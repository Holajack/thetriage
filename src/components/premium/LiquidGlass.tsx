import React from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';

interface LiquidGlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: 'subtle' | 'medium' | 'strong';
  variant?: 'light' | 'dark' | 'adaptive';
  borderRadius?: number;
  padding?: number;
  showBorder?: boolean;
  showGlow?: boolean;
}

/**
 * LiquidGlassCard - Apple-inspired frosted glass effect component
 *
 * Creates a translucent, blurred background with subtle borders and optional glow.
 * Inspired by iOS/visionOS liquid glass design language.
 */
export const LiquidGlassCard: React.FC<LiquidGlassCardProps> = ({
  children,
  style,
  intensity = 'medium',
  variant = 'adaptive',
  borderRadius = 16,
  padding = 16,
  showBorder = true,
  showGlow = false,
}) => {
  const { theme, isDark } = useTheme();

  // Determine blur intensity based on prop
  const blurIntensity = {
    subtle: 20,
    medium: 40,
    strong: 60,
  }[intensity];

  // Determine tint based on variant
  const tint = variant === 'adaptive'
    ? (isDark ? 'dark' : 'light')
    : variant;

  // Background colors for the glass effect
  const glassColors = isDark
    ? {
        background: 'rgba(255, 255, 255, 0.08)',
        border: 'rgba(255, 255, 255, 0.15)',
        gradientStart: 'rgba(255, 255, 255, 0.12)',
        gradientEnd: 'rgba(255, 255, 255, 0.04)',
        glow: 'rgba(255, 255, 255, 0.1)',
      }
    : {
        background: 'rgba(255, 255, 255, 0.7)',
        border: 'rgba(255, 255, 255, 0.5)',
        gradientStart: 'rgba(255, 255, 255, 0.9)',
        gradientEnd: 'rgba(255, 255, 255, 0.6)',
        glow: 'rgba(255, 255, 255, 0.3)',
      };

  return (
    <View
      style={[
        styles.container,
        {
          borderRadius,
          ...(showGlow && {
            shadowColor: isDark ? '#FFFFFF' : '#000000',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: isDark ? 0.15 : 0.1,
            shadowRadius: 20,
            elevation: 8,
          }),
        },
        style,
      ]}
    >
      {/* Blur Layer */}
      <BlurView
        intensity={blurIntensity}
        tint={tint}
        style={[
          styles.blurView,
          { borderRadius },
        ]}
      />

      {/* Glass overlay gradient */}
      <LinearGradient
        colors={[glassColors.gradientStart, glassColors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[
          styles.gradient,
          { borderRadius },
        ]}
      />

      {/* Border overlay */}
      {showBorder && (
        <View
          style={[
            styles.border,
            {
              borderRadius,
              borderColor: glassColors.border,
            },
          ]}
        />
      )}

      {/* Content */}
      <View style={[styles.content, { padding }]}>
        {children}
      </View>
    </View>
  );
};

interface LiquidGlassButtonProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: 'subtle' | 'medium' | 'strong';
}

/**
 * LiquidGlassButton - A button with liquid glass styling
 */
export const LiquidGlassButton: React.FC<LiquidGlassButtonProps> = ({
  children,
  style,
  intensity = 'subtle',
}) => {
  return (
    <LiquidGlassCard
      style={style}
      intensity={intensity}
      borderRadius={12}
      padding={12}
      showBorder={true}
      showGlow={false}
    >
      {children}
    </LiquidGlassCard>
  );
};

interface LiquidGlassHeaderProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

/**
 * LiquidGlassHeader - A header bar with liquid glass effect
 */
export const LiquidGlassHeader: React.FC<LiquidGlassHeaderProps> = ({
  children,
  style,
}) => {
  const { isDark } = useTheme();

  return (
    <View style={[styles.headerContainer, style]}>
      <BlurView
        intensity={50}
        tint={isDark ? 'dark' : 'light'}
        style={styles.headerBlur}
      />
      <LinearGradient
        colors={
          isDark
            ? ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']
            : ['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.headerGradient}
      />
      <View
        style={[
          styles.headerBorder,
          {
            borderBottomColor: isDark
              ? 'rgba(255, 255, 255, 0.1)'
              : 'rgba(0, 0, 0, 0.1)',
          },
        ]}
      />
      <View style={styles.headerContent}>
        {children}
      </View>
    </View>
  );
};

/**
 * Glass overlay styles for existing components
 * Use these as style presets for quick glass effects
 */
export const glassStyles = {
  // Subtle glass effect for cards
  subtleCard: (isDark: boolean): ViewStyle => ({
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.5)',
    shadowColor: isDark ? '#FFFFFF' : '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.05 : 0.08,
    shadowRadius: 12,
    elevation: 3,
  }),

  // Medium glass effect
  mediumCard: (isDark: boolean): ViewStyle => ({
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.6)',
    shadowColor: isDark ? '#FFFFFF' : '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.08 : 0.1,
    shadowRadius: 16,
    elevation: 4,
  }),

  // Strong glass effect with glow
  glowCard: (isDark: boolean): ViewStyle => ({
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1.5,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.7)',
    shadowColor: isDark ? '#FFFFFF' : '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: isDark ? 0.15 : 0.12,
    shadowRadius: 24,
    elevation: 6,
  }),
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
  blurView: {
    ...StyleSheet.absoluteFillObject,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  border: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
  headerContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  headerBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  headerGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  headerBorder: {
    ...StyleSheet.absoluteFillObject,
    borderBottomWidth: 0.5,
  },
  headerContent: {
    position: 'relative',
    zIndex: 1,
  },
});

export default LiquidGlassCard;
