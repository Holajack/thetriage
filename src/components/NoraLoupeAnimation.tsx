/**
 * NoraLoupeAnimation - macOS Preview-style Loupe/Magnifying Glass Animation
 *
 * Features:
 * - Circular glass lens with reflections
 * - Dark cap/rim at top (like a jeweler's loupe)
 * - Subtle pulsing and shimmer effects while thinking
 * - Clean, minimal glass aesthetic
 */

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  interpolate,
  Easing,
} from 'react-native-reanimated';

interface NoraLoupeAnimationProps {
  size?: number;
  isDark?: boolean;
}

export const NoraLoupeAnimation: React.FC<NoraLoupeAnimationProps> = ({
  size = 80,
  isDark = true,
}) => {
  // Animation values
  const shimmerX = useSharedValue(-1);
  const pulseScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);
  const innerRotation = useSharedValue(0);

  useEffect(() => {
    // Shimmer sweep across the glass
    shimmerX.value = withRepeat(
      withTiming(2, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      false
    );

    // Subtle pulse effect
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Glow pulsing
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.2, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Inner content rotation (subtle scanning effect)
    innerRotation.value = withRepeat(
      withTiming(360, { duration: 8000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  // Animated styles
  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(shimmerX.value, [-1, 2], [-size, size * 1.5]) },
      { rotate: '45deg' },
    ],
    opacity: 0.6,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const innerContentStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${innerRotation.value}deg` }],
  }));

  const glassSize = size;
  const capWidth = size * 0.7;
  const capHeight = size * 0.22;

  // Colors based on theme
  const colors = isDark
    ? {
        glassOuter: ['#4A5568', '#2D3748', '#1A202C'],
        glassInner: ['#718096', '#4A5568', '#2D3748'],
        glassCenter: ['#A0AEC0', '#718096', '#4A5568'],
        capGradient: ['#1A1A1A', '#2D2D2D', '#1A1A1A'],
        capRing: '#0D0D0D',
        highlight: 'rgba(255, 255, 255, 0.4)',
        shimmer: ['transparent', 'rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.5)', 'rgba(255, 255, 255, 0.3)', 'transparent'],
        glow: 'rgba(123, 97, 255, 0.4)',
        innerDots: 'rgba(123, 97, 255, 0.6)',
      }
    : {
        glassOuter: ['#CBD5E0', '#A0AEC0', '#718096'],
        glassInner: ['#E2E8F0', '#CBD5E0', '#A0AEC0'],
        glassCenter: ['#F7FAFC', '#EDF2F7', '#E2E8F0'],
        capGradient: ['#2D2D2D', '#3D3D3D', '#2D2D2D'],
        capRing: '#1A1A1A',
        highlight: 'rgba(255, 255, 255, 0.6)',
        shimmer: ['transparent', 'rgba(255, 255, 255, 0.4)', 'rgba(255, 255, 255, 0.7)', 'rgba(255, 255, 255, 0.4)', 'transparent'],
        glow: 'rgba(123, 97, 255, 0.3)',
        innerDots: 'rgba(123, 97, 255, 0.5)',
      };

  return (
    <Animated.View style={[styles.container, containerStyle, { width: size, height: size + capHeight }]}>
      {/* Outer glow */}
      <Animated.View
        style={[
          styles.outerGlow,
          glowStyle,
          {
            width: size + 20,
            height: size + 20,
            borderRadius: (size + 20) / 2,
            backgroundColor: colors.glow,
            top: capHeight - 10,
          },
        ]}
      />

      {/* Glass body */}
      <View style={[styles.glassBody, { width: glassSize, height: glassSize, borderRadius: glassSize / 2, top: capHeight }]}>
        {/* Outer glass ring */}
        <LinearGradient
          colors={colors.glassOuter as any}
          style={[styles.glassLayer, { width: glassSize, height: glassSize, borderRadius: glassSize / 2 }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Middle glass layer */}
          <LinearGradient
            colors={colors.glassInner as any}
            style={[
              styles.glassLayer,
              {
                width: glassSize * 0.85,
                height: glassSize * 0.85,
                borderRadius: (glassSize * 0.85) / 2,
              },
            ]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
          >
            {/* Inner glass (viewing area) */}
            <LinearGradient
              colors={colors.glassCenter as any}
              style={[
                styles.glassLayer,
                styles.innerGlass,
                {
                  width: glassSize * 0.7,
                  height: glassSize * 0.7,
                  borderRadius: (glassSize * 0.7) / 2,
                },
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {/* Animated inner content (scanning dots) */}
              <Animated.View style={[styles.innerContent, innerContentStyle]}>
                <View style={[styles.scanDot, { backgroundColor: colors.innerDots, top: '20%', left: '50%' }]} />
                <View style={[styles.scanDot, { backgroundColor: colors.innerDots, top: '50%', left: '25%' }]} />
                <View style={[styles.scanDot, { backgroundColor: colors.innerDots, top: '50%', left: '75%' }]} />
                <View style={[styles.scanDot, { backgroundColor: colors.innerDots, top: '75%', left: '50%' }]} />
              </Animated.View>

              {/* Glass highlight reflection */}
              <View
                style={[
                  styles.glassHighlight,
                  {
                    backgroundColor: colors.highlight,
                    width: glassSize * 0.25,
                    height: glassSize * 0.12,
                    top: glassSize * 0.08,
                    left: glassSize * 0.12,
                  },
                ]}
              />
            </LinearGradient>
          </LinearGradient>
        </LinearGradient>

        {/* Shimmer sweep effect */}
        <Animated.View style={[styles.shimmerContainer, shimmerStyle]}>
          <LinearGradient
            colors={colors.shimmer as any}
            style={[styles.shimmer, { height: glassSize * 1.5 }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        </Animated.View>
      </View>

      {/* Cap/rim at top */}
      <View style={[styles.capContainer, { width: capWidth, height: capHeight }]}>
        {/* Cap outer ring */}
        <View style={[styles.capRing, { backgroundColor: colors.capRing, width: capWidth, height: capHeight, borderRadius: capHeight / 2 }]}>
          {/* Cap gradient body */}
          <LinearGradient
            colors={colors.capGradient as any}
            style={[styles.capBody, { width: capWidth - 4, height: capHeight - 4, borderRadius: (capHeight - 4) / 2 }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          >
            {/* Cap ridges (texture lines) */}
            <View style={styles.capRidges}>
              {[...Array(8)].map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.capRidge,
                    {
                      left: `${12 + i * 10}%`,
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    },
                  ]}
                />
              ))}
            </View>

            {/* Cap highlight */}
            <View style={styles.capHighlight} />
          </LinearGradient>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  outerGlow: {
    position: 'absolute',
    alignSelf: 'center',
  },
  glassBody: {
    position: 'absolute',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  glassLayer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerGlass: {
    overflow: 'hidden',
  },
  innerContent: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  scanDot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    marginLeft: -2,
    marginTop: -2,
  },
  glassHighlight: {
    position: 'absolute',
    borderRadius: 100,
    transform: [{ rotate: '-30deg' }],
  },
  shimmerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  shimmer: {
    width: 30,
  },
  capContainer: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
    zIndex: 10,
  },
  capRing: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 6,
  },
  capBody: {
    overflow: 'hidden',
  },
  capRidges: {
    flexDirection: 'row',
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  capRidge: {
    position: 'absolute',
    top: '20%',
    bottom: '20%',
    width: 1,
  },
  capHighlight: {
    position: 'absolute',
    top: 2,
    left: '10%',
    right: '10%',
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 1,
  },
});

export default NoraLoupeAnimation;
