/**
 * Premium Animated Button
 * Based on Chris Ro's "Ellie Dictation" pattern
 *
 * Features:
 * - Spring scale on press
 * - Haptic feedback
 * - Optional loading state with shimmer
 * - Success/error state transitions
 */

import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, ViewStyle, TextStyle, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  interpolateColor,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimationConfig, TimingConfig, Typography, BorderRadius, Shadows, Spacing } from '../../theme/premiumTheme';
import { useTheme } from '../../context/ThemeContext';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface AnimatedButtonProps {
  title: string;
  onPress: () => void | Promise<void>;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  gradient?: boolean;
  gradientColors?: string[];
  style?: ViewStyle;
  textStyle?: TextStyle;
  hapticFeedback?: boolean;
  successState?: boolean;
  fullWidth?: boolean;
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  gradient = false,
  gradientColors,
  style,
  textStyle,
  hapticFeedback = true,
  successState = false,
  fullWidth = false,
}) => {
  const { theme } = useTheme();
  const [isPressed, setIsPressed] = useState(false);

  // Animation values
  const scale = useSharedValue(1);
  const backgroundColor = useSharedValue(0);
  const successProgress = useSharedValue(0);

  // Handle press animations
  const handlePressIn = useCallback(() => {
    setIsPressed(true);
    scale.value = withSpring(0.95, AnimationConfig.snappy);
    if (hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [hapticFeedback]);

  const handlePressOut = useCallback(() => {
    setIsPressed(false);
    scale.value = withSpring(1, AnimationConfig.bouncy);
  }, []);

  const handlePress = useCallback(async () => {
    if (disabled || loading) return;

    // Celebration animation on success
    if (successState) {
      successProgress.value = withSequence(
        withSpring(1.1, AnimationConfig.bouncy),
        withSpring(1, AnimationConfig.standard)
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    await onPress();
  }, [disabled, loading, onPress, successState]);

  // Animated styles
  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Get styles based on variant and size
  const getContainerStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: BorderRadius.lg,
      ...Shadows.md,
    };

    // Size styles
    const sizeStyles: Record<string, ViewStyle> = {
      small: { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.md, minHeight: 36 },
      medium: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg, minHeight: 48 },
      large: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, minHeight: 56 },
    };

    // Variant styles
    const variantStyles: Record<string, ViewStyle> = {
      primary: { backgroundColor: theme.primary },
      secondary: { backgroundColor: theme.card },
      outline: { backgroundColor: 'transparent', borderWidth: 2, borderColor: theme.primary },
      ghost: { backgroundColor: 'transparent', ...{ shadowOpacity: 0 } },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...(disabled && { opacity: 0.5 }),
      ...(fullWidth && { width: '100%' }),
    };
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      ...Typography.label,
      textTransform: 'none',
      fontWeight: '600',
    };

    const sizeStyles: Record<string, TextStyle> = {
      small: { fontSize: 13 },
      medium: { fontSize: 15 },
      large: { fontSize: 17 },
    };

    const variantStyles: Record<string, TextStyle> = {
      primary: { color: '#FFFFFF' },
      secondary: { color: theme.text },
      outline: { color: theme.primary },
      ghost: { color: theme.primary },
    };

    return { ...baseStyle, ...sizeStyles[size], ...variantStyles[variant] };
  };

  const containerStyle = getContainerStyle();
  const computedTextStyle = getTextStyle();

  // Render content
  const renderContent = () => (
    <>
      {icon && iconPosition === 'left' && <Animated.View style={styles.iconLeft}>{icon}</Animated.View>}
      {loading ? (
        <Text style={[computedTextStyle, textStyle]}>Loading...</Text>
      ) : (
        <Text style={[computedTextStyle, textStyle]}>{title}</Text>
      )}
      {icon && iconPosition === 'right' && <Animated.View style={styles.iconRight}>{icon}</Animated.View>}
    </>
  );

  // Gradient button
  if (gradient && variant === 'primary') {
    const colors = gradientColors || [theme.primary, adjustColor(theme.primary, -20)];

    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[animatedContainerStyle, style]}
      >
        <LinearGradient
          colors={colors as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[containerStyle, styles.gradientContainer]}
        >
          {renderContent()}
        </LinearGradient>
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[animatedContainerStyle, containerStyle, style]}
    >
      {renderContent()}
    </AnimatedPressable>
  );
};

// Helper to darken/lighten colors
const adjustColor = (color: string, amount: number): string => {
  const hex = color.replace('#', '');
  const num = parseInt(hex, 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
};

const styles = StyleSheet.create({
  iconLeft: {
    marginRight: Spacing.xs,
  },
  iconRight: {
    marginLeft: Spacing.xs,
  },
  gradientContainer: {
    overflow: 'hidden',
  },
});

export default AnimatedButton;
