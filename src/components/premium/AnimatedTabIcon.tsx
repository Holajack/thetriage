/**
 * Premium Animated Tab Icon
 * Based on Chris Ro's icon consistency rules
 *
 * Features:
 * - Filled (active) / Outlined (inactive) icon states
 * - Spring animation on state change
 * - Bounce on press
 * - Optional badge indicator
 */

import React, { useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  interpolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import { AnimationConfig, Typography, Spacing } from '../../theme/premiumTheme';

interface AnimatedTabIconProps {
  name: keyof typeof Ionicons.glyphMap;
  outlineName?: keyof typeof Ionicons.glyphMap;
  isActive: boolean;
  size?: number;
  activeColor?: string;
  inactiveColor?: string;
  label?: string;
  badge?: number;
  onPress?: () => void;
  showLabel?: boolean;
}

export const AnimatedTabIcon: React.FC<AnimatedTabIconProps> = ({
  name,
  outlineName,
  isActive,
  size = 24,
  activeColor,
  inactiveColor,
  label,
  badge,
  onPress,
  showLabel = true,
}) => {
  const { theme } = useTheme();

  const finalActiveColor = activeColor || theme.primary;
  const finalInactiveColor = inactiveColor || (theme.isDark ? '#9CA3AF' : '#6B7280');

  // Animation values
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);
  const iconOpacity = useSharedValue(isActive ? 1 : 0.7);
  const fillProgress = useSharedValue(isActive ? 1 : 0);

  // Only animate opacity and fill state changes - no repeated bounce
  useEffect(() => {
    iconOpacity.value = withSpring(isActive ? 1 : 0.7, AnimationConfig.quick);
    fillProgress.value = withSpring(isActive ? 1 : 0, AnimationConfig.standard);
    // Note: Bounce animation removed - sliding indicator handles tab switch feedback
  }, [isActive]);

  // Press handler
  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.9, AnimationConfig.snappy);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, AnimationConfig.bouncy);
  }, []);

  const handlePress = useCallback(() => {
    if (onPress) {
      onPress();
    }
  }, [onPress]);

  // Animated styles
  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
  }));

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
  }));

  // Get the appropriate icon name
  const getIconName = (): keyof typeof Ionicons.glyphMap => {
    if (isActive) {
      return name;
    }
    // If outline name is provided, use it; otherwise, try to append "-outline"
    if (outlineName) {
      return outlineName;
    }
    const outlineIconName = `${name}-outline` as keyof typeof Ionicons.glyphMap;
    return outlineIconName;
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={[styles.container, containerAnimatedStyle]}>
        <Animated.View style={iconAnimatedStyle}>
          <Ionicons
            name={getIconName()}
            size={size}
            color={isActive ? finalActiveColor : finalInactiveColor}
          />
        </Animated.View>

        {/* Badge */}
        {badge !== undefined && badge > 0 && (
          <View style={[styles.badge, { backgroundColor: theme.primary }]}>
            <Text style={styles.badgeText}>
              {badge > 99 ? '99+' : badge}
            </Text>
          </View>
        )}

        {/* Label */}
        {showLabel && label && (
          <Text
            style={[
              styles.label,
              {
                color: isActive ? finalActiveColor : finalInactiveColor,
                fontWeight: isActive ? '600' : '500',
              },
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
        )}
      </Animated.View>
    </Pressable>
  );
};

// Preset tab icons for common use cases
export const HomeTabIcon: React.FC<{ isActive: boolean; onPress?: () => void }> = (props) => (
  <AnimatedTabIcon name="home" outlineName="home-outline" label="Home" {...props} />
);

export const ProfileTabIcon: React.FC<{ isActive: boolean; onPress?: () => void }> = (props) => (
  <AnimatedTabIcon name="person" outlineName="person-outline" label="Profile" {...props} />
);

export const HistoryTabIcon: React.FC<{ isActive: boolean; onPress?: () => void }> = (props) => (
  <AnimatedTabIcon name="document-text" outlineName="document-text-outline" label="History" {...props} />
);

export const StatsTabIcon: React.FC<{ isActive: boolean; onPress?: () => void }> = (props) => (
  <AnimatedTabIcon name="stats-chart" outlineName="stats-chart-outline" label="Stats" {...props} />
);

export const BonusesTabIcon: React.FC<{ isActive: boolean; onPress?: () => void }> = (props) => (
  <AnimatedTabIcon name="trophy" outlineName="trophy-outline" label="Bonuses" {...props} />
);

export const CommunityTabIcon: React.FC<{ isActive: boolean; onPress?: () => void; badge?: number }> = (props) => (
  <AnimatedTabIcon name="people" outlineName="people-outline" label="Community" {...props} />
);

export const SettingsTabIcon: React.FC<{ isActive: boolean; onPress?: () => void }> = (props) => (
  <AnimatedTabIcon name="settings" outlineName="settings-outline" label="Settings" {...props} />
);

export const ChatTabIcon: React.FC<{ isActive: boolean; onPress?: () => void; badge?: number }> = (props) => (
  <AnimatedTabIcon name="chatbubble" outlineName="chatbubble-outline" label="Chat" {...props} />
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  label: {
    fontSize: 9,
    marginTop: 2,
    textAlign: 'center',
  },
});

export default AnimatedTabIcon;
