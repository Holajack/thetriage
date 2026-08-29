import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Image,
  Text,
  StyleSheet,
  Dimensions,
  ImageSourcePropType,
} from "react-native";
import { getTrailAssets } from "../config/trailAssets";
import { NineLayerParallax } from "./NineLayerParallax";
import { hasNineLayerSet } from "../config/nineLayerAssets";
import {
  PLANT_SURFACE_FRAC,
  BUDDY_FOOT_FRAC,
  DEFAULT_FOOT_FRAC,
} from "../config/nineLayerGeometry";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Spritesheet configuration - each sheet is 5600x200 (28 frames of 200x200)
const FRAME_WIDTH = 200;
const FRAME_HEIGHT = 200;
const TOTAL_FRAMES = 28;
const SPRITESHEET_WIDTH = FRAME_WIDTH * TOTAL_FRAMES; // 5600px

// Use spritesheets instead of individual frames (only 5 images vs 140)
const BUDDY_SPRITESHEETS: Record<string, ImageSourcePropType> = {
  patrick: require("../../assets/trail-buddies/patrick_walking_optimized.webp"),
  fox: require("../../assets/trail-buddies/fox_walking_optimized.webp"),
  deer: require("../../assets/trail-buddies/deer_walking_optimized.webp"),
  wolf: require("../../assets/trail-buddies/wolf_walking_optimized.webp"),
  nora: require("../../assets/trail-buddies/nora_walking_optimized.webp"),
  bear: require("../../assets/trail-buddies/bear_walking_optimized.webp"),
  lion: require("../../assets/trail-buddies/lion_walking_optimized.webp"),
};

// Resting spritesheets — same format (28 frames, 200x200 each, 5600x200 total)
const BUDDY_RESTING_SPRITESHEETS: Record<string, ImageSourcePropType> = {
  patrick: require("../../assets/trail-buddies/patrick_resting_optimized.webp"),
  fox: require("../../assets/trail-buddies/fox_resting_optimized.webp"),
  deer: require("../../assets/trail-buddies/deer_resting_optimized.webp"),
  wolf: require("../../assets/trail-buddies/wolf_resting_optimized.webp"),
  nora: require("../../assets/trail-buddies/nora_resting_optimized.webp"),
  bear: require("../../assets/trail-buddies/bear_resting_optimized.webp"),
  lion: require("../../assets/trail-buddies/lion_walking_optimized.webp"),
};

// Bear, fox, wolf and deer have real lying-down sleep cycles. Patrick's and
// Nora's "resting" sheets are upright walk cycles, and the lion has no resting
// sheet at all — so for those three we hold a single standing frame instead of
// playing the cycle. A buddy that keeps walking through a screen that says
// "Resting" reads as a bug (a tester reported exactly that). Remove a buddy
// from this set as soon as genuine resting art ships for it.
const BUDDIES_WITHOUT_RESTING_ART = new Set(["patrick", "nora", "lion"]);

// Parallax layer speeds (duration for full screen scroll)
const PATH_SCROLL_DURATION = 6000; // Slower path - synced with walking animation
const TREES_SCROLL_DURATION = 12000; // Medium - mid layer trees (slower to maintain parallax ratio)
const BACKGROUND_SCROLL_DURATION = 0; // Static - background doesn't move

// Layer dimensions - trees and path need to tile horizontally
const LAYER_WIDTH = SCREEN_WIDTH * 2; // Two copies for seamless loop

interface ParallaxForestBackgroundProps {
  trailBuddyType?: string;
  isActive?: boolean;
  showTrailBuddy?: boolean;
  showPath?: boolean;
  treeScrollDuration?: number;
  /** 'walking' = normal study session, 'resting' = break time (slower animation, resting sprite) */
  animationMode?: "walking" | "resting";
  /** Trail environment ID - determines which parallax layers to render. Defaults to 'forest'. */
  trailType?: string;
  /** When true, stops scrolling layers and slows buddy animation for accessibility */
  reduceMotion?: boolean;
  /** Which ground/path variant to show. Stable per session; rotates between sessions. */
  groundVariantIndex?: number;
}

// Animated Trail Buddy Component using spritesheet
// Display sizes: walking uses compact 120px, resting uses larger 200px for visibility
const WALK_DISPLAY_SIZE = 120;
const REST_DISPLAY_SIZE = 300;

