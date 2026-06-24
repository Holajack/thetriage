#!/usr/bin/env python3
"""
Normalize parallax layer images so all variants within a group share
a universal bottom edge. Shifts each image's content DOWN so the
bottommost non-transparent pixel sits at the very last row of the image.

This makes trees, bushes, and ground path variants tile at a consistent
vertical position regardless of which variant is showing.

Usage:
  python3 tools/normalize-layer-bottoms.py          # dry run (preview only)
  python3 tools/normalize-layer-bottoms.py --apply   # actually modify images
"""

import os
import sys
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

TREES = [
    "foreground_tree",
    "foreground_tall_tree",
    "foreground_left_lean_tree",
    "foreground_right_lean_tree",
    "foreground_right_trunk_bend_left",
    "foreground_trunk_bend_right",
    "foreground_trunk_s",
    "foreground_long_vine_tree",
    "foreground_vines_tree",
]
BUSHES = ["jungle_bush", "tall_bush", "wide_low_bush", "thick_moss_bush"]
GROUNDS = [
    "regular_path",
    "mossy_jungl_path",
    "grassy_path",
    "damp_moss_path",
    "flower_jungl_path",
    "stones_pebbles_path",
]

ALPHA_THRESHOLD = 10


def find_content_bottom(img):
    w, h = img.size
    for y in range(h - 1, -1, -1):
        row = img.crop((0, y, w, y + 1)).getdata()
        if any(px[3] > ALPHA_THRESHOLD for px in row):
            return y
    return 0


def shift_image_down(img, shift):
    w, h = img.size
    new = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    cropped = img.crop((0, 0, w, h - shift))
    new.paste(cropped, (0, shift))
    return new


def resolve_path(biome_dir, name):
    webp = os.path.join(biome_dir, name + ".webp")
    if os.path.exists(webp):
        return webp
    png = os.path.join(biome_dir, name + ".png")
    if os.path.exists(png):
        return png
    return None


def process_group(biome_folder, group_name, names, apply=False):
    biome_dir = os.path.join(BASE, biome_folder, "nine_layer")
    results = []
    modified = 0

    for name in names:
        path = resolve_path(biome_dir, name)
        if not path:
            print(f"    SKIP {name} (not found)")
            continue

        img = Image.open(path).convert("RGBA")
        w, h = img.size
        bottom = find_content_bottom(img)
        shift = (h - 1) - bottom

        if shift == 0:
            print(f"    OK   {name:40s} bottom={bottom} (already at edge)")
            results.append((name, path, 0))
            continue

        print(f"    SHIFT {name:40s} bottom={bottom} -> {h-1}  (shift {shift}px down)")
        results.append((name, path, shift))

        if apply:
            new_img = shift_image_down(img, shift)
            if path.endswith(".webp"):
                new_img.save(path, "WEBP", lossless=True, quality=100)
            else:
                new_img.save(path, "PNG")
            modified += 1

    return results, modified


def main():
    apply = "--apply" in sys.argv
    total_modified = 0

    if apply:
        print("=== APPLYING CHANGES (modifying images) ===\n")
    else:
        print("=== DRY RUN (preview only, use --apply to modify) ===\n")

    for biome in BIOME_FOLDERS:
        print(f'\n{"="*60}')
        print(f"  {biome}")
        print(f'{"="*60}')

        for group_name, names in [
            ("TREES", TREES),
            ("BUSHES", BUSHES),
            ("GROUND", GROUNDS),
        ]:
            print(f"\n  {group_name}:")
            _, modified = process_group(biome, group_name, names, apply)
            total_modified += modified

    print(f'\n{"="*60}')
    if apply:
        print(f"Done! Modified {total_modified} images.")
    else:
        print("Dry run complete. Use --apply to modify images.")
    print(f'{"="*60}')


if __name__ == "__main__":
    main()
