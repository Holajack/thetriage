#!/usr/bin/env python3
"""
Screenshot Post-Processing for HikeWise

This script processes captured screenshots:
1. Validates screenshot dimensions
2. Optionally adds device frames
3. Resizes to exact store requirements
4. Generates a preview grid

Usage:
    python execution/screenshots/process_screenshots.py
    python execution/screenshots/process_screenshots.py --add-frames
    python execution/screenshots/process_screenshots.py --validate-only
"""

import sys
import json
from pathlib import Path
from typing import Dict, List, Tuple

# Add parent directory to path for utils import
sys.path.insert(0, str(Path(__file__).parent.parent))
from utils import load_env, log

def logger_info(msg): log(msg, "info")
def logger_error(msg): log(msg, "error")
def logger_warning(msg): log(msg, "warning")

class Logger:
    info = staticmethod(logger_info)
    error = staticmethod(logger_error)
    warning = staticmethod(logger_warning)

logger = Logger()

# Expected dimensions for each device (width x height in pixels)
EXPECTED_DIMENSIONS: Dict[str, Tuple[int, int]] = {
    "ios/iphone-6.7": (1290, 2796),
    "ios/iphone-6.5": (1242, 2688),
    "ios/iphone-5.5": (1242, 2208),
    "ios/ipad-12.9": (2048, 2732),
    "android/phone": (1080, 1920),
    "android/tablet": (1200, 1920),
}

SCREENS = ["home", "study", "nora", "analytics", "subscription", "leaderboard", "profile"]


def get_image_dimensions(filepath: Path) -> Tuple[int, int]:
    """Get dimensions of an image file."""
    try:
        from PIL import Image
        with Image.open(filepath) as img:
            return img.size
    except ImportError:
        logger.warning("PIL not installed. Install with: pip install Pillow")
        return (0, 0)
    except Exception as e:
        logger.error(f"Error reading {filepath}: {e}")
        return (0, 0)


def validate_screenshots(base_dir: Path) -> Dict[str, List[str]]:
    """Validate all screenshots exist and have correct dimensions."""
    results = {
        "valid": [],
        "missing": [],
        "wrong_size": [],
    }

    for device, expected_size in EXPECTED_DIMENSIONS.items():
        device_dir = base_dir / device

        if not device_dir.exists():
            logger.warning(f"Device directory missing: {device}")
            for screen in SCREENS:
                results["missing"].append(f"{device}/{screen}.png")
            continue

        for screen in SCREENS:
            filepath = device_dir / f"{screen}.png"

            if not filepath.exists():
                results["missing"].append(f"{device}/{screen}.png")
                continue

            actual_size = get_image_dimensions(filepath)
            if actual_size == (0, 0):
                results["wrong_size"].append(f"{device}/{screen}.png (unreadable)")
            elif actual_size != expected_size:
                results["wrong_size"].append(
                    f"{device}/{screen}.png ({actual_size[0]}x{actual_size[1]} != {expected_size[0]}x{expected_size[1]})"
                )
            else:
                results["valid"].append(f"{device}/{screen}.png")

    return results


def resize_screenshot(filepath: Path, target_size: Tuple[int, int]) -> bool:
    """Resize a screenshot to target dimensions."""
    try:
        from PIL import Image

        with Image.open(filepath) as img:
            # Use high-quality resampling
            resized = img.resize(target_size, Image.Resampling.LANCZOS)
            resized.save(filepath, "PNG", optimize=True)
            logger.info(f"Resized {filepath.name} to {target_size[0]}x{target_size[1]}")
            return True
    except ImportError:
        logger.error("PIL not installed. Install with: pip install Pillow")
        return False
    except Exception as e:
        logger.error(f"Error resizing {filepath}: {e}")
        return False


