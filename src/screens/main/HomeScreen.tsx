import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Image, Animated, Modal, TextInput, Alert } from 'react-native';
import { ThemedImage } from '../../components/ThemedImage';
import LottieView from 'lottie-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

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
  
  // Animation refs
  const scrollY = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const colorFillAnim = useRef(new Animated.Value(0)).current;
  
  // Use our comprehensive data hook
  const { data: userData } = useUserAppData();

  // Use theme context colors directly - they automatically sync with Settings
  const environmentColors = theme;


  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
    }
  );

  // Generate daily changing encouragement text
  const getDailyEncouragement = () => {
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    
    const encouragements = [
      { quote: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
      { quote: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
      { quote: "The only impossible journey is the one you never begin.", author: "Tony Robbins" },
      { quote: "Your limitation—it's only your imagination.", author: "Unknown" },
      { quote: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
      { quote: "Great things never come from comfort zones.", author: "Unknown" },
      { quote: "Dream it. Wish it. Do it.", author: "Unknown" },
      { quote: "Success doesn't just find you. You have to go out and get it.", author: "Unknown" },
      { quote: "The harder you work for something, the greater you'll feel when you achieve it.", author: "Unknown" },
      { quote: "Dream bigger. Do bigger.", author: "Unknown" },
      { quote: "Don't stop when you're tired. Stop when you're done.", author: "Unknown" },
      { quote: "Wake up with determination. Go to bed with satisfaction.", author: "George Lorimer" },
      { quote: "Do something today that your future self will thank you for.", author: "Sean Patrick Flanery" },
      { quote: "Little progress is still progress.", author: "Unknown" },
      { quote: "Don't wait for opportunity. Create it.", author: "George Bernard Shaw" },
      { quote: "Sometimes we're tested not to show our weaknesses, but to discover our strengths.", author: "Unknown" },
      { quote: "The key to success is to focus on goals, not obstacles.", author: "Unknown" },
      { quote: "You don't have to be great to get started, but you have to get started to be great.", author: "Zig Ziglar" },
      { quote: "A year from now you may wish you had started today.", author: "Karen Lamb" },
      { quote: "The secret of getting ahead is getting started.", author: "Mark Twain" },
      { quote: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
      { quote: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
      { quote: "You are never too old to set another goal or to dream a new dream.", author: "C.S. Lewis" },
      { quote: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
      { quote: "It is during our darkest moments that we must focus to see the light.", author: "Aristotle" },
      { quote: "You have been assigned this mountain to show others it can be moved.", author: "Mel Robbins" },
      { quote: "Difficult roads often lead to beautiful destinations.", author: "Zig Ziglar" },
      { quote: "Focus on being productive instead of being busy.", author: "Tim Ferriss" },
      { quote: "Your only limit is your mind.", author: "Unknown" },
      { quote: "Be yourself; everyone else is already taken.", author: "Oscar Wilde" },
    ];
    
    return encouragements[dayOfYear % encouragements.length];
  };


  useEffect(() => {
    // Set daily encouragement
    const dailyEncouragement = getDailyEncouragement();
    setInspiration(dailyEncouragement);

    // Start pulse animation for main image
    const startPulseAnimation = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.02,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    startPulseAnimation();
  }, []);

  const handleStartFocusSession = () => {
    // Start color fill animation with longer duration and better easing
    Animated.timing(colorFillAnim, {
      toValue: 1,
      duration: 1200, // Increased from 800 to 1200ms for fuller screen coverage
      useNativeDriver: false,
    }).start(() => {
      // Navigate after animation completes
      navigation.navigate('FocusPreparation' as never);
      // Reset animation for next time
      colorFillAnim.setValue(0);
    });
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
    switch (destination) {
      case 'settings':
        // Add sliding transition animation - slide from left
        const slideAnimation = Animated.timing(scrollY, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        });
        slideAnimation.start(() => {
          navigation.navigate('Settings' as never);
          scrollY.setValue(0); // Reset animation value
        });
        break;
      case 'nora':
        // No functionality - placeholder
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
      {/* Top Bar with Menu and Profile Icon */}
      <View style={styles.topBar}>
        {/* Menu Button */}
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        >
          <Ionicons name="menu" size={24} color={environmentColors.text} />
        </TouchableOpacity>

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
            {/* Inspirational Quote */}
            <View style={styles.quoteContainer}>
              <Text style={[styles.quote, { color: environmentColors.text }]}>
                "{inspiration?.quote || 'The way to get started is to quit talking and begin doing.'}"
              </Text>
              <Text style={[styles.quoteAuthor, { color: environmentColors.text + '80' }]}>
                - {inspiration?.author || 'Walt Disney'}
              </Text>
            </View>

            {/* Central HomeScreen Image */}
            <View style={styles.centralImageContainer}>
              {/* Main image with gentle pulse animation */}
              <Animated.View style={{
                transform: [{ scale: pulseAnim }]
              }}>
                <TouchableOpacity 
                  onPress={() => {
                    // Trigger a quick bounce animation on tap
                    Animated.sequence([
                      Animated.timing(pulseAnim, {
                        toValue: 0.96,
                        duration: 100,
                        useNativeDriver: true,
                      }),
                      Animated.timing(pulseAnim, {
                        toValue: 1.06,
                        duration: 200,
                        useNativeDriver: true,
                      }),
                      Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 100,
                        useNativeDriver: true,
                      }),
                    ]).start();
                  }}
                  activeOpacity={0.9}
                >
                  <ThemedImage 
                    source={require('../../../assets/homescreen-image.png')} 
                    style={styles.centralImage}
                    resizeMode="contain"
                    applyFilter={true}
                  />
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>

          {/* Spacer to push focus button down - clean layout v5 */}
          <View style={{ flex: 1 }} />

          {/* Large Focus Button - Positioned at Bottom */}
          <TouchableOpacity 
            style={[styles.mainFocusButton, { backgroundColor: environmentColors.primary }]}
            onPress={handleStartFocusSession}
            activeOpacity={0.8}
          >
            <Text style={styles.focusButtonText}>Focus</Text>
          </TouchableOpacity>
      </View>

      {/* Bottom Navigation Bar - Positioned Up from Edge */}
      <View style={[styles.bottomNavContainer, { borderTopColor: environmentColors.border }]}>
        <TouchableOpacity
          style={[styles.navButton, styles.leftNavButton, { backgroundColor: environmentColors.card }]}
          onPress={() => handleNavigation('settings')}
          activeOpacity={0.7}
        >
          <Ionicons name="settings-outline" size={26} color={environmentColors.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, styles.centerNavButton, {
            backgroundColor: theme.isDark ? '#2A2A2A' : environmentColors.card,
            borderWidth: theme.isDark ? 2 : 0,
            borderColor: theme.isDark ? environmentColors.primary : 'transparent'
          }]}
          onPress={() => handleNavigation('nora')}
          activeOpacity={0.7}
        >
          <Text style={[styles.pawPrint, {
            color: theme.isDark ? '#FFFFFF' : environmentColors.primary,
            textShadowColor: theme.isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.2)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: theme.isDark ? 4 : 3
          }]}>🐾</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, styles.rightNavButton, { backgroundColor: environmentColors.card }]}
          onPress={() => handleNavigation('leaderboard')}
          activeOpacity={0.7}
        >
          <Ionicons name="trophy-outline" size={26} color={environmentColors.primary} />
        </TouchableOpacity>
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

      {/* Color Fill Animation Overlay */}
      <Animated.View
        style={[
          styles.colorFillOverlay,
          {
            backgroundColor: environmentColors.primary,
            opacity: colorFillAnim.interpolate({
              inputRange: [0, 0.3, 1],
              outputRange: [0, 0.9, 1],
            }),
            transform: [
              {
                scale: colorFillAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 35], // Further increased scale to ensure full screen coverage
                }),
              },
            ],
          },
        ]}
        pointerEvents="none"
      />
    </SafeAreaView>
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

