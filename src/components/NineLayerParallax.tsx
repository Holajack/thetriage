import React, { useEffect, useMemo } from "react";
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  ImageSourcePropType,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import { NINE_LAYER_ASSETS, NineLayerBiome } from "../config/nineLayerAssets";
import {
  SURFACE_FRAC,
  GROUND_OVERSHOOT,
  PLANT_DEPTH,
  NINE_LAYER_GEOMETRY,
} from "../config/nineLayerGeometry";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const FRAME_ASPECT = 1024 / 1536;

const BASE_SPEED = 93;

type LayerConfig = {
  scale: number;
  offsetY: number;
  offsetX: number;
  speed: number;
};
type BiomeLayers = Record<string, LayerConfig>;

export const BIOME_LAYERS: Record<NineLayerBiome, BiomeLayers> = {
  forest: {
    ground: { scale: 1.18, offsetY: 0.03, offsetX: 0.0, speed: 0.75 },
    bushes: { scale: 0.3, offsetY: -0.11, offsetX: -0.09, speed: 0.55 },
    trees: { scale: 0.52, offsetY: -0.07, offsetX: 0.0, speed: 0.35 },
    midground: { scale: 1.0, offsetY: 0.14, offsetX: 0.0, speed: 0.15 },
    midMountains: { scale: 1.0, offsetY: 0.0, offsetX: 0.0, speed: 0 },
    farMountains: { scale: 1.0, offsetY: -0.01, offsetX: 0.0, speed: 0 },
    clouds: { scale: 0.57, offsetY: -0.46, offsetX: 0.0, speed: 0.03 },
    sun: { scale: 0.4, offsetY: -0.62, offsetX: 0.0, speed: 0 },
  },
  beach: {
    ground: { scale: 1.15, offsetY: 0.05, offsetX: 0.0, speed: 0.75 },
    bushes: { scale: 0.45, offsetY: -0.05, offsetX: -0.09, speed: 0.55 },
    trees: { scale: 0.58, offsetY: -0.08, offsetX: 0.0, speed: 0.35 },
    midground: { scale: 1.0, offsetY: 0.3, offsetX: 0.0, speed: 0.15 },
    midMountains: { scale: 1.0, offsetY: 0.14, offsetX: 0.0, speed: 0 },
    farMountains: { scale: 1.0, offsetY: 0.02, offsetX: 0.0, speed: 0 },
    clouds: { scale: 0.57, offsetY: -0.39, offsetX: 0.0, speed: 0.03 },
    sun: { scale: 0.4, offsetY: -0.52, offsetX: 0.0, speed: 0 },
  },
  desert: {
    ground: { scale: 1.18, offsetY: 0.02, offsetX: 0.0, speed: 0.75 },
    bushes: { scale: 0.5, offsetY: -0.1, offsetX: -0.09, speed: 0.55 },
    trees: { scale: 0.68, offsetY: -0.11, offsetX: 0.07, speed: 0.35 },
    midground: { scale: 1.04, offsetY: 0.18, offsetX: 0.0, speed: 0.15 },
    midMountains: { scale: 1.13, offsetY: 0.15, offsetX: 0.0, speed: 0 },
    farMountains: { scale: 1.15, offsetY: -0.1, offsetX: 0.0, speed: 0 },
    clouds: { scale: 0.65, offsetY: -0.4, offsetX: 0.0, speed: 0.03 },
    sun: { scale: 0.45, offsetY: -0.58, offsetX: 0.0, speed: 0 },
  },
  volcano: {
    ground: { scale: 1.18, offsetY: 0.07, offsetX: 0.0, speed: 0.75 },
    bushes: { scale: 0.49, offsetY: -0.17, offsetX: -0.09, speed: 0.55 },
    trees: { scale: 0.67, offsetY: -0.15, offsetX: 0.03, speed: 0.35 },
    midground: { scale: 1.0, offsetY: 0.21, offsetX: 0.0, speed: 0.15 },
    midMountains: { scale: 1.0, offsetY: 0.06, offsetX: 0.0, speed: 0 },
    farMountains: { scale: 1.0, offsetY: -0.03, offsetX: 0.0, speed: 0 },
    clouds: { scale: 0.7, offsetY: -0.39, offsetX: 0.0, speed: 0.03 },
    sun: { scale: 0.39, offsetY: -0.62, offsetX: 0.0, speed: 0 },
  },
  snow: {
    ground: { scale: 1.18, offsetY: 0.07, offsetX: 0.0, speed: 0.75 },
    bushes: { scale: 0.49, offsetY: -0.1, offsetX: -0.13, speed: 0.55 },
    trees: { scale: 0.59, offsetY: -0.14, offsetX: 0.03, speed: 0.35 },
    midground: { scale: 1.0, offsetY: 0.02, offsetX: 0.0, speed: 0.15 },
    midMountains: { scale: 1.0, offsetY: -0.17, offsetX: 0.0, speed: 0 },
    farMountains: { scale: 1.01, offsetY: -0.05, offsetX: 0.0, speed: 0 },
    clouds: { scale: 0.65, offsetY: -0.44, offsetX: 0.0, speed: 0.03 },
    sun: { scale: 0.39, offsetY: -0.66, offsetX: 0.0, speed: 0 },
  },
  canyon: {
    ground: { scale: 1.18, offsetY: 0.03, offsetX: 0.0, speed: 0.75 },
    bushes: { scale: 0.5, offsetY: -0.07, offsetX: -0.09, speed: 0.55 },
    trees: { scale: 0.54, offsetY: -0.15, offsetX: 0.07, speed: 0.35 },
    midground: { scale: 1.04, offsetY: 0.08, offsetX: 0.0, speed: 0.15 },
    midMountains: { scale: 1.0, offsetY: 0.09, offsetX: 0.0, speed: 0 },
    farMountains: { scale: 1.01, offsetY: 0.0, offsetX: 0.0, speed: 0 },
    clouds: { scale: 0.82, offsetY: -0.29, offsetX: 0.0, speed: 0.03 },
    sun: { scale: 0.44, offsetY: -0.54, offsetX: 0.0, speed: 0 },
  },
  northern: {
    ground: { scale: 1.18, offsetY: 0.05, offsetX: 0.0, speed: 0.75 },
    bushes: { scale: 0.5, offsetY: -0.07, offsetX: -0.09, speed: 0.55 },
    trees: { scale: 0.63, offsetY: -0.11, offsetX: 0.07, speed: 0.35 },
    midground: { scale: 1.04, offsetY: 0.21, offsetX: 0.0, speed: 0.15 },
    midMountains: { scale: 1.0, offsetY: 0.05, offsetX: 0.0, speed: 0 },
    farMountains: { scale: 1.01, offsetY: -0.07, offsetX: 0.0, speed: 0 },
    clouds: { scale: 0.65, offsetY: -0.43, offsetX: 0.0, speed: 0.03 },
    sun: { scale: 0.47, offsetY: -0.58, offsetX: 0.0, speed: 0 },
  },
  galaxy: {
    ground: { scale: 1.18, offsetY: 0.11, offsetX: 0.0, speed: 0.75 },
    bushes: { scale: 0.5, offsetY: -0.07, offsetX: -0.09, speed: 0.55 },
    trees: { scale: 0.68, offsetY: -0.12, offsetX: 0.07, speed: 0.35 },
    midground: { scale: 1.04, offsetY: 0.19, offsetX: 0.0, speed: 0.15 },
    midMountains: { scale: 1.0, offsetY: 0.14, offsetX: 0.0, speed: 0 },
    farMountains: { scale: 1.01, offsetY: 0.02, offsetX: 0.0, speed: 0 },
    clouds: { scale: 0.65, offsetY: -0.43, offsetX: 0.0, speed: 0.03 },
    sun: { scale: 0.45, offsetY: -0.53, offsetX: 0.0, speed: 0 },
  },
};

