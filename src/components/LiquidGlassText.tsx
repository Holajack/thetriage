/**
 * LiquidGlassText - Premium Liquid Glass Text Effect
 *
 * Features:
 * - Liquid glass material appearance with depth
 * - Flowing iridescent color animations
 * - Multi-layer glass reflections
 * - Smooth liquid motion effects
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
  interpolateColor,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';

// Liquid Glass Color Palette
const LIQUID_GLASS_COLORS = {
  // Base glass colors
  glassLight: '#F0F4F8',
  glassMid: '#D8E2EC',
  glassDark: '#B8C8D8',

  // Iridescent highlights
  iridescentBlue: '#A8D4F0',
  iridescentPurple: '#D4C4F0',
  iridescentPink: '#F0C4E0',
  iridescentCyan: '#C4F0F0',

  // Liquid shine
  liquidShine: '#FFFFFF',
  liquidHighlight: 'rgba(255, 255, 255, 0.95)',
  liquidReflection: 'rgba(200, 220, 255, 0.6)',

  // Glass depth
  glassEdge: 'rgba(180, 200, 220, 0.8)',
  glassShadow: 'rgba(100, 120, 140, 0.3)',
};

interface LiquidGlassTextProps {
  children: string;
  style?: TextStyle;
  variant?: 'liquid' | 'crystal' | 'frost' | 'aurora';
  speed?: 'slow' | 'medium' | 'fast';
  intensity?: 'subtle' | 'medium' | 'strong';
  delay?: number;
  width?: number;
  disabled?: boolean;
}

/**
 * Premium Liquid Glass Text
 * Creates a flowing, liquid glass material effect on text
 */