const TrailBuddySprite = ({
  buddyType,
  mode = "walking",
  reduceMotion = false,
}: {
  buddyType: string;
  mode?: "walking" | "resting";
  reduceMotion?: boolean;
}) => {
  const [currentFrame, setCurrentFrame] = useState(0);

  // Pick the right spritesheet based on animation mode
  const spritesheets =
    mode === "resting" ? BUDDY_RESTING_SPRITESHEETS : BUDDY_SPRITESHEETS;
  const spritesheet = spritesheets[buddyType] || spritesheets.bear;

  const displaySize =
    mode === "resting" ? REST_DISPLAY_SIZE : WALK_DISPLAY_SIZE;

  // Only hold still when this buddy's resting sheet is really a walk cycle;
  // unknown buddy types fall back to the bear, which has proper resting art.
  const holdStill =
    mode === "resting" &&
    !!spritesheets[buddyType] &&
    BUDDIES_WITHOUT_RESTING_ART.has(buddyType);

  useEffect(() => {
    if (holdStill) {
      setCurrentFrame(0);
      return;
    }

    // Normal: Walking 70ms (~2s), Resting 140ms (~4s)
    // Reduce motion: Walking 280ms (~8s gentle), Resting 300ms (~8.4s very slow)
    const FRAME_DURATION = reduceMotion
      ? mode === "resting"
        ? 300
        : 280
      : mode === "resting"
        ? 140
        : 70;
    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % TOTAL_FRAMES);
    }, FRAME_DURATION);

    return () => clearInterval(interval);
  }, [mode, reduceMotion, holdStill]);

  // Calculate the offset to show the current frame (scaled to display size)
  const displayScale = displaySize / FRAME_HEIGHT;
  const frameOffset = -currentFrame * FRAME_WIDTH * displayScale;

  return (
    <View
      style={{
        width: displaySize,
        height: displaySize,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Clip container to show only one frame */}
      <View
        style={{ width: displaySize, height: displaySize, overflow: "hidden" }}
      >
        <Image
          source={spritesheet}
          style={[
            {
              width: SPRITESHEET_WIDTH * (displaySize / FRAME_HEIGHT),
              height: displaySize,
            },
            { transform: [{ translateX: frameOffset }] },
          ]}
          resizeMode="cover"
        />
      </View>
    </View>
  );
};

// Scrolling Layer Component (used in walking mode)
const ScrollingLayer = ({
  source,
  duration,
  style,
  zIndex,
  imageStyle,
}: {
  source: ImageSourcePropType;
  duration: number;
  style?: any;
  zIndex: number;
  imageStyle?: any;
}) => {
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (duration > 0) {
      // Cancel any previous animation when duration changes
      cancelAnimation(translateX);
      // Reset position
      translateX.value = 0;
      // Animate from 0 to -SCREEN_WIDTH, then reset (seamless loop)
      translateX.value = withRepeat(
        withTiming(-SCREEN_WIDTH, {
          duration,
          easing: Easing.linear,
        }),
        -1, // Infinite repeat
        false, // Don't reverse
      );
    }

    // Cleanup: cancel animation on unmount
    return () => {
      cancelAnimation(translateX);
    };
  }, [duration]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  if (duration === 0) {
    // Static layer (background)
    return (
      <View style={[styles.layerContainer, { zIndex }]}>
        <Image
          source={source}
          style={[styles.staticBackground, style]}
          resizeMode="cover"
        />
      </View>
    );
  }

  return (
    <Animated.View
      style={[styles.layerContainer, { zIndex }, style, animatedStyle]}
    >
      {/* Two copies side by side for seamless loop */}
      <Image
        source={source}
        style={[styles.scrollingImage, imageStyle]}
        resizeMode="stretch"
      />
      <Image
        source={source}
        style={[styles.scrollingImage, imageStyle]}
        resizeMode="stretch"
      />
    </Animated.View>
  );
};

