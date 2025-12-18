/**
 * Premium Staggered List
 * Based on Chris Ro's "List animations" pattern
 *
 * Features:
 * - Staggered entrance animation for list items
 * - Subtle fade + slide effect (not overly bouncy)
 * - Configurable delay between items
 * - Premium feel without being distracting
 */

import React, { useEffect, useCallback, ReactNode, Children } from 'react';
import { StyleSheet, View, ViewStyle, FlatList, FlatListProps } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withTiming,
  FadeIn,
  FadeInUp,
  FadeInDown,
  SlideInRight,
  Layout,
  Easing,
} from 'react-native-reanimated';
import { AnimationConfig, TimingConfig, StaggerDelay, Spacing } from '../../theme/premiumTheme';

// Subtle stagger delays - faster and less noticeable
const SubtleStaggerDelay = {
  fast: 30,    // Was 50
  normal: 50,  // Was 80
  slow: 80,    // Was 120
};

// ============================================
// STAGGERED ITEM WRAPPER
// ============================================
interface StaggeredItemProps {
  index: number;
  children: ReactNode;
  delay?: 'fast' | 'normal' | 'slow';
  direction?: 'up' | 'down' | 'right' | 'fade';
  style?: ViewStyle;
  subtle?: boolean; // New prop for subtle animations
}

export const StaggeredItem: React.FC<StaggeredItemProps> = ({
  index,
  children,
  delay = 'normal',
  direction = 'up',
  style,
  subtle = true, // Default to subtle animations
}) => {
  // Use subtle delays for a more refined feel
  const staggerDelay = SubtleStaggerDelay[delay] * Math.min(index, 10); // Cap at 10 to prevent too long delays

  // Choose the animation based on direction - much more subtle now
  const getEntering = () => {
    if (subtle) {
      // Subtle animations - pure fade with minimal movement
      switch (direction) {
        case 'fade':
          return FadeIn.delay(staggerDelay).duration(250);
        case 'down':
          return FadeInDown.delay(staggerDelay).duration(300).damping(25).stiffness(200);
        case 'right':
          return SlideInRight.delay(staggerDelay).duration(250).damping(25);
        case 'up':
        default:
          return FadeInUp.delay(staggerDelay).duration(300).damping(25).stiffness(200);
      }
    } else {
      // Original bouncy animations for special cases
      switch (direction) {
        case 'down':
          return FadeInDown.delay(staggerDelay).springify().damping(15);
        case 'right':
          return SlideInRight.delay(staggerDelay).springify().damping(15);
        case 'up':
        default:
          return FadeInUp.delay(staggerDelay).springify().damping(15);
      }
    }
  };

  return (
    <Animated.View
      entering={getEntering()}
      style={style}
    >
      {children}
    </Animated.View>
  );
};

// ============================================
// STAGGERED LIST CONTAINER
// ============================================
interface StaggeredListProps {
  children: ReactNode;
  delay?: 'fast' | 'normal' | 'slow';
  direction?: 'up' | 'down' | 'right';
  style?: ViewStyle;
}

export const StaggeredList: React.FC<StaggeredListProps> = ({
  children,
  delay = 'normal',
  direction = 'up',
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {Children.map(children, (child, index) => (
        <StaggeredItem key={`staggered-${index}`} index={index} delay={delay} direction={direction}>
          {child}
        </StaggeredItem>
      ))}
    </View>
  );
};

// ============================================
// ANIMATED FLATLIST
// ============================================
interface AnimatedFlatListProps<T> extends Omit<FlatListProps<T>, 'renderItem'> {
  data: T[];
  renderItem: (info: { item: T; index: number }) => ReactNode;
  delay?: 'fast' | 'normal' | 'slow';
  direction?: 'up' | 'down' | 'right';
  itemContainerStyle?: ViewStyle;
}

export function AnimatedFlatList<T>({
  data,
  renderItem,
  delay = 'fast',
  direction = 'fade',
  itemContainerStyle,
  ...props
}: AnimatedFlatListProps<T>) {
  return (
    <FlatList
      data={data}
      renderItem={({ item, index }) => (
        <StaggeredItem
          index={index}
          delay={delay}
          direction={direction}
          style={itemContainerStyle}
          subtle={true}
        >
          {renderItem({ item, index })}
        </StaggeredItem>
      )}
      {...props}
    />
  );
}

// ============================================
// CARD LIST ITEM (Pre-styled for common use)
// ============================================
interface CardListItemProps {
  index: number;
  children: ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}

export const CardListItem: React.FC<CardListItemProps> = ({
  index,
  children,
  style,
  onPress,
}) => {
  const staggerDelay = 40 * Math.min(index, 8); // Subtle delay, capped

  return (
    <Animated.View
      entering={FadeIn.delay(staggerDelay).duration(250)}
      style={[styles.cardItem, style]}
    >
      {children}
    </Animated.View>
  );
};

// ============================================
// GRID LAYOUT WITH STAGGER
// ============================================
interface StaggeredGridProps {
  children: ReactNode;
  columns?: number;
  gap?: number;
  delay?: 'fast' | 'normal' | 'slow';
  style?: ViewStyle;
}

export const StaggeredGrid: React.FC<StaggeredGridProps> = ({
  children,
  columns = 2,
  gap = Spacing.md,
  delay = 'fast',
  style,
}) => {
  return (
    <View style={[styles.grid, { gap }, style]}>
      {Children.map(children, (child, index) => (
        <StaggeredItem
          key={`grid-${index}`}
          index={index}
          delay={delay}
          direction="fade"
          subtle={true}
          style={[
            styles.gridItem,
            {
              width: `${100 / columns - (gap / columns) * (columns - 1)}%`,
            },
          ]}
        >
          {child}
        </StaggeredItem>
      ))}
    </View>
  );
};

// ============================================
// SECTION WITH STAGGERED CONTENT
// ============================================
interface StaggeredSectionProps {
  title?: string;
  children: ReactNode;
  delay?: 'fast' | 'normal' | 'slow';
  titleStyle?: ViewStyle;
  contentStyle?: ViewStyle;
  style?: ViewStyle;
}

export const StaggeredSection: React.FC<StaggeredSectionProps> = ({
  title,
  children,
  delay = 'normal',
  titleStyle,
  contentStyle,
  style,
}) => {
  return (
    <View style={[styles.section, style]}>
      {title && (
        <Animated.Text
          entering={FadeIn.delay(0).duration(TimingConfig.entrance)}
          style={[styles.sectionTitle, titleStyle]}
        >
          {title}
        </Animated.Text>
      )}
      <View style={contentStyle}>
        {Children.map(children, (child, index) => (
          <StaggeredItem key={`section-${index}`} index={index} delay={delay} direction="up">
            {child}
          </StaggeredItem>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cardItem: {
    marginBottom: Spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    // Width is set dynamically
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
});

export default StaggeredList;
