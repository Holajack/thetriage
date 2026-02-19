/**
 * Trail Asset Registry
 *
 * Static require() map of all trail environments.
 * React Native requires literal strings in require() - no dynamic paths.
 *
 * Each trail has 4 layers (sky, mountain, tree, path) for both focus and rest modes.
 * If a trail has no rest variant, its rest assets mirror the focus assets.
 */
import { ImageSourcePropType } from 'react-native';

export type TrailId = 'forest' | 'beach' | 'jungle' | 'volcano' | 'desert';

export interface TrailLayerAssets {
  sky: ImageSourcePropType;
  mountain: ImageSourcePropType;
  tree: ImageSourcePropType;
  path: ImageSourcePropType;
}

export interface TrailEnvironment {
  id: TrailId;
  focus: TrailLayerAssets;
  rest: TrailLayerAssets;
  hasRestVariant: boolean;
}

export const TRAIL_ASSETS: Record<TrailId, TrailEnvironment> = {
  forest: {
    id: 'forest',
    focus: {
      sky: require('../../assets/Background_animations/Forest/sunset_colors.png'),
      mountain: require('../../assets/Background_animations/Forest/rocky_mountain.png'),
      tree: require('../../assets/Background_animations/Forest/evergreen_tree.png'),
      path: require('../../assets/Background_animations/Forest/path_animation.png'),
    },
    rest: {
      sky: require('../../assets/Background_animations/Forest/rest_animation/rest_sky.png'),
      mountain: require('../../assets/Background_animations/Forest/rest_animation/rest_mountain.png'),
      tree: require('../../assets/Background_animations/Forest/rest_animation/rest_tree.png'),
      path: require('../../assets/Background_animations/Forest/rest_animation/rest_ground.png'),
    },
    hasRestVariant: true,
  },
  beach: {
    id: 'beach',
    focus: {
      sky: require('../../assets/Background_animations/Beach/beach_sunset.png'),
      mountain: require('../../assets/Background_animations/Beach/beach_background.png'),
      tree: require('../../assets/Background_animations/Beach/beach_mid-layer.png'),
      path: require('../../assets/Background_animations/Beach/beach_path.png'),
    },
    rest: {
      sky: require('../../assets/Background_animations/Beach_Rest/generated/sunset_colors.png'),
      mountain: require('../../assets/Background_animations/Beach_Rest/generated/rocky_mountain.png'),
      tree: require('../../assets/Background_animations/Beach_Rest/generated/evergreen_tree.png'),
      path: require('../../assets/Background_animations/Beach_Rest/generated/path_animation.png'),
    },
    hasRestVariant: true,
  },
  jungle: {
    id: 'jungle',
    focus: {
      sky: require('../../assets/Background_animations/Jungle/generated/sunset_colors.png'),
      mountain: require('../../assets/Background_animations/Jungle/generated/rocky_mountain.png'),
      tree: require('../../assets/Background_animations/Jungle/generated/evergreen_tree.png'),
      path: require('../../assets/Background_animations/Jungle/generated/path_animation.png'),
    },
    rest: {
      sky: require('../../assets/Background_animations/jungle_rest/generated/sunset_colors.png'),
      mountain: require('../../assets/Background_animations/jungle_rest/generated/rocky_mountain.png'),
      tree: require('../../assets/Background_animations/jungle_rest/generated/evergreen_tree.png'),
      path: require('../../assets/Background_animations/jungle_rest/generated/path_animation.png'),
    },
    hasRestVariant: true,
  },
  volcano: {
    id: 'volcano',
    focus: {
      sky: require('../../assets/Background_animations/Volcano/generated/sunset_colors.png'),
      mountain: require('../../assets/Background_animations/Volcano/generated/rocky_mountain.png'),
      tree: require('../../assets/Background_animations/Volcano/generated/evergreen_tree.png'),
      path: require('../../assets/Background_animations/Volcano/generated/path_animation.png'),
    },
    rest: {
      sky: require('../../assets/Background_animations/volcano_night/generated/sunset_colors.png'),
      mountain: require('../../assets/Background_animations/volcano_night/generated/rocky_mountain.png'),
      tree: require('../../assets/Background_animations/volcano_night/generated/evergreen_tree.png'),
      path: require('../../assets/Background_animations/volcano_night/generated/path_animation.png'),
    },
    hasRestVariant: true,
  },
  desert: {
    id: 'desert',
    focus: {
      sky: require('../../assets/Background_animations/Desert 2/generated/sunset_colors.png'),
      mountain: require('../../assets/Background_animations/Desert 2/generated/rocky_mountain.png'),
      tree: require('../../assets/Background_animations/Desert 2/generated/evergreen_tree.png'),
      path: require('../../assets/Background_animations/Desert 2/generated/path_animation.png'),
    },
    rest: {
      sky: require('../../assets/Background_animations/Desert_Rest/generated/sunset_colors.png'),
      mountain: require('../../assets/Background_animations/Desert_Rest/generated/rocky_mountain.png'),
      tree: require('../../assets/Background_animations/Desert_Rest/generated/evergreen_tree.png'),
      path: require('../../assets/Background_animations/Desert_Rest/generated/path_animation.png'),
    },
    hasRestVariant: true,
  },
};

export const DEFAULT_TRAIL: TrailId = 'jungle';

/** Set of trail IDs that have actual assets and are purchasable */
export const AVAILABLE_TRAIL_IDS: Set<string> = new Set(Object.keys(TRAIL_ASSETS));

/** Get the appropriate layer assets for a given trail and animation mode */
export function getTrailAssets(
  trailId: string | undefined,
  mode: 'walking' | 'resting' = 'walking'
): TrailLayerAssets {
  const trail = TRAIL_ASSETS[trailId as TrailId] ?? TRAIL_ASSETS[DEFAULT_TRAIL];
  return mode === 'resting' ? trail.rest : trail.focus;
}

/** Check if a trail ID has assets available */
export function isTrailAvailable(trailId: string): boolean {
  return AVAILABLE_TRAIL_IDS.has(trailId);
}
