import React, { useEffect, useState, useMemo } from 'react';
import { View, Image, StyleSheet, Dimensions, ImageSourcePropType } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Spritesheet configuration - each sheet is 5600x200 (28 frames of 200x200)
const FRAME_WIDTH = 200;
const FRAME_HEIGHT = 200;
const TOTAL_FRAMES = 28;
const SPRITESHEET_WIDTH = FRAME_WIDTH * TOTAL_FRAMES; // 5600px

// Use spritesheets instead of individual frames (only 5 images vs 140)
const BUDDY_SPRITESHEETS: Record<string, ImageSourcePropType> = {
  fox: require('../../assets/trail-buddies/fox_walking_optimized.png'),
  deer: require('../../assets/trail-buddies/deer_walking_optimized.png'),
  wolf: require('../../assets/trail-buddies/wolf_walking_optimized.png'),
  nora: require('../../assets/trail-buddies/nora_walking_optimized.png'),
  bear: require('../../assets/trail-buddies/bear_walking_optimized.png'),
};

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
}

// Animated Trail Buddy Component using spritesheet
const TrailBuddySprite = ({ buddyType }: { buddyType: string }) => {
  const [currentFrame, setCurrentFrame] = useState(0);

  // Get the spritesheet for this buddy type
  const spritesheet = BUDDY_SPRITESHEETS[buddyType] || BUDDY_SPRITESHEETS.bear;

  useEffect(() => {
    // Walking animation synced with path scroll speed (4000ms)
    // 28 frames, path takes 4000ms to scroll full width
    // For natural walking: ~70ms per frame = ~2000ms per walk cycle
    // This makes footsteps appear to match the ground movement
    const FRAME_DURATION = 70; // ms per frame - synced with path speed
    const interval = setInterval(() => {
      setCurrentFrame(prev => (prev + 1) % TOTAL_FRAMES);
    }, FRAME_DURATION);

    return () => clearInterval(interval);
  }, []);

  // Calculate the offset to show the current frame (scaled to display size)
  const displayScale = 120 / FRAME_HEIGHT; // 120px display / 200px frame = 0.6
  const frameOffset = -currentFrame * FRAME_WIDTH * displayScale;

  return (
    <View style={styles.buddyContainer}>
      {/* Clip container to show only one frame */}
      <View style={styles.spriteClipContainer}>
        <Image
          source={spritesheet}
          style={[
            styles.spritesheetImage,
            { transform: [{ translateX: frameOffset }] }
          ]}
          resizeMode="cover"
        />
      </View>
    </View>
  );
};

// Scrolling Layer Component
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
      // Animate from 0 to -SCREEN_WIDTH, then reset (seamless loop)
      translateX.value = withRepeat(
        withTiming(-SCREEN_WIDTH, {
          duration,
          easing: Easing.linear,
        }),
        -1, // Infinite repeat
        false // Don't reverse
      );
    }
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
    <Animated.View style={[styles.layerContainer, { zIndex }, style, animatedStyle]}>
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

export const ParallaxForestBackground: React.FC<ParallaxForestBackgroundProps> = ({
  trailBuddyType = 'bear',
  isActive = true,
  showTrailBuddy = false,
}) => {
  if (!isActive) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Layer 0: Sky - Sunset Colors (static, furthest back) */}
      <View style={[styles.skyLayerContainer, { zIndex: 0 }]}>
        <Image
          source={require('../../assets/Background_animations/Forest/sunset_colors.png')}
          style={styles.skyLayer}
          resizeMode="cover"
        />
      </View>

      {/* Layer 1: Background - Rocky Mountain (static, covers full screen) */}
      <View style={[styles.mountainLayerContainer, { zIndex: 1 }]}>
        <Image
          source={require('../../assets/Background_animations/Forest/rocky_mountain.png')}
          style={styles.mountainLayer}
          resizeMode="cover"
        />
      </View>

      {/* Layer 2: Mid Layer - Evergreen Trees (slow scroll) */}
      <ScrollingLayer
        source={require('../../assets/Background_animations/Forest/evergreen_tree.png')}
        duration={TREES_SCROLL_DURATION}
        zIndex={2}
        style={styles.treesLayer}
      />

      {/* Layer 3: Foreground - Path (fastest scroll) - behind the buddy */}
      <ScrollingLayer
        source={require('../../assets/Background_animations/Forest/path_animation.png')}
        duration={PATH_SCROLL_DURATION}
        zIndex={3}
        style={styles.pathLayer}
      />

      {/* Layer 4: Trail Buddy (walking animation) - in front of trees and on top of path */}
      {showTrailBuddy && (
        <View style={[styles.buddyLayer, { zIndex: 4 }]}>
          <TrailBuddySprite buddyType={trailBuddyType} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  layerContainer: {
    position: 'absolute',
    left: 0,
    flexDirection: 'row',
    width: LAYER_WIDTH,
  },
  staticBackground: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
  scrollingImage: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
  // Sky layer - sunset colors visible only in top sky section (behind mountain)
  skyLayerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.35, // Only top 35% for the sky area
  },
  skyLayer: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
  // Mountain layer - covers full screen with lake in background
  mountainLayerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  mountainLayer: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
  treesLayer: {
    // Trees - positioned to sit on the yellow path
    // Path is at zIndex 4, trees at zIndex 2, so path renders on top
    height: SCREEN_HEIGHT * 0.50, // Tree layer height
    bottom: SCREEN_HEIGHT * 0.09, // Trees sit on the path
    top: undefined,
    position: 'absolute',
  },
  pathLayer: {
    // Path at the bottom - 35% of screen height
    height: SCREEN_HEIGHT * 0.35,
    bottom: 0,
    top: undefined,
    position: 'absolute',
  },
  buddyLayer: {
    position: 'absolute',
    bottom: SCREEN_HEIGHT * 0.08, // Position buddy walking on top of the path
    left: SCREEN_WIDTH * 0.38, // Centered on the path
    width: 140,
    height: 140,
  },
  buddyContainer: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spriteClipContainer: {
    width: 120,
    height: 120,
    overflow: 'hidden',
  },
  spritesheetImage: {
    width: SPRITESHEET_WIDTH * (120 / FRAME_HEIGHT), // Scale spritesheet to match display size
    height: 120,
  },
});

export default ParallaxForestBackground;
