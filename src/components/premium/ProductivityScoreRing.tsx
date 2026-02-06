/**
 * ProductivityScoreRing
 *
 * A circular progress ring that displays a productivity score (0-100)
 * with tier-based styling and animations.
 */

import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  interpolate,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../../context/ThemeContext';
import { useCounterAnimation, useHolographicEffect } from '../../utils/animationUtils';
import { Typography, Spacing, Shadows } from '../../theme/premiumTheme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProductivityScoreRingProps {
  streak: number;
  focusProgress: number; // 0-100 percentage toward weekly goal
  tasksCompleted: number;
  size?: number;
  strokeWidth?: number;
}

type Tier = 'common' | 'rare' | 'epic' | 'legendary';

const TIER_CONFIG: Record<Tier, { color: string; label: string; gradient: string[] }> = {
  common: { color: '#9CA3AF', label: 'Common', gradient: ['#9CA3AF', '#6B7280'] },
  rare: { color: '#3B82F6', label: 'Rare', gradient: ['#60A5FA', '#3B82F6'] },
  epic: { color: '#8B5CF6', label: 'Epic', gradient: ['#A78BFA', '#8B5CF6'] },
  legendary: { color: '#F59E0B', label: 'Legendary', gradient: ['#FCD34D', '#F59E0B'] },
};

const MOTIVATIONAL_MESSAGES: Record<Tier, string[]> = {
  common: ['Every journey starts somewhere!', 'Building momentum...'],
  rare: ['You\'re making progress!', 'Keep the streak alive!'],
  epic: ['Impressive dedication!', 'You\'re in the zone!'],
  legendary: ['You\'re unstoppable!', 'Peak performance!'],
};

export const ProductivityScoreRing: React.FC<ProductivityScoreRingProps> = ({
  streak,
  focusProgress,
  tasksCompleted,
  size = 140,
  strokeWidth = 10,
}) => {
  const { theme, isDark } = useTheme();
  const { holographicStyle } = useHolographicEffect();

  // Calculate productivity score (0-100)
  const score = useMemo(() => {
    const streakScore = Math.min(streak / 7, 1) * 25;
    const focusScore = Math.min(focusProgress / 100, 1) * 35;
    const taskScore = Math.min(tasksCompleted / 10, 1) * 20;
    const completionRate = 0.8 * 20; // Assume 80% completion rate for now
    return Math.min(Math.round(streakScore + focusScore + taskScore + completionRate), 100);
  }, [streak, focusProgress, tasksCompleted]);

  // Determine tier based on score
  const tier: Tier = useMemo(() => {
    if (score >= 76) return 'legendary';
    if (score >= 51) return 'epic';
    if (score >= 26) return 'rare';
    return 'common';
  }, [score]);

  const tierConfig = TIER_CONFIG[tier];

  // Get random motivational message for current tier
  const motivationalMessage = useMemo(() => {
    const messages = MOTIVATIONAL_MESSAGES[tier];
    return messages[Math.floor(Math.random() * messages.length)];
  }, [tier, score]);

  // Animated counter for score display
  const { value: displayScore } = useCounterAnimation(score, 1200);

  // SVG calculations
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Animated progress value
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withDelay(
      300,
      withTiming(score / 100, {
        duration: 1200,
        easing: Easing.bezier(0.33, 1, 0.68, 1),
      })
    );
  }, [score]);

  const animatedCircleProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference * (1 - animatedProgress.value);
    return {
      strokeDashoffset,
    };
  });

  return (
    <Animated.View
      entering={FadeIn.delay(100).duration(400)}
      style={styles.container}
    >
      {/* Score Ring */}
      <View style={styles.ringContainer}>
        <Svg width={size} height={size}>
          <Defs>
            <LinearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={tierConfig.gradient[0]} />
              <Stop offset="100%" stopColor={tierConfig.gradient[1]} />
            </LinearGradient>
          </Defs>

          {/* Background circle */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}
            strokeWidth={strokeWidth}
            fill="none"
          />

          {/* Progress circle */}
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            stroke="url(#scoreGradient)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            animatedProps={animatedCircleProps}
            rotation={-90}
            origin={`${center}, ${center}`}
          />
        </Svg>

        {/* Center content */}
        <View style={styles.centerContent}>
          <Text style={[styles.scoreValue, { color: tierConfig.color }]}>
            {displayScore}
          </Text>
          <Text style={[styles.scoreLabel, { color: theme.textSecondary }]}>
            SCORE
          </Text>
        </View>

        {/* Legendary glow effect */}
        {tier === 'legendary' && (
          <Animated.View
            style={[
              styles.legendaryGlow,
              {
                shadowColor: tierConfig.color,
                borderColor: tierConfig.color,
              },
              holographicStyle,
            ]}
          />
        )}
      </View>

      {/* Tier badge */}
      <View
        style={[
          styles.tierBadge,
          {
            backgroundColor: isDark
              ? `${tierConfig.color}20`
              : `${tierConfig.color}15`,
            borderColor: tierConfig.color,
          },
        ]}
      >
        <Text style={[styles.tierLabel, { color: tierConfig.color }]}>
          {tierConfig.label}
        </Text>
      </View>

      {/* Motivational message */}
      <Text style={[styles.motivationalText, { color: theme.textSecondary }]}>
        {motivationalMessage}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  ringContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    ...Typography.stat,
    fontSize: 36,
  },
  scoreLabel: {
    ...Typography.caption,
    letterSpacing: 2,
    marginTop: 2,
  },
  legendaryGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 999,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  tierBadge: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xxs,
    borderRadius: 12,
    borderWidth: 1,
  },
  tierLabel: {
    ...Typography.caption,
    fontWeight: '600',
    letterSpacing: 1,
  },
  motivationalText: {
    ...Typography.bodySmall,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
});

export default ProductivityScoreRing;
