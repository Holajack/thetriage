/**
 * PremiumShimmerText - Silver Glass Shine Animation
 *
 * Features:
 * - Elegant silver/chrome metallic text appearance
 * - Glass-like shine sweep effect
 * - Subtle reflections and highlights
 * - Premium, luxurious feel
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TextStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';

// Silver/Chrome color palette
const SILVER_PALETTE = {
  // Base silver tones
  silver: '#C0C0C0',
  silverLight: '#E8E8E8',
  silverDark: '#A8A8A8',

  // Chrome/metallic highlights
  chrome: '#F5F5F5',
  chromeHighlight: '#FFFFFF',
  chromeShadow: '#909090',

  // Glass effects
  glassShine: 'rgba(255, 255, 255, 0.9)',
  glassReflection: 'rgba(255, 255, 255, 0.6)',
  glassFrost: 'rgba(200, 210, 220, 0.3)',
};

interface PremiumShimmerTextProps {
  children: string;
  style?: TextStyle;
  variant?: 'silver' | 'chrome' | 'glass' | 'frost';
  duration?: number;
  delay?: number;
  width?: number;
  disabled?: boolean;
  intensity?: 'subtle' | 'medium' | 'strong';
}

/**
 * Silver Glass Shine Text - Premium metallic text with glass shine sweep
 */
export const ShineText: React.FC<PremiumShimmerTextProps> = ({
  children,
  style,
  variant = 'silver',
  duration = 2500,
  delay = 1000,
  width = 200,
  disabled = false,
  intensity = 'medium',
}) => {
  const shinePosition = useSharedValue(0);

  // Get colors based on variant
  const getColors = () => {
    switch (variant) {
      case 'chrome':
        return {
          base: SILVER_PALETTE.chrome,
          highlight: SILVER_PALETTE.chromeHighlight,
          shadow: SILVER_PALETTE.chromeShadow,
          shine: 'rgba(255, 255, 255, 0.95)',
        };
      case 'glass':
        return {
          base: SILVER_PALETTE.silverLight,
          highlight: SILVER_PALETTE.glassShine,
          shadow: SILVER_PALETTE.silverDark,
          shine: 'rgba(255, 255, 255, 0.85)',
        };
      case 'frost':
        return {
          base: 'rgba(220, 225, 235, 0.9)',
          highlight: 'rgba(255, 255, 255, 0.95)',
          shadow: 'rgba(180, 185, 195, 0.8)',
          shine: 'rgba(255, 255, 255, 0.7)',
        };
      case 'silver':
      default:
        return {
          base: SILVER_PALETTE.silver,
          highlight: SILVER_PALETTE.silverLight,
          shadow: SILVER_PALETTE.silverDark,
          shine: SILVER_PALETTE.glassShine,
        };
    }
  };

  const colors = getColors();

  // Shine intensity settings
  const getIntensitySettings = () => {
    switch (intensity) {
      case 'subtle':
        return { shineWidth: 40, opacity: 0.6 };
      case 'strong':
        return { shineWidth: 80, opacity: 1 };
      case 'medium':
      default:
        return { shineWidth: 60, opacity: 0.85 };
    }
  };

  const intensitySettings = getIntensitySettings();

  useEffect(() => {
    if (disabled) return;

    shinePosition.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, {
            duration: duration,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          }),
          withDelay(1500, withTiming(0, { duration: 0 })) // Pause between shines
        ),
        -1,
        false
      )
    );
  }, [disabled, delay, duration]);

  const shineStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          shinePosition.value,
          [0, 1],
          [-width * 0.5, width * 1.5]
        ),
      },
    ],
    opacity: interpolate(
      shinePosition.value,
      [0, 0.15, 0.5, 0.85, 1],
      [0, intensitySettings.opacity, intensitySettings.opacity, intensitySettings.opacity, 0]
    ),
  }));

  if (disabled) {
    return <Text style={[style, { color: colors.base }]}>{children}</Text>;
  }

  return (
    <View style={[styles.shineContainer, { width }]}>
      {/* Base silver text with subtle gradient effect */}
      <MaskedView
        style={StyleSheet.absoluteFill}
        maskElement={
          <Text style={[style, styles.maskText]}>{children}</Text>
        }
      >
        <LinearGradient
          colors={[colors.shadow, colors.base, colors.highlight, colors.base, colors.shadow]}
          locations={[0, 0.3, 0.5, 0.7, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </MaskedView>

      {/* Glass shine sweep overlay */}
      <MaskedView
        style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}
        maskElement={
          <Text style={[style, styles.maskText]}>{children}</Text>
        }
      >
        <Animated.View style={[styles.shineBar, { width: intensitySettings.shineWidth }, shineStyle]}>
          <LinearGradient
            colors={[
              'transparent',
              'rgba(255, 255, 255, 0.3)',
              colors.shine,
              'rgba(255, 255, 255, 0.3)',
              'transparent',
            ]}
            locations={[0, 0.2, 0.5, 0.8, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.shineGradient}
          />
        </Animated.View>
      </MaskedView>
    </View>
  );
};

/**
 * Silver Shimmer Text - Subtle pulsing glow effect with silver tones
 */
export const SimpleShimmerText: React.FC<PremiumShimmerTextProps> = ({
  children,
  style,
  variant = 'silver',
  duration = 3000,
  delay = 0,
  disabled = false,
  intensity = 'medium',
}) => {
  const shimmerOpacity = useSharedValue(0);
  const glowIntensity = useSharedValue(0);

  // Get colors based on variant
  const getColors = () => {
    switch (variant) {
      case 'chrome':
        return {
          base: SILVER_PALETTE.chrome,
          glow: 'rgba(255, 255, 255, 0.8)',
        };
      case 'glass':
        return {
          base: SILVER_PALETTE.silverLight,
          glow: 'rgba(200, 220, 255, 0.6)',
        };
      case 'frost':
        return {
          base: 'rgba(210, 215, 225, 0.95)',
          glow: 'rgba(180, 200, 230, 0.5)',
        };
      case 'silver':
      default:
        return {
          base: SILVER_PALETTE.silver,
          glow: 'rgba(255, 255, 255, 0.6)',
        };
    }
  };

  const colors = getColors();

  // Intensity multiplier
  const getIntensityMultiplier = () => {
    switch (intensity) {
      case 'subtle': return 0.5;
      case 'strong': return 1.5;
      default: return 1;
    }
  };

  const intensityMult = getIntensityMultiplier();

  useEffect(() => {
    if (disabled) return;

    shimmerOpacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, {
            duration: duration / 2,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(0, {
            duration: duration / 2,
            easing: Easing.inOut(Easing.ease),
          })
        ),
        -1,
        false
      )
    );

    glowIntensity.value = withDelay(
      delay + 200,
      withRepeat(
        withSequence(
          withTiming(1, {
            duration: duration / 2 + 400,
            easing: Easing.inOut(Easing.sine),
          }),
          withTiming(0, {
            duration: duration / 2 + 400,
            easing: Easing.inOut(Easing.sine),
          })
        ),
        -1,
        false
      )
    );
  }, [disabled, delay, duration]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmerOpacity.value, [0, 0.5, 1], [0.8, 1, 0.8]),
    textShadowColor: colors.glow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: interpolate(glowIntensity.value, [0, 1], [0, 12 * intensityMult]),
  }));

  if (disabled) {
    return <Text style={[style, { color: colors.base }]}>{children}</Text>;
  }

  return (
    <Animated.Text style={[style, { color: colors.base }, animatedStyle]}>
      {children}
    </Animated.Text>
  );
};

