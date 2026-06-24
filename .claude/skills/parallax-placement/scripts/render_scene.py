#!/usr/bin/env python3
"""Faithful PIL replica of src/components/NineLayerParallax.tsx.

Renders a biome's 9-layer parallax scene per ground variant using the EXACT
same constants, embed math, and BIOME_LAYERS as the app — so you can SEE where
trees/bushes/path/buddy land WITHOUT a device build. Verified to match the live
app pixel-for-pixel on the known-good forest biome.

Usage:
  python3 render_scene.py [biome ...]          # default: all biomes
  python3 render_scene.py beach snow            # specific biomes
Outputs .tmp/render/scene_<biome>.png (6 ground variants side by side).

If you change geometry, assets, or BIOME_LAYERS, re-run this and eyeball the
result. Keep these constants in sync with NineLayerParallax.tsx / nineLayerGeometry.ts.
"""

from PIL import Image
import numpy as np
import os
import sys
import pathlib

ROOT = str(pathlib.Path(__file__).resolve().parents[4])  # repo root
W, H = 393, 852  # iPhone logical points (proportional on any device)
ASPECT = 1024 / 1536  # FRAME_ASPECT
SURF, OVER, PLANT_DEPTH, TILE = (
    0.82,
    0.06,
    0.25,
    30,
)  # SURFACE_FRAC / GROUND_OVERSHOOT / PLANT_DEPTH / TILE_OVERLAP
COV = 0.30

