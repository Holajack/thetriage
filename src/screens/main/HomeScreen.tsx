import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Image, Modal, TextInput, Alert, Pressable } from 'react-native';
import { ThemedImage } from '../../components/ThemedImage';
import LottieView from 'lottie-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getRandomQuote } from '../../data/motivationalQuotes';
import { useBackgroundMusic } from '../../hooks/useBackgroundMusic';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  withDelay,
  Easing
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { AnimationConfig, TimingConfig } from '../../theme/premiumTheme';
import { useEntranceAnimation, useButtonPressAnimation } from '../../utils/animationUtils';

// Import userAppData functions
const userAppDataModule = require('../../utils/userAppData');

// Extract functions from userAppData module
const { useUserAppData } = userAppDataModule;

export default function HomeScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme(); // Use theme context directly
  const { user } = useAuth(); // Get user data for profile
  
  const [inspiration, setInspiration] = useState<{quote: string; author: string} | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState('Medium');

  // Reanimated shared values for premium animations
  const pulseScale = useSharedValue(1);
  const colorFillProgress = useSharedValue(0);
  const colorFillOpacity = useSharedValue(0);

  // Entrance animations
  const quoteEntranceStyle = useEntranceAnimation(0);
  const imageEntranceStyle = useEntranceAnimation(200);
  const buttonEntranceStyle = useEntranceAnimation(400);

  // Button press animation for Focus button
  const focusButtonAnimation = useButtonPressAnimation();

  // Use our comprehensive data hook
  const { data: userData } = useUserAppData();

  // Use theme context colors directly - they automatically sync with Settings
  const environmentColors = theme;

  // Music hook - stop playback when returning to home
  const { stopPlayback } = useBackgroundMusic();

  // Stop music when returning to home screen
  useEffect(() => {
    stopPlayback().catch(error => {
      console.warn('🎵 Failed to stop music on home screen:', error);
    });
  }, [stopPlayback]);

  // Generate daily changing encouragement text from comprehensive database
  const getDailyEncouragement = () => {
    const today = new Date();
    // Use day of year to ensure same quote shows all day
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));

    // Use the day of year as a seed for consistent daily quotes
    const previousRandom = Math.random;
    Math.random = () => {
      const x = Math.sin(dayOfYear) * 10000;
      return x - Math.floor(x);
    };

    const quote = getRandomQuote();
    Math.random = previousRandom; // Restore original random

    return quote;
  };


  useEffect(() => {
    // Set daily encouragement from database of 200+ quotes
    const dailyEncouragement = getDailyEncouragement();
    setInspiration(dailyEncouragement);

    // Start Reanimated pulse animation for main image
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1, // Infinite repeat
      true
    );
  }, []);

  const handleStartFocusSession = () => {
    // Add haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Start color fill animation with spring physics
    colorFillOpacity.value = withTiming(1, { duration: TimingConfig.fast });
    colorFillProgress.value = withTiming(1, {
      duration: 1200,
      easing: Easing.bezier(0.33, 1, 0.68, 1),
    });

    // Navigate after animation completes
    setTimeout(() => {
      navigation.navigate('FocusPreparation' as never);
      // Reset animation for next time
      colorFillProgress.value = 0;
      colorFillOpacity.value = 0;
    }, 1200);
  };

  const handleQuickActions = (action: string) => {
    switch (action) {
      case 'tasks':
        setShowTaskModal(true);
        break;
      case 'progress':
        navigation.navigate('Results' as never);
        break;
      case 'leaderboard':
        navigation.navigate('Leaderboard' as never);
        break;
      case 'settings':
        navigation.navigate('Settings' as never);
        break;
      case 'profile':
        navigation.navigate('Profile' as never);
        break;
      default:
        break;
    }
  };

  const handleNavigation = (destination: string) => {
    // Add haptic feedback for navigation
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    switch (destination) {
      case 'settings':
        navigation.navigate('Settings' as never);
        break;
      case 'nora':
        navigation.navigate('NoraScreen' as never);
        break;
      case 'leaderboard':
        navigation.navigate('Leaderboard' as never);
        break;
      default:
        break;
    }
  };


  const handleCreateTask = () => {
    if (!taskTitle.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    // Here you would typically save the task to your backend/database
    console.log('Creating task:', { title: taskTitle, priority: taskPriority });
    
    // For now, just show a success message
    Alert.alert('Success', 'Task created successfully!', [
      {
        text: 'OK',
        onPress: () => {
          setTaskTitle('');
          setTaskPriority('Medium');
          setShowTaskModal(false);
        }
      }
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: environmentColors.background }]}>
      {/* Top Bar with Profile Icon */}
      <View style={styles.topBar}>
        {/* Profile Icon */}
        <TouchableOpacity
          style={styles.profileIconContainer}
          onPress={() => handleQuickActions('profile')}
          activeOpacity={0.8}
        >
          <View style={[styles.profileIcon, { backgroundColor: environmentColors.card }]}>
            {user?.avatar_url ? (
              <Image 
                source={{ uri: user.avatar_url }} 
                style={styles.profileImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.defaultProfileIcon, { backgroundColor: environmentColors.primary }]}>
                <Text style={styles.profileInitial}>
                  {user?.full_name?.[0] || user?.username?.[0] || 'U'}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* Main Content Container - No Scroll */}
      <View style={styles.mainContent}>
          {/* Top Content */}
          <View style={styles.topContent}>
            {/* Inspirational Quote - Entrance Animation */}
            <Animated.View style={[styles.quoteContainer, quoteEntranceStyle]}>
              <Text style={[styles.quote, { color: environmentColors.text }]}>
                "{inspiration?.quote || 'The way to get started is to quit talking and begin doing.'}"
              </Text>
              <Text style={[styles.quoteAuthor, { color: environmentColors.text + '80' }]}>
                - {inspiration?.author || 'Walt Disney'}
              </Text>
            </Animated.View>

            {/* Central HomeScreen Image */}
            <Animated.View style={[styles.centralImageContainer, imageEntranceStyle]}>
              {/* Main image with gentle pulse animation */}
              <Animated.View style={useAnimatedStyle(() => ({
                transform: [{ scale: pulseScale.value }]
              }))}>
                <Pressable
                  onPress={() => {
                    // Trigger haptic feedback
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    // Trigger a quick bounce animation on tap
                    pulseScale.value = withSequence(
                      withTiming(0.96, { duration: 100 }),
                      withSpring(1.06, AnimationConfig.bouncy),
                      withSpring(1, AnimationConfig.standard)
                    );
                  }}
                >
                  <ThemedImage
                    source={require('../../../assets/homescreen-image.png')}
                    style={styles.centralImage}
                    resizeMode="contain"
                    applyFilter={true}
                  />
                </Pressable>
              </Animated.View>
            </Animated.View>
          </View>

          {/* Spacer to push focus button down - clean layout v5 */}
          <View style={{ flex: 1 }} />

          {/* Large Focus Button - Positioned at Bottom with Premium Animation */}
          <Animated.View style={[buttonEntranceStyle, focusButtonAnimation.animatedStyle]}>
            <Pressable
              style={[styles.mainFocusButton, { backgroundColor: environmentColors.primary }]}
              onPress={handleStartFocusSession}
              onPressIn={focusButtonAnimation.onPressIn}
              onPressOut={focusButtonAnimation.onPressOut}
            >
              <Text style={styles.focusButtonText}>Focus</Text>
            </Pressable>
          </Animated.View>
      </View>

      {/* Bottom Navigation Bar - Positioned Up from Edge */}
      <View style={[styles.bottomNavContainer, { borderTopColor: environmentColors.border }]}>
        <NavButton
          onPress={() => handleNavigation('settings')}
          style={[styles.navButton, styles.leftNavButton, { backgroundColor: environmentColors.card }]}
        >
          <Ionicons name="settings-outline" size={26} color={environmentColors.primary} />
        </NavButton>

        <NavButton
          onPress={() => handleNavigation('nora')}
          style={[styles.navButton, styles.centerNavButton, {
            backgroundColor: theme.isDark ? '#2A2A2A' : environmentColors.card,
            borderWidth: theme.isDark ? 2 : 0,
            borderColor: theme.isDark ? environmentColors.primary : 'transparent'
          }]}
        >
          <Text style={[styles.pawPrint, {
            color: theme.isDark ? '#FFFFFF' : environmentColors.primary,
            textShadowColor: theme.isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.2)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: theme.isDark ? 4 : 3
          }]}>🐾</Text>
        </NavButton>

        <NavButton
          onPress={() => handleNavigation('leaderboard')}
          style={[styles.navButton, styles.rightNavButton, { backgroundColor: environmentColors.card }]}
        >
          <Ionicons name="trophy-outline" size={26} color={environmentColors.primary} />
        </NavButton>
      </View>

      {/* Task Creation Modal */}
      <Modal
        visible={showTaskModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTaskModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: environmentColors.card }]}>
            <Text style={[styles.modalTitle, { color: environmentColors.text }]}>Create New Task</Text>
            
            <TextInput
              style={[styles.taskInput, { color: environmentColors.text, borderColor: environmentColors.primary }]}
              placeholder="Enter task title..."
              placeholderTextColor={environmentColors.text + '80'}
              value={taskTitle}
              onChangeText={setTaskTitle}
              autoFocus
            />

            <Text style={[styles.priorityLabel, { color: environmentColors.text }]}>Priority Level:</Text>
            <View style={styles.priorityContainer}>
              {['Low', 'Medium', 'High'].map(priority => (
                <TouchableOpacity
                  key={priority}
                  style={[
                    styles.priorityButton,
                    { 
                      borderColor: environmentColors.primary,
                      backgroundColor: taskPriority === priority ? environmentColors.primary : 'transparent'
                    }
                  ]}
                  onPress={() => setTaskPriority(priority)}
                >
                  <Text style={[
                    styles.priorityButtonText,
                    { color: taskPriority === priority ? environmentColors.card : environmentColors.primary }
                  ]}>
                    {priority}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowTaskModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: environmentColors.text + '80' }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton, { backgroundColor: environmentColors.primary }]}
                onPress={handleCreateTask}
              >
                <Text style={[styles.modalButtonText, { color: environmentColors.card }]}>Create Task</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Color Fill Animation Overlay - Reanimated */}
      <Animated.View
        style={[
          styles.colorFillOverlay,
          {
            backgroundColor: environmentColors.primary,
          },
          useAnimatedStyle(() => ({
            opacity: colorFillOpacity.value,
            transform: [{ scale: 1 + (colorFillProgress.value * 34) }],
          })),
        ]}
        pointerEvents="none"
      />
    </SafeAreaView>
  );
};