interface NineLayerParallaxProps {
  biome: NineLayerBiome;
  speed?: number;
  reduceMotion?: boolean;
  isActive?: boolean;
  /** Which ground/path variant to show. Stable per session; rotates between sessions. */
  groundVariantIndex?: number;
}

/**
 * Static layer — renders a single image at pre-calculated pixel dimensions.
 * No CSS transform scale; the image is directly sized to its final appearance.
 * Vertical position simulates "anchor at bottom": the bottom edge stays at
 * (offsetY + 1) * SCREEN_HEIGHT, and the layer grows upward by scaledH.
 */
const StaticLayer = ({
  source,
  zIndex,
  scale,
  topOffset,
  leftOffset,
}: {
  source: ImageSourcePropType;
  zIndex: number;
  scale: number;
  topOffset: number;
  leftOffset: number;
}) => {
  const scaledH = Math.round(SCREEN_HEIGHT * scale);
  const scaledW = Math.max(
    Math.round(SCREEN_HEIGHT * FRAME_ASPECT * scale),
    SCREEN_WIDTH + 2,
  );
  const viewBottom = topOffset + SCREEN_HEIGHT;
  const viewTop = viewBottom - scaledH;

  return (
    <View
      style={[
        styles.row,
        { top: viewTop, left: leftOffset, height: scaledH, zIndex },
      ]}
    >
      <Image
        source={source}
        style={{ width: scaledW, height: scaledH }}
        resizeMode="stretch"
      />
    </View>
  );
};

