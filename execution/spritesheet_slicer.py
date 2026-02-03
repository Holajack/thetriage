"""
Spritesheet Slicer v2
Slices AI-generated spritesheets into uniform frames.
Two modes: grid (clean inputs) and smart (messy AI outputs with BG removal).
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Optional

import numpy as np
from PIL import Image

# Add parent of execution/ to path for utils import
sys.path.insert(0, str(Path(__file__).parent))
from utils import log, ExecutionResult


def validate_and_trim(
    img_w: int, img_h: int,
    frame_w: int, frame_h: int,
    tolerance: int = 10
) -> tuple[int, int, int, int]:
    """Check if dimensions divide evenly; auto-trim edges if within tolerance."""
    rem_w = img_w % frame_w
    rem_h = img_h % frame_h

    if rem_w > tolerance:
        raise ValueError(
            f"Width {img_w} doesn't divide by frame_w {frame_w} "
            f"(remainder {rem_w} > tolerance {tolerance})"
        )
    if rem_h > tolerance:
        raise ValueError(
            f"Height {img_h} doesn't divide by frame_h {frame_h} "
            f"(remainder {rem_h} > tolerance {tolerance})"
        )

    trimmed_w = img_w - rem_w
    trimmed_h = img_h - rem_h
    cols = trimmed_w // frame_w
    rows = trimmed_h // frame_h
    if rem_w or rem_h:
        log(f"Auto-trimmed: {img_w}x{img_h} -> {trimmed_w}x{trimmed_h} "
            f"(removed {rem_w}px width, {rem_h}px height)")
    return trimmed_w, trimmed_h, cols, rows


def detect_background_color(
    image: Image.Image, sample_size: int = 10
) -> tuple[int, int, int, int]:
    """Sample 4 corners to find dominant background color."""
    img = image.convert("RGBA")
    w, h = img.size
    arr = np.array(img)

    corners = [
        arr[:sample_size, :sample_size],          # top-left
        arr[:sample_size, w - sample_size:],       # top-right
        arr[h - sample_size:, :sample_size],       # bottom-left
        arr[h - sample_size:, w - sample_size:],   # bottom-right
    ]

    # Flatten all corner pixels, find the most common color
    pixels = np.concatenate([c.reshape(-1, 4) for c in corners], axis=0)
    # Use median as robust estimator (handles slight variations)
    bg = tuple(int(v) for v in np.median(pixels, axis=0))
    log(f"Detected background color: RGBA{bg}")
    return bg


def remove_background(
    image: Image.Image, bg_color: tuple, tolerance: int = 30
) -> Image.Image:
    """Replace background color with transparency."""
    img = image.convert("RGBA")
    arr = np.array(img, dtype=np.float32)
    bg = np.array(bg_color[:3], dtype=np.float32)

    # Color distance per pixel (RGB only)
    dist = np.sqrt(np.sum((arr[:, :, :3] - bg) ** 2, axis=2))

    # Create alpha mask: transparent where close to bg color
    mask = (dist > tolerance).astype(np.uint8) * 255
    arr[:, :, 3] = mask

    return Image.fromarray(arr.astype(np.uint8))


def find_grid_structure(
    image: Image.Image,
    hint_cols: Optional[int] = None,
    hint_rows: Optional[int] = None
) -> tuple[int, int, int, int]:
    """Detect grid structure from pixel density or use hints.
    Returns (cols, rows, cell_width, cell_height)."""
    w, h = image.size

    if hint_cols and hint_rows:
        cell_w = w // hint_cols
        cell_h = h // hint_rows
        log(f"Using hinted grid: {hint_cols}x{hint_rows}, cell {cell_w}x{cell_h}")
        return hint_cols, hint_rows, cell_w, cell_h

    # Convert to RGBA and get alpha/content density
    img = image.convert("RGBA")
    arr = np.array(img)
    alpha = arr[:, :, 3]

    # Sum alpha per column and per row to find gutters
    col_density = alpha.sum(axis=0).astype(float)
    row_density = alpha.sum(axis=1).astype(float)

    cols = _find_divisions(col_density, w)
    rows = _find_divisions(row_density, h)

    cell_w = w // cols
    cell_h = h // rows
    log(f"Auto-detected grid: {cols}x{rows}, cell {cell_w}x{cell_h}")
    return cols, rows, cell_w, cell_h


def _find_divisions(density: np.ndarray, total_size: int) -> int:
    """Find number of divisions by looking for periodic gutters in density signal."""
    if density.max() == 0:
        return 1

    # Normalize
    norm = density / density.max()

    # Try candidate divisions from 2 to 20
    best_score = float("inf")
    best_n = 1

    for n in range(2, min(21, total_size // 10 + 1)):
        cell_size = total_size / n
        if cell_size < 10:
            break

        # Check density at cell boundaries (gutters should have low density)
        boundary_score = 0
        for i in range(1, n):
            boundary = int(i * cell_size)
            lo = max(0, boundary - 2)
            hi = min(len(norm), boundary + 3)
            boundary_score += norm[lo:hi].mean()
        # Normalize by number of boundaries
        boundary_score = boundary_score / max(1, n - 1)

        # Penalize uneven division
        remainder_penalty = (total_size % max(1, int(cell_size))) / total_size

        # Reward higher n (more divisions) to avoid defaulting to 2
        # but not too aggressively
        division_bonus = -0.02 * n

        score = boundary_score + remainder_penalty * 2 + division_bonus

        if score < best_score:
            best_score = score
            best_n = n

    return best_n


def extract_content_bbox(
    frame_image: Image.Image
) -> Optional[tuple[int, int, int, int]]:
    """Find tight bounding box of non-transparent content. Returns None if empty."""
    arr = np.array(frame_image.convert("RGBA"))
    alpha = arr[:, :, 3]

    if alpha.max() == 0:
        return None

    rows_with_content = np.any(alpha > 0, axis=1)
    cols_with_content = np.any(alpha > 0, axis=0)

    top = int(np.argmax(rows_with_content))
    bottom = int(len(rows_with_content) - np.argmax(rows_with_content[::-1]))
    left = int(np.argmax(cols_with_content))
    right = int(len(cols_with_content) - np.argmax(cols_with_content[::-1]))

    return left, top, right, bottom


def slice_grid(image: Image.Image, cols: int, rows: int) -> list[Image.Image]:
    """Crop image into grid cells, row-major order."""
    img = image.convert("RGBA")
    w, h = img.size
    cell_w = w // cols
    cell_h = h // rows

    frames = []
    for r in range(rows):
        for c in range(cols):
            x = c * cell_w
            y = r * cell_h
            frame = img.crop((x, y, x + cell_w, y + cell_h))
            frames.append(frame)

    log(f"Sliced {cols}x{rows} grid -> {len(frames)} raw frames ({cell_w}x{cell_h} each)")
    return frames


def smart_extract(
    image: Image.Image,
    hint_cols: Optional[int] = None,
    hint_rows: Optional[int] = None,
    bg_tolerance: int = 30
) -> list[Image.Image]:
    """Full smart pipeline: detect BG, remove it, find grid, extract and normalize."""
    bg_color = detect_background_color(image)
    clean = remove_background(image, bg_color, tolerance=bg_tolerance)
    cols, rows, cell_w, cell_h = find_grid_structure(clean, hint_cols, hint_rows)
    frames = slice_grid(clean, cols, rows)
    return frames


def skip_empty_frames(
    frames: list[Image.Image], threshold: float = 0.01
) -> list[Image.Image]:
    """Remove frames that are mostly transparent or solid-color placeholders."""
    result = []
    skipped = 0
    for i, frame in enumerate(frames):
        arr = np.array(frame.convert("RGBA"))
        alpha = arr[:, :, 3]
        content_ratio = (alpha > 0).sum() / alpha.size

        # Check 1: mostly transparent
        if content_ratio < threshold:
            skipped += 1
            continue

        # Check 2: solid-color placeholder (e.g., black empty cells)
        # If >90% of non-transparent pixels are the same color, it's a placeholder
        if content_ratio > 0:
            opaque_mask = alpha > 0
            opaque_pixels = arr[opaque_mask][:, :3]
            if len(opaque_pixels) > 0:
                median_color = np.median(opaque_pixels, axis=0)
                distances = np.sqrt(np.sum((opaque_pixels.astype(float) - median_color) ** 2, axis=1))
                uniform_ratio = (distances < 15).sum() / len(distances)
                if uniform_ratio > 0.90:
                    skipped += 1
                    log(f"Frame {i}: solid-color placeholder (uniformity={uniform_ratio:.2f}), skipping")
                    continue

        result.append(frame)

    if skipped:
        log(f"Skipped {skipped} empty/placeholder frames total")
    return result


def normalize_frames(
    frames: list[Image.Image],
    output_size: Optional[tuple[int, int]] = None
) -> list[Image.Image]:
    """Ensure all frames have identical dimensions.
    If output_size given, resize to that. Otherwise, find max bbox and center."""
    if not frames:
        return frames

    if output_size:
        target_w, target_h = output_size
    else:
        # Find max content bounding box across all frames
        max_w, max_h = 0, 0
        for frame in frames:
            bbox = extract_content_bbox(frame)
            if bbox:
                l, t, r, b = bbox
                max_w = max(max_w, r - l)
                max_h = max(max_h, b - t)

        if max_w == 0 or max_h == 0:
            # Fallback: use frame dimensions as-is
            target_w, target_h = frames[0].size
        else:
            # Add 10% padding
            target_w = int(max_w * 1.1)
            target_h = int(max_h * 1.1)

    result = []
    for frame in frames:
        bbox = extract_content_bbox(frame)
        if bbox is None:
            # Empty frame (shouldn't happen after skip_empty, but handle gracefully)
            result.append(Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0)))
            continue

        l, t, r, b = bbox
        content = frame.crop((l, t, r, b))

        # Scale content to fit target while preserving aspect ratio
        content_w, content_h = content.size
        scale = min(target_w / content_w, target_h / content_h)

        if scale < 1.0 or output_size:
            # Only scale down (or when explicit output_size requested)
            new_w = int(content_w * scale)
            new_h = int(content_h * scale)
            content = content.resize((new_w, new_h), Image.Resampling.LANCZOS)

        # Center on transparent canvas
        canvas = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
        paste_x = (target_w - content.width) // 2
        paste_y = (target_h - content.height) // 2
        canvas.paste(content, (paste_x, paste_y), content)
        result.append(canvas)

    log(f"Normalized {len(result)} frames to {target_w}x{target_h}")
    return result


def reassemble_strip(frames: list[Image.Image]) -> Image.Image:
    """Concatenate frames into a single horizontal strip."""
    if not frames:
        raise ValueError("No frames to assemble")

    frame_w, frame_h = frames[0].size
    strip = Image.new("RGBA", (frame_w * len(frames), frame_h), (0, 0, 0, 0))
    for i, frame in enumerate(frames):
        strip.paste(frame, (i * frame_w, 0), frame)

    log(f"Assembled strip: {strip.size[0]}x{strip.size[1]} ({len(frames)} frames)")
    return strip


def generate_metadata(
    source: str, frame_w: int, frame_h: int, total_frames: int
) -> dict:
    """Generate JSON metadata matching bear_walking_frames.json format."""
    sheet_w = frame_w * total_frames
    sheet_h = frame_h
    sprite_name = Path(source).stem + "_optimized.png"

    metadata = {
        "spriteSheet": sprite_name,
        "frameWidth": frame_w,
        "frameHeight": frame_h,
        "sheetWidth": sheet_w,
        "sheetHeight": sheet_h,
        "columns": total_frames,
        "rows": 1,
        "totalFrames": total_frames,
        "frames": [
            {
                "x": i * frame_w,
                "y": 0,
                "width": frame_w,
                "height": frame_h,
                "frameIndex": i
            }
            for i in range(total_frames)
        ]
    }
    return metadata


def validate_output(frames: list[Image.Image]) -> None:
    """Assert all frames are uniform RGBA."""
    if not frames:
        raise ValueError("No frames to validate")

    ref_size = frames[0].size
    for i, frame in enumerate(frames):
        if frame.size != ref_size:
            raise ValueError(
                f"Frame {i} size {frame.size} != expected {ref_size}"
            )
        if frame.mode != "RGBA":
            raise ValueError(f"Frame {i} mode is {frame.mode}, expected RGBA")


def process_single(args) -> ExecutionResult:
    """Process a single spritesheet image."""
    image_path = Path(args.image)
    if not image_path.exists():
        return ExecutionResult.fail(f"Image not found: {image_path}")

    try:
        img = Image.open(image_path)
        log(f"Opened {image_path.name}: {img.size[0]}x{img.size[1]}, mode={img.mode}")
    except Exception as e:
        return ExecutionResult.fail(f"Failed to open image: {e}")

    # Determine output directory
    output_dir = Path(args.output_dir) if args.output_dir else image_path.parent
    output_dir.mkdir(parents=True, exist_ok=True)
    stem = image_path.stem

    try:
        # === EXTRACTION ===
        if args.smart:
            frames = smart_extract(
                img,
                hint_cols=args.columns,
                hint_rows=args.rows,
                bg_tolerance=args.bg_tolerance
            )
        elif args.frame_width and args.frame_height:
            trimmed_w, trimmed_h, cols, rows = validate_and_trim(
                img.size[0], img.size[1],
                args.frame_width, args.frame_height,
                tolerance=args.trim_tolerance
            )
            cropped = img.crop((0, 0, trimmed_w, trimmed_h))
            frames = slice_grid(cropped, cols, rows)
        elif args.columns and args.rows:
            frames = slice_grid(img, args.columns, args.rows)
        else:
            # Auto-detect: assume horizontal strip with square frames
            h = img.size[1]
            w = img.size[0]
            if w > h:
                cols = round(w / h)
                frames = slice_grid(img, cols, 1)
            else:
                return ExecutionResult.fail(
                    "Cannot auto-detect grid. Provide --columns/--rows, "
                    "--frame-width/--frame-height, or use --smart mode."
                )

        # === EMPTY FRAME REMOVAL ===
        frames = skip_empty_frames(frames)

        # === MAX FRAMES CAP ===
        if args.max_frames and len(frames) > args.max_frames:
            log(f"Capping frames from {len(frames)} to {args.max_frames}")
            frames = frames[:args.max_frames]

        # === NORMALIZATION ===
        output_size = None
        if args.output_size:
            parts = args.output_size.lower().split("x")
            output_size = (int(parts[0]), int(parts[1]))

        if output_size or args.smart:
            frames = normalize_frames(frames, output_size)

        # === VALIDATION ===
        validate_output(frames)
        frame_w, frame_h = frames[0].size

        log(f"Final: {len(frames)} frames at {frame_w}x{frame_h}")

        # === OUTPUT ===
        results = {"frames_extracted": len(frames), "frame_size": f"{frame_w}x{frame_h}"}

        # Save individual frames
        frames_dir = output_dir / f"{stem}-frames"
        frames_dir.mkdir(exist_ok=True)
        for i, frame in enumerate(frames):
            frame_path = frames_dir / f"frame_{i:03d}.png"
            frame.save(frame_path, "PNG", optimize=True)
        results["frames_dir"] = str(frames_dir)

        # Strip output
        if args.strip:
            strip = reassemble_strip(frames)
            strip_name = f"{stem}_optimized.png"
            strip_path = output_dir / strip_name
            strip.save(strip_path, "PNG", optimize=True)
            results["strip"] = str(strip_path)
            log(f"Saved strip: {strip_path}")

            # Verify strip dimensions
            assert strip.size == (frame_w * len(frames), frame_h), \
                f"Strip size mismatch: {strip.size}"

        # JSON metadata
        if args.json:
            meta = generate_metadata(image_path.name, frame_w, frame_h, len(frames))
            json_name = f"{stem}_frames.json"
            json_path = output_dir / json_name
            with open(json_path, "w") as f:
                json.dump(meta, f, indent=2)
            results["json"] = str(json_path)
            log(f"Saved metadata: {json_path}")

        return ExecutionResult.ok(results)

    except Exception as e:
        log(f"Error processing {image_path.name}: {e}", level="error")
        return ExecutionResult.fail(str(e))


def main():
    parser = argparse.ArgumentParser(
        description="Spritesheet Slicer v2 - Extract uniform frames from AI-generated spritesheets"
    )

    # Input
    input_group = parser.add_mutually_exclusive_group(required=True)
    input_group.add_argument("--image", type=str, help="Path to input spritesheet image")
    input_group.add_argument("--batch", type=str, help="Directory of images to batch process")

    # Mode
    parser.add_argument("--smart", action="store_true",
                        help="Smart mode: auto-detect BG, remove it, find grid")

    # Grid specification
    parser.add_argument("--columns", type=int, help="Number of columns in grid")
    parser.add_argument("--rows", type=int, help="Number of rows in grid")
    parser.add_argument("--frame-width", type=int, help="Explicit frame width in pixels")
    parser.add_argument("--frame-height", type=int, help="Explicit frame height in pixels")

    # Tolerances
    parser.add_argument("--trim-tolerance", type=int, default=10,
                        help="Max pixels to auto-trim for uneven division (default: 10)")
    parser.add_argument("--bg-tolerance", type=int, default=30,
                        help="Color distance threshold for BG removal (default: 30)")

    # Post-processing
    parser.add_argument("--output-size", type=str,
                        help="Normalize all frames to WxH (e.g., 200x200)")
    parser.add_argument("--strip", action="store_true",
                        help="Output horizontal strip PNG")
    parser.add_argument("--json", action="store_true",
                        help="Output JSON metadata file")
    parser.add_argument("--max-frames", type=int,
                        help="Maximum number of output frames")

    # Output
    parser.add_argument("--output-dir", type=str,
                        help="Output directory (default: same as input)")

    args = parser.parse_args()

    if args.batch:
        batch_dir = Path(args.batch)
        if not batch_dir.is_dir():
            print(ExecutionResult.fail(f"Batch directory not found: {batch_dir}").to_json())
            sys.exit(1)

        extensions = {".png", ".jpg", ".jpeg", ".webp"}
        images = sorted(
            p for p in batch_dir.iterdir()
            if p.suffix.lower() in extensions
        )

        if not images:
            print(ExecutionResult.fail(f"No images found in {batch_dir}").to_json())
            sys.exit(1)

        log(f"Batch processing {len(images)} images from {batch_dir}")
        results = {}
        for image_path in images:
            args.image = str(image_path)
            result = process_single(args)
            results[image_path.name] = result.to_dict()
            status = "OK" if result.success else f"FAIL: {result.error}"
            log(f"  {image_path.name}: {status}")

        all_ok = all(r["success"] for r in results.values())
        final = ExecutionResult(
            success=all_ok,
            data=results,
            metadata={"batch_size": len(images)}
        )
        print(final.to_json())
    else:
        result = process_single(args)
        print(result.to_json())
        sys.exit(0 if result.success else 1)


if __name__ == "__main__":
    main()
