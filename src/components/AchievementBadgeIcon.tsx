import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * 14 unique badge designs for achievements.
 * Each badge has a distinct shape, color palette, and icon.
 */

type BadgeShape = 'circle' | 'diamond' | 'hexagon' | 'shield' | 'star';

interface BadgeConfig {
  icon: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  shape: BadgeShape;
}

const BADGE_CONFIGS: Record<string, BadgeConfig> = {
  // ===== Convex achievementType values (actual DB keys) =====
  first_session: {
    icon: 'footsteps-outline',
    primaryColor: '#4CAF50',
    secondaryColor: '#81C784',
    accentColor: '#E8F5E9',
    shape: 'circle',
  },
  week_warrior: {
    icon: 'shield-outline',
    primaryColor: '#E91E63',
    secondaryColor: '#F48FB1',
    accentColor: '#FCE4EC',
    shape: 'shield',
  },
  streak_7: {
    icon: 'flame-outline',
    primaryColor: '#F44336',
    secondaryColor: '#EF9A9A',
    accentColor: '#FFEBEE',
    shape: 'diamond',
  },
  deep_focus: {
    icon: 'flash-outline',
    primaryColor: '#9C27B0',
    secondaryColor: '#CE93D8',
    accentColor: '#F3E5F5',
    shape: 'hexagon',
  },
  early_bird: {
    icon: 'sunny-outline',
    primaryColor: '#FF9800',
    secondaryColor: '#FFB74D',
    accentColor: '#FFF3E0',
    shape: 'star',
  },

  // ===== Additional achievement types (for future awarding) =====
  first_hour: {
    icon: 'hourglass-outline',
    primaryColor: '#2196F3',
    secondaryColor: '#64B5F6',
    accentColor: '#E3F2FD',
    shape: 'circle',
  },
  focus_master: {
    icon: 'eye-outline',
    primaryColor: '#3F51B5',
    secondaryColor: '#9FA8DA',
    accentColor: '#E8EAF6',
    shape: 'diamond',
  },
  zen_master: {
    icon: 'flower-outline',
    primaryColor: '#FFD700',
    secondaryColor: '#FFE082',
    accentColor: '#FFFDE7',
    shape: 'star',
  },
  habit_builder: {
    icon: 'trending-up-outline',
    primaryColor: '#673AB7',
    secondaryColor: '#B39DDB',
    accentColor: '#EDE7F6',
    shape: 'diamond',
  },
  task_starter: {
    icon: 'checkmark-circle-outline',
    primaryColor: '#00BCD4',
    secondaryColor: '#80DEEA',
    accentColor: '#E0F7FA',
    shape: 'circle',
  },
  task_master: {
    icon: 'trophy-outline',
    primaryColor: '#FFD700',
    secondaryColor: '#FFE082',
    accentColor: '#FFFDE7',
    shape: 'star',
  },
  productive: {
    icon: 'rocket-outline',
    primaryColor: '#009688',
    secondaryColor: '#80CBC4',
    accentColor: '#E0F2F1',
    shape: 'hexagon',
  },
  social_butterfly: {
    icon: 'people-outline',
    primaryColor: '#3F51B5',
    secondaryColor: '#9FA8DA',
    accentColor: '#E8EAF6',
    shape: 'shield',
  },
  community_builder: {
    icon: 'heart-outline',
    primaryColor: '#2196F3',
    secondaryColor: '#90CAF9',
    accentColor: '#E3F2FD',
    shape: 'shield',
  },
};

interface AchievementBadgeIconProps {
  achievementId: string;
  size?: number;
  earned?: boolean;
  /** Fallback Ionicons name from Convex data when no badge config exists */
  fallbackIcon?: string;
  /** Fallback color when no badge config exists */
  fallbackColor?: string;
}