export const LiquidGlassText: React.FC<LiquidGlassTextProps> = ({
  children,
  style,
  variant = 'liquid',
  speed = 'medium',
  intensity = 'medium',
  delay = 0,
  width = 300,
  disabled = false,
}) => {
  // Animation values
  const colorPhase = useSharedValue(0);
  const shinePosition = useSharedValue(0);
  const liquidFlow = useSharedValue(0);
  const glowPulse = useSharedValue(0);

  // Speed settings
  const getSpeedDuration = () => {
    switch (speed) {
      case 'slow': return { color: 6000, shine: 4000, flow: 5000 };
      case 'fast': return { color: 2000, shine: 1500, flow: 2000 };
      default: return { color: 4000, shine: 2500, flow: 3500 };
    }
  };

  const durations = getSpeedDuration();

  // Intensity settings
  const getIntensitySettings = () => {
    switch (intensity) {
      case 'subtle': return { shineOpacity: 0.5, glowRadius: 6, colorRange: 0.3 };
      case 'strong': return { shineOpacity: 1, glowRadius: 16, colorRange: 1 };
      default: return { shineOpacity: 0.75, glowRadius: 10, colorRange: 0.6 };
    }
  };

  const intensitySettings = getIntensitySettings();

  // Get variant colors
  const getVariantColors = () => {
    switch (variant) {
      case 'crystal':
        return {
          gradient: [
            'rgba(220, 235, 255, 0.95)',
            'rgba(200, 220, 250, 1)',
            'rgba(180, 210, 255, 0.95)',
            'rgba(200, 220, 250, 1)',
            'rgba(220, 235, 255, 0.95)',
          ],
          iridescent: ['#C8E0FF', '#E0D0FF', '#D0E8FF'],
          shine: 'rgba(255, 255, 255, 0.98)',
        };
      case 'frost':
        return {
          gradient: [
            'rgba(230, 240, 250, 0.9)',
            'rgba(210, 225, 240, 0.95)',
            'rgba(190, 210, 230, 0.9)',
            'rgba(210, 225, 240, 0.95)',
            'rgba(230, 240, 250, 0.9)',
          ],
          iridescent: ['#E8F0F8', '#F0E8F8', '#E8F8F0'],
          shine: 'rgba(255, 255, 255, 0.85)',
        };
      case 'aurora':
        return {
          gradient: [
            'rgba(200, 230, 255, 0.95)',
            'rgba(220, 200, 255, 1)',
            'rgba(255, 200, 230, 0.95)',
            'rgba(200, 255, 240, 1)',
            'rgba(200, 230, 255, 0.95)',
          ],
          iridescent: ['#A0E0FF', '#E0A0FF', '#A0FFE0'],
          shine: 'rgba(255, 255, 255, 0.95)',
        };
      case 'liquid':
      default:
        return {
          gradient: [
            'rgba(200, 220, 245, 0.9)',
            'rgba(220, 235, 255, 1)',
            'rgba(240, 248, 255, 1)',
            'rgba(220, 235, 255, 1)',
            'rgba(200, 220, 245, 0.9)',
          ],
          iridescent: ['#B8D8F8', '#D8C8F8', '#C8E8F8'],
          shine: 'rgba(255, 255, 255, 0.95)',
        };
    }
  };

  const variantColors = getVariantColors();

  useEffect(() => {
    if (disabled) return;

    // Iridescent color cycling
    colorPhase.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, {
          duration: durations.color,
          easing: Easing.inOut(Easing.sine),
        }),
        -1,
        true
      )
    );

    // Liquid shine sweep
    shinePosition.value = withDelay(
      delay + 300,
      withRepeat(
        withSequence(
          withTiming(1, {
            duration: durations.shine,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
          }),
          withDelay(800, withTiming(0, { duration: 0 }))
        ),
        -1,
        false
      )
    );

    // Liquid flow animation
    liquidFlow.value = withDelay(
      delay + 500,
      withRepeat(
        withTiming(1, {
          duration: durations.flow,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      )
    );

    // Glow pulse
    glowPulse.value = withDelay(
      delay + 200,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sine) }),
          withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.sine) })
        ),
        -1,
        false
      )
    );
  }, [disabled, delay, durations]);

  // Animated iridescent color
  const iridescentStyle = useAnimatedStyle(() => {
    const progress = colorPhase.value * intensitySettings.colorRange;
    return {
      opacity: interpolate(progress, [0, 0.5, 1], [0.7, 1, 0.7]),
    };
  });

  // Shine sweep style
  const shineStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          shinePosition.value,
          [0, 1],
          [-width * 0.3, width * 1.3]
        ),
      },
      {
        skewX: '-20deg',
      },
    ],
    opacity: interpolate(
      shinePosition.value,
      [0, 0.1, 0.5, 0.9, 1],
      [0, intensitySettings.shineOpacity, intensitySettings.shineOpacity, intensitySettings.shineOpacity, 0]
    ),
  }));

  // Liquid flow gradient position
  const liquidGradientStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(liquidFlow.value, [0, 1], [-2, 2]),
      },
    ],
  }));

  // Glow effect
  const glowStyle = useAnimatedStyle(() => ({
    textShadowRadius: interpolate(
      glowPulse.value,
      [0, 1],
      [2, intensitySettings.glowRadius]
    ),
    textShadowColor: interpolateColor(
      glowPulse.value,
      [0, 1],
      ['rgba(200, 220, 255, 0.3)', 'rgba(200, 220, 255, 0.6)']
    ),
  }));

  if (disabled) {
    return (
      <Text style={[style, { color: LIQUID_GLASS_COLORS.glassMid }]}>
        {children}
      </Text>
    );
  }

  return (
    <View style={[styles.container, { width }]}>
      {/* Base liquid glass gradient layer */}
      <MaskedView
        style={StyleSheet.absoluteFill}
        maskElement={
          <Text style={[style, styles.maskText]}>{children}</Text>
        }
      >
        <Animated.View style={[StyleSheet.absoluteFill, liquidGradientStyle]}>
          <LinearGradient
            colors={variantColors.gradient}
            locations={[0, 0.25, 0.5, 0.75, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.3, y: 1 }}
            style={[StyleSheet.absoluteFill, { transform: [{ scale: 1.5 }] }]}
          />
        </Animated.View>
      </MaskedView>

      {/* Iridescent overlay layer */}
      <MaskedView
        style={StyleSheet.absoluteFill}
        maskElement={
          <Text style={[style, styles.maskText]}>{children}</Text>
        }
      >
        <Animated.View style={[StyleSheet.absoluteFill, iridescentStyle]}>
          <LinearGradient
            colors={[
              'transparent',
              variantColors.iridescent[0] + '40',
              variantColors.iridescent[1] + '50',
              variantColors.iridescent[2] + '40',
              'transparent',
            ]}
            locations={[0, 0.2, 0.5, 0.8, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </MaskedView>

      {/* Glass edge highlight (top) */}
      <MaskedView
        style={StyleSheet.absoluteFill}
        maskElement={
          <Text style={[style, styles.maskText]}>{children}</Text>
        }
      >
        <LinearGradient
          colors={[
            'rgba(255, 255, 255, 0.8)',
            'rgba(255, 255, 255, 0.2)',
            'transparent',
            'transparent',
          ]}
          locations={[0, 0.15, 0.3, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </MaskedView>

      {/* Liquid shine sweep */}
      <MaskedView
        style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}
        maskElement={
          <Text style={[style, styles.maskText]}>{children}</Text>
        }
      >
        <Animated.View style={[styles.shineBar, shineStyle]}>
          <LinearGradient
            colors={[
              'transparent',
              'rgba(255, 255, 255, 0.2)',
              'rgba(255, 255, 255, 0.5)',
              variantColors.shine,
              'rgba(255, 255, 255, 0.5)',
              'rgba(255, 255, 255, 0.2)',
              'transparent',
            ]}
            locations={[0, 0.15, 0.35, 0.5, 0.65, 0.85, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0.3 }}
            style={styles.shineGradient}
          />
        </Animated.View>
      </MaskedView>

      {/* Animated glow text overlay for depth */}
      <Animated.Text
        style={[
          style,
          styles.glowText,
          {
            textShadowOffset: { width: 0, height: 0 },
          },
          glowStyle,
        ]}
      >
        {children}
      </Animated.Text>
    </View>
  );
};

/**
 * Simple Liquid Glass - Lighter weight version
 */
export const SimpleLiquidGlass: React.FC<LiquidGlassTextProps> = ({
  children,
  style,
  variant = 'liquid',
  speed = 'medium',
  delay = 0,
  disabled = false,
}) => {
  const shimmer = useSharedValue(0);
  const colorShift = useSharedValue(0);

  const duration = speed === 'slow' ? 4000 : speed === 'fast' ? 1500 : 2500;

  useEffect(() => {
    if (disabled) return;

    shimmer.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration, easing: Easing.inOut(Easing.sine) }),
          withTiming(0, { duration, easing: Easing.inOut(Easing.sine) })
        ),
        -1,
        false
      )
    );

    colorShift.value = withDelay(
      delay + 500,
      withRepeat(
        withTiming(1, { duration: duration * 1.5, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      )
    );
  }, [disabled, delay, duration]);

  const getColors = () => {
    switch (variant) {
      case 'crystal':
        return { base: '#D0E8FF', highlight: '#F0F8FF', glow: 'rgba(200, 230, 255, 0.6)' };
      case 'frost':
        return { base: '#E0E8F0', highlight: '#F8FCFF', glow: 'rgba(220, 235, 250, 0.5)' };
      case 'aurora':
        return { base: '#D8E0FF', highlight: '#FFF0F8', glow: 'rgba(220, 200, 255, 0.5)' };
      default:
        return { base: '#D0E0F0', highlight: '#F0F8FF', glow: 'rgba(200, 220, 245, 0.6)' };
    }
  };

  const colors = getColors();

  const animatedStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      colorShift.value,
      [0, 0.5, 1],
      [colors.base, colors.highlight, colors.base]
    ),
    opacity: interpolate(shimmer.value, [0, 0.5, 1], [0.85, 1, 0.85]),
    textShadowColor: colors.glow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: interpolate(shimmer.value, [0, 0.5, 1], [4, 12, 4]),
  }));

  if (disabled) {
    return <Text style={[style, { color: colors.base }]}>{children}</Text>;
  }

  return (
    <Animated.Text style={[style, animatedStyle]}>
      {children}
    </Animated.Text>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  maskText: {
    color: '#000',
    backgroundColor: 'transparent',
  },
  shineBar: {
    position: 'absolute',
    top: -10,
    bottom: -10,
    width: 80,
  },
  shineGradient: {
    flex: 1,
  },
  glowText: {
    position: 'absolute',
    color: 'transparent',
  },
});

export { LIQUID_GLASS_COLORS };
export default LiquidGlassText;
