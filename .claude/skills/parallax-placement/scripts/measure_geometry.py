#!/usr/bin/env python3
"""Re-measure src/config/nineLayerGeometry.ts from the nine_layer asset frames.

Run this WHENEVER ground/tree/bush art changes (new biome, regenerated path,
new sprite). It alpha-scans each frame and writes the geometry the renderer uses
to plant everything on the shared ground line. Idempotent: unchanged art yields
identical values.

Usage:  python3 measure_geometry.py        # rewrites src/config/nineLayerGeometry.ts

Measured per ground variant:
  groundCrest  = first row with >=30% opaque coverage  (path top / grass line)
  groundBottom = last  row with >=30% coverage         (opaque underside)
  groundSolidWidth = width of the >=85%-column-coverage centre (tile stride basis,
                     so tapered "island" tips overlap neighbours -> no blue gap)
Per tree:  treeBase = last >=30% row (planted at the dirt line).
Per bush:  bushGreenBottom = lowest predominantly-green row (green plants on the
           surface, brown base tucks under); falls back to the opaque bottom for
           non-green (snow/desert/galaxy) bushes.
Buddy foot fraction is read from assets/trail-buddies/<name>_walking_optimized.webp.
"""

from PIL import Image
import numpy as np
import os
import pathlib

ROOT = str(pathlib.Path(__file__).resolve().parents[4])
BIOME_DIR = {
    "forest": "Forest",
    "beach": "Beach",
    "desert": "Desert",
    "volcano": "Volcano",
    "snow": "Snow",
    "canyon": "Canyon",
    "northern": "Northern",
    "galaxy": "Galaxy",
}
GROUND = [
    "regular_path",
    "mossy_jungl_path",
    "grassy_path",
    "damp_moss_path",
    "flower_jungl_path",
    "stones_pebbles_path",
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
BUDDIES = ["fox", "deer", "wolf", "nora", "bear", "lion"]
COV = 0.30


def load(b, n):
    for e in (".webp", ".png"):
        p = f"{ROOT}/assets/Background_animations/{BIOME_DIR[b]}/nine_layer/{n}{e}"
        if os.path.exists(p):
            return np.asarray(Image.open(p).convert("RGBA"))
    raise FileNotFoundError(f"{b}/{n}")


def crest(im):
    rc = (im[:, :, 3] > 40).mean(axis=1)
    s = np.where(rc >= COV)[0]
    return round(float(s[0] / im.shape[0]), 3) if len(s) else 0.5


def bot(im):
    rc = (im[:, :, 3] > 40).mean(axis=1)
    s = np.where(rc >= COV)[0]
    return round(float(s[-1] / im.shape[0]), 3) if len(s) else 0.99


def solidw(im):
    al = im[:, :, 3] > 40
    H, W = al.shape
    rows = np.where(al.mean(axis=1) >= COV)[0]
    if len(rows) == 0:
        return 1.0
    cc = al[rows[0] : rows[-1] + 1].mean(axis=0)
    s = np.where(cc >= 0.85)[0]
    return round(float((s[-1] - s[0]) / W), 3) if len(s) else 0.85


def greenbottom(im):
    H = im.shape[0]
    b = bot(im)
    for y in range(H - 1, -1, -1):
        row = im[y]
        op = row[:, 3] > 120
        if op.sum() < im.shape[1] * 0.08:
            continue
        r, g, bl = (
            row[op, 0].astype(int),
            row[op, 1].astype(int),
            row[op, 2].astype(int),
        )
        if ((g > r + 8) & (g > bl)).mean() > 0.45:
            gb = round(y / H, 3)
            return gb if gb >= 0.80 else b
    return b


def arr(vals):
    return "[" + ", ".join(f"{x:.3f}" for x in vals) + "]"


L = [
    "/**",
    " * 9-Layer parallax geometry - AUTO-MEASURED (alpha-scan of nine_layer frames).",
    " * Regenerate with .claude/skills/parallax-placement/scripts/measure_geometry.py",
    " * groundCrest/Bottom: path top/opaque-bottom fraction. groundSolidWidth: solid-centre",
    " *   fraction (>=85% column coverage) used as the tile stride so tapered path tips overlap",
    " *   their neighbours (no blue-sky gap). treeBase: tree base. bushGreenBottom: bottom of the",
    " *   green foliage so bushes plant the green on the surface and tuck the brown base under.",
    " */",
    "import { NineLayerBiome } from './nineLayerAssets';",
    "",
    "export const SURFACE_FRAC = 0.82;",
    "",
    "export const GROUND_OVERSHOOT = 0.06;",
    "",
    "export const PLANT_DEPTH = 0.25;",
    "",
    "export const PLANT_SURFACE_FRAC =",
    "  SURFACE_FRAC + PLANT_DEPTH * (1 - SURFACE_FRAC + GROUND_OVERSHOOT);",
    "",
    "export interface BiomeGeometry {",
    "  groundCrest: number[];",
    "  groundBottom: number[];",
    "  groundSolidWidth: number[];",
    "  treeBase: number[];",
    "  bushGreenBottom: number[];",
    "}",
    "",
    "export const NINE_LAYER_GEOMETRY: Record<NineLayerBiome, BiomeGeometry> = {",
]
for b in BIOME_DIR:
    L += [
        f"  {b}: {{",
        f"    groundCrest: {arr([crest(load(b, v)) for v in GROUND])},",
        f"    groundBottom: {arr([bot(load(b, v)) for v in GROUND])},",
        f"    groundSolidWidth: {arr([solidw(load(b, v)) for v in GROUND])},",
        f"    treeBase: {arr([bot(load(b, v)) for v in TREES])},",
        f"    bushGreenBottom: {arr([greenbottom(load(b, v)) for v in BUSHES])},",
        "  },",
    ]
L += ["};", "", "export const BUDDY_FOOT_FRAC: Record<string, number> = {"]
for bd in BUDDIES:
    a = np.asarray(
        Image.open(f"{ROOT}/assets/trail-buddies/{bd}_walking_optimized.webp").convert(
            "RGBA"
        )
    )[:, :200, :]
    rc = (a[:, :, 3] > 40).mean(axis=1)
    s = np.where(rc >= 0.05)[0]
    L.append(f"  {bd}: {round(float(s[-1] / 200), 3)},")
L += ["};", "export const DEFAULT_FOOT_FRAC = 0.94;", ""]
out = f"{ROOT}/src/config/nineLayerGeometry.ts"
open(out, "w").write("\n".join(L))
print(f"wrote {out}")
