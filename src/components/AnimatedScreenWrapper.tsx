import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';

interface AnimatedScreenWrapperProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Animation type: 'fade' | 'fadeUp' | 'fadeScale' */
  animationType?: 'fade' | 'fadeUp' | 'fadeScale';
  /** Duration in milliseconds */
  duration?: number;
  /** Delay before animation starts */
  delay?: number;
}

/**
 * Premium screen transition wrapper
 * Wraps screen content with smooth animations on focus
 *
 * Usage:
 * ```
 * <AnimatedScreenWrapper animationType="fadeUp">
 *   <YourScreenContent />
 * </AnimatedScreenWrapper>
 * ```
 */
export const AnimatedScreenWrapper: React.FC<AnimatedScreenWrapperProps> = ({
  children,
  style,
  animationType = 'fadeUp',
  duration = 300,
  delay = 0,
}) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(animationType === 'fadeUp' ? 12 : 0);
  const scale = useSharedValue(animationType === 'fadeScale' ? 0.97 : 1);

  useFocusEffect(
    React.useCallback(() => {
      // Reset values
      opacity.value = 0;
      if (animationType === 'fadeUp') {
        translateY.value = 12;
      }
      if (animationType === 'fadeScale') {
        scale.value = 0.97;
      }

      // Animate in
      const animate = () => {
        opacity.value = withTiming(1, {
          duration,
          easing: Easing.out(Easing.cubic),
        });

        if (animationType === 'fadeUp') {
          translateY.value = withTiming(0, {
            duration: duration + 50,
            easing: Easing.out(Easing.cubic),
          });
        }

        if (animationType === 'fadeScale') {
          scale.value = withTiming(1, {
            duration: duration + 50,
            easing: Easing.out(Easing.cubic),
          });
        }
      };

      if (delay > 0) {
        opacity.value = withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.cubic) }));
        if (animationType === 'fadeUp') {
          translateY.value = withDelay(delay, withTiming(0, { duration: duration + 50, easing: Easing.out(Easing.cubic) }));
        }
        if (animationType === 'fadeScale') {
          scale.value = withDelay(delay, withTiming(1, { duration: duration + 50, easing: Easing.out(Easing.cubic) }));
        }
      } else {
        animate();
      }

      return () => {
        // Quick fade out when leaving
        opacity.value = withTiming(0, { duration: 150 });
      };
    }, [animationType, duration, delay])
  );

  const animatedStyle = useAnimatedStyle(() => {
    const transforms: any[] = [];

    if (animationType === 'fadeUp') {
      transforms.push({ translateY: translateY.value });
    }
    if (animationType === 'fadeScale') {
      transforms.push({ scale: scale.value });
    }

    return {
      opacity: opacity.value,
      transform: transforms.length > 0 ? transforms : undefined,
    };
  });

  return (
    <Animated.View style={[styles.container, animatedStyle, style]}>
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default AnimatedScreenWrapper;
