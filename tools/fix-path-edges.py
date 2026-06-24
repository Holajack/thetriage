#!/usr/bin/env python3
"""
Fix path images that have transparent left/right edges, causing visible
gaps when tiled horizontally. For each row with content, extends the
edge pixels outward to fill the full image width.

Usage:
  python3 tools/fix-path-edges.py          # dry run
  python3 tools/fix-path-edges.py --apply  # modify images
"""

import os
import sys
import numpy as np
from PIL import Image

BASE = os.path.join(os.path.dirname(__file__), "..", "assets", "Background_animations")
BIOME_FOLDERS = [
    "Forest",
    "Beach",
    "Desert",
    "Volcano",
    "Snow",
    "Canyon",
    "Northern",
    "Galaxy",
]
GROUNDS = [
    "regular_path",
    "mossy_jungl_path",
    "grassy_path",
    "damp_moss_path",
    "flower_jungl_path",
    "stones_pebbles_path",
]

ALPHA_THRESHOLD = 5
EDGE_DENSITY_THRESHOLD = 30


def analyze_edges(img_array):
    h, w = img_array.shape[:2]
    alpha = img_array[:, :, 3]

    left_gap = w
    right_gap = w
    for x in range(w):
        if np.any(alpha[:, x] > ALPHA_THRESHOLD):
            left_gap = x
            break
    for x in range(w - 1, -1, -1):
        if np.any(alpha[:, x] > ALPHA_THRESHOLD):
            right_gap = w - 1 - x
            break

    left_20 = alpha[:, :20]
    right_20 = alpha[:, w - 20 :]
    left_density = np.sum(left_20 > ALPHA_THRESHOLD) / max(left_20.size, 1) * 100
    right_density = np.sum(right_20 > ALPHA_THRESHOLD) / max(right_20.size, 1) * 100

    return left_gap, right_gap, left_density, right_density


def extend_edges(img_array):
    h, w = img_array.shape[:2]
    result = img_array.copy()
    alpha = result[:, :, 3]

    for y in range(h):
        row_alpha = alpha[y]
        opaque = np.where(row_alpha > ALPHA_THRESHOLD)[0]
        if len(opaque) == 0:
            continue

        left_x = opaque[0]
        right_x = opaque[-1]

        if left_x > 0:
            sample_width = min(8, len(opaque))
            sample = result[y, left_x : left_x + sample_width]
            for x in range(left_x):
                src_idx = x % sample_width
                result[y, left_x - 1 - x] = sample[sample_width - 1 - src_idx]

        if right_x < w - 1:
            sample_width = min(8, len(opaque))
            sample = result[y, right_x - sample_width + 1 : right_x + 1]
            for x in range(w - 1 - right_x):
                src_idx = x % sample_width
                result[y, right_x + 1 + x] = sample[sample_width - 1 - src_idx]

    return result


def process_image(path, apply=False):
    img = Image.open(path).convert("RGBA")
    arr = np.array(img)
    left_gap, right_gap, left_d, right_d = analyze_edges(arr)

    needs_fix = left_d < EDGE_DENSITY_THRESHOLD or right_d < EDGE_DENSITY_THRESHOLD

    if not needs_fix:
        return False, left_d, right_d

    if apply:
        fixed = extend_edges(arr)
        fixed_img = Image.fromarray(fixed)
        if path.endswith(".webp"):
            fixed_img.save(path, "WEBP", lossless=True, quality=100)
        else:
            fixed_img.save(path, "PNG")

    return True, left_d, right_d


def main():
    apply = "--apply" in sys.argv
    total_fixed = 0

    if apply:
        print("=== APPLYING edge fixes ===\n")
    else:
        print("=== DRY RUN (use --apply to modify) ===\n")

    for biome in BIOME_FOLDERS:
        d = os.path.join(BASE, biome, "nine_layer")
        print(f"{biome}:")

        for name in GROUNDS:
            path = os.path.join(d, name + ".webp")
            if not os.path.exists(path):
                path = os.path.join(d, name + ".png")
            if not os.path.exists(path):
                continue

            fixed, left_d, right_d = process_image(path, apply)
            label = name.replace("_path", "").replace("_jungl", "")
            if fixed:
                status = "FIXED" if apply else "NEEDS FIX"
                print(f"  {status:10s} {label:20s} L={left_d:4.0f}%  R={right_d:4.0f}%")
                total_fixed += 1
            else:
                print(f'  {"OK":10s} {label:20s} L={left_d:4.0f}%  R={right_d:4.0f}%')

        print()

    print(f'{"Fixed" if apply else "Would fix"} {total_fixed} images.')


if __name__ == "__main__":
    main()
