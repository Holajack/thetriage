import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { AnimatedTabIcon } from './premium/AnimatedTabIcon';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

// Global state to persist position across screens
let globalLastIndex = -1;
let globalLastX = 0;

interface BottomTabBarProps {
  currentRoute?: string;
}

type TabConfig = {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  outlineIcon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: string;
};

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ currentRoute }) => {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();

  const tabs: TabConfig[] = [
    {
      name: 'Profile',
      icon: 'person',
      outlineIcon: 'person-outline',
      label: 'Profile',
      route: 'Profile',
    },
    {
      name: 'History',
      icon: 'document-text',
      outlineIcon: 'document-text-outline',
      label: 'History',
      route: 'SessionHistory',
    },
    {
      name: 'Stats',
      icon: 'stats-chart',
      outlineIcon: 'stats-chart-outline',
      label: 'Stats',
      route: 'Results',
    },
    {
      name: 'Bonuses',
      icon: 'trophy',
      outlineIcon: 'trophy-outline',
      label: 'Bonuses',
      route: 'Bonuses',
    },
    {
      name: 'Community',
      icon: 'people',
      outlineIcon: 'people-outline',
      label: 'Community',
      route: 'Community',
    },
  ];

  // Find the index of the active tab
  const activeIndex = tabs.findIndex(tab => tab.route === currentRoute);
  const numTabs = tabs.length;
  const HORIZONTAL_PADDING = 16; // Must match paddingHorizontal in container style
  const INDICATOR_INSET = 4; // Inset from tab edges for the indicator

  // Sliding indicator animation
  const translateX = useSharedValue(globalLastX);
  const [containerWidth, setContainerWidth] = useState(0);

  // Simple calculation: tabs are evenly distributed with flex: 1
  const innerWidth = containerWidth - (HORIZONTAL_PADDING * 2);
  const tabWidth = innerWidth / numTabs;
  const indicatorWidth = tabWidth - (INDICATOR_INSET * 2);

  // Calculate target X position for the active tab
  const getTargetX = useCallback((index: number, width: number) => {
    const inner = width - (HORIZONTAL_PADDING * 2);
    const tw = inner / numTabs;
    return HORIZONTAL_PADDING + INDICATOR_INSET + (index * tw);
  }, [numTabs]);

  // Animate when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (activeIndex >= 0 && containerWidth > 0) {
        const targetX = getTargetX(activeIndex, containerWidth);

        // Always animate if coming from a different tab
        if (globalLastIndex !== activeIndex && globalLastIndex >= 0) {
          // Start from previous position
          translateX.value = globalLastX;
          // Animate to new position
          translateX.value = withTiming(targetX, {
            duration: 350,
            easing: Easing.out(Easing.cubic),
          });
        } else {
          // First load or same tab - set position directly
          translateX.value = targetX;
        }

        // Update global state for next navigation
        globalLastIndex = activeIndex;
        globalLastX = targetX;
      }
    }, [activeIndex, containerWidth, getTargetX])
  );

  // Also set position when containerWidth is first measured
  useEffect(() => {
    if (containerWidth > 0 && activeIndex >= 0) {
      const targetX = getTargetX(activeIndex, containerWidth);
      if (globalLastIndex === -1) {
        // Very first load - set position without animation
        translateX.value = targetX;
        globalLastIndex = activeIndex;
        globalLastX = targetX;
      }
    }
  }, [containerWidth, activeIndex, getTargetX]);

  // Animated style uses the pre-calculated X position
  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    width: indicatorWidth > 0 ? indicatorWidth : 50,
  }));

  const handleLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  const handleTabPress = (route: string) => {
    navigation.navigate(route as never);
  };

  return (
    <View style={styles.floatingContainer}>
      <View
        style={[styles.container, { backgroundColor: theme.primary }]}
        onLayout={handleLayout}
      >
        {/* Sliding shadow indicator behind active tab */}
        {containerWidth > 0 && indicatorWidth > 0 && (
          <Animated.View
            style={[
              styles.slidingIndicator,
              indicatorStyle,
            ]}
          />
        )}

        {/* Tab icons - each wrapped in flex:1 container for equal widths */}
        {tabs.map((tab) => {
          const isActive = currentRoute === tab.route;
          return (
            <View key={tab.name} style={styles.tabWrapper}>
              <AnimatedTabIcon
                name={tab.icon}
                outlineName={tab.outlineIcon}
                isActive={isActive}
                label={tab.label}
                size={22}
                activeColor="#FFFFFF"
                inactiveColor="rgba(255,255,255,0.6)"
                onPress={() => handleTabPress(tab.route)}
                showLabel={true}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 15,
    width: '100%',
    maxWidth: 400,
    position: 'relative',
    overflow: 'hidden',
  },
  slidingIndicator: {
    position: 'absolute',
    top: 8,
    left: 0, // Actual position controlled by translateX in indicatorStyle
    bottom: 8,
    borderRadius: 16,
    // Lighter background behind active tab
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    // Prominent shadow for the "shadowy rounded box" effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  tabWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 4,
    flex: 1,
    minHeight: 60,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
});
