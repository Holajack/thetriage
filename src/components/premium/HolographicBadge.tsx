/**
 * Premium Holographic Badge
 * Based on Chris Ro's "Holographic Effect" pattern
 *
 * Features:
 * - Responds to device motion for shine effect
 * - Gesture-based shine on drag
 * - Rainbow gradient overlay
 * - Celebration animation on unlock
 */

import React, { useEffect, useCallback } from 'react';
import { StyleSheet, View, ViewStyle, Text, Image, ImageSourcePropType } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import {
  BorderRadius,
  Shadows,
  Spacing,
  Typography,
  AnimationConfig,
  PremiumColors,
} from '../../theme/premiumTheme';

interface HolographicBadgeProps {
  title: string;
  description?: string;
  icon?: ImageSourcePropType | React.ReactNode;
  unlocked?: boolean;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  progress?: number; // 0-1 for locked badges
  size?: 'small' | 'medium' | 'large';
  onPress?: () => void;
  style?: ViewStyle;
  showCelebration?: boolean;
}

const RARITY_COLORS = {
  common: ['#94A3B8', '#64748B'],
  rare: ['#60A5FA', '#3B82F6'],
  epic: ['#A78BFA', '#8B5CF6'],
  legendary: ['#FBBF24', '#F59E0B', '#EA580C'],
};

const HOLOGRAPHIC_COLORS = [
  'rgba(255, 107, 107, 0.3)',
  'rgba(78, 205, 196, 0.3)',
  'rgba(69, 183, 209, 0.3)',
  'rgba(150, 230, 161, 0.3)',
  'rgba(221, 160, 221, 0.3)',
  'rgba(255, 230, 109, 0.3)',
];