// NavButton Component with Premium Animation
const NavButton: React.FC<{
  onPress: () => void;
  style?: any;
  children: React.ReactNode;
}> = ({ onPress, style, children }) => {
  const animation = useButtonPressAnimation();

  return (
    <Animated.View style={animation.animatedStyle}>
      <Pressable
        style={style}
        onPress={onPress}
        onPressIn={animation.onPressIn}
        onPressOut={animation.onPressOut}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    backgroundColor: 'transparent',
  },
  menuButton: {
    padding: 8,
    marginRight: 12,
  },
  profileIconContainer: {
    position: 'absolute',
    top: 10,
    right: 16,
    zIndex: 10,
  },
  profileIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
    overflow: 'hidden',
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  defaultProfileIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitial: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'space-between', // Distribute space to push focus button down
    paddingTop: 60,
  },
  topContent: {
    alignItems: 'center',
    width: '100%',
  },
  quoteContainer: {
    alignItems: 'center',
    marginBottom: 50, // More space after quote
    paddingHorizontal: 15,
  },
  quote: {
    fontSize: 19,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 10,
  },
  quoteAuthor: {
    fontSize: 15,
    fontStyle: 'italic',
    opacity: 0.8,
  },
  centralImageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 60, // Reduced space between image and focus button
    marginTop: 40, // Move image further down to match IMG_0014.PNG spacing
    position: 'relative',
  },
  centralImage: {
    width: width * 0.9, // 90% of screen width - bigger image
    height: 220, // Larger height for bigger image
    maxWidth: 350,
  },
  mainFocusButton: {
    width: 100, // Smaller to match IMG_0014.PNG proportions
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30, // Reduced margin 
    marginBottom: 100, // Much more space above bottom nav (avoid overlap with paw button)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
    transform: [{ scale: 1 }],
  },
  focusButtonText: {
    color: '#FFFFFF',
    fontSize: 18, // Smaller text to match smaller button
    fontWeight: 'bold',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  taskInput: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
  },
  priorityLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  priorityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  priorityButton: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  priorityButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  createButton: {
    // backgroundColor set dynamically
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  bottomNavContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 40,
    paddingBottom: 35,
    marginTop: 10,
    width: '100%',
    backgroundColor: 'transparent',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  navButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  leftNavButton: {
    alignSelf: 'flex-start',
  },
  centerNavButton: {
    alignSelf: 'center',
  },
  rightNavButton: {
    alignSelf: 'flex-end',
  },
  pawPrint: {
    fontSize: 28,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  colorFillOverlay: {
    position: 'absolute',
    bottom: 140, // Position near the focus button
    left: '50%',
    width: 100,
    height: 100,
    borderRadius: 50,
    marginLeft: -50,
    zIndex: 1000,
  },
});

