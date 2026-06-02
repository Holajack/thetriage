# HikeWise + Parallax Theme Studio — Final Review & Research Report

_Prepared for: Jacken (solo founder) · Date: 2026-06-01_
_Scope: code-bloat audit, App Store launch readiness, parallax art-quality root-cause analysis, and a concrete anti-AI-slop generation stack._
_Method: 15-agent workflow — 4 code/launch auditors over both repos + 5 web-research lanes, each adversarially fact-checked, then synthesized. Corrections from verification are folded in and flagged in §8._

---

## 1. TL;DR

- **Bloat is real but mostly cosmetic, not bundle-fatal.** ~28% of the _repo_ is non-shipping cruft. Inside the actual app, only ~4.5% of `src/` is dead code (one whole dead Nora screen + 7 abandoned 3D-brain components). The bigger sins are repo hygiene: 70 session-log `.md` files, 28 dead Supabase `.sql` files, 26 ad-hoc test scripts, and ~65MB of redundant binary zips sitting next to their extracted folders.
- **HikeWise is ~65% launch-ready** — solid bones (EAS profiles, RevenueCat wired, live privacy policy, real usage strings) but **not submittable today**.
- **The single biggest launch blocker is a config split-brain:** a committed native `ios/` directory (19 tracked files, verified) overrides `app.json`, so EAS would ship **v1.7.0 build 14** instead of your intended 2.0.0/16, dropping all your usage-string/privacy/encryption work.
- **Zero App Store screenshots exist** (all directories empty) and `ITSAppUsesNonExemptEncryption` is missing — both hard Apple blockers.
- **CORRECTION to the original briefing:** the `AuthKey_X52658YN2G.p8` is **NOT committed**. Verified: it sits untracked in the working tree, matched by `*.p8` at `.gitignore:74`, never in `git ls-files` or history. This is a foot-gun to clean up, **not a credential leak**. No secrets are in git history.
- **The "AI slop" parallax feel has four named root causes, all fixable:** (1) no seed locking, (2) style is prompt-text only (no LoRA / style-reference), (3) transparency is _requested-then-validated_ rather than produced by real matting, (4) no true pixel-art post-processing. The border-only alpha check is also too weak, and 9-layer mode anchors every biome to fixed _jungle_ references.
- **The single best move to fix the slop:** train **one FLUX.1-dev style LoRA** (`ostris/flux-dev-lora-trainer`, ~$2) and generate every layer with **a locked per-scene seed + a shared style reference**, then run a **real matting pass (BiRefNet/ToonOut → PyMatting foreground decontamination)** and a **deterministic pixel-art post-pipeline (PixelOE k-centroid → grid-snap → locked Lospec master palette)**. That combination is what turns "AI cosplaying pixel art" into intentional craft.
- **For the studio-as-SaaS:** keep Next.js + Convex + Clerk + Stripe; move generation off synchronous Replicate onto a **Convex Workflow + Workpool** fan-out into **fal.ai's async queue** (pay-per-success), with **Stripe prepaid Credits** for billing and **server-side** credit deduction (currently bypassable client-side).

---

## 2. Code Bloat Verdict

**Verdict: ~28% of the repo is non-shipping cruft.** Crucially, distinguish _repo_ bloat from _bundle_ bloat — most of the 28% never reaches users; it inflates clone size and, more importantly, burns context in every future AI session.

### Basis

- Shipped app code (`src/` TS/TSX): **~70,797 lines**.
- Dead `src/` code: NoraScreen.tsx (1,486) + 6 dead brain components (1,706) ≈ **~3,200 lines (~4.5% of src)**.
- Root non-code that ships nothing: **70 markdown logs (12,373 lines) + 28 Supabase `.sql` (2,328) + 26 test/verify scripts (2,606)** ≈ 17,000 lines (~21% against the 82k src+convex total).
- Asset binary bloat: **~65MB of redundant zips** (52MB background zips + 8.3MB trail-buddy zip + 5.2MB "Desert 2") coexisting with their extracted folders.

### The three buckets