// Orbiting Sky Component (used in resting mode) - very subtle drift animation
const OrbitingSky = ({
  source,
  reduceMotion = false,
}: {
  source: ImageSourcePropType;
  reduceMotion?: boolean;
}) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      // No drift — completely still sky
      cancelAnimation(translateX);
      cancelAnimation(translateY);
      translateX.value = 0;
      translateY.value = 0;
      return;
    }
    // Very slow, gentle drift - peaceful resting mood
    translateX.value = withRepeat(
      withTiming(10, { duration: 30000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true, // reverse
    );
    translateY.value = withRepeat(
      withTiming(6, { duration: 25000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );

    return () => {
      cancelAnimation(translateX);
      cancelAnimation(translateY);
    };
  }, [reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <Animated.View
      style={[styles.restSkyContainer, { zIndex: 0 }, animatedStyle]}
    >
      <Image source={source} style={styles.restFullImage} resizeMode="cover" />
    </Animated.View>
  );
};

export const ParallaxForestBackground: React.FC<
  ParallaxForestBackgroundProps
> = ({
  trailBuddyType = "bear",
  isActive = true,
  showTrailBuddy = false,
  showPath = true,
  treeScrollDuration = TREES_SCROLL_DURATION,
  animationMode = "walking",
  trailType = "forest",
  reduceMotion = false,
  groundVariantIndex = 0,
}) => {
  const layers = useMemo(
    () => getTrailAssets(trailType, animationMode),
    [trailType, animationMode],
  );
  if (!isActive) {
    return null;
  }

  // ─────────────────────────────────────────────
  // REST MODE: Static full-screen scene, no scrolling
  // ─────────────────────────────────────────────
  if (animationMode === "resting") {
    return (
      <View style={styles.container}>
        {/* Layer 0: Sky - full screen with subtle orbit drift */}
        <OrbitingSky source={layers.sky} reduceMotion={reduceMotion} />

        {/* Layer 1: Mountain/mid-ground scenery - static, full screen */}
        <View style={[styles.restLayerFull, { zIndex: 1 }]}>
          <Image
            source={layers.mountain}
            style={styles.restFullImage}
            resizeMode="cover"
          />
        </View>

        {/* Layer 5: Ground platform - in front of everything */}
        <View style={[styles.restGroundLayer, { zIndex: 5 }]}>
          <Image
            source={layers.path}
            style={styles.restGroundImage}
            resizeMode="cover"
          />
        </View>

        {/* Layer 3: Tree/foliage frame - foreground canopy framing the scene */}
        <View style={[styles.restLayerFull, { zIndex: 3 }]}>
          <Image
            source={layers.tree}
            style={styles.restFullImage}
            resizeMode="cover"
          />
        </View>

        {/* Layer 4: Trail Buddy resting - center-right on the ground */}
        {showTrailBuddy && (
          <View style={[styles.restBuddyLayer, { zIndex: 6 }]}>
            <TrailBuddySprite
              buddyType={trailBuddyType}
              mode="resting"
              reduceMotion={reduceMotion}
            />
          </View>
        )}
      </View>
    );
  }

  // ─────────────────────────────────────────────
  // WALKING MODE: 9-layer parallax (when the trail has a full set)
  // ─────────────────────────────────────────────
  if (hasNineLayerSet(trailType)) {
    // Plant the buddy's feet on the same ground baseline NineLayerParallax uses.
    // Buddy walks on the dirt line (where tree/bush bases sit), not the grass crest.
    const baselineY = PLANT_SURFACE_FRAC * SCREEN_HEIGHT;
    const footFrac = BUDDY_FOOT_FRAC[trailBuddyType] ?? DEFAULT_FOOT_FRAC;
    const buddyBottom =
      SCREEN_HEIGHT - baselineY - WALK_DISPLAY_SIZE * (1 - footFrac);

    return (
      <View style={styles.container}>
        <NineLayerParallax
          biome={trailType}
          reduceMotion={reduceMotion}
          isActive={isActive}
          groundVariantIndex={groundVariantIndex}
        />
        {showTrailBuddy && (
          <View
            style={[
              styles.nineLayerBuddyLayer,
              { bottom: buddyBottom, zIndex: 10 },
            ]}
          >
            <TrailBuddySprite
              buddyType={trailBuddyType}
              mode="walking"
              reduceMotion={reduceMotion}
            />
          </View>
        )}
      </View>
    );
  }

  // ─────────────────────────────────────────────
  // WALKING MODE: legacy 4-layer side-scrolling (fallback, e.g. jungle)
  // ─────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Layer 0: Sky (static, furthest back) */}
      <View style={[styles.skyLayerContainer, { zIndex: 0 }]}>
        <Image source={layers.sky} style={styles.skyLayer} resizeMode="cover" />
      </View>

      {/* Layer 1: Background - Mountain/scenery (static, covers full screen) */}
      <View style={[styles.mountainLayerContainer, { zIndex: 1 }]}>
        <Image
          source={layers.mountain}
          style={styles.mountainLayer}
          resizeMode="cover"
        />
      </View>

      {/* Layer 2: Mid Layer - Trees/foliage (slow scroll, static when reduce motion) */}
      <ScrollingLayer
        source={layers.tree}
        duration={reduceMotion ? 0 : treeScrollDuration}
        zIndex={2}
        style={styles.treesLayer}
      />

      {/* Layer 3: Foreground - Path (fastest scroll, static when reduce motion) */}
      {showPath && (
        <ScrollingLayer
          source={layers.path}
          duration={reduceMotion ? 0 : PATH_SCROLL_DURATION}
          zIndex={3}
          style={styles.pathLayer}
        />
      )}

      {/* Layer 4: Trail Buddy (walking animation, slower when reduce motion) */}
      {showTrailBuddy && (
        <View style={[styles.buddyLayer, { zIndex: 4 }]}>
          <TrailBuddySprite
            buddyType={trailBuddyType}
            mode={animationMode}
            reduceMotion={reduceMotion}
          />
        </View>
      )}
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
    backgroundColor: "#000", // Prevent white gaps between layers
  },

  // ─── WALKING MODE STYLES ───────────────────────
  layerContainer: {
    position: "absolute",
    left: 0,
    flexDirection: "row",
    width: LAYER_WIDTH,
  },
  staticBackground: {
    width: SCREEN_WIDTH,
    height: "100%",
  },
  scrollingImage: {
    width: SCREEN_WIDTH + 2, // +2px overlap to eliminate sub-pixel seam between tiles
    height: "100%",
  },
  // Sky layer - covers full screen so no black gaps show behind transparent mountain/dune edges
  skyLayerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  skyLayer: {
    width: SCREEN_WIDTH,
    height: "100%",
  },
  // Mountain layer - covers full screen with lake in background
  mountainLayerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  mountainLayer: {
    width: SCREEN_WIDTH,
    height: "100%",
  },
  treesLayer: {
    // Trees/cacti - positioned so their bases sit at or just below the path ground
    // Path is zIndex 3 (on top), trees are zIndex 2 (behind)
    height: SCREEN_HEIGHT * 0.55, // Taller to keep tree tops visible
    bottom: SCREEN_HEIGHT * 0.05, // Raise cacti so bases sit on the walking path
    top: undefined,
    position: "absolute",
  },
  pathLayer: {
    // Path/ground at the bottom - tall enough to cover gap under mountain/dunes
    height: SCREEN_HEIGHT * 0.45,
    bottom: 0,
    top: undefined,
    position: "absolute",
  },
  buddyLayer: {
    position: "absolute",
    bottom: SCREEN_HEIGHT * 0.1,
    left: SCREEN_WIDTH * 0.38,
    width: 140,
    height: 140,
  },
  nineLayerBuddyLayer: {
    position: "absolute",
    left: SCREEN_WIDTH * 0.38,
    width: WALK_DISPLAY_SIZE,
    height: WALK_DISPLAY_SIZE,
  },

  // ─── REST MODE STYLES ──────────────────────────
  // Sky: slightly oversized for orbit drift without exposing edges
  restSkyContainer: {
    position: "absolute",
    top: -15,
    left: -15,
    right: -15,
    bottom: -15,
  },
  // Full-screen layer used for mountain and tree frame
  restLayerFull: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  restFullImage: {
    width: "100%",
    height: "100%",
  },
  // Ground platform - large, top edge at info button level, lower half off-screen
  restGroundLayer: {
    position: "absolute",
    bottom: -SCREEN_HEIGHT * 0.3,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.7,
  },
  restGroundImage: {
    width: SCREEN_WIDTH * 1.4,
    height: "100%",
    alignSelf: "center",
  },
  // Trail buddy resting position - center-right on the ground (300px sprite)
  restBuddyLayer: {
    position: "absolute",
    bottom: SCREEN_HEIGHT * 0.04,
    right: SCREEN_WIDTH * 0.08,
    width: 310,
    height: 310,
  },

  // ─── SHARED STYLES ─────────────────────────────
  buddyContainer: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  spriteClipContainer: {
    width: 120,
    height: 120,
    overflow: "hidden",
  },
  spritesheetImage: {
    width: SPRITESHEET_WIDTH * (120 / FRAME_HEIGHT), // Scale spritesheet to match display size
    height: 120,
  },
});
