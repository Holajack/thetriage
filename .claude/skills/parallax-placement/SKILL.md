---
name: parallax-placement
description: Place and verify the 9-layer biome parallax (path, trees, bushes, buddy) when art/sprites/geometry change. Re-measures geometry from frames and renders app-faithful previews without a device build. Trigger when new background or sprite images arrive, a biome looks wrong (floating/clipping/blue gaps/no path), or after editing NineLayerParallax.
---

# Parallax Placement

How the 9-layer biome parallax positions every layer, and how to keep placements
correct when art changes. The renderer is `src/components/NineLayerParallax.tsx`;
the measured geometry lives in `src/config/nineLayerGeometry.ts`.

## When to use

- New / regenerated **path, tree, bush, mountain, or buddy** art.
- A biome looks wrong: animal floating, trees not meeting the ground, bushes too
  high, blue showing between tiled path copies, or "no path / just the scene".
- After changing `BIOME_LAYERS` or the embed constants.

## The placement model (the "embed" model)

Everything is fractional of screen height `H`, so it scales to any device.

- `SURFACE_FRAC = 0.82` — the **path crest** (grass-top) sits here.
- `GROUND_OVERSHOOT = 0.06` — the path's opaque bottom is pushed to `1.06·H`
  (off-screen) so the gappy underside never shows; the solid slab fills to the
  screen bottom. No blue below the path.
- `PLANT_DEPTH = 0.25` → `plantY = 0.82·H + 0.25·(0.24·H) ≈ 0.88·H` — the **dirt
  line**. Trees, bushes and the buddy plant here, _behind_ the path, so their
  bases tuck under the path crest and they look grown-in, not floating.

Each scrolling layer is **anchored**: `anchorFracs[i]` (a frame-internal fraction
0=top…1=bottom of the subject's base) is positioned on a baseline regardless of
the frame's transparent padding:

- **Ground**: `groundCrest` anchored at `SURFACE_FRAC·H`; scaled so its band fills
  `1−SURFACE_FRAC+GROUND_OVERSHOOT`.
- **Trees**: `treeBase` (opaque bottom) anchored at `plantY`.
- **Bushes**: `bushGreenBottom` (bottom of the GREEN foliage) anchored at `plantY`
  — green shows, brown base tucks under.
- **Buddy**: stands on `PLANT_SURFACE_FRAC·H` using `BUDDY_FOOT_FRAC[type]`
  (in `ParallaxForestBackground.tsx`).

**Tiling / no blue gap**: a path's tile stride is its `groundSolidWidth` (the
≥85%-coverage solid centre), not its full width. Tapered "island" tips then
overlap the neighbour instead of leaving a transparent (blue) gap. Damp-type
tapered paths need this; full-width paths are unaffected.

## Procedure when art changes

1. **Drop the new frames** into `assets/Background_animations/<Biome>/nine_layer/`
   as `.webp` (the app loads webp; PNGs there are git/eas-ignored). Filenames must
   match the canonical slots (e.g. `regular_path`, `foreground_tall_tree`,
   `tall_bush`, `mid_jungle_layer`, `sky_gradient`, `sun`).
2. **Re-measure geometry** — this rewrites `nineLayerGeometry.ts`:
   ```
   python3 .claude/skills/parallax-placement/scripts/measure_geometry.py
   ```
   (Idempotent — unchanged art yields identical values. `npx prettier --write`
   the file afterward to match repo style.)
3. **Verify visually, no device needed** — renders app-faithful previews to
   `.tmp/render/scene_<biome>.png` (6 path variants each):
   ```
   python3 .claude/skills/parallax-placement/scripts/render_scene.py <biome>
   ```
   The replica matches the live app pixel-for-pixel (validated on forest). Read
   the PNG and check: path crest on the surface line, solid fill to the bottom,
   trees/bushes emerging from the path, buddy on the dirt, no blue between tiles.
4. **If a whole layer sits wrong** (too high/low/big), adjust that biome's entry
   in `BIOME_LAYERS` in `NineLayerParallax.tsx` **and** mirror it in
   `render_scene.py`'s `LAYERS` dict, then re-render. Geometry handles per-frame
   base alignment; `BIOME_LAYERS` handles per-layer scale/offset.
5. `npx tsc --noEmit --skipLibCheck` and commit.

## Regenerating path/biome art (parallax-theme-studio)

Generator: `~/App Development/parallax-theme-studio/scripts/generate-nine-layer.ts`

```
node --experimental-strip-types scripts/generate-nine-layer.ts <Biome> --only <variantId>
```

Writes PNGs into this repo's asset dir → convert to webp (PIL `save('…','WEBP',quality=85,method=6)`) and delete the PNGs.

**Lesson (Beach):** the ground prompt must use a per-biome SURFACE material, not
the full scene description — otherwise the whole scene (ocean, palms, horizon)
leaks into the path strip and renders a scene instead of a trail. See
`GROUND_BIOME_SURFACE` in the generator. Test ONE variant before regenerating all 6.

## Path rotation

One continuous path per session; it rotates to the next variant only when a
session completes (`src/utils/pathRotation.ts`, wired in `StudySessionScreen`).

## Files

- `src/components/NineLayerParallax.tsx` — renderer + `BIOME_LAYERS`.
- `src/config/nineLayerGeometry.ts` — measured geometry (generated).
- `src/components/ParallaxForestBackground.tsx` — buddy grounding.
- `scripts/measure_geometry.py`, `scripts/render_scene.py` — keep their constants
  in sync with the two files above.