1. **Dead / cruft (ships or pollutes):** dead source files, 70 `.md` logs, 28 `.sql`, 26 scripts, redundant zips, and two ever-deployed Convex seed files (`seedAdminUser.ts` 918 lines, `quizSeed.ts` 898 lines) callable in production.
2. **Dev tooling (doesn't ship, bloats repo):** `execution/` (51 files), `directives/` (26), `maestro/` (17), `scripts/` (33) — intentional, ~1.5MB. Leave mostly alone.
3. **Oversized-but-active (refactor, don't delete):** monolith screens led by `StudySessionScreen.tsx` at **3,477 lines** (~10× the CLAUDE.md 300-line ceiling).

### Biggest offenders

| Path                                                                | Size         | Bucket               | Action                                             |
| ------------------------------------------------------------------- | ------------ | -------------------- | -------------------------------------------------- |
| `src/screens/main/NoraScreen.tsx`                                   | 1,486 lines  | Dead (shipped)       | **Delete** — nav imports `NoraScreenNew` only      |
| 6 brain components (Realistic/Simple/TestCube/Real3D/Real2D/Lottie) | 1,706 lines  | Dead (shipped)       | **Delete** — only `OBJBrain3D` is consumed         |
| Root `*.md` session logs (70)                                       | 12,373 lines | Cruft                | **Delete** (keep CLAUDE/README/GEMINI)             |
| Root `*.sql` (28)                                                   | 2,328 lines  | Cruft (Supabase-era) | **Delete**                                         |
| Root `test-*/verify*/check*` (26)                                   | 2,606 lines  | Cruft                | **Delete**                                         |
| `Background_animations/*.zip` (7)                                   | ~52MB        | Redundant binary     | **Delete** (extracted folders exist)               |
| `trail-buddies-spritesheets.zip` + `Desert 2/`                      | ~13.5MB      | Redundant binary     | **Delete**                                         |
| `StudySessionScreen.tsx`                                            | 3,477 lines  | Oversized-active     | **Split** into Timer/TaskList/Controls/BreakPrompt |
| `convex/seedAdminUser.ts` / `quizSeed.ts`                           | 1,816 lines  | Dev seed deployed    | **Guard behind `IS_DEV`**                          |

**Unused deps to drop:** `react-native-chart-kit` (zero imports, confirmed), `react-native-localize` (superseded by `expo-localization`), `dotenv` (not used at RN runtime). `react-native-fs` is only a Metro shim — verify before removing. The 11 Node polyfills are **legitimately needed** for the Convex SDK + svix; do not touch. `react-native-paper` (~2.5MB) is pulled in only for MD3 theme color tokens in `theme.ts` — replaceable with inlined constants. Both `@react-navigation/stack` (legacy JS) and `native-stack` are installed; migrating off the legacy one improves animation perf.

### Ranked cleanup plan

1. **Delete dead source** (NoraScreen + 6 brain files) — zero risk, immediate. Also unblocks auditing `expo-gl`/`expo-three`.
2. **Delete root `.md`/`.sql`/test-script cruft** — biggest AI-context win.
3. **Delete redundant zips + Desert 2** — ~65MB reclaimed, zero app impact.
4. **Remove `react-native-chart-kit`** (and audit the other unused deps).
5. **Guard the Convex seed mutations** so demo/reset data can't be called in prod.
6. **Split `StudySessionScreen.tsx`** (highest-complexity file).

### Security item (corrected)

The committed-credential claim is **refuted**. `AuthKey_X52658YN2G.p8` is **untracked** and gitignored (`*.p8`, line 74), never in history — verified this session. It is a **near-miss hygiene risk**, not a leak: it's a private ASC signing key loose at repo root, _and a different key than `eas.json` actually uses_ (`~/credentials/AuthKey_HKFQXFLWA5.p8`). **Action: move the stray key into `~/credentials/` and delete it from the working tree.** `.env.local` is correctly untracked and not referenced in the client bundle.

---

## 3. HikeWise App Store Launch Checklist

**Readiness: ~65%.** Engineering is largely done; remaining work is metadata/asset finishing plus reconciling config sources of truth. (`com.hikewise.app`, ASC App ID 6756673693.)

### CRITICAL blockers (fix before anything else)

1. **Committed native `ios/` overrides `app.json` (stale version).** `ios/` is tracked (19 files, verified). With a native project present, EAS builds from it and **skips prebuild**, so `app.json` is ignored. `ios/HikeWise/Info.plist` = **1.7.0 / build 14**; `app.json` = **2.0.0 / 16**. You'd ship a lower/duplicate build → upload rejection, and lose all usage-string/privacy/encryption work in `app.json`. **Pick ONE source of truth.**
2. **Zero store screenshots.** All `store-assets/screenshots/*` dirs contain 0 images. Apple requires ≥1 each at 6.7" and 5.5". `apple_submission_preflight.py` treats this as a hard FAIL.
3. **Missing `ITSAppUsesNonExemptEncryption`** in both `app.json` and native Info.plist → every build held on the export-compliance question.

### Checklist

| Item                                         | Status                               | Action                                                             |
| -------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------ |
| EAS profiles + ASC submit config             | ✅ Done                              | —                                                                  |
| Bundle id, scheme, icon, usage strings       | ✅ Done (in app.json)                | Ensure they actually apply (see blocker #1)                        |
| Privacy manifest (`PrivacyInfo.xcprivacy`)   | ✅ Present                           | Verify matches nutrition labels                                    |
| RevenueCat client (purchase/restore/paywall) | ✅ Fully wired                       | —                                                                  |
| Privacy policy live at hikewise.app/privacy  | ✅ Verified live                     | —                                                                  |
| Secrets hygiene                              | ✅ Clean (no leaks)                  | Move stray `.p8` out of tree                                       |
| Config source of truth                       | ❌ Split-brain                       | Delete/gitignore `ios/` OR hand-edit native plist                  |
| App version/build consistency                | ❌ 3 disagree (1.7.0/2.0.0/14/15/16) | Align app.json, native plist, store-config, ASC                    |
| Store screenshots                            | ❌ None exist                        | Run/repair `apple_screenshot_generator.py`                         |
| `ITSAppUsesNonExemptEncryption`              | ❌ Missing                           | Add `= false` to the chosen config                                 |
| IAP catalog                                  | ⚠️ Mismatch                          | Scripts define 3 tiers (incl. Basic); app ships only Premium/Elite |
| IAP products actually created in ASC         | ⚠️ Unconfirmed                       | Verify in ASC + RevenueCat dashboards (no run logs found)          |
| Google service account (Android)             | ⚠️ Missing file                      | Needed only for Play track, not iOS launch                         |
| `console.log` count (~349)                   | ⚠️ CLAUDE.md ban                     | Cleanup, not an Apple blocker                                      |

### Remaining work, ordered by effort

- **S:** Add encryption key; move stray `.p8`; run `apple_submission_preflight.py --strict`; verify Android service account (defer).
- **M:** Choose config source of truth + align all version fields; generate & place screenshots; reconcile the 2-tier vs 3-tier IAP catalog (then confirm products exist in ASC/RevenueCat); complete the ASC listing (keywords, nutrition labels, age-rating questionnaire).

---

## 4. Parallax Pipeline Assessment

### Architecture

**Studio (`parallax-theme-studio`):** Next.js 16 + React 19 + Clerk + Convex + Stripe + Replicate (`gpt-image-1.5`/`gpt-image-1`/nano-banana). Three modes: preset 4-layer (edits fixed Forest source PNGs), freeform 4-layer (pure text-to-image), and 9-layer (img2img guided by fixed **jungle** reference PNGs). Provider orchestration fires Replicate calls in parallel (max 5) then polls; each layer gets up to 3 attempts. `checkTransparency` samples only the **1px border ring** (fails if >2% opaque); `applySourceAlphaMask` composites through the source PNG's alpha when a source exists. Output: `output/runs/<id>/generated/*.png` + `manifest.json`.

**In-app rendering (HikeWise):** `ParallaxForestBackground.tsx` stacks 4–5 absolute Views. Scrolling layers use **reanimated worklets on the UI thread (correct, 60fps)** with two side-by-side image copies and modulo reset. Sprite frames, however, run on the **JS thread via `setInterval` + `setState` at ~14fps** — ~14 re-renders/sec for the entire session. All 40 background PNGs + 12 spritesheets (~77.6MB) are `require()`d at module scope, so **every user bundles every trail and every buddy** regardless of ownership.

**Asset pipeline (studio → app):** Confirmed manual copy — HikeWise's `Canyon/manifest.json` and `Jungle/manifest.json` are **byte-for-byte studio run manifests** (same runId UUIDs, same `replicate_openai_gpt_image_1_5` provider, same `outputPath` strings still pointing back at the studio's `output/runs`). No transform, no rename, no sync script; absolute studio paths leak into the app, and naming drifts (Aurora→Northern, Galactic→Galaxy).

### What's genuinely good

- **Best-in-class prompt engineering:** per-biome/per-layer/per-time-of-day guardrails with an explicit anti-morphing rule ("no tree-shaped silhouettes filled with sand"). This is the strongest part of the codebase.
- Two-stage automated QA (pixel transparency validator + content-presence check).
- `applySourceAlphaMask` salvages failing preset layers without re-generating.
- Clean lib/ separation, Zod-validated manifests, resilient provider fallbacks, proportional credit refunds.

### Root causes of the "AI-generated feel"

1. **No seed locking** — every layer uses an independent random seed, so sky/mountain/tree/ground of one scene drift in palette, lighting angle, and line weight, and nothing is reproducible. _Biggest single cause._
2. **Style is prompt-text only** — `ART_STYLE_PROMPTS` ("think Stardew Valley") with no shared style-reference image, no LoRA, no fine-tune. "Pixel art" is reinterpreted per layer **and** per theme.
3. **Transparency is requested-then-validated, not matted** — freeform mode explicitly _accepts marginal output_ (runs.ts ~948-951), so halos/fringe ship.
4. **No true pixel-art post-processing** — no quantize, no nearest-neighbor grid snap → anti-aliased, soft, high-color output that reads as "AI imitating pixel art."

**Secondary:** the border-only alpha check passes images with a fully opaque _interior_ fill; 9-layer mode forces all biomes through jungle references; inter-layer horizon/scale alignment isn't enforced; **credit deduction is client-side and bypassable**; the admin allow-list (`jackenhaiti@gmail.com`, 999999 credits) is hardcoded; the dead OpenAI-direct path uses `any` casts (violating your own CLAUDE.md).

---

## 5. The Anti-AI-Slop Recommendation (the heart of it)

The fix is a **deterministic pipeline**, not a better prompt. Layer four techniques in priority order: **trained style model > shared style-reference > seed lock > palette lock**, then a **real matting pass**, then **true pixel-art post-processing**.

### Step 0 — Lock ONE master palette (cross-theme cohesion)

Curate a palette on **Lospec** and fetch it by slug as the project's single source of truth:
`GET https://lospec.com/palette-list/{slug}.json` (e.g. `endesga-32`). Note: the API serves JSON/CSV only; GPL/ASE exports come from the palette web page. Every theme remaps to this — that's what makes the set look intentional.

### Step 1 — Train a style model (kills inter-theme drift)

`gpt-image-1.5` **cannot be style-fine-tuned**, which is why ~80 layers drift (it _does_ retain reference-image editing, so frame it as "no trainable style adapter," not "no consistency tooling"). Train **one FLUX.1-dev style LoRA** on 10–30 cohesive references:

- **`ostris/flux-dev-lora-trainer`** on Replicate — `https://replicate.com/ostris/flux-dev-lora-trainer/train` — **~$2 to train** (~1000 steps, 20–30 min).
- Inference: FLUX-dev on Replicate is **~$0.003–$0.04/img** depending on variant (schnell cheapest; the ~$0.025 figure is closer to fal's rate).
- ⚠️ **Use FLUX.1-dev, not "FLUX.2"** — FLUX.2 doesn't release until **Nov 2026** (future-dated; not available now).
- ⚠️ FLUX.1-dev is **non-commercial without a BFL license** — verify before shipping.

**Least-effort turnkey alternative:** **Scenario.gg** (purpose-built game-asset style training). Corrected pricing: **Free / Starter $15 / Pro $45 / Max $75 / Enterprise** (the old "$19/$99" figures are wrong). Its transparent-PNG capability is _likely_ but **unconfirmed** in official docs — verify directly. Not on Replicate.

### Step 2 — Lock the seed + feed a shared style reference

Pass **one per-scene base seed** into every layer's Replicate input (`seed`) — `gpt-image` has no seed parameter, which is itself a reason to move to FLUX. Store the seed in the manifest so good scenes are reproducible. Add the **same style-reference image** (per art style) to every layer via img2img at **0.3–0.5 denoise** / IP-Adapter so all layers share one art direction.

### Step 3 — Real transparency via matting (not prompt + validator)

Replace "prompt transparent bg + sharp border check + retry." Two tiers:

- **Primary — native RGBA generation:** **LayerDiffuse-Flux** (`FireRedTeam/LayerDiffuse-Flux`: `TransparentVAE.pth` + `layerlora.safetensors` on FLUX.1-dev) produces _true_ alpha in one pass — no background to remove, no halo. The original `lllyasviel/LayerDiffuse` (Apache-2.0, SDXL/SD1.5, 8GB VRAM) is the proven method; its paper reports **97% of users prefer native transparency over generate-then-matte**. Not a first-class Replicate model — self-host (ComfyUI: `huchenlei/ComfyUI-layerdiffuse`) or use **Runware's API** (`layerDiffuse: true`, FLUX-dev only).
- **Fallback — generate-then-cutout:** **ToonOut** (`MatteoKartoon/BiRefNet`, BiRefNet fine-tune for illustrated art, 95.3%→99.5% on _its own_ "Pixel Accuracy" metric) or **`men1scus/birefnet`** on Replicate (**~$0.0037/run, A100-80GB** — not T4; the T4 one is `851-labs/background-remover` at ~$0.00054/run). **Always finish with `pymatting` `estimate_foreground_cf`** (closed-form foreground estimation) — this is the actual root-cause fix for the colored halo that a sharp pixel-validator can never address.

_Notes:_ SAM2 gives only hard masks (needs a matting head — the relevant paper is **"Segment and Matte Anything"/SAMA, AAAI 2026**, not "SAM2-Matte"). BRIA RMBG-2.0 is turnkey (fal ~$0.018/img) but **non-commercial without a BRIA license** and photoreal-leaning.

### Step 4 — True pixel-art post-processing (for pixel/retro themes)

1. **PixelOE** (`KohakuBlueleaf/PixelOE`, **Apache-2.0**, pip `pixeloe` — latest is **0.1.4**) — contrast-aware outline expansion + **k-centroid** edge-preserving downscale to a true grid. The quality-defining step.
2. **Grid snap** if drift remains: `KennethJAllen/proper-pixel-art` (MIT, Hough → median spacing) or `Astropulse/pixeldetector` (MIT).
3. **Palette lock + dither:** **libimagequant** with the master palette as `liq_image_add_fixed_color` (sharp's high-level API can't pin a fixed palette), or **Aseprite CLI** headless: `aseprite -b in.png --palette master.gpl --color-mode indexed --dithering-algorithm ordered --dithering-matrix bayer8x8 --save-as out.png` (Aseprite CLI dither values are `none/ordered/old`).
4. **Crisp export** with your existing **sharp**: `resize(w*N, h*N, {kernel: sharp.kernel.nearest})` + `.png({ palette: true, colors: n, dither: 0 })`.

**AI-native shortcut for pixel themes:** **Retro Diffusion** (`retro-diffusion/rd-plus`, `rd-fast`, `rd-tile`, `rd-animation` on Replicate) is trained for grid-aligned limited-palette output and accepts an **input palette image** for locking + seamless tiling + background removal. _(Confirm per-image price on Replicate.)_ Avoid `WuZongWei6/Pixelization` for shipping — its LICENSE **strictly prohibits commercial use** (benchmark only).

### When to STOP fighting generation

- **Commission a pixel artist** for the handful of hero/identity scenes — AI+pipeline cannot reliably do deliberate cluster dithering or cross-set consistency. _(Budget per quote.)_
- **Buy curated CC0/royalty-free packs** (Kenney All-in-1 ~$19.95 CC0, CraftPix royalty-free, itch.io CC0) as a true-pixel **base**, then AI-generate only **variations** locked to the pack's palette. **Rule: AI+pipeline for volume/variations; humans/packs for hero/base.**

### Do-this path (one line)

**Train a FLUX.1-dev style LoRA → generate every layer with one locked seed + shared style ref → matting (LayerDiffuse-Flux native, else BiRefNet/ToonOut + PyMatting) → PixelOE k-centroid + grid-snap + Lospec master-palette lock → sharp nearest-neighbor export.**

---

## 6. Recommended Frameworks, Repos & Integrations

### (a) Studio SaaS backend

- **GPU/inference — primary:** **fal.ai** — `https://fal.ai/pricing` — pay **only for successful outputs**, fastest cold starts (1–10s), per-MP pricing. Native async queue + webhooks. Ideal for 4–9-image batches with retries.
- **GPU — cost-optimization target:** **RunPod Serverless** (worker-comfyui + FLUX) — `https://docs.runpod.io/serverless/pricing` — cheapest per image (~$0.004–0.006 FLUX.1-dev), scale-to-zero; cost is Docker build/push friction + 6–12s cold starts. Matches your existing `RUNPOD_RESEARCH.md`.
- **GPU — alternatives:** Modal (best DX, ~20–40% pricier than RunPod); Baseten (enterprise, overkill at launch); **Replicate** keep only as fallback (most expensive/slowest; Cloudflare acquisition announced Nov 17 2025, completed early 2026).
- **Job queue:** **Convex Workflow + Workpool** — `https://www.convex.dev/components/workflow` + `https://www.convex.dev/components/workpool` — durable resume, exponential-backoff retries, transactional enqueue, real-time UI progress. Respect the **10-min action cap** by fanning images across the workpool, not blocking one action. **Don't add Inngest/Trigger.dev/QStash** unless you outgrow Convex.
- **Billing:** **Stripe prepaid Credits + Billing Meters** — `https://stripe.com/blog/introducing-credits-for-usage-based-billing` — Stripe explicitly recommends credits for high-COGS AI. **Move deduction server-side** (currently client-side and bypassable). Reference patterns: `adrianhajdin/ai_saas_app` (credit-burndown ledger), `mickasmt/next-saas-stripe-starter` (Stripe plumbing).

### (b) In-app RN parallax rendering

- **`@shopify/react-native-skia`** — `https://shopify.github.io/react-native-skia/docs/shapes/atlas/` — one Skia Canvas per theme + the **Atlas** API (`drawAtlas`) for spritesheets. ⚠️ Documented **~8150px texture-width limit** (issue #2907) → split very wide sheets or get silent blank rendering.
- **`react-native-reanimated` `useFrameCallback`** — drive the parallax offset on the UI thread; **memoize the worklet** to avoid recreation each render.
- **Move sprite frames off the JS thread:** replace `setInterval`+`setState` with `withRepeat(withTiming(..., { easing: Easing.steps(N, true) }))` + `useAnimatedStyle` → eliminates ~14 JS re-renders/sec.
- **On-demand theme download:** `expo-file-system` — ⚠️ `downloadAsync` is **legacy** in SDK 52+; use the new `File.downloadFileAsync` (or `expo-file-system/legacy`). Keeps the binary small vs the current ~77.6MB unconditional bundle.
- **`expo-image`** + **WebP** — a 3MB PNG → ~400–700KB; gets memory/disk caching + blurhash for free.

---

## 7. Prioritized Action Plan

### (A) Launch HikeWise now

1. **Decide the config source of truth.** Recommended: delete/gitignore `ios/`, let `app.json` + prebuild drive; add `ITSAppUsesNonExemptEncryption=false` to `ios.infoPlist`. _(M)_
2. **Align all version fields** to one launch version (app.json, native plist if kept, store-config.json, ASC). _(S — quick win once #1 is decided.)_
3. **Generate & place screenshots** (6.7" + 5.5" min) via `apple_screenshot_generator.py`; re-run preflight. _(M)_
4. **Reconcile IAP catalog** to 2 tiers (remove Basic from setup scripts) and **confirm products exist** in ASC + RevenueCat. _(M)_
5. **Move the stray `.p8`** into `~/credentials/`; run `apple_submission_preflight.py --strict`. _(S — quick win)_
6. Complete ASC listing (keywords, nutrition labels, age-rating). _(M)_

### (B) Fix parallax art quality

1. **Add seed locking** — store per-scene seed in manifest. _(quick win, highest leverage)_
2. **Move credit deduction server-side** + remove hardcoded admin email. _(quick win, security)_
3. **Train one FLUX.1-dev style LoRA** (~$2) + feed a shared style reference to every layer. _(M)_
4. **Add a matting pass** (LayerDiffuse-Flux native, or BiRefNet/ToonOut + PyMatting) — replace the accept-marginal-freeform shortcut. _(M)_
5. **Add the pixel-art post-pipeline** (PixelOE k-centroid → grid-snap → Lospec master palette → sharp export). _(M)_
6. **Strengthen the alpha validator** (interior grid sampling, not just the 1px ring). _(S — quick win)_
7. Stop anchoring 9-layer to jungle refs; enforce horizon/ground alignment. _(M)_

### (C) Turn the studio into a product

1. **Migrate generation to a Convex Workflow → fal.ai async queue** with webhooks (fixes the 10-min timeout, reliable retries, real-time progress, swappable backend). _(L — the single biggest architectural change)_
2. **Stripe prepaid Credits** with server-side burndown. _(M)_
3. **Standardize the studio→HikeWise handoff:** a script that pulls a runId, renames to canonical theme (Aurora→Northern, Galactic→Galaxy), and rewrites `outputPath` to relative. _(S — quick win)_
4. Plan RunPod migration once volume is steady (per `RUNPOD_RESEARCH.md`). _(L, later)_
5. Delete the dead OpenAI-direct path / `any` casts; split the 2,474-line `ParallaxStudio.tsx`. _(S)_

---

## 8. Sources & Confidence Notes

### Models / anti-slop

- Scenario style training: https://help.scenario.com/en/articles/train-a-style-model/ · Scenario pricing: https://www.scenario.com/pricing
- FLUX LoRA trainer: https://replicate.com/ostris/flux-dev-lora-trainer/train · gpt-image-1.5: https://replicate.com/openai/gpt-image-1.5

### Transparency / matting

- LayerDiffuse (paper/repo): https://arxiv.org/abs/2402.17113 · https://github.com/lllyasviel/LayerDiffuse
- LayerDiffuse-Flux: https://github.com/FireRedTeam/LayerDiffuse-Flux · BiRefNet: https://github.com/ZhengPeng7/BiRefNet · ToonOut: https://arxiv.org/abs/2509.06839 · https://github.com/MatteoKartoon/BiRefNet · PyMatting: https://github.com/pymatting/pymatting · rembg: https://github.com/danielgatis/rembg

### Pixel-art pipeline

- PixelOE: https://github.com/KohakuBlueleaf/PixelOE · proper-pixel-art: https://github.com/KennethJAllen/proper-pixel-art · pixeldetector: https://github.com/Astropulse/pixeldetector · libimagequant: https://pngquant.org/lib/ · Lospec API: https://lospec.com/palettes/api · Aseprite CLI: https://www.aseprite.org/docs/cli/ · Retro Diffusion: https://replicate.com/retro-diffusion/rd-plus · Kenney: https://kenney.itch.io/kenney-game-assets

### SaaS infra

- fal.ai: https://fal.ai/docs/documentation/model-apis/pricing · RunPod: https://docs.runpod.io/serverless/pricing · Convex Workflow/Workpool: https://www.convex.dev/components/workflow · Stripe Credits: https://stripe.com/blog/introducing-credits-for-usage-based-billing

### RN rendering

- Skia Atlas: https://shopify.github.io/react-native-skia/docs/shapes/atlas/ · Reanimated `useFrameCallback`: https://docs.swmansion.com/react-native-reanimated/docs/2.x/api/hooks/useFrameCallback/

### Corrected / low-confidence claims (do not over-trust)

- **REFUTED — committed `.p8` leak:** the key is untracked + gitignored, never in history. Hygiene risk only. _(Verified this session.)_
- **REFUTED — "FLUX.2-dev" as current option:** FLUX.2 releases Nov 2026; use FLUX.1-dev only.
- **REFUTED — Scenario "$19/$99" pricing:** live tiers are Free/$15/$45/$75/Enterprise.
- **CORRECTED — Replicate/Cloudflare close date:** announced Nov 17 2025, completed _early 2026_ (not Dec 1 2025).
- **CORRECTED — `men1scus/birefnet` hardware:** A100-80GB ~$0.0037/run (the T4 ~$0.00054 one is `851-labs/background-remover`); the ~$0.058 figure is the slow community `alexgenovese` deploy.
- **CORRECTED — FLUX inference cost:** ~$0.003–0.04/img on Replicate (the ~$0.025 figure is fal's rate).
- **CORRECTED — naming:** "SAM2-Matte" → **SAMA / "Segment and Matte Anything"** (AAAI 2026). PixelOE latest is **0.1.4**. Aseprite dither values are `none/ordered/old`.
- **UNCERTAIN / unverified:** Scenario transparent-PNG ("likely"); fal BiRefNet "free compute-seconds"; Retro Diffusion per-image price (confirm on Replicate); ToonOut 99.5% is on the paper's _own_ metric; "one Skia Canvas, not stacked Views" is sound engineering but not stated in the cited Reanimated guide.

---

_Relevant local paths:_ `src/screens/main/NoraScreen.tsx` (delete), `src/screens/main/StudySessionScreen.tsx` (split), `ios/HikeWise/Info.plist` (config split-brain), `AuthKey_X52658YN2G.p8` (move to `~/credentials/`), `src/components/ParallaxForestBackground.tsx` + `src/config/trailAssets.ts` (in-app renderer), `assets/Background_animations/` (redundant zips + orphaned themes).