const AchievementBadgeIcon: React.FC<AchievementBadgeIconProps> = ({
  achievementId,
  size = 32,
  earned = true,
  fallbackIcon,
  fallbackColor,
}) => {
  const config = BADGE_CONFIGS[achievementId] ?? (fallbackIcon ? {
    icon: fallbackIcon,
    primaryColor: fallbackColor || '#6366F1',
    secondaryColor: '#A5B4FC',
    accentColor: '#EEF2FF',
    shape: 'circle' as BadgeShape,
  } : null);

  if (!config) {
    return <Ionicons name="ribbon-outline" size={size} color="#6366F1" />;
  }

  const containerSize = size * 1.6;
  const iconSize = size * 0.85;
  const opacity = earned ? 1 : 0.4;

  switch (config.shape) {
    case 'diamond':
      return (
        <View style={[styles.badgeOuter, { width: containerSize, height: containerSize, opacity }]}>
          <View
            style={[
              styles.diamondOuter,
              {
                width: containerSize * 0.85,
                height: containerSize * 0.85,
                backgroundColor: config.primaryColor + '20',
                borderColor: config.primaryColor + '40',
              },
            ]}
          >
            <View
              style={[
                styles.diamondInner,
                {
                  width: containerSize * 0.62,
                  height: containerSize * 0.62,
                  backgroundColor: config.primaryColor + '30',
                },
              ]}
            >
              <View style={{ transform: [{ rotate: '-45deg' }] }}>
                <Ionicons name={config.icon as any} size={iconSize} color={config.primaryColor} />
              </View>
            </View>
          </View>
        </View>
      );

    case 'hexagon':
      return (
        <View style={[styles.badgeOuter, { width: containerSize, height: containerSize, opacity }]}>
          <View
            style={[
              styles.hexOuter,
              {
                width: containerSize * 0.9,
                height: containerSize * 0.75,
                backgroundColor: config.primaryColor + '18',
                borderColor: config.primaryColor + '35',
              },
            ]}
          >
            <View
              style={[
                styles.hexDot,
                { backgroundColor: config.primaryColor, left: 4, top: 4 },
              ]}
            />
            <View
              style={[
                styles.hexDot,
                { backgroundColor: config.primaryColor, right: 4, bottom: 4 },
              ]}
            />
            <Ionicons name={config.icon as any} size={iconSize} color={config.primaryColor} />
          </View>
        </View>
      );

    case 'shield':
      return (
        <View style={[styles.badgeOuter, { width: containerSize, height: containerSize, opacity }]}>
          <View
            style={[
              styles.shieldOuter,
              {
                width: containerSize * 0.78,
                height: containerSize * 0.9,
                backgroundColor: config.primaryColor + '18',
                borderColor: config.primaryColor + '40',
              },
            ]}
          >
            <View
              style={[
                styles.shieldStripe,
                { backgroundColor: config.primaryColor + '15' },
              ]}
            />
            <Ionicons name={config.icon as any} size={iconSize} color={config.primaryColor} />
          </View>
        </View>
      );

    case 'star':
      return (
        <View style={[styles.badgeOuter, { width: containerSize, height: containerSize, opacity }]}>
          {/* Radiating points */}
          {[0, 45, 90, 135].map((deg) => (
            <View
              key={deg}
              style={[
                styles.starRay,
                {
                  width: containerSize * 0.12,
                  height: containerSize * 0.85,
                  backgroundColor: config.primaryColor + '12',
                  transform: [{ rotate: `${deg}deg` }],
                },
              ]}
            />
          ))}
          <View
            style={[
              styles.starCenter,
              {
                width: containerSize * 0.72,
                height: containerSize * 0.72,
                backgroundColor: config.primaryColor + '22',
                borderColor: config.primaryColor + '50',
              },
            ]}
          >
            <Ionicons name={config.icon as any} size={iconSize} color={config.primaryColor} />
          </View>
        </View>
      );

    case 'circle':
    default:
      return (
        <View style={[styles.badgeOuter, { width: containerSize, height: containerSize, opacity }]}>
          <View
            style={[
              styles.circleRing,
              {
                width: containerSize * 0.92,
                height: containerSize * 0.92,
                borderColor: config.primaryColor + '30',
              },
            ]}
          >
            <View
              style={[
                styles.circleInner,
                {
                  width: containerSize * 0.72,
                  height: containerSize * 0.72,
                  backgroundColor: config.primaryColor + '18',
                },
              ]}
            >
              <Ionicons name={config.icon as any} size={iconSize} color={config.primaryColor} />
            </View>
          </View>
        </View>
      );
  }
};

const styles = StyleSheet.create({
  badgeOuter: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Circle
  circleRing: {
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleInner: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Diamond
  diamondOuter: {
    borderRadius: 8,
    borderWidth: 2,
    transform: [{ rotate: '45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  diamondInner: {
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Hexagon (approximated with wide rounded rect)
  hexOuter: {
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  hexDot: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 2.5,
    opacity: 0.5,
  },

  // Shield
  shieldOuter: {
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  shieldStripe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
  },

  // Star
  starRay: {
    position: 'absolute',
    borderRadius: 4,
  },
  starCenter: {
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export { BADGE_CONFIGS };
export default AchievementBadgeIcon;
