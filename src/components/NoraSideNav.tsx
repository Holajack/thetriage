/**
 * Claude-style Side Navigation for Nora - Premium Animations
 *
 * Features:
 * - Smooth spring-based menu slide
 * - Staggered reveal animations for items
 * - Gesture-based interactions
 * - Glass morphism with animated backdrop
 * - Liquid-feel menu transitions
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  interpolate,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { BorderRadius, Spacing, Shadows } from '../theme/premiumTheme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MENU_WIDTH = 280;
const ITEM_HEIGHT = 52;
const INDICATOR_PADDING = 4;

export interface NavItem {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
}

export interface ChatSession {
  id: string;
  date: string;
  preview: string;
  messages: any[];
}

interface NoraSideNavProps {
  items: NavItem[];
  activeItemId: string;
  onItemSelect: (itemId: string) => void;
  onNewChat?: () => void;
  chatSessions?: ChatSession[];
  onSelectSession?: (session: ChatSession) => void;
  onDeleteSession?: (sessionId: string) => void;
}

// Animated Menu Button with morphing icon
interface MenuButtonProps {
  onPress: () => void;
  isOpen: boolean;
}

export const MenuButton: React.FC<MenuButtonProps> = ({ onPress, isOpen }) => {
  const { theme } = useTheme();
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const iconOpacity1 = useSharedValue(1);
  const iconOpacity2 = useSharedValue(0);

  useEffect(() => {
    rotation.value = withSpring(isOpen ? 1 : 0, {
      damping: 15,
      stiffness: 150,
    });
    iconOpacity1.value = withTiming(isOpen ? 0 : 1, { duration: 150 });
    iconOpacity2.value = withTiming(isOpen ? 1 : 0, { duration: 150 });
  }, [isOpen]);

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
  };

  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${interpolate(rotation.value, [0, 1], [0, 90])}deg` },
    ],
  }));

  const menuIconStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity1.value,
    position: 'absolute' as const,
  }));

  const closeIconStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity2.value,
    position: 'absolute' as const,
  }));

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[
          styles.menuButton,
          { backgroundColor: theme.primary },
          containerStyle,
        ]}
      >
        <Animated.View style={menuIconStyle}>
          <Ionicons name="menu" size={20} color="#FFFFFF" />
        </Animated.View>
        <Animated.View style={closeIconStyle}>
          <Ionicons name="close" size={20} color="#FFFFFF" />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
};

// Sliding Indicator with smooth spring physics
interface SlidingIndicatorProps {
  activeIndex: number;
  itemCount: number;
}

const SlidingIndicator: React.FC<SlidingIndicatorProps> = ({ activeIndex, itemCount }) => {
  const { theme } = useTheme();
  const isDark = theme.isDark;
  const translateY = useSharedValue(activeIndex * ITEM_HEIGHT);
  const scaleX = useSharedValue(1);

  useEffect(() => {
    // Slight squeeze during movement
    scaleX.value = withSequence(
      withTiming(0.97, { duration: 100 }),
      withSpring(1, { damping: 15, stiffness: 200 })
    );
    translateY.value = withSpring(activeIndex * ITEM_HEIGHT, {
      damping: 18,
      stiffness: 180,
      mass: 0.8,
    });
  }, [activeIndex]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scaleX: scaleX.value },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.slidingIndicator,
        {
          backgroundColor: isDark ? '#141414' : 'rgba(0, 0, 0, 0.06)',
          borderColor: isDark ? '#1F1F1F' : 'rgba(0, 0, 0, 0.08)',
        },
        animatedStyle,
      ]}
    />
  );
};

// Navigation Item with staggered entrance
interface NavItemComponentProps {
  item: NavItem;
  index: number;
  isActive: boolean;
  onPress: () => void;
  isVisible: boolean;
}

const NavItemComponent: React.FC<NavItemComponentProps> = ({
  item,
  index,
  isActive,
  onPress,
  isVisible,
}) => {
  const { theme } = useTheme();
  const isDark = theme.isDark;
  const scale = useSharedValue(1);
  const translateX = useSharedValue(50);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (isVisible) {
      const delay = 80 + index * 40;
      translateX.value = withDelay(delay, withSpring(0, { damping: 20, stiffness: 200 }));
      opacity.value = withDelay(delay, withTiming(1, { duration: 200 }));
    } else {
      translateX.value = 50;
      opacity.value = 0;
    }
  }, [isVisible, index]);

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={containerStyle}>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.navItem}
      >
        <View style={styles.navItemContent}>
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: isActive
                  ? (isDark ? '#4CAF5025' : theme.primary + '20')
                  : 'transparent',
              },
            ]}
          >
            <Ionicons
              name={item.icon}
              size={20}
              color={isActive ? '#4CAF50' : (isDark ? '#606060' : theme.textSecondary)}
            />
          </View>
          <Text
            style={[
              styles.navItemLabel,
              {
                color: isActive ? (isDark ? '#D0D0D0' : theme.text) : (isDark ? '#606060' : theme.textSecondary),
                fontWeight: isActive ? '600' : '400',
              },
            ]}
          >
            {item.label}
          </Text>
        </View>
        {isActive && (
          <View
            style={[
              styles.activeIndicatorDot,
              { backgroundColor: '#4CAF50' },
            ]}
          />
        )}
      </Pressable>
    </Animated.View>
  );
};

// Chat History Item with staggered reveal
interface ChatHistoryItemProps {
  session: ChatSession;
  onPress: () => void;
  onDelete: () => void;
  index: number;
  isVisible: boolean;
}

const ChatHistoryItem: React.FC<ChatHistoryItemProps> = ({
  session,
  onPress,
  onDelete,
  index,
  isVisible,
}) => {
  const { theme } = useTheme();
  const isDark = theme.isDark;
  const scale = useSharedValue(1);
  const translateX = useSharedValue(30);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (isVisible) {
      const delay = 200 + index * 30;
      translateX.value = withDelay(delay, withSpring(0, { damping: 18, stiffness: 180 }));
      opacity.value = withDelay(delay, withTiming(1, { duration: 180 }));
    } else {
      translateX.value = 30;
      opacity.value = 0;
    }
  }, [isVisible, index]);

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  const summary = session.preview.length > 40
    ? session.preview.substring(0, 40) + '...'
    : session.preview;

  return (
    <Animated.View style={containerStyle}>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.chatHistoryItem,
          {
            backgroundColor: isDark ? '#111111' : 'rgba(0, 0, 0, 0.03)',
          },
        ]}
      >
        <View style={[styles.chatHistoryIcon, {
          backgroundColor: isDark ? '#1A1A1A' : 'rgba(0, 0, 0, 0.06)',
        }]}>
          <Ionicons
            name="chatbubble-outline"
            size={16}
            color={isDark ? '#505050' : '#666666'}
          />
        </View>
        <View style={styles.chatHistoryContent}>
          <Text
            style={[styles.chatHistoryText, { color: isDark ? '#C0C0C0' : '#000000' }]}
            numberOfLines={1}
          >
            {summary || 'New conversation'}
          </Text>
          <Text
            style={[styles.chatHistoryDate, { color: isDark ? '#505050' : '#666666' }]}
          >
            {session.date}
          </Text>
        </View>
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onDelete();
          }}
          style={[styles.deleteButton, {
            backgroundColor: isDark ? '#1A1212' : 'rgba(255, 59, 48, 0.1)',
          }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name="trash-outline"
            size={14}
            color={isDark ? '#CC5555' : '#FF3B30'}
          />
        </TouchableOpacity>
      </Pressable>
    </Animated.View>
  );
};

// Main Side Navigation Component
export const NoraSideNav: React.FC<NoraSideNavProps> = ({
  items,
  activeItemId,
  onItemSelect,
  onNewChat,
  chatSessions = [],
  onSelectSession,
  onDeleteSession,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const { theme } = useTheme();
  const isDark = theme.isDark;

  // Animation values for custom animations
  const menuTranslateX = useSharedValue(MENU_WIDTH);
  const backdropOpacity = useSharedValue(0);
  const headerScale = useSharedValue(0.9);
  const headerOpacity = useSharedValue(0);
  const newChatScale = useSharedValue(0.8);
  const newChatOpacity = useSharedValue(0);

  const activeIndex = items.findIndex((item) => item.id === activeItemId);

  // Handle opening/closing animations
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      // Backdrop fade in
      backdropOpacity.value = withTiming(1, { duration: 250 });
      // Menu slide in with spring
      menuTranslateX.value = withSpring(0, {
        damping: 22,
        stiffness: 200,
        mass: 0.8,
      });
      // Header entrance
      headerScale.value = withDelay(100, withSpring(1, { damping: 15, stiffness: 200 }));
      headerOpacity.value = withDelay(100, withTiming(1, { duration: 200 }));
      // New chat button entrance
      newChatScale.value = withDelay(150, withSpring(1, { damping: 15, stiffness: 200 }));
      newChatOpacity.value = withDelay(150, withTiming(1, { duration: 200 }));
    } else {
      // Quick exit animations
      backdropOpacity.value = withTiming(0, { duration: 200 });
      menuTranslateX.value = withTiming(MENU_WIDTH, {
        duration: 250,
        easing: Easing.inOut(Easing.ease),
      });
      headerScale.value = 0.9;
      headerOpacity.value = 0;
      newChatScale.value = 0.8;
      newChatOpacity.value = 0;

      // Reset animating state after animation completes
      setTimeout(() => setIsAnimating(false), 250);
    }
  }, [isOpen]);

  const handleItemPress = useCallback((itemId: string) => {
    onItemSelect(itemId);
    setTimeout(() => setIsOpen(false), 150);
  }, [onItemSelect]);

  const handleNewChat = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsOpen(false);
    onNewChat?.();
  }, [onNewChat]);

  const handleSelectSession = useCallback((session: ChatSession) => {
    setIsOpen(false);
    onSelectSession?.(session);
  }, [onSelectSession]);

  const handleDeleteSession = useCallback((sessionId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onDeleteSession?.(sessionId);
  }, [onDeleteSession]);

  // Animated styles
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const menuPanelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: menuTranslateX.value }],
  }));

  const headerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: headerScale.value }],
    opacity: headerOpacity.value,
  }));

  const newChatStyle = useAnimatedStyle(() => ({
    transform: [{ scale: newChatScale.value }],
    opacity: newChatOpacity.value,
  }));

  return (
    <>
      <MenuButton isOpen={isOpen} onPress={() => setIsOpen(!isOpen)} />

      <Modal
        visible={isOpen || isAnimating}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => setIsOpen(false)}
      >
        {/* Animated Backdrop */}
        <Pressable
          style={styles.backdrop}
          onPress={() => setIsOpen(false)}
        >
          <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
            <BlurView
              intensity={isDark ? 30 : 20}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: isDark
                    ? 'rgba(0, 0, 0, 0.4)'
                    : 'rgba(0, 0, 0, 0.2)',
                },
              ]}
            />
          </Animated.View>
        </Pressable>

        {/* Animated Menu Panel */}
        <Animated.View
          style={[
            styles.menuPanel,
            {
              backgroundColor: isDark ? '#0A0A0A' : '#FFFFFF',
              borderLeftColor: isDark ? '#1A1A1A' : 'rgba(0, 0, 0, 0.08)',
            },
            menuPanelStyle,
          ]}
        >
          {/* Animated Header */}
          <Animated.View style={[styles.menuHeader, headerStyle]}>
            <Text style={[styles.menuTitle, { color: isDark ? '#E0E0E0' : '#000000' }]}>
              Nora
            </Text>
            <TouchableOpacity
              onPress={() => setIsOpen(false)}
              style={[
                styles.closeButton,
                {
                  backgroundColor: isDark ? '#1A1A1A' : 'rgba(0, 0, 0, 0.05)',
                },
              ]}
            >
              <Ionicons name="close" size={18} color={isDark ? '#707070' : '#666666'} />
            </TouchableOpacity>
          </Animated.View>

          {/* Animated New Chat Button */}
          {onNewChat && (
            <Animated.View style={newChatStyle}>
              <TouchableOpacity
                onPress={handleNewChat}
                activeOpacity={0.8}
                style={[
                  styles.newChatButton,
                  { backgroundColor: theme.primary },
                ]}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
                <Text style={styles.newChatText}>New Chat</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Navigation Items with staggered entrance */}
          <View style={styles.navItemsContainer}>
            <SlidingIndicator
              activeIndex={activeIndex >= 0 ? activeIndex : 0}
              itemCount={items.length}
            />
            {items.map((item, index) => (
              <NavItemComponent
                key={item.id}
                item={item}
                index={index}
                isActive={item.id === activeItemId}
                onPress={() => handleItemPress(item.id)}
                isVisible={isOpen}
              />
            ))}
          </View>

          {/* Chat History Section with staggered items */}
          <View style={styles.chatHistorySection}>
            <View style={[
              styles.chatHistoryHeader,
              { borderTopColor: isDark ? '#1A1A1A' : 'rgba(0,0,0,0.08)' }
            ]}>
              <Ionicons name="time-outline" size={14} color={isDark ? '#404040' : '#666666'} />
              <Text style={[styles.chatHistorySectionTitle, { color: isDark ? '#404040' : '#666666' }]}>
                Recent Chats
              </Text>
            </View>

            {chatSessions.length > 0 ? (
              <ScrollView
                style={styles.chatHistoryScrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.chatHistoryScrollContent}
              >
                {chatSessions.map((session, index) => (
                  <ChatHistoryItem
                    key={session.id}
                    session={session}
                    index={index}
                    onPress={() => handleSelectSession(session)}
                    onDelete={() => handleDeleteSession(session.id)}
                    isVisible={isOpen}
                  />
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyHistoryState}>
                <Ionicons name="chatbubbles-outline" size={32} color={isDark ? '#303030' : '#999999'} />
                <Text style={[styles.emptyHistoryText, { color: isDark ? '#303030' : '#999999' }]}>
                  No chat history yet
                </Text>
              </View>
            )}
          </View>

          {/* Footer */}
          <View style={[styles.menuFooter, { borderTopColor: isDark ? '#1A1A1A' : 'rgba(0,0,0,0.1)' }]}>
            <Text style={[styles.footerText, { color: isDark ? '#303030' : '#999999' }]}>
              Powered by AI
            </Text>
          </View>
        </Animated.View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },
  backdrop: {
    flex: 1,
  },
  menuPanel: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: MENU_WIDTH,
    paddingTop: 60,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
    borderLeftWidth: 1,
    ...Shadows.lg,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.xs,
  },
  menuTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    gap: 8,
    ...Shadows.sm,
  },
  newChatText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  navItemsContainer: {
    position: 'relative',
  },
  slidingIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ITEM_HEIGHT - INDICATOR_PADDING * 2,
    marginVertical: INDICATOR_PADDING,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  navItem: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  navItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navItemLabel: {
    fontSize: 15,
    flex: 1,
  },
  activeIndicatorDot: {
    position: 'absolute',
    right: 12,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  menuFooter: {
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
  },
  chatHistorySection: {
    flex: 1,
    marginTop: Spacing.md,
  },
  chatHistoryScrollView: {
    flex: 1,
  },
  chatHistoryScrollContent: {
    paddingBottom: Spacing.sm,
  },
  chatHistoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    borderTopWidth: 1,
  },
  chatHistorySectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chatHistoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: Spacing.sm,
    marginHorizontal: 4,
    marginVertical: 2,
    borderRadius: BorderRadius.sm,
    gap: 10,
  },
  chatHistoryIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  chatHistoryContent: {
    flex: 1,
  },
  chatHistoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  chatHistoryDate: {
    fontSize: 11,
    marginTop: 2,
  },
  emptyHistoryState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: 8,
  },
  emptyHistoryText: {
    fontSize: 13,
  },
});

export default NoraSideNav;