DIR = {
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
CLOUDS = [
    "fluffy_cloud",
    "dense_layered_cloud",
    "small_cloud",
    "thin_wisp_cloud",
    "wide_cloud",
]

# BIOME_LAYERS mirror of NineLayerParallax.tsx — each layer: (scale, offsetY, offsetX)
LAYERS = {
    "forest": {
        "ground": (1.18, 0.03, 0.0),
        "bushes": (0.30, -0.11, -0.09),
        "trees": (0.52, -0.07, 0.0),
        "midground": (1.0, 0.14, 0.0),
        "midMountains": (1.0, 0.0, 0.0),
        "farMountains": (1.0, -0.01, 0.0),
        "clouds": (0.57, -0.46, 0.0),
        "sun": (0.40, -0.62, 0.0),
    },
    "beach": {
        "ground": (1.15, 0.05, 0.0),
        "bushes": (0.45, -0.05, -0.09),
        "trees": (0.58, -0.08, 0.0),
        "midground": (1.0, 0.30, 0.0),
        "midMountains": (1.0, 0.14, 0.0),
        "farMountains": (1.0, 0.02, 0.0),
        "clouds": (0.57, -0.39, 0.0),
        "sun": (0.40, -0.52, 0.0),
    },
    "desert": {
        "ground": (1.18, 0.02, 0.0),
        "bushes": (0.50, -0.10, -0.09),
        "trees": (0.68, -0.11, 0.07),
        "midground": (1.04, 0.18, 0.0),
        "midMountains": (1.13, 0.15, 0.0),
        "farMountains": (1.15, -0.10, 0.0),
        "clouds": (0.65, -0.40, 0.0),
        "sun": (0.45, -0.58, 0.0),
    },
    "volcano": {
        "ground": (1.18, 0.07, 0.0),
        "bushes": (0.49, -0.17, -0.09),
        "trees": (0.67, -0.15, 0.03),
        "midground": (1.0, 0.21, 0.0),
        "midMountains": (1.0, 0.06, 0.0),
        "farMountains": (1.0, -0.03, 0.0),
        "clouds": (0.70, -0.39, 0.0),
        "sun": (0.39, -0.62, 0.0),
    },
    "snow": {
        "ground": (1.18, 0.07, 0.0),
        "bushes": (0.49, -0.10, -0.13),
        "trees": (0.59, -0.14, 0.03),
        "midground": (1.0, 0.02, 0.0),
        "midMountains": (1.0, -0.17, 0.0),
        "farMountains": (1.01, -0.05, 0.0),
        "clouds": (0.65, -0.44, 0.0),
        "sun": (0.39, -0.66, 0.0),
    },
    "canyon": {
        "ground": (1.18, 0.03, 0.0),
        "bushes": (0.50, -0.07, -0.09),
        "trees": (0.54, -0.15, 0.07),
        "midground": (1.04, 0.08, 0.0),
        "midMountains": (1.0, 0.09, 0.0),
        "farMountains": (1.01, 0.0, 0.0),
        "clouds": (0.82, -0.29, 0.0),
        "sun": (0.44, -0.54, 0.0),
    },
    "northern": {
        "ground": (1.18, 0.05, 0.0),
        "bushes": (0.50, -0.07, -0.09),
        "trees": (0.63, -0.11, 0.07),
        "midground": (1.04, 0.21, 0.0),
        "midMountains": (1.0, 0.05, 0.0),
        "farMountains": (1.01, -0.07, 0.0),
        "clouds": (0.65, -0.43, 0.0),
        "sun": (0.47, -0.58, 0.0),
    },
    "galaxy": {
        "ground": (1.18, 0.11, 0.0),
        "bushes": (0.50, -0.07, -0.09),
        "trees": (0.68, -0.12, 0.07),
        "midground": (1.04, 0.19, 0.0),
        "midMountains": (1.0, 0.14, 0.0),
        "farMountains": (1.01, 0.02, 0.0),
        "clouds": (0.65, -0.43, 0.0),
        "sun": (0.45, -0.53, 0.0),
    },
}


def load(b, n):
    for e in (".webp", ".png"):
        p = f"{ROOT}/assets/Background_animations/{DIR[b]}/nine_layer/{n}{e}"
        if os.path.exists(p):
            return Image.open(p).convert("RGBA")
    return None


def crest(im):
    rc = (np.asarray(im)[:, :, 3] > 40).mean(axis=1)
    s = np.where(rc >= COV)[0]
    return float(s[0] / im.height) if len(s) else 0.5


def bot(im):
    rc = (np.asarray(im)[:, :, 3] > 40).mean(axis=1)
    s = np.where(rc >= COV)[0]
    return float(s[-1] / im.height) if len(s) else 0.99


def greenb(
    im,
):  # lowest predominantly-green row (bush green-bottom); fallback to opaque bottom
    a = np.asarray(im)
    Hh = im.height
    b = bot(im)
    for y in range(Hh - 1, -1, -1):
        row = a[y]
        op = row[:, 3] > 120
        if op.sum() < im.width * 0.08:
            continue
        r, g, bl = (
            row[op, 0].astype(int),
            row[op, 1].astype(int),
            row[op, 2].astype(int),
        )
        if ((g > r + 8) & (g > bl)).mean() > 0.45:
            gb = y / Hh
            return gb if gb >= 0.80 else b
    return b


def solidw(im):  # solid-centre fraction (>=85% column coverage) = tile stride basis
    al = np.asarray(im)[:, :, 3] > 40
    rows = np.where(al.mean(axis=1) >= COV)[0]
    if len(rows) == 0:
        return 1.0
    cc = al[rows[0] : rows[-1] + 1].mean(axis=0)
    s = np.where(cc >= 0.85)[0]
    return float((s[-1] - s[0]) / im.width) if len(s) else 0.85


def cover(cv, im):  # resizeMode=cover
    s = max(W / im.width, H / im.height)
    r = im.resize((round(im.width * s), round(im.height * s)))
    cv.alpha_composite(r, ((W - r.width) // 2, (H - r.height) // 2))


def static_layer(
    cv, im, scale, offY, offX
):  # StaticLayer: bottom anchored at (offsetY+1)*H
    sH = round(H * scale)
    sW = max(round(H * ASPECT * scale), W + 2)
    cv.alpha_composite(im.resize((sW, sH)), (round(W * offX), round(H * offY) + H - sH))


def scroll_row(
    cv, frames, scale, offY, offX, anchor=None, baseline=None, solidFrac=1.0
):
    sFW = round(H * ASPECT * scale)
    sH = round(H * scale)
    stride = round(solidFrac * sFW) - TILE
    vtop = (
        (baseline - sH)
        if (anchor is not None and baseline is not None)
        else (round(H * offY) + H - sH)
    )
    rs = [f.resize((sFW, sH)) for f in frames]
    x = round(W * offX) - sFW
    i = 0  # start one tile left so the left edge is covered (as during scroll)
    while x < W:
        dy = (
            round((1 - (anchor[i % len(anchor)] if anchor else 1)) * sH)
            if anchor is not None
            else 0
        )
        cv.alpha_composite(rs[i % len(rs)], (int(x), int(vtop + dy)))
        x += stride
        i += 1


def sun_layer(cv, im, scale):
    sH = round(H * scale)
    r = im.copy()
    r.thumbnail((round(sH * ASPECT), sH))
    cv.alpha_composite(r, ((W - r.width) // 2, round(H * 0.06)))


def scene(b, vi):
    L = LAYERS[b]
    cv = Image.new("RGBA", (W, H), (0, 0, 0, 255))
    cover(cv, load(b, "sky_gradient"))
    static_layer(cv, load(b, "far_mountain_range"), *L["farMountains"])
    static_layer(cv, load(b, "mid_mountain_range"), *L["midMountains"])
    scroll_row(cv, [load(b, "mid_jungle_layer")], *L["midground"])
    baselineY = round(SURF * H)
    plantY = baselineY + round(PLANT_DEPTH * (1 - SURF + OVER) * H)
    scroll_row(
        cv,
        [load(b, t) for t in TREES],
        *L["trees"],
        anchor=[bot(load(b, t)) for t in TREES],
        baseline=plantY,
    )
    scroll_row(
        cv,
        [load(b, x) for x in BUSHES],
        *L["bushes"],
        anchor=[greenb(load(b, x)) for x in BUSHES],
        baseline=plantY,
    )
    g = load(b, GROUND[vi])
    band = max(0.05, bot(g) - crest(g))
    scroll_row(
        cv,
        [g],
        (1 - SURF + OVER) / band,
        L["ground"][1],
        L["ground"][2],
        anchor=[crest(g)],
        baseline=baselineY,
        solidFrac=solidw(g),
    )
    sun_layer(cv, load(b, "sun"), L["sun"][0])
    scroll_row(cv, [load(b, c) for c in CLOUDS], *L["clouds"])
    return cv


def strip(b):
    gap = 6
    s = Image.new("RGB", (W * 6 + gap * 7, H + gap * 2), (30, 30, 30))
    for i in range(6):
        s.paste(scene(b, i).convert("RGB"), (gap + i * (W + gap), gap))
    out = f"{ROOT}/.tmp/render/scene_{b}.png"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    s.save(out)
    print(f"wrote {out}  (cols: {', '.join(GROUND)})")


if __name__ == "__main__":
    for b in sys.argv[1:] or list(DIR):
        strip(b)
