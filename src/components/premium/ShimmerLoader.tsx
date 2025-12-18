/**
 * Premium Shimmer Loader
 * Based on Chris Ro's "Amy Effect" pattern
 *
 * Features:
 * - Animated gradient shimmer
 * - Configurable shapes (text, circle, card)
 * - Matches theme colors
 */

import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { BorderRadius, Spacing } from '../../theme/premiumTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ShimmerLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
  variant?: 'text' | 'circle' | 'card' | 'button' | 'custom';
}

export const ShimmerLoader: React.FC<ShimmerLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius,
  style,
  variant = 'custom',
}) => {
  const { theme } = useTheme();
  const shimmerPosition = useSharedValue(-1);

  useEffect(() => {
    shimmerPosition.value = withRepeat(
      withTiming(2, { duration: 1500, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  // Get variant-specific dimensions
  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'text':
        return { width: width, height: 16, borderRadius: BorderRadius.xs };
      case 'circle':
        const size = typeof height === 'number' ? height : 48;
        return { width: size, height: size, borderRadius: size / 2 };
      case 'card':
        return { width: '100%', height: 120, borderRadius: BorderRadius.lg };
      case 'button':
        return { width: width, height: 48, borderRadius: BorderRadius.lg };
      default:
        return { width: width, height: height, borderRadius: borderRadius || BorderRadius.sm };
    }
  };

  const shimmerStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      shimmerPosition.value,
      [-1, 2],
      [-SCREEN_WIDTH, SCREEN_WIDTH * 2]
    );

    return {
      transform: [{ translateX }],
    };
  });

  const baseColor = theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const highlightColor = theme.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.03)';

  return (
    <View style={[styles.container, getVariantStyle(), { backgroundColor: baseColor }, style]}>
      <Animated.View style={[styles.shimmer, shimmerStyle]}>
        <LinearGradient
          colors={['transparent', highlightColor, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        />
      </Animated.View>
    </View>
  );
};

// Skeleton screen builder
interface SkeletonRowProps {
  lines?: number;
  lineHeight?: number;
  spacing?: number;
  lastLineWidth?: number | string;
}

export const SkeletonText: React.FC<SkeletonRowProps> = ({
  lines = 3,
  lineHeight = 16,
  spacing = Spacing.xs,
  lastLineWidth = '60%',
}) => {
  return (
    <View>
      {Array.from({ length: lines }).map((_, index) => (
        <ShimmerLoader
          key={index}
          variant="text"
          height={lineHeight}
          width={index === lines - 1 ? lastLineWidth : '100%'}
          style={index < lines - 1 ? { marginBottom: spacing } : undefined}
        />
      ))}
    </View>
  );
};

// Card skeleton
interface SkeletonCardProps {
  showImage?: boolean;
  showTitle?: boolean;
  showDescription?: boolean;
  style?: ViewStyle;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  showImage = true,
  showTitle = true,
  showDescription = true,
  style,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.cardContainer, { backgroundColor: theme.card }, style]}>
      {showImage && (
        <ShimmerLoader variant="custom" width="100%" height={160} style={styles.cardImage} />
      )}
      <View style={styles.cardContent}>
        {showTitle && (
          <ShimmerLoader variant="text" width="70%" height={20} style={styles.cardTitle} />
        )}
        {showDescription && <SkeletonText lines={2} lastLineWidth="80%" />}
      </View>
    </View>
  );
};

// Avatar with text skeleton
export const SkeletonAvatarRow: React.FC<{ avatarSize?: number }> = ({ avatarSize = 48 }) => {
  return (
    <View style={styles.avatarRow}>
      <ShimmerLoader variant="circle" height={avatarSize} />
      <View style={styles.avatarTextContainer}>
        <ShimmerLoader variant="text" width="60%" height={18} style={{ marginBottom: 8 }} />
        <ShimmerLoader variant="text" width="40%" height={14} />
      </View>
    </View>
  );
};

// Stats grid skeleton
export const SkeletonStatsGrid: React.FC<{ columns?: number }> = ({ columns = 3 }) => {
  return (
    <View style={styles.statsGrid}>
      {Array.from({ length: columns }).map((_, index) => (
        <View key={index} style={styles.statItem}>
          <ShimmerLoader variant="custom" width={50} height={32} style={{ marginBottom: 8 }} />
          <ShimmerLoader variant="text" width={60} height={12} />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_WIDTH,
  },
  gradient: {
    flex: 1,
    width: SCREEN_WIDTH * 0.5,
  },
  cardContainer: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  cardImage: {
    borderRadius: 0,
  },
  cardContent: {
    padding: Spacing.md,
  },
  cardTitle: {
    marginBottom: Spacing.sm,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarTextContainer: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
});

export default ShimmerLoader;
