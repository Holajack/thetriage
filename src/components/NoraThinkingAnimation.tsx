/**
 * NoraThinkingAnimation - Smooth Shine Effect
 *
 * Features:
 * - Full text displayed immediately
 * - Smooth left-to-right shine wave
 * - Uses theme colors from user's environment
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
  interpolate,
} from 'react-native-reanimated';

interface NoraThinkingAnimationProps {
  steps: string[];
  isDark?: boolean;
  textColor?: string;
  shineColor?: string;
}

// Character with smooth shine based on wave position
const WaveCharacter: React.FC<{
  char: string;
  index: number;
  totalChars: number;
  wavePosition: Animated.SharedValue<number>;
  baseColor: string;
  shineColor: string;
}> = ({ char, index, totalChars, wavePosition, baseColor, shineColor }) => {
  // Calculate this character's position as a percentage (0-1)
  const charPosition = totalChars > 1 ? index / (totalChars - 1) : 0;

  const animatedStyle = useAnimatedStyle(() => {
    // Create smooth wave - character brightens as wave passes through
    // Wave width controls how "wide" the shine is (0.3 = 30% of text width)
    const waveWidth = 0.25;
    const distance = Math.abs(wavePosition.value - charPosition);

    // Smooth falloff - closer to wave center = brighter
    const brightness = interpolate(
      distance,
      [0, waveWidth / 2, waveWidth],
      [1, 0.5, 0],
      'clamp'
    );

    return {
      opacity: interpolate(brightness, [0, 1], [0.7, 1]),
      color: brightness > 0.3 ? shineColor : baseColor,
      textShadowColor: shineColor,
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: interpolate(brightness, [0, 1], [0, 4]),
    };
  });

  return (
    <Animated.Text style={[styles.char, animatedStyle]}>
      {char}
    </Animated.Text>
  );
};

// Main thinking animation component
export const NoraThinkingAnimation: React.FC<NoraThinkingAnimationProps> = ({
  steps,
  isDark = true,
  textColor,
  shineColor,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const wavePosition = useSharedValue(-0.2);
  const textOpacity = useSharedValue(1);

  // Default colors based on theme if not provided
  const baseColor = textColor || (isDark ? '#8A9BB0' : '#5A6B7D');
  const highlightColor = shineColor || (isDark ? '#C8D8E8' : '#4A5B6D');

  const currentText = steps[currentStep] || 'Thinking...';
  const chars = currentText.split('');

  // Continuous wave animation
  useEffect(() => {
    wavePosition.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withDelay(400, withTiming(-0.2, { duration: 0 }))
      ),
      -1,
      false
    );
  }, []);

  // Cycle through steps
  useEffect(() => {
    if (steps.length <= 1) return;

    const stepInterval = setInterval(() => {
      // Fade out
      textOpacity.value = withTiming(0.3, { duration: 150 });

      setTimeout(() => {
        setCurrentStep((prev) => (prev + 1) % steps.length);
        // Fade in
        textOpacity.value = withTiming(1, { duration: 200 });
      }, 150);
    }, 3500);

    return () => clearInterval(stepInterval);
  }, [steps.length]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <View style={styles.textRow}>
        {chars.map((char, index) => (
          <WaveCharacter
            key={`${currentStep}-${index}`}
            char={char}
            index={index}
            totalChars={chars.length}
            wavePosition={wavePosition}
            baseColor={baseColor}
            shineColor={highlightColor}
          />
        ))}
      </View>
    </Animated.View>
  );
};

// Simple dots for other uses
export const NoraThinkingDots: React.FC<{ isDark?: boolean; color?: string }> = ({
  isDark = true,
  color,
}) => {
  const dotColor = color || (isDark ? '#7A8B9D' : '#5A6B7D');
  const [activeDot, setActiveDot] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveDot((prev) => (prev + 1) % 3);
    }, 300);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.dotsContainer}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={[
            styles.dot,
            {
              backgroundColor: dotColor,
              opacity: activeDot === i ? 1 : 0.3,
            },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  textRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  char: {
    fontSize: 15,
    fontStyle: 'italic',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
});

export default NoraThinkingAnimation;