def generate_preview_grid(base_dir: Path, output_path: Path) -> bool:
    """Generate a preview grid showing all screenshots."""
    try:
        from PIL import Image

        # Create a grid: 7 screens × 6 devices
        thumb_width = 180
        thumb_height = 320
        padding = 10

        grid_width = (thumb_width + padding) * len(SCREENS) + padding
        grid_height = (thumb_height + padding) * len(EXPECTED_DIMENSIONS) + padding + 40

        grid = Image.new("RGB", (grid_width, grid_height), "white")

        y = 40  # Leave room for header
        for device in EXPECTED_DIMENSIONS.keys():
            x = padding
            device_dir = base_dir / device

            for screen in SCREENS:
                filepath = device_dir / f"{screen}.png"
                if filepath.exists():
                    try:
                        with Image.open(filepath) as img:
                            # Calculate thumbnail size maintaining aspect ratio
                            img.thumbnail((thumb_width, thumb_height), Image.Resampling.LANCZOS)
                            # Center in cell
                            offset_x = x + (thumb_width - img.width) // 2
                            offset_y = y + (thumb_height - img.height) // 2
                            grid.paste(img, (offset_x, offset_y))
                    except Exception as e:
                        logger.warning(f"Could not add {filepath} to grid: {e}")

                x += thumb_width + padding

            y += thumb_height + padding

        grid.save(output_path, "PNG")
        logger.info(f"Generated preview grid: {output_path}")
        return True

    except ImportError:
        logger.error("PIL not installed. Install with: pip install Pillow")
        return False
    except Exception as e:
        logger.error(f"Error generating preview grid: {e}")
        return False


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Process screenshots for app stores")
    parser.add_argument("--validate-only", action="store_true", help="Only validate, don't modify")
    parser.add_argument("--resize", action="store_true", help="Resize screenshots to exact dimensions")
    parser.add_argument("--preview", action="store_true", help="Generate preview grid")
    parser.add_argument("--add-frames", action="store_true", help="Add device frames (not implemented)")
    args = parser.parse_args()

    load_env()

    base_dir = Path(__file__).parent.parent.parent / "store-assets" / "screenshots"

    if not base_dir.exists():
        logger.error(f"Screenshots directory not found: {base_dir}")
        logger.info("Run capture_web_screenshots.py first to generate screenshots")
        sys.exit(1)

    # Validate screenshots
    print("\n" + "=" * 50)
    print("Screenshot Validation")
    print("=" * 50)

    results = validate_screenshots(base_dir)

    print(f"\n✅ Valid: {len(results['valid'])}")
    print(f"❌ Missing: {len(results['missing'])}")
    print(f"⚠️ Wrong size: {len(results['wrong_size'])}")

    if results["missing"]:
        print("\nMissing screenshots:")
        for f in results["missing"][:10]:
            print(f"  - {f}")
        if len(results["missing"]) > 10:
            print(f"  ... and {len(results['missing']) - 10} more")

    if results["wrong_size"]:
        print("\nWrong size screenshots:")
        for f in results["wrong_size"][:10]:
            print(f"  - {f}")
        if len(results["wrong_size"]) > 10:
            print(f"  ... and {len(results['wrong_size']) - 10} more")

    if args.validate_only:
        sys.exit(0 if not results["missing"] and not results["wrong_size"] else 1)

    # Resize if requested
    if args.resize and results["wrong_size"]:
        print("\n" + "=" * 50)
        print("Resizing Screenshots")
        print("=" * 50)

        for device, target_size in EXPECTED_DIMENSIONS.items():
            device_dir = base_dir / device
            if device_dir.exists():
                for screen in SCREENS:
                    filepath = device_dir / f"{screen}.png"
                    if filepath.exists():
                        resize_screenshot(filepath, target_size)

    # Generate preview if requested
    if args.preview:
        print("\n" + "=" * 50)
        print("Generating Preview Grid")
        print("=" * 50)

        preview_path = base_dir / "preview_grid.png"
        generate_preview_grid(base_dir, preview_path)

    if args.add_frames:
        print("\n⚠️ Device frame feature not yet implemented")
        print("Consider using tools like:")
        print("  - https://mockuphone.com/")
        print("  - https://screenshots.pro/")

    # Summary
    total_expected = len(SCREENS) * len(EXPECTED_DIMENSIONS)
    total_valid = len(results["valid"])

    print("\n" + "=" * 50)
    print(f"Summary: {total_valid}/{total_expected} screenshots ready")
    print("=" * 50)

    if total_valid == total_expected:
        print("\n✅ All screenshots are ready for store submission!")
        sys.exit(0)
    else:
        print(f"\n⚠️ {total_expected - total_valid} screenshots need attention")
        sys.exit(1)


if __name__ == "__main__":
    main()
