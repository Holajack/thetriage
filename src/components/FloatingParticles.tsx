import React from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ParticleConfig {
  size: number;
  startX: number;
  startY: number;
  travelY: number;
  duration: number;
  delay: number;
  maxOpacity: number;
  color: string;
}

const EASING = Easing.inOut(Easing.ease);

const Particle: React.FC<{ config: ParticleConfig }> = ({ config }) => {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    // Float upward continuously
    translateY.value = withDelay(
      config.delay,
      withRepeat(
        withTiming(-config.travelY, {
          duration: config.duration,
          easing: Easing.out(Easing.ease),
        }),
        -1,
        false,
      ),
    );

    // Fade in then out over the travel duration
    opacity.value = withDelay(
      config.delay,
      withRepeat(
        withSequence(
          withTiming(config.maxOpacity, { duration: config.duration * 0.3, easing: EASING }),
          withTiming(config.maxOpacity, { duration: config.duration * 0.3 }),
          withTiming(0, { duration: config.duration * 0.4, easing: EASING }),
        ),
        -1,
        false,
      ),
    );

    // Cleanup: cancel animations on unmount
    return () => {
      cancelAnimation(translateY);
      cancelAnimation(opacity);
    };
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
          backgroundColor: config.color,
          left: config.startX,
          top: config.startY,
        },
        animStyle,
      ]}
    />
  );
};

interface FloatingParticlesProps {
  isDark: boolean;
}

// Deterministic "random" positions spread across the screen
const getParticles = (isDark: boolean): ParticleConfig[] => {
  const color = isDark ? 'rgb(255, 255, 255)' : 'rgb(56, 142, 60)';
  const positions = [0.08, 0.22, 0.38, 0.52, 0.68, 0.82, 0.93];
  const startYBase = SCREEN_HEIGHT * 0.45;

  return positions.map((xRatio, i) => ({
    size: 3 + (i % 3) * 1.5, // 3, 4.5, 6, 3, 4.5, 6, 3
    startX: SCREEN_WIDTH * xRatio,
    startY: startYBase + (i % 3) * 30 - 30, // stagger vertical start
    travelY: 150 + (i % 3) * 40,
    duration: 5000 + (i % 4) * 1000, // 5s, 6s, 7s, 8s cycle
    delay: i * 700,
    maxOpacity: isDark ? 0.18 + (i % 3) * 0.06 : 0.12 + (i % 3) * 0.05,
    color,
  }));
};

export const FloatingParticles: React.FC<FloatingParticlesProps> = ({ isDark }) => {
  const particles = React.useMemo(() => getParticles(isDark), [isDark]);

  return (
    <>
      {particles.map((particle, index) => (
        <Particle key={index} config={particle} />
      ))}
    </>
  );
};

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
  },
});
