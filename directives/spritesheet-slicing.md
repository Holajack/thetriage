# Directive: Spritesheet Slicer

## Goal
Extract uniform, equal-sized frames from AI-generated spritesheets and output horizontal strip PNGs with JSON metadata.

## Inputs
- **Required:**
  - `image`: Path to a spritesheet PNG (or `batch`: path to a directory of PNGs)
- **Optional:**
  - `--smart`: Enable smart mode (background detection/removal, auto-grid) (default: off)
  - `--columns N`: Number of columns in the grid
  - `--rows N`: Number of rows in the grid
  - `--frame-width N`: Explicit frame width in pixels
  - `--frame-height N`: Explicit frame height in pixels
  - `--output-size WxH`: Normalize all frames to this size (e.g., 200x200)
  - `--strip`: Output a horizontal strip PNG
  - `--json`: Output JSON metadata file
  - `--max-frames N`: Cap the number of output frames
  - `--bg-tolerance N`: Color distance for BG removal (default: 30)
  - `--trim-tolerance N`: Max pixels to auto-trim for uneven division (default: 10)
  - `--output-dir DIR`: Output directory (default: same as input)

## Execution Scripts
1. `execution/spritesheet_slicer.py` - Main slicer with grid mode, smart mode, and post-processing

## Process

### Mode 1: Grid Slice (clean inputs like campfire_animation.png)
1. Open image and check dimensions
2. Validate frame dimensions divide evenly (auto-trim if within tolerance)
3. Crop each cell in row-major order
4. Skip empty trailing frames
5. Apply post-processing (resize, strip, JSON)

### Mode 2: Smart Extract (messy AI outputs like bear-sleeping-sprite.png, deer_spritesheet.png)
1. Detect background color by sampling 4 corners (10x10px each)
2. Remove background -> convert to transparency
3. Find grid structure via pixel density analysis (or use column/row hints)
4. Crop each cell, find tight content bounding box
5. Skip empty cells (handles incomplete last rows)
6. Normalize all frames to uniform size with centering
7. Apply post-processing (resize, strip, JSON)

### Common Recipes

**Campfire (clean 4x4 grid):**
```bash
python execution/spritesheet_slicer.py \
  --image assets/trail-buddies/example-input-images/campfire_animation.png \
  --columns 4 --rows 4 --strip --json
```

**Bear sleeping (white BG, single row):**
```bash
python execution/spritesheet_slicer.py \
  --image assets/trail-buddies/example-input-images/bear-sleeping-sprite.png \
  --smart --columns 10 --rows 1 --output-size 200x200 --strip --json
```

**Deer (gray BG, incomplete grid):**
```bash
python execution/spritesheet_slicer.py \
  --image assets/trail-buddies/example-input-images/deer_spritesheet.png \
  --smart --output-size 200x200 --strip --json
```

**Batch all examples:**
```bash
python execution/spritesheet_slicer.py \
  --batch assets/trail-buddies/example-input-images/ \
  --smart --output-size 200x200 --strip --json
```

## Outputs
- **Primary:** Horizontal strip PNG (`{name}_optimized.png`) and JSON metadata (`{name}_frames.json`)
- **Intermediate:** Individual frame PNGs in `{name}-frames/` directory

## Error Handling
- **Uneven dimensions:** Auto-trims up to `--trim-tolerance` pixels; fails with exact remainder info if beyond
- **No alpha channel:** Smart mode auto-detects and removes solid-color backgrounds
- **Empty cells:** Automatically detected and skipped (content ratio < 1%)
- **Variable frame sizes:** Smart mode normalizes all frames via content-aware extraction and centering

## Edge Cases
- What if the spritesheet has no clear grid gutters? Use `--columns`/`--rows` hints with `--smart`
- What if background color varies across the sheet? Increase `--bg-tolerance` (try 40-50)
- What if frames overflow the grid cells? Smart mode uses content bounding box, not cell boundaries
- What if the sheet is a single horizontal row? Auto-detected when width > height without flags

## Learnings
> Add discoveries here as you use this directive
