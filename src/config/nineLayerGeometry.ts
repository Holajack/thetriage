/**
 * 9-Layer parallax geometry - AUTO-MEASURED (alpha-scan of nine_layer frames).
 * groundCrest/Bottom: path top/opaque-bottom fraction. groundSolidWidth: solid-centre
 *   fraction (>=85% column coverage) used as the tile stride so tapered path tips overlap
 *   their neighbours (no blue-sky gap). treeBase: tree base. bushGreenBottom: bottom of the
 *   green foliage so bushes plant the green on the surface and tuck the brown base under.
 */
import { NineLayerBiome } from "./nineLayerAssets";

export const SURFACE_FRAC = 0.82;

export const GROUND_OVERSHOOT = 0.06;

export const PLANT_DEPTH = 0.25;

export const PLANT_SURFACE_FRAC =
  SURFACE_FRAC + PLANT_DEPTH * (1 - SURFACE_FRAC + GROUND_OVERSHOOT);

export interface BiomeGeometry {
  groundCrest: number[];
  groundBottom: number[];
  groundSolidWidth: number[];
  treeBase: number[];
  bushGreenBottom: number[];
}

export const NINE_LAYER_GEOMETRY: Record<NineLayerBiome, BiomeGeometry> = {
  forest: {
    groundCrest: [0.639, 0.651, 0.456, 0.482, 0.432, 0.414],
    groundBottom: [0.842, 0.827, 0.604, 0.627, 0.581, 0.641],
    groundSolidWidth: [0.999, 0.994, 0.999, 0.902, 0.97, 0.999],
    treeBase: [0.987, 0.98, 0.984, 0.988, 0.992, 0.986, 0.984, 0.988, 0.986],
    bushGreenBottom: [0.984, 0.949, 0.989, 0.957],
  },
  beach: {
    groundCrest: [0.576, 0.467, 0.524, 0.48, 0.479, 0.514],
    groundBottom: [0.718, 0.663, 0.67, 0.693, 0.628, 0.684],
    groundSolidWidth: [0.925, 0.999, 0.999, 0.999, 0.999, 0.999],
    treeBase: [0.991, 0.978, 0.982, 0.98, 0.982, 0.979, 0.99, 0.984, 0.982],
    bushGreenBottom: [0.92, 0.949, 0.94, 0.952],
  },
  desert: {
    groundCrest: [0.467, 0.45, 0.492, 0.393, 0.425, 0.536],
    groundBottom: [0.654, 0.637, 0.631, 0.689, 0.609, 0.708],
    groundSolidWidth: [0.999, 0.978, 0.999, 0.999, 0.999, 0.967],
    treeBase: [0.99, 0.982, 0.909, 0.987, 0.99, 0.986, 0.992, 0.988, 0.991],
    bushGreenBottom: [0.825, 0.922, 0.917, 0.993],
  },
  volcano: {
    groundCrest: [0.6, 0.58, 0.168, 0.539, 0.383, 0.594],
    groundBottom: [0.832, 0.8, 0.65, 0.999, 0.805, 0.803],
    groundSolidWidth: [0.999, 0.999, 0.999, 0.999, 0.999, 0.999],
    treeBase: [0.99, 0.973, 0.99, 0.984, 0.981, 0.982, 0.989, 0.986, 0.979],
    bushGreenBottom: [0.991, 0.986, 0.992, 0.993],
  },
  snow: {
    groundCrest: [0.44, 0.444, 0.585, 0.574, 0.452, 0.523],
    groundBottom: [0.662, 0.604, 0.762, 0.725, 0.659, 0.678],
    groundSolidWidth: [0.911, 0.999, 0.999, 0.959, 0.999, 0.999],
    treeBase: [0.973, 0.854, 0.988, 0.982, 0.985, 0.984, 0.99, 0.982, 0.808],
    bushGreenBottom: [0.989, 0.988, 0.996, 0.986],
  },
  canyon: {
    groundCrest: [0.627, 0.446, 0.505, 0.492, 0.589, 0.508],
    groundBottom: [0.785, 0.613, 0.667, 0.677, 0.832, 0.673],
    groundSolidWidth: [0.949, 0.943, 0.999, 0.999, 0.999, 0.999],
    treeBase: [0.991, 0.984, 0.991, 0.98, 0.984, 0.989, 0.982, 0.992, 0.993],
    bushGreenBottom: [0.99, 0.839, 0.994, 0.995],
  },
  northern: {
    groundCrest: [0.496, 0.462, 0.391, 0.405, 0.832, 0.548],
    groundBottom: [0.658, 0.658, 0.632, 0.681, 0.999, 0.697],
    groundSolidWidth: [0.925, 0.892, 0.597, 0.999, 0.975, 0.97],
    treeBase: [0.988, 0.831, 0.986, 0.979, 0.983, 0.988, 0.995, 0.982, 0.98],
    bushGreenBottom: [0.99, 0.985, 0.989, 0.727],
  },
  galaxy: {
    groundCrest: [0.585, 0.774, 0.734, 0.79, 0.799, 0.758],
    groundBottom: [0.754, 0.999, 0.997, 0.999, 0.999, 0.999],
    groundSolidWidth: [0.999, 0.818, 0.01, 0.703, 0.944, 0.972],
    treeBase: [0.993, 0.984, 0.979, 0.991, 0.988, 0.987, 0.988, 0.984, 0.992],
    bushGreenBottom: [0.988, 0.98, 0.99, 0.977],
  },
};

export const BUDDY_FOOT_FRAC: Record<string, number> = {
  fox: 0.945,
  deer: 0.945,
  wolf: 0.94,
  nora: 0.94,
  bear: 0.945,
  lion: 0.93,
};
export const DEFAULT_FOOT_FRAC = 0.94;