export const HolographicBadge: React.FC<HolographicBadgeProps> = ({
  title,
  description,
  icon,
  unlocked = true,
  rarity = 'common',
  progress = 0,
  size = 'medium',
  onPress,
  style,
  showCelebration = false,
}) => {
  const { theme } = useTheme();

  // Animation values
  const shineX = useSharedValue(0);
  const shineY = useSharedValue(0);
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const celebrationScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  // Size configurations
  const getSizeConfig = () => {
    switch (size) {
      case 'small':
        return { width: 80, height: 100, iconSize: 32, titleSize: 11 };
      case 'large':
        return { width: 140, height: 175, iconSize: 64, titleSize: 15 };
      default:
        return { width: 110, height: 138, iconSize: 48, titleSize: 13 };
    }
  };

  const sizeConfig = getSizeConfig();

  // Celebration effect when unlocked
  useEffect(() => {
    if (showCelebration && unlocked) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Bounce + glow animation
      celebrationScale.value = withSequence(
        withSpring(1.15, AnimationConfig.bouncy),
        withSpring(0.95, AnimationConfig.quick),
        withSpring(1, AnimationConfig.standard)
      );

      rotation.value = withSequence(
        withTiming(-10, { duration: 100 }),
        withTiming(10, { duration: 100 }),
        withTiming(-5, { duration: 100 }),
        withTiming(5, { duration: 100 }),
        withTiming(0, { duration: 100 })
      );

      glowOpacity.value = withSequence(
        withTiming(0.8, { duration: 300 }),
        withTiming(0, { duration: 500 })
      );
    }
  }, [showCelebration, unlocked]);

  // Idle shimmer animation for unlocked badges
  useEffect(() => {
    if (unlocked) {
      shineX.value = withRepeat(
        withSequence(
          withTiming(-0.5, { duration: 0 }),
          withTiming(1.5, { duration: 3000 })
        ),
        -1,
        false
      );
    }
  }, [unlocked]);

  // Pan gesture for interactive shine
  const panGesture = Gesture.Pan()
    .onBegin(() => {
      scale.value = withSpring(1.05, AnimationConfig.quick);
    })
    .onUpdate((event) => {
      shineX.value = event.x / sizeConfig.width;
      shineY.value = event.y / sizeConfig.height;
    })
    .onEnd(() => {
      scale.value = withSpring(1, AnimationConfig.standard);
    });

  // Tap gesture
  const tapGesture = Gesture.Tap()
    .onStart(() => {
      scale.value = withSpring(0.95, AnimationConfig.snappy);
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    })
    .onEnd(() => {
      scale.value = withSpring(1, AnimationConfig.bouncy);
      if (onPress) {
        runOnJS(onPress)();
      }
    });

  const composedGesture = Gesture.Simultaneous(panGesture, tapGesture);

  // Animated styles
  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value * celebrationScale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const shineAnimatedStyle = useAnimatedStyle(() => {
    const angle = interpolate(
      shineX.value + shineY.value,
      [0, 2],
      [0, 360],
      Extrapolation.CLAMP
    );

    return {
      opacity: unlocked ? 0.6 : 0,
      transform: [
        { rotate: `${angle}deg` },
        { translateX: interpolate(shineX.value, [0, 1], [-50, 50]) },
        { translateY: interpolate(shineY.value, [0, 1], [-50, 50]) },
      ],
    };
  });

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const rarityColors = RARITY_COLORS[rarity];

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[
          styles.container,
          {
            width: sizeConfig.width,
            height: sizeConfig.height,
          },
          containerAnimatedStyle,
          style,
        ]}
      >
        {/* Glow effect for celebration */}
        <Animated.View style={[styles.glow, { backgroundColor: rarityColors[0] }, glowAnimatedStyle]} />

        {/* Card background */}
        <LinearGradient
          colors={unlocked ? (rarityColors as [string, string, ...string[]]) : ['#4B5563', '#374151']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          {/* Holographic shine overlay */}
          <Animated.View style={[styles.shine, shineAnimatedStyle]}>
            <LinearGradient
              colors={HOLOGRAPHIC_COLORS as [string, string, ...string[]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.shineGradient}
            />
          </Animated.View>

          {/* Icon */}
          <View style={[styles.iconContainer, { width: sizeConfig.iconSize, height: sizeConfig.iconSize }]}>
            {typeof icon === 'object' && 'uri' in (icon as any) ? (
              <Image
                source={icon as ImageSourcePropType}
                style={[
                  styles.icon,
                  { width: sizeConfig.iconSize, height: sizeConfig.iconSize },
                  !unlocked && styles.lockedIcon,
                ]}
                resizeMode="contain"
              />
            ) : (
              icon
            )}
          </View>

          {/* Lock overlay */}
          {!unlocked && (
            <View style={styles.lockOverlay}>
              <Text style={styles.lockIcon}>🔒</Text>
              {progress > 0 && (
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                </View>
              )}
            </View>
          )}

          {/* Title */}
          <Text
            style={[
              styles.title,
              { fontSize: sizeConfig.titleSize, color: unlocked ? '#FFFFFF' : '#9CA3AF' },
            ]}
            numberOfLines={2}
          >
            {title}
          </Text>

          {/* Rarity indicator */}
          <View style={[styles.rarityDot, { backgroundColor: rarityColors[0] }]} />
        </LinearGradient>
      </Animated.View>
    </GestureDetector>
  );
};

// Badge grid for collections
interface BadgeGridProps {
  badges: Array<{
    id: string;
    title: string;
    icon?: ImageSourcePropType | React.ReactNode;
    unlocked: boolean;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    progress?: number;
  }>;
  onBadgePress?: (id: string) => void;
}

export const BadgeGrid: React.FC<BadgeGridProps> = ({ badges, onBadgePress }) => {
  return (
    <View style={styles.grid}>
      {badges.map((badge) => (
        <HolographicBadge
          key={badge.id}
          title={badge.title}
          icon={badge.icon}
          unlocked={badge.unlocked}
          rarity={badge.rarity}
          progress={badge.progress}
          size="small"
          onPress={() => onBadgePress?.(badge.id)}
          style={styles.gridItem}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: '120%',
    height: '120%',
    borderRadius: BorderRadius.xl,
    opacity: 0,
  },
  card: {
    width: '100%',
    height: '100%',
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.sm,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  shine: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  shineGradient: {
    width: '200%',
    height: '200%',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  icon: {
    resizeMode: 'contain',
  },
  lockedIcon: {
    opacity: 0.3,
    tintColor: '#9CA3AF',
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.lg,
  },
  lockIcon: {
    fontSize: 24,
  },
  progressBar: {
    width: '60%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    marginTop: Spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  title: {
    fontWeight: '600',
    textAlign: 'center',
    marginTop: Spacing.xxs,
  },
  rarityDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  gridItem: {
    margin: Spacing.xxs,
  },
});

export default HolographicBadge;
