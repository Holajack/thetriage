/**
 * 9-Layer parallax geometry.
 * Anchor fractions (groundCrest / treeBase / bushBase) are AUTO-MEASURED by an
 * alpha-scan of the nine_layer frames — where the subject base / path crest sits
 * inside the 1024x1536 frame — so every foreground layer plants on one shared
 * baseline. Arrays are parallel to the variant order in nineLayerAssets.ts.
 * `fill` colors are hand-tunable design values (gradient under the path island).
 */
import { NineLayerBiome } from "./nineLayerAssets";

/** Fraction of screen height where the walkable surface sits. */
export const GROUND_BASELINE = 0.82;

export interface BiomeGeometry {
  /** crest (top surface) fraction per ground variant - buddy stands here */
  groundCrest: number[];
  /** base (bottom) fraction per tree variant */
  treeBase: number[];
  /** base (bottom) fraction per bush variant */
  bushBase: number[];
  /** solid earth fill below the baseline (gradient top -> bottom) */
  fill: { top: string; bottom: string };
}

export const NINE_LAYER_GEOMETRY: Record<NineLayerBiome, BiomeGeometry> = {
  forest: {
    groundCrest: [0.639, 0.651, 0.456, 0.482, 0.498, 0.485],
    treeBase: [0.987, 0.98, 0.984, 0.988, 0.992, 0.986, 0.984, 0.988, 0.986],
    bushBase: [0.995, 0.99, 0.993, 0.991],
    fill: { top: "#69611b", bottom: "#39350e" },
  },
  beach: {
    groundCrest: [0.6, 0.414, 0.732, 0.43, 0.372, 0.579],
    treeBase: [0.991, 0.978, 0.982, 0.98, 0.982, 0.979, 0.99, 0.984, 0.982],
    bushBase: [0.979, 0.988, 0.987, 0.992],
    fill: { top: "#cdb98a", bottom: "#7a6a44" },
  },
  desert: {
    groundCrest: [0.467, 0.45, 0.492, 0.393, 0.425, 0.536],
    treeBase: [0.99, 0.982, 0.909, 0.987, 0.99, 0.986, 0.992, 0.988, 0.991],
    bushBase: [0.988, 0.986, 0.993, 0.993],
    fill: { top: "#ce863c", bottom: "#714921" },
  },
  volcano: {
    groundCrest: [0.6, 0.58, 0.168, 0.539, 0.383, 0.594],
    treeBase: [0.99, 0.973, 0.99, 0.984, 0.981, 0.982, 0.989, 0.986, 0.979],
    bushBase: [0.991, 0.986, 0.992, 0.993],
    fill: { top: "#6f3924", bottom: "#3d1f13" },
  },
  snow: {
    groundCrest: [0.486, 0.444, 0.585, 0.574, 0.452, 0.523],
    treeBase: [0.973, 0.854, 0.988, 0.982, 0.985, 0.984, 0.99, 0.982, 0.808],
    bushBase: [0.989, 0.988, 0.996, 0.986],
    fill: { top: "#bed7ec", bottom: "#687681" },
  },
  canyon: {
    groundCrest: [0.627, 0.446, 0.505, 0.492, 0.589, 0.508],
    treeBase: [0.991, 0.984, 0.991, 0.98, 0.984, 0.989, 0.982, 0.992, 0.993],
    bushBase: [0.99, 0.989, 0.994, 0.995],
    fill: { top: "#c26325", bottom: "#6a3614" },
  },
  northern: {
    groundCrest: [0.496, 0.462, 0.5, 0.405, 0.832, 0.548],
    treeBase: [0.988, 0.831, 0.986, 0.979, 0.983, 0.988, 0.995, 0.982, 0.98],
    bushBase: [0.99, 0.985, 0.989, 0.727],
    fill: { top: "#537abb", bottom: "#2d4366" },
  },
  galaxy: {
    groundCrest: [0.71, 0.774, 0.734, 0.79, 0.799, 0.758],
    treeBase: [0.993, 0.984, 0.979, 0.991, 0.988, 0.987, 0.988, 0.984, 0.992],
    bushBase: [0.988, 0.98, 0.99, 0.977],
    fill: { top: "#3a2b5c", bottom: "#180f2e" },
  },
};

/** Buddy sprite foot fraction (lowest opaque row / 200px frame). */
export const BUDDY_FOOT_FRAC: Record<string, number> = {
  fox: 0.945,
  deer: 0.945,
  wolf: 0.94,
  nora: 0.94,
  bear: 0.945,
  lion: 0.93,
};
export const DEFAULT_FOOT_FRAC = 0.94;
