/**
 * Premium Animation Utilities
 * Based on Chris Ro's Design Principles
 *
 * Provides reusable animation hooks and helpers for premium feel
 */

import { useEffect, useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  withRepeat,
  interpolate,
  Extrapolation,
  runOnJS,
  SharedValue,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { AnimationConfig, TimingConfig, StaggerDelay, HapticPatterns } from '../theme/premiumTheme';

// ============================================
// FOCUS-AWARE ANIMATION KEY
// Forces animations to replay on every screen focus
// ============================================
export const useFocusAnimationKey = () => {
  const [focusKey, setFocusKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      // Increment key on each focus to force remount of animated components
      setFocusKey(prev => prev + 1);
    }, [])
  );

  return focusKey;
};

// ============================================
// BUTTON PRESS ANIMATION
// ============================================
export const useButtonPressAnimation = () => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const onPressIn = useCallback(() => {
    scale.value = withSpring(0.95, AnimationConfig.snappy);
    opacity.value = withTiming(0.9, { duration: TimingConfig.instant });
  }, []);

  const onPressOut = useCallback(() => {
    scale.value = withSpring(1, AnimationConfig.bouncy);
    opacity.value = withTiming(1, { duration: TimingConfig.fast });
  }, []);

  return { animatedStyle, onPressIn, onPressOut };
};

// ============================================
// ENTRANCE ANIMATION (Fade + Slide)
// ============================================
export const useEntranceAnimation = (delay: number = 0) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  // Use focus-aware effect so animation triggers when screen becomes visible
  useEffect(() => {
    // Reset to initial state
    opacity.value = 0;
    translateY.value = 20;

    // Small delay to ensure layout is ready, then animate
    const timeoutId = setTimeout(() => {
      opacity.value = withDelay(delay, withTiming(1, { duration: TimingConfig.entrance }));
      translateY.value = withDelay(delay, withSpring(0, AnimationConfig.gentle));
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return animatedStyle;
};

// ============================================
// STAGGERED LIST ENTRANCE
// ============================================
export const useStaggeredEntrance = (
  itemCount: number,
  delayType: 'fast' | 'normal' | 'slow' = 'normal'
) => {
  const baseDelay = StaggerDelay[delayType];

  const getItemAnimation = useCallback((index: number) => {
    const delay = index * baseDelay;
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(30);

    useEffect(() => {
      opacity.value = withDelay(delay, withTiming(1, { duration: TimingConfig.entrance }));
      translateY.value = withDelay(delay, withSpring(0, AnimationConfig.gentle));
    }, []);

    return useAnimatedStyle(() => ({
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    }));
  }, [baseDelay]);

  return { getItemAnimation };
};

// ============================================
// PULSE ANIMATION (Heartbeat effect)
// ============================================
export const usePulseAnimation = (enabled: boolean = true) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (enabled) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1, // Infinite
        true
      );
    }
  }, [enabled]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return animatedStyle;
};

// ============================================
// SHIMMER/SKELETON LOADER
// ============================================
export const useShimmerAnimation = () => {
  const shimmerPosition = useSharedValue(-1);

  useEffect(() => {
    shimmerPosition.value = withRepeat(
      withTiming(2, { duration: 1500, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerPosition.value * 100 + '%' }],
  }));

  return shimmerStyle;
};

// ============================================
// SUCCESS CELEBRATION
// ============================================
export const useSuccessAnimation = () => {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(1);

  const celebrate = useCallback(() => {
    // Haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Bounce + slight rotation
    scale.value = withSequence(
      withSpring(1.2, AnimationConfig.bouncy),
      withSpring(0.9, AnimationConfig.quick),
      withSpring(1, AnimationConfig.standard)
    );

    rotation.value = withSequence(
      withTiming(-5, { duration: 100 }),
      withTiming(5, { duration: 100 }),
      withTiming(0, { duration: 100 })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return { animatedStyle, celebrate };
};

// ============================================
// TAB SWITCH ANIMATION
// ============================================
export const useTabSwitchAnimation = (isActive: boolean) => {
  const scale = useSharedValue(isActive ? 1 : 0.9);
  const opacity = useSharedValue(isActive ? 1 : 0.6);

  useEffect(() => {
    scale.value = withSpring(isActive ? 1 : 0.9, AnimationConfig.quick);
    opacity.value = withTiming(isActive ? 1 : 0.6, { duration: TimingConfig.fast });
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return animatedStyle;
};

// ============================================
// HOLOGRAPHIC SHINE EFFECT
// ============================================
export const useHolographicEffect = () => {
  const shinePosition = useSharedValue(0);

  useEffect(() => {
    shinePosition.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const holographicStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shinePosition.value, [0, 0.5, 1], [0.3, 0.8, 0.3]),
  }));

  return { shinePosition, holographicStyle };
};

// ============================================
// PROGRESS BAR ANIMATION
// ============================================
export const useProgressAnimation = (targetProgress: number) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(targetProgress, {
      duration: TimingConfig.slow,
      easing: Easing.bezier(0.33, 1, 0.68, 1),
    });
  }, [targetProgress]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return progressStyle;
};

// ============================================
// COUNTER ANIMATION (Numbers counting up)
// ============================================
export const useCounterAnimation = (
  targetValue: number,
  duration: number = 1000
) => {
  const count = useSharedValue(0);

  useEffect(() => {
    count.value = withTiming(targetValue, { duration });
  }, [targetValue, duration]);

  return count;
};

// ============================================
// HAPTIC FEEDBACK HELPERS
// ============================================
export const triggerHaptic = (type: keyof typeof HapticPatterns) => {
  switch (type) {
    case 'buttonPress':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      break;
    case 'success':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      break;
    case 'error':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      break;
    case 'warning':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      break;
    case 'selection':
      Haptics.selectionAsync();
      break;
    case 'milestone':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      break;
  }
};

// ============================================
// MODAL/SHEET ANIMATION
// ============================================
export const useModalAnimation = (isVisible: boolean) => {
  const translateY = useSharedValue(500);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (isVisible) {
      opacity.value = withTiming(1, { duration: TimingConfig.fast });
      translateY.value = withSpring(0, AnimationConfig.standard);
    } else {
      opacity.value = withTiming(0, { duration: TimingConfig.exit });
      translateY.value = withTiming(500, { duration: TimingConfig.exit });
    }
  }, [isVisible]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value * 0.5,
  }));

  return { containerStyle, backdropStyle };
};

// ============================================
// FLOATING ANIMATION (Subtle up/down)
// ============================================
export const useFloatingAnimation = () => {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return animatedStyle;
};

// ============================================
// NAVIGATION SLIDE ANIMATION (Slide-over effect)
// ============================================
export const useNavigationSlideAnimation = () => {
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
    ],
    opacity: opacity.value,
  }));

  const onPressIn = useCallback(() => {
    scale.value = withSpring(0.98, AnimationConfig.snappy);
    translateX.value = withSpring(4, AnimationConfig.snappy);
    opacity.value = withTiming(0.95, { duration: TimingConfig.instant });
  }, []);

  const onPressOut = useCallback(() => {
    scale.value = withSpring(1, AnimationConfig.bouncy);
    translateX.value = withSpring(0, AnimationConfig.bouncy);
    opacity.value = withTiming(1, { duration: TimingConfig.fast });
  }, []);

  // Slide out animation before navigation
  const slideOut = useCallback((callback: () => void) => {
    translateX.value = withTiming(20, { duration: 150 });
    opacity.value = withTiming(0.7, { duration: 150 }, () => {
      runOnJS(callback)();
    });
  }, []);

  return { animatedStyle, onPressIn, onPressOut, slideOut };
};