/**
 * Scrolling layer — tiles frames horizontally and animates translateX.
 * Images are pre-sized at scale so no CSS transform scale is needed.
 */
const TILE_OVERLAP = 30;

const ScrollRow = ({
  frames,
  pxPerSec,
  speed,
  reduceMotion,
  zIndex,
  scale,
  topOffset,
  leftOffset,
  anchorFracs,
  baselineY,
  solidFrac = 1,
}: {
  frames: ImageSourcePropType[];
  pxPerSec: number;
  speed: number;
  reduceMotion: boolean;
  zIndex: number;
  scale: number;
  topOffset: number;
  leftOffset: number;
  /**
   * When set, each frame is planted on the shared ground baseline: anchorFracs[i]
   * is the frame-internal fraction (0=top, 1=bottom) of the subject's base/crest,
   * and that point is positioned at baselineY regardless of the frame's height.
   */
  anchorFracs?: number[];
  baselineY?: number;
  /**
   * Fraction of the frame width that is solid. Used as the tile-stride basis so a
   * tapered "island" path tiles by its solid centre — the tapered tips overlap the
   * neighbour instead of leaving a transparent gap (which showed as blue sky).
   */
  solidFrac?: number;
}) => {
  const translateX = useSharedValue(0);
  const scaledFrameW = Math.round(SCREEN_HEIGHT * FRAME_ASPECT * scale);
  const scaledH = Math.round(SCREEN_HEIGHT * scale);
  const stride = Math.round(solidFrac * scaledFrameW) - TILE_OVERLAP;
  const period = frames.length * stride;
  const repeats = Math.max(2, Math.ceil((period + SCREEN_WIDTH) / period) + 1);

  const anchored = anchorFracs != null && baselineY != null;
  // Anchored rows place the frame BOTTOM at the baseline, then nudge each cell
  // down by (1 - anchorFrac) * scaledH so its own base/crest lands on the line.
  const viewTop = anchored
    ? baselineY - scaledH
    : topOffset + SCREEN_HEIGHT - scaledH;

  useEffect(() => {
    cancelAnimation(translateX);
    translateX.value = 0;
    const effSpeed = reduceMotion ? 0 : pxPerSec * speed;
    if (effSpeed > 0) {
      const durationMs = (period / effSpeed) * 1000;
      translateX.value = withRepeat(
        withTiming(-period, { duration: durationMs, easing: Easing.linear }),
        -1,
        false,
      );
    }
    return () => cancelAnimation(translateX);
  }, [period, pxPerSec, speed, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const cells: React.ReactNode[] = [];
  for (let r = 0; r < repeats; r++) {
    for (let i = 0; i < frames.length; i++) {
      const dy = anchored
        ? Math.round((1 - (anchorFracs![i] ?? 1)) * scaledH)
        : 0;
      cells.push(
        <Image
          key={`${r}-${i}`}
          source={frames[i]}
          style={{
            width: scaledFrameW,
            height: scaledH,
            // Spacing = stride, so a tapered path tiles by its solid centre
            // (negative margin overlaps the tapered tips) — no gap / blue sky.
            marginRight: stride - scaledFrameW,
            transform: [{ translateY: dy }],
          }}
          resizeMode="stretch"
        />,
      );
    }
  }

  return (
    <Animated.View
      style={[
        styles.row,
        { top: viewTop, left: leftOffset, height: scaledH, zIndex },
        animatedStyle,
      ]}
    >
      {cells}
    </Animated.View>
  );
};

export const NineLayerParallax: React.FC<NineLayerParallaxProps> = ({
  biome,
  speed = 1,
  reduceMotion = false,
  isActive = true,
  groundVariantIndex = 0,
}) => {
  const set = NINE_LAYER_ASSETS[biome];
  const layers = BIOME_LAYERS[biome];
  const geo = NINE_LAYER_GEOMETRY[biome];
  const baselineY = Math.round(SURFACE_FRAC * SCREEN_HEIGHT);
  const cloudFrames = useMemo(() => set.clouds, [set]);
  const treeFrames = useMemo(() => set.trees, [set]);
  const bushFrames = useMemo(() => set.bushes, [set]);

  const groundIndex =
    ((groundVariantIndex % set.ground.length) + set.ground.length) %
    set.ground.length;
  const groundFrame = useMemo(
    () => [set.ground[groundIndex]],
    [set, groundIndex],
  );
  const groundCrest = geo.groundCrest[groundIndex];
  // Anchor the path crest on the surface line and its opaque bottom just BELOW
  // the screen (GROUND_OVERSHOOT) so the path's gappy underside is hidden
  // off-screen. The band must fill (1 - SURFACE_FRAC + GROUND_OVERSHOOT) of H.
  const groundFill = 1 - SURFACE_FRAC + GROUND_OVERSHOOT;
  const groundBand = Math.max(
    0.05,
    geo.groundBottom[groundIndex] - groundCrest,
  );
  const groundScale = groundFill / groundBand;
  // Trees/bushes plant PLANT_DEPTH down into the band so their bases embed
  // behind the path and they appear to grow out of the ground (not float on it).
  const plantY =
    baselineY + Math.round(PLANT_DEPTH * groundFill * SCREEN_HEIGHT);

  if (!isActive) return null;

  const sc = (key: string) => layers[key].scale;
  const topOff = (key: string) =>
    Math.round(SCREEN_HEIGHT * layers[key].offsetY);
  const leftOff = (key: string) =>
    Math.round(SCREEN_WIDTH * layers[key].offsetX);
  const pxSec = (key: string) => layers[key].speed * BASE_SPEED;

  const sunScale = sc("sun");
  const sunH = Math.round(SCREEN_HEIGHT * sunScale);
  const sunW = Math.round(sunH * FRAME_ASPECT);

  return (
    <View style={styles.container}>
      {/* 0 — Sky: static full-screen background */}
      <View style={[styles.fill, { zIndex: 0 }]}>
        <Image source={set.sky} style={styles.fillImage} resizeMode="cover" />
      </View>

      {/* 1 — Far mountains (static) */}
      <StaticLayer
        source={set.farMountains}
        zIndex={1}
        scale={sc("farMountains")}
        topOffset={topOff("farMountains")}
        leftOffset={leftOff("farMountains")}
      />

      {/* 2 — Mid mountains (static) */}
      <StaticLayer
        source={set.midMountains}
        zIndex={2}
        scale={sc("midMountains")}
        topOffset={topOff("midMountains")}
        leftOffset={leftOff("midMountains")}
      />

      {/* 3 — Midground (distant treeline, anchored by its own offset) */}
      <ScrollRow
        frames={[set.midground]}
        pxPerSec={pxSec("midground")}
        speed={speed}
        reduceMotion={reduceMotion}
        zIndex={3}
        scale={sc("midground")}
        topOffset={topOff("midground")}
        leftOffset={leftOff("midground")}
      />

      {/* 4 — Foreground trees (planted on the surface line) */}
      <ScrollRow
        frames={treeFrames}
        pxPerSec={pxSec("trees")}
        speed={speed}
        reduceMotion={reduceMotion}
        zIndex={4}
        scale={sc("trees")}
        topOffset={0}
        leftOffset={leftOff("trees")}
        anchorFracs={geo.treeBase}
        baselineY={plantY}
      />

      {/* 5 — Bushes (planted on the surface line) */}
      <ScrollRow
        frames={bushFrames}
        pxPerSec={pxSec("bushes")}
        speed={speed}
        reduceMotion={reduceMotion}
        zIndex={5}
        scale={sc("bushes")}
        topOffset={0}
        leftOffset={leftOff("bushes")}
        anchorFracs={geo.bushGreenBottom}
        baselineY={plantY}
      />

      {/* 6 — Ground path: scaled so its crest sits on the surface and its opaque
          bottom reaches the screen bottom; one variant per session */}
      <ScrollRow
        frames={groundFrame}
        pxPerSec={pxSec("ground")}
        speed={speed}
        reduceMotion={reduceMotion}
        zIndex={6}
        scale={groundScale}
        topOffset={0}
        leftOffset={leftOff("ground")}
        anchorFracs={[groundCrest]}
        baselineY={baselineY}
        solidFrac={geo.groundSolidWidth[groundIndex]}
      />

      {/* 7 — Sun: centered, static, always visible above scene layers */}
      <View
        style={[styles.sunContainer, { zIndex: 7, top: SCREEN_HEIGHT * 0.06 }]}
        pointerEvents="none"
      >
        <Image
          source={set.sun}
          style={{ width: sunW, height: sunH }}
          resizeMode="contain"
        />
      </View>

      {/* 8 — Clouds: highest z-index so they're always visible */}
      <ScrollRow
        frames={cloudFrames}
        pxPerSec={pxSec("clouds")}
        speed={speed}
        reduceMotion={reduceMotion}
        zIndex={8}
        scale={sc("clouds")}
        topOffset={topOff("clouds")}
        leftOffset={leftOff("clouds")}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  fill: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  fillImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  row: {
    position: "absolute",
    flexDirection: "row",
  },
  sunContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
});