/**
 * Frosted Glass Text - Glass morphism effect with silver tones
 */
export const FrostedGlassText: React.FC<PremiumShimmerTextProps> = ({
  children,
  style,
  duration = 4000,
  delay = 0,
  width = 200,
  disabled = false,
}) => {
  const frostShimmer = useSharedValue(0);
  const reflectionPos = useSharedValue(0);

  useEffect(() => {
    if (disabled) return;

    // Subtle frost shimmer
    frostShimmer.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: duration / 2, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: duration / 2, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      )
    );

    // Slow reflection movement
    reflectionPos.value = withDelay(
      delay + 500,
      withRepeat(
        withTiming(1, { duration: duration * 1.5, easing: Easing.linear }),
        -1,
        false
      )
    );
  }, [disabled, delay, duration]);

  const textStyle = useAnimatedStyle(() => ({
    opacity: interpolate(frostShimmer.value, [0, 1], [0.85, 1]),
  }));

  const reflectionStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(reflectionPos.value, [0, 1], [-width, width * 2]),
      },
    ],
    opacity: interpolate(
      reflectionPos.value,
      [0, 0.2, 0.5, 0.8, 1],
      [0, 0.4, 0.6, 0.4, 0]
    ),
  }));

  if (disabled) {
    return <Text style={[style, { color: SILVER_PALETTE.silverLight }]}>{children}</Text>;
  }

  return (
    <View style={[styles.frostedContainer, { width }]}>
      {/* Base frosted text */}
      <Animated.Text
        style={[
          style,
          {
            color: SILVER_PALETTE.silverLight,
            textShadowColor: 'rgba(255, 255, 255, 0.3)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 2,
          },
          textStyle,
        ]}
      >
        {children}
      </Animated.Text>

      {/* Reflection overlay */}
      <MaskedView
        style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}
        maskElement={
          <Text style={[style, styles.maskText]}>{children}</Text>
        }
      >
        <Animated.View style={[styles.reflectionBar, reflectionStyle]}>
          <LinearGradient
            colors={[
              'transparent',
              'rgba(255, 255, 255, 0.15)',
              'rgba(255, 255, 255, 0.4)',
              'rgba(255, 255, 255, 0.15)',
              'transparent',
            ]}
            locations={[0, 0.3, 0.5, 0.7, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0.3 }}
            style={styles.reflectionGradient}
          />
        </Animated.View>
      </MaskedView>
    </View>
  );
};

const styles = StyleSheet.create({
  maskText: {
    color: '#000',
    backgroundColor: 'transparent',
  },
  shineContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  shineBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  shineGradient: {
    flex: 1,
  },
  frostedContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  reflectionBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 100,
  },
  reflectionGradient: {
    flex: 1,
  },
});

// Re-export for convenience
export { SILVER_PALETTE };
export default ShineText;
