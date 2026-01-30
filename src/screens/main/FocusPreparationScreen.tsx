import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, Alert, Dimensions, Animated, KeyboardAvoidingView, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ThemedImageBackground } from '../../components/ThemedImage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useConvexTasks } from '../../hooks/useConvex';
import { getUserSettings, updateUserSettings } from '../../utils/userSettings';
import { useAuth } from '../../context/AuthContext';
import { startFocusSessionWithDND } from '../../utils/doNotDisturb';
import { LinearGradient } from 'expo-linear-gradient';
import ReAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withSequence,
  withTiming,
  withRepeat,
  Easing,
  interpolate,
  FadeInDown
} from 'react-native-reanimated';
import { Typography, Spacing, BorderRadius, Shadows, AnimationConfig, TimingConfig } from '../../theme/premiumTheme';
import { useEntranceAnimation, useButtonPressAnimation, usePulseAnimation, triggerHaptic } from '../../utils/animationUtils';

const { width, height } = Dimensions.get('window');

// Animated Task Item Component
const AnimatedTaskItem = ({ task, isSelected, onPress, index, theme }: any) => {
  const scale = useSharedValue(1);
  const selectedScale = useSharedValue(isSelected ? 1 : 0);

  // Update selection animation when isSelected changes
  React.useEffect(() => {
    selectedScale.value = withSpring(isSelected ? 1 : 0, {
      damping: 15,
      stiffness: 150,
    });
  }, [isSelected]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value * (1 + selectedScale.value * 0.02) } // Subtle scale to 1.02 when selected
    ]
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, AnimationConfig.snappy);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, AnimationConfig.bouncy);
  };

  const handlePress = () => {
    triggerHaptic('selection');
    onPress();
  };

  return (
    <ReAnimated.View
      entering={FadeInDown.delay(index * 60).springify().damping(15).stiffness(150)}
      style={animatedStyle}
    >
      <TouchableOpacity
        style={[
          styles.taskOption,
          isSelected && { backgroundColor: theme.primary + '20' },
          { borderBottomColor: theme.background }
        ]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        activeOpacity={1}
      >
        <Text style={[
          styles.taskOptionText,
          { color: theme.text }
        ]}>
          {task.title}
        </Text>
        {isSelected && (
          <Ionicons name="checkmark-outline" size={20} color={theme.primary} />
        )}
      </TouchableOpacity>
    </ReAnimated.View>
  );
};

// Animated Time Option Component
interface AnimatedTimeOptionProps {
  option: { label: string; value: number; isWorkStyle: boolean };
  isSelected: boolean;
  onPress: () => void;
  themeColor: string;
  textColor: string;
  isCompact?: boolean;
}

const AnimatedTimeOption: React.FC<AnimatedTimeOptionProps> = ({
  option,
  isSelected,
  onPress,
  themeColor,
  textColor,
  isCompact = false
}) => {
  const scale = useSharedValue(1);
  const borderWidth = useSharedValue(isSelected ? 2 : 1);
  const confirmScale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value * confirmScale.value }
    ],
    borderWidth: borderWidth.value,
    borderColor: themeColor,
    borderRadius: 20,
    overflow: 'hidden',
  }));

  // Compact style for break time options
  const compactStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: isCompact ? 0.85 : 1 }
    ]
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.92, AnimationConfig.snappy);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, AnimationConfig.bouncy);
  };

  const handlePress = () => {
    // Trigger haptic feedback
    triggerHaptic('selection');

    // Confirmation bounce animation
    confirmScale.value = withSequence(
      withSpring(1.15, AnimationConfig.bouncy),
      withSpring(1, AnimationConfig.standard)
    );

    // Animate border width on selection
    if (!isSelected) {
      borderWidth.value = withSpring(2, AnimationConfig.snappy);
    }

    onPress();
  };

  // Reset border width when deselected
  React.useEffect(() => {
    if (!isSelected) {
      borderWidth.value = withSpring(1, AnimationConfig.standard);
    } else {
      borderWidth.value = withSpring(2, AnimationConfig.snappy);
    }
  }, [isSelected]);

  return (
    <ReAnimated.View style={[animatedStyle, compactStyle]}>
      <TouchableOpacity
        style={[
          styles.inlineTimeOption,
          isSelected && { backgroundColor: themeColor },
          { borderWidth: 0 } // Border is handled by animated view
        ]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <Text style={[
          styles.inlineTimeOptionText,
          { color: isSelected ? '#fff' : textColor }
        ]}>
          {option.label}
        </Text>
      </TouchableOpacity>
    </ReAnimated.View>
  );
};

export default function FocusPreparationScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { tasks, addTask, refetch: refetchTasks } = useConvexTasks();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  
  // Dynamic styles that depend on theme
  const dynamicStyles = {
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.isDark ? 'rgba(66, 66, 66, 0.9)' : 'rgba(255,255,255,0.9)',
      justifyContent: 'center' as 'center',
      alignItems: 'center' as 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: theme.isDark ? 0.3 : 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    warningBanner: {
      flexDirection: 'row' as 'row',
      alignItems: 'center' as 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      marginHorizontal: 20,
      marginBottom: 10,
      borderRadius: 20,
      borderWidth: theme.isDark ? 1 : 0,
      borderColor: theme.isDark ? theme.primary + '40' : 'transparent',
    },
    menuContainer: {
      position: 'absolute' as 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 24,
      paddingBottom: 40,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
      backgroundColor: theme.isDark ? 'rgba(33, 33, 33, 0.95)' : 'rgba(255,255,255,0.95)',
    },
  };

  // State management
  const [selectedTime, setSelectedTime] = useState(25); // Default to 25 minutes
  const [selectedBreakTime, setSelectedBreakTime] = useState(15); // Default to 15 minutes
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isManualProgression, setIsManualProgression] = useState(true);
  const [showTimeSelector, setShowTimeSelector] = useState(false);
  const [showInlineTimeSelector, setShowInlineTimeSelector] = useState(false);
  const [showTaskSelector, setShowTaskSelector] = useState(false);
  const [showWorkStyleWarning, setShowWorkStyleWarning] = useState(false);
  const [userSettings, setUserSettings] = useState<any>(null);
  
  // Basecamp/Summit system states
  const [focusMode, setFocusMode] = useState<'basecamp' | 'summit' | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<any[]>([]);
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [showNotification, setShowNotification] = useState('');

  // Quick task creation states (now used in task selector modal)
  const [showQuickTask, setShowQuickTask] = useState(false);
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickTaskSubject, setQuickTaskSubject] = useState('');

  // Nora chat modal states
  const [showNoraChat, setShowNoraChat] = useState(false);
  const [noraChatInput, setNoraChatInput] = useState('');
  const [noraChatMessages, setNoraChatMessages] = useState<{id: string, text: string, isUser: boolean, timestamp: Date}[]>([]);
  
  // Color fill animation
  const colorFillAnim = useRef(new Animated.Value(0)).current;

  // Premium animations
  const headerAnimStyle = useEntranceAnimation(0);
  const menuAnimStyle = useEntranceAnimation(200);
  const mode1AnimStyle = useEntranceAnimation(300);
  const mode2AnimStyle = useEntranceAnimation(400);
  const timeAnimStyle = useEntranceAnimation(500);

  // Pulse animation for selected time option
  const selectedTimePulse = usePulseAnimation(showInlineTimeSelector);

  // Go button animation
  const goButtonScale = useSharedValue(1);
  const goButtonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: goButtonScale.value }]
  }));

  const handleGoButtonPress = () => {
    triggerHaptic('success');
    goButtonScale.value = withSequence(
      withSpring(0.9, AnimationConfig.snappy),
      withSpring(1.1, AnimationConfig.bouncy),
      withSpring(1, AnimationConfig.standard)
    );
    handleStartFocus();
  };

  // Mode button press animations
  const basecampButton = useButtonPressAnimation();
  const summitButton = useButtonPressAnimation();

  // Border glow animation for mode buttons
  const basecampBorderGlow = useSharedValue(0);
  const summitBorderGlow = useSharedValue(0);

  const basecampBorderStyle = useAnimatedStyle(() => ({
    shadowOpacity: interpolate(basecampBorderGlow.value, [0, 1], [0.1, 0.4]),
    shadowRadius: interpolate(basecampBorderGlow.value, [0, 1], [4, 12]),
  }));

  const summitBorderStyle = useAnimatedStyle(() => ({
    shadowOpacity: interpolate(summitBorderGlow.value, [0, 1], [0.1, 0.4]),
    shadowRadius: interpolate(summitBorderGlow.value, [0, 1], [4, 12]),
  }));

  // Default work style times (loaded from user settings)
  const defaultWorkStyle = userSettings ? {
    name: userSettings.workStyle || 'Balanced',
    focusTime: userSettings.workStyle === 'Sprint' ? 25 : userSettings.workStyle === 'Deep Work' ? 60 : 45,
    breakTime: userSettings.workStyle === 'Sprint' ? 5 : 15
  } : {
    name: 'Balanced',
    focusTime: 25,
    breakTime: 5
  };



  // Load user settings and start animations
  useEffect(() => {
    const loadUserSettings = async () => {
      try {
        const settings = await getUserSettings();
        console.log('Loaded user settings:', settings);
        setUserSettings(settings);
        
        // Set default time based on user's work style
        let defaultTime = 25; // Default fallback
        
        if (settings?.workStyle) {
          switch (settings.workStyle) {
            case 'Sprint':
              defaultTime = 25;
              break;
            case 'Deep Work':
              defaultTime = 60;
              break;
            case 'Balanced':
            default:
              defaultTime = 45;
              break;
          }
        } else if (settings?.focus_duration) {
          defaultTime = settings.focus_duration;
        }

        setSelectedTime(defaultTime);

        // Load break preference
        if (settings?.preferred_break_length) {
          setSelectedBreakTime(settings.preferred_break_length);
        }
      } catch (error) {
        console.warn('Failed to load user settings, using defaults:', error);
        // Use default settings
        setSelectedTime(25);
      }
    };
    
    loadUserSettings();
  }, []);

  // Time options following the specified pattern
  const getTimeOptions = () => {
    const workStyles = [
      { label: 'Deep Work', value: 60, isWorkStyle: true },
      { label: 'Balanced', value: 45, isWorkStyle: true },
      { label: 'Sprint', value: 25, isWorkStyle: true },
    ];

    const customTimes = [];
    // Start at 5 minutes (removed 3-minute option as sessions under 5 minutes are not saved)
    customTimes.push({ label: '5 min', value: 5, isWorkStyle: false });
    
    // Increments of 5 until 30
    for (let i = 10; i <= 30; i += 5) {
      customTimes.push({ label: `${i} min`, value: i, isWorkStyle: false });
    }
    
    // 40, 50, 60, 90, 120
    [40, 50, 60, 90, 120].forEach(time => {
      customTimes.push({ label: `${time} min`, value: time, isWorkStyle: false });
    });

    return [...workStyles, ...customTimes];
  };

  const timeOptions = getTimeOptions();

  // Break time options (5-30 minutes in 5-minute increments)
  const breakTimeOptions = [
    { label: '5 min', value: 5 },
    { label: '10 min', value: 10 },
    { label: '15 min', value: 15 },
    { label: '20 min', value: 20 },
    { label: '25 min', value: 25 },
    { label: '30 min', value: 30 },
  ];

  const handleTimeSelection = (time: number, isWorkStyle: boolean) => {
    setSelectedTime(time);
    setShowTimeSelector(false);

    // Auto-select break time based on work style
    if (isWorkStyle) {
      if (time === 60) {
        // Deep Work → 5 minute break
        setSelectedBreakTime(5);
      } else if (time === 45) {
        // Balanced → 15 minute break
        setSelectedBreakTime(15);
      } else if (time === 25) {
        // Sprint → 5 minute break
        setSelectedBreakTime(5);
      }
    }

    // Show warning if not using default work style
    if (!isWorkStyle && time !== defaultWorkStyle.focusTime) {
      setShowWorkStyleWarning(true);
      setTimeout(() => setShowWorkStyleWarning(false), 3000);
    }
  };

  const handleBreakTimeSelection = async (time: number) => {
    setSelectedBreakTime(time);

    // Save break preference to database
    if (user?.id) {
      try {
        await updateUserSettings(user.id, {
          preferred_break_length: time
        });
        console.log('✅ Break preference saved:', time);
      } catch (error) {
        console.error('❌ Failed to save break preference:', error);
      }
    }
  };

  const handleModeSelection = (mode: 'basecamp' | 'summit') => {
    setFocusMode(mode);
    setSelectedTasks([]);
    setSelectedTask(null);
    setShowModeSelector(false);
    setShowTaskSelector(true);
    
    // Force manual mode for Basecamp
    if (mode === 'basecamp') {
      setIsManualProgression(true);
    }
  };

  const handleTaskSelection = (task: any) => {
    if (focusMode === 'basecamp') {
      setSelectedTask(task);
      setSelectedTasks([task]);
      setShowTaskSelector(false);
    } else if (focusMode === 'summit') {
      const isSelected = selectedTasks.some(t => t.id === task.id);
      if (isSelected) {
        const newTasks = selectedTasks.filter(t => t.id !== task.id);
        setSelectedTasks(newTasks);
        if (selectedTask?.id === task.id) {
          setSelectedTask(newTasks[0] || null);
        }
      } else {
        const newTasks = [...selectedTasks, task];
        setSelectedTasks(newTasks);
        if (!selectedTask) {
          setSelectedTask(task); // Set first task as primary
        }
      }
    }
  };

  const handleManualToggle = () => {
    // Completely prevent any toggle in Basecamp mode
    if (focusMode === 'basecamp') {
      setShowNotification('Basecamp mode is always manual - select Summit for automatic mode');
      setTimeout(() => setShowNotification(''), 3000);
      return;
    }

    // Only allow toggle in Summit mode
    if (focusMode === 'summit') {
      setIsManualProgression(!isManualProgression);
    }
  };

  const handleQuickTaskCreate = async () => {
    if (!quickTaskTitle.trim()) {
      Alert.alert('Task Required', 'Please enter a task title');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Call addTask with correct positional parameters: (title, description, priority, subject)
      const newTask = await addTask(
        quickTaskTitle.trim(),
        '',
        'Medium',
        quickTaskSubject.trim() || 'General'
      );

      console.log('✅ Quick task created:', newTask);

      if (newTask) {
        // Auto-select based on mode
        if (focusMode === 'basecamp') {
          setSelectedTask(newTask);
          setSelectedTasks([newTask]);
        } else if (focusMode === 'summit') {
          setSelectedTasks(prev => [...prev, newTask]);
          if (selectedTasks.length === 0) {
            setSelectedTask(newTask);
          }
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowNotification('Task created and selected!');
        setTimeout(() => setShowNotification(''), 2000);
      }

      // Reset form
      setQuickTaskTitle('');
      setQuickTaskSubject('');
      setShowQuickTask(false);
    } catch (error) {
      console.error('❌ Failed to create task:', error);
      Alert.alert('Error', 'Failed to create task. Please try again.');
    }
  };

  const handleNoraChat = () => {
    setShowNoraChat(true);
  };

  const handleSendNoraMessage = () => {
    if (!noraChatInput.trim()) return;

    const userMessage = {
      id: Date.now() + Math.random().toString(),
      text: noraChatInput.trim(),
      isUser: true,
      timestamp: new Date()
    };

    setNoraChatMessages(prev => [...prev, userMessage]);
    setNoraChatInput('');

    // Simulate Nora's response (in a real app, this would call an AI service)
    setTimeout(() => {
      const noraResponse = {
        id: Date.now() + Math.random().toString(),
        text: getNoraResponse(userMessage.text),
        isUser: false,
        timestamp: new Date()
      };
      setNoraChatMessages(prev => [...prev, noraResponse]);
    }, 1000);
  };

  const getNoraResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();
    
    if (input.includes('focus') || input.includes('study')) {
      return "Great question! I'm here to help you focus better. Try starting with shorter sessions and gradually increase the duration. What specific aspect of focusing would you like help with?";
    }
    if (input.includes('time') || input.includes('duration')) {
      return "For focus sessions, I recommend starting with 25-45 minute sessions. Your current work style is set to " + (userSettings?.workStyle || 'Balanced') + ". Would you like me to explain the different work styles?";
    }
    if (input.includes('basecamp') || input.includes('summit')) {
      return "Basecamp is perfect for deep focus on a single task, while Summit helps you tackle multiple tasks efficiently. Basecamp uses manual progression only, while Summit offers both manual and automatic task organization.";
    }
    if (input.includes('break') || input.includes('rest')) {
      return "Taking breaks is crucial! I recommend 5-15 minute breaks depending on your work style. Use breaks to stretch, hydrate, or do light movement. Avoid screens during breaks when possible.";
    }
    if (input.includes('motivation') || input.includes('difficult')) {
      return "I understand studying can be challenging! Try breaking your task into smaller, manageable chunks. Remember why you're studying and celebrate small victories. You've got this! 🌟";
    }
    
    // Default responses
    const defaultResponses = [
      "That's a great question! I'm here to help you optimize your study sessions. What specific challenge are you facing?",
      "I'm Nora, your AI study companion! I can help with focus techniques, time management, and study strategies. What would you like to know?",
      "Thanks for reaching out! I'm here to support your learning journey. How can I help you study more effectively today?",
      "Excellent question! Every student learns differently. What study method or challenge would you like assistance with?"
    ];
    
    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
  };

  const handleStartFocus = async () => {
    if (!selectedTask) {
      Alert.alert('Select a Task', 'Please select a task to focus on');
      return;
    }

    // Enable Do Not Disturb mode if auto DND is enabled
    await startFocusSessionWithDND(true);

    // Start color fill animation with longer duration for full screen coverage
    Animated.timing(colorFillAnim, {
      toValue: 1,
      duration: 1200, // Increased from 800 to 1200ms to match HomeScreen
      useNativeDriver: false,
    }).start(() => {
      // Navigate to actual focus screen with parameters
      // Determine selection mode:
      // - Basecamp is ALWAYS manual
      // - Summit depends on isManualProgression toggle
      const isManualMode = focusMode === 'basecamp' || isManualProgression;

      navigation.navigate('StudySessionScreen' as never, {
        duration: selectedTime,
        breakDuration: selectedBreakTime,
        task: selectedTask,
        tasks: selectedTasks,
        focusMode: focusMode,
        autoProgress: !isManualProgression,
        autoStart: true,
        // Pass explicit selectionMode for StudySessionScreen
        manualSelection: isManualMode,
        selectionMode: isManualMode ? 'manual' : 'auto',
      } as never);
      // Reset animation for next time
      colorFillAnim.setValue(0);
    });
  };

  const activeTasks = tasks.filter(task => task.status !== 'completed');

  return (
    <View style={styles.container}>
      {/* Background Image */}
      <View style={styles.backgroundContainer}>
        <ThemedImageBackground
          source={require('../../../assets/triage-background-image.png')}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
          applyFilter={true}
        >
          <LinearGradient
            colors={theme.isDark ? ['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.6)'] : ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.4)']}
            style={StyleSheet.absoluteFillObject}
          />
        </ThemedImageBackground>
        
      </View>

      {/* Overlay Content */}
      <SafeAreaView style={styles.overlay}>
        {/* Header */}
        <ReAnimated.View style={[styles.header, headerAnimStyle]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={dynamicStyles.backButton}
          >
            <Ionicons name="arrow-back-outline" size={24} color={theme.text} />
          </TouchableOpacity>
        </ReAnimated.View>

        {/* Work Style Warning */}
        {showWorkStyleWarning && (
          <View style={[dynamicStyles.warningBanner, { backgroundColor: theme.isDark ? 'rgba(33, 33, 33, 0.9)' : theme.primary + '20' }]}>
            <Ionicons name="information-circle-outline" size={16} color={theme.primary} />
            <Text style={[styles.warningText, { color: theme.primary }]}>
              Outside your {defaultWorkStyle.name} work style
            </Text>
          </View>
        )}

        {/* Mode Selection Notification - High contrast background for visibility */}
        {showNotification && (
          <View style={[
            dynamicStyles.warningBanner,
            {
              backgroundColor: theme.isDark ? 'rgba(40, 40, 40, 0.95)' : 'rgba(255, 255, 255, 0.95)',
              borderWidth: 1,
              borderColor: '#FF6B6B',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
            }
          ]}>
            <Ionicons name="alert-circle-outline" size={16} color="#FF6B6B" />
            <Text style={[styles.warningText, { color: '#FF6B6B', fontWeight: '600' }]}>
              {showNotification}
            </Text>
          </View>
        )}

        {/* Spacer to push menu to bottom */}
        <View style={styles.spacer} />

        {/* Menu Container - Like in IMG_0021.PNG */}
        <ReAnimated.View style={[dynamicStyles.menuContainer, menuAnimStyle]}>
          {/* Focus Mode and Task Selection - Fixed height container */}
          <View style={styles.topSectionContainer}>
            {!focusMode ? (
              /* Mode Selection - Basecamp vs Summit */
              <View style={styles.modeSelectionContainer}>
                <Text style={[styles.modeHeading, { color: theme.text }]}>
                  What do you like to focus on now?
                </Text>
                <Text style={[styles.modeSubtext, { color: theme.textSecondary }]}>
                  Choose your focus approach
                </Text>

                <View style={styles.modeButtons}>
                  <ReAnimated.View style={[mode1AnimStyle, basecampButton.animatedStyle, basecampBorderStyle]}>
                    <Pressable
                      style={[styles.modeButton, { backgroundColor: theme.card, borderColor: theme.primary, shadowColor: theme.primary }]}
                      onPress={() => {
                        triggerHaptic('selection');
                        basecampBorderGlow.value = withSequence(
                          withTiming(1, { duration: 100 }),
                          withTiming(0, { duration: 300 })
                        );
                        handleModeSelection('basecamp');
                      }}
                      onPressIn={() => {
                        basecampButton.onPressIn();
                        basecampBorderGlow.value = withTiming(1, { duration: 100 });
                      }}
                      onPressOut={() => {
                        basecampButton.onPressOut();
                        basecampBorderGlow.value = withTiming(0, { duration: 300 });
                      }}
                    >
                      <View style={[styles.modeIconContainer, { backgroundColor: theme.primary + '20' }]}>
                        <Text style={[styles.tentIcon, { color: theme.primary }]}>⛺</Text>
                      </View>
                      <Text style={[styles.modeButtonTitle, { color: theme.text }]}>
                        Basecamp
                      </Text>
                      <Text style={[styles.modeButtonSubtitle, { color: theme.text + '70' }]}>
                        One task
                      </Text>
                    </Pressable>
                  </ReAnimated.View>

                  <ReAnimated.View style={[mode2AnimStyle, summitButton.animatedStyle, summitBorderStyle]}>
                    <Pressable
                      style={[styles.modeButton, { backgroundColor: theme.card, borderColor: theme.primary, shadowColor: theme.primary }]}
                      onPress={() => {
                        triggerHaptic('selection');
                        summitBorderGlow.value = withSequence(
                          withTiming(1, { duration: 100 }),
                          withTiming(0, { duration: 300 })
                        );
                        handleModeSelection('summit');
                      }}
                      onPressIn={() => {
                        summitButton.onPressIn();
                        summitBorderGlow.value = withTiming(1, { duration: 100 });
                      }}
                      onPressOut={() => {
                        summitButton.onPressOut();
                        summitBorderGlow.value = withTiming(0, { duration: 300 });
                      }}
                    >
                      <View style={[styles.modeIconContainer, { backgroundColor: theme.primary + '20' }]}>
                        <Text style={[styles.mountainIcon, { color: theme.primary }]}>🏔️</Text>
                      </View>
                      <Text style={[styles.modeButtonTitle, { color: theme.text }]}>
                        Summit
                      </Text>
                      <Text style={[styles.modeButtonSubtitle, { color: theme.text + '70' }]}>
                        Multiple tasks
                      </Text>
                    </Pressable>
                  </ReAnimated.View>
                </View>
              </View>
            ) : (
              /* Task Selection After Mode Selection */
              <>
                <TouchableOpacity
                  style={styles.taskSelectorButton}
                  onPress={() => setShowTaskSelector(true)}
                >
                  <Text style={[styles.taskSelectorLabel, { color: theme.textSecondary }]}>
                    {focusMode === 'basecamp' ? 'Select your task' : 'Select your tasks'}
                  </Text>
                  <Text style={[styles.taskSelectorText, { color: theme.text }]}>
                    {selectedTasks.length > 0
                      ? focusMode === 'basecamp'
                        ? selectedTask?.title || 'Choose one task'
                        : `${selectedTasks.length} task${selectedTasks.length > 1 ? 's' : ''} selected`
                      : focusMode === 'basecamp'
                        ? 'Choose one task'
                        : 'Choose multiple tasks'
                    }
                  </Text>
                  <Ionicons name="chevron-down-outline" size={20} color={theme.text} />
                </TouchableOpacity>
                
                {/* Mode Toggle Button - Switch between basecamp and summit */}
                <TouchableOpacity 
                  style={[styles.modeToggleButton, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '30' }]}
                  onPress={() => {
                    // Add haptic feedback
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    const switchMode = focusMode === 'basecamp' ? 'summit' : 'basecamp';
                    setFocusMode(switchMode);
                    // Clear selections when switching
                    setSelectedTasks([]);
                    setSelectedTask(null);
                    // Reset manual mode for basecamp
                    if (switchMode === 'basecamp') {
                      setIsManualProgression(true);
                    }
                  }}
                >
                  <Text style={[styles.modeToggleIcon, { color: theme.primary }]}>
                    {focusMode === 'basecamp' ? '🏔️' : '⛺'}
                  </Text>
                  <Text style={[styles.modeToggleText, { color: theme.primary }]}>
                    Switch to {focusMode === 'basecamp' ? 'Summit' : 'Basecamp'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Smaller Centered Go Button */}
          <ReAnimated.View style={goButtonAnimStyle}>
            <TouchableOpacity
              style={[styles.goButton, { backgroundColor: theme.primary }]}
              onPress={handleGoButtonPress}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[theme.primary, theme.primary + 'DD']}
                style={styles.goButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.goButtonText}>Go</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ReAnimated.View>

          {/* Spacer for extra space */}
          <View style={styles.buttonSpacer} />

          {/* Time Selector OR Control Tabs - Only show one at a time */}
          {showInlineTimeSelector ? (
            /* Full Time Selector - Takes over bottom area like IMG_0133.PNG */
            <View style={styles.fullTimeSelectorContainer}>
              {/* Focus Time Row */}
              <View style={styles.timeSelectorRow}>
                <Text style={[styles.timeSelectorLabel, { color: theme.text }]}>Focus Time</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.timeOptionsScroll}
                >
                  {/* Work Styles */}
                  {timeOptions.filter(option => option.isWorkStyle).map((option) => (
                    <AnimatedTimeOption
                      key={`focus-${option.value}`}
                      option={option}
                      isSelected={selectedTime === option.value}
                      onPress={() => {
                        handleTimeSelection(option.value, option.isWorkStyle);
                      }}
                      themeColor={theme.primary}
                      textColor={theme.text}
                    />
                  ))}

                  {/* Custom Times */}
                  {timeOptions.filter(option => !option.isWorkStyle).map((option) => (
                    <AnimatedTimeOption
                      key={`focus-${option.value}`}
                      option={option}
                      isSelected={selectedTime === option.value}
                      onPress={() => {
                        handleTimeSelection(option.value, option.isWorkStyle);
                      }}
                      themeColor={theme.primary}
                      textColor={theme.text}
                    />
                  ))}
                </ScrollView>
              </View>

              {/* Break Time Row - Always Visible */}
              <View style={styles.timeSelectorRow}>
                <Text style={[styles.timeSelectorLabelSmall, { color: theme.text }]}>
                  Break Time
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.timeOptionsScroll}
                >
                  {breakTimeOptions.map((option) => (
                    <AnimatedTimeOption
                      key={`break-${option.value}`}
                      option={option}
                      isSelected={selectedBreakTime === option.value}
                      onPress={() => handleBreakTimeSelection(option.value)}
                      themeColor={theme.accent || theme.primary}
                      textColor={theme.text}
                      isCompact={true}
                    />
                  ))}
                </ScrollView>
              </View>

              {/* Close/Done button for time selector */}
              <TouchableOpacity
                style={styles.closeSelectorButton}
                onPress={() => setShowInlineTimeSelector(false)}
              >
                <Text style={[styles.closeSelectorText, { color: theme.text }]}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Control Tabs at Bottom - Positioned like IMG_0021.PNG */
            <View style={styles.controlTabs}>
              {/* Time Tab - Move further left */}
              <TouchableOpacity
                style={[styles.controlTab, styles.leftTab]}
                onPress={() => setShowInlineTimeSelector(true)}
              >
                <Ionicons name="time-outline" size={32} color={theme.text} />
                <Text style={[styles.tabText, { color: theme.text }]}>{selectedTime} min</Text>
              </TouchableOpacity>

              {/* Nora Tab - Stay centered */}
              <TouchableOpacity 
                style={[styles.controlTab, styles.centerTab]}
                onPress={handleNoraChat}
              >
                <Text style={[styles.pawPrint, { color: theme.text }]}>🐾</Text>
                <Text style={[styles.tabText, { color: theme.text }]}>Nora</Text>
              </TouchableOpacity>

              {/* Manual/Auto Tab - Move further right */}
              <TouchableOpacity
                style={[
                  styles.controlTab, 
                  styles.rightTab,
                  focusMode === 'basecamp' && styles.disabledTab
                ]}
                onPress={handleManualToggle}
              >
                <Ionicons 
                  name={isManualProgression ? "hand-left-outline" : "play-circle-outline"} 
                  size={32} 
                  color={focusMode === 'basecamp' ? theme.text + '50' : theme.text} 
                />
                <Text style={[styles.tabText, { 
                  color: focusMode === 'basecamp' ? theme.text + '50' : theme.text 
                }]}>
                  {isManualProgression ? 'Manual' : 'Auto'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ReAnimated.View>
      </SafeAreaView>

      {/* Time Selector Modal */}
      <Modal
        visible={showTimeSelector}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTimeSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.timeSelectorModal, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Select Focus Time</Text>
              <TouchableOpacity onPress={() => setShowTimeSelector(false)}>
                <Ionicons name="close-outline" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.timeOptionsContainer}>
              {/* Work Styles Section */}
              <Text style={[styles.sectionLabel, { color: theme.text }]}>Work Styles</Text>
              {timeOptions.filter(option => option.isWorkStyle).map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.timeOption,
                    selectedTime === option.value && { backgroundColor: theme.primary },
                    { borderBottomColor: theme.background }
                  ]}
                  onPress={() => handleTimeSelection(option.value, option.isWorkStyle)}
                >
                  <Text style={[
                    styles.timeOptionText,
                    { color: selectedTime === option.value ? '#fff' : theme.text }
                  ]}>
                    {option.label}
                  </Text>
                  {selectedTime === option.value && (
                    <Ionicons name="checkmark-outline" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}

              {/* Custom Times Section */}
              <Text style={[styles.sectionLabel, { color: theme.text }]}>Custom Times</Text>
              {timeOptions.filter(option => !option.isWorkStyle).map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.timeOption,
                    selectedTime === option.value && { backgroundColor: theme.primary },
                    { borderBottomColor: theme.background }
                  ]}
                  onPress={() => handleTimeSelection(option.value, option.isWorkStyle)}
                >
                  <Text style={[
                    styles.timeOptionText,
                    { color: selectedTime === option.value ? '#fff' : theme.text }
                  ]}>
                    {option.label}
                  </Text>
                  {selectedTime === option.value && (
                    <Ionicons name="checkmark-outline" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Task Selector Modal */}
      <Modal
        visible={showTaskSelector}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTaskSelector(false)}
      >
        <KeyboardAvoidingView
          behavior="padding"
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.taskSelectorModal, { backgroundColor: theme.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Select Task</Text>
                <TouchableOpacity onPress={() => setShowTaskSelector(false)}>
                  <Ionicons name="close-outline" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.taskList}
                keyboardShouldPersistTaps="handled"
              >
              {/* Mode Info */}
              <View style={[styles.modeInfoBanner, { backgroundColor: theme.primary + '10' }]}>
                <Ionicons
                  name={focusMode === 'basecamp' ? 'flag-outline' : 'layers-outline'}
                  size={16}
                  color={theme.primary}
                />
                <Text style={[styles.modeInfoText, { color: theme.primary }]}>
                  {focusMode === 'basecamp' 
                    ? 'Basecamp: Select one task to focus on' 
                    : 'Summit: Select multiple tasks/subjects'}
                </Text>
              </View>

              {/* Create New Task Section */}
              <ReAnimated.View
                entering={FadeInDown.delay(0).springify().damping(15).stiffness(150)}
              >
                <TouchableOpacity
                  style={[styles.taskOption, { borderBottomColor: theme.background }]}
                  onPress={() => {
                    triggerHaptic('selection');
                    setShowQuickTask(!showQuickTask);
                  }}
                >
                  <Ionicons
                    name={showQuickTask ? "chevron-down" : "chevron-forward"}
                    size={20}
                    color={theme.text}
                  />
                  <Ionicons name="add-circle-outline" size={24} color={theme.primary} />
                  <Text style={[styles.taskOptionText, { color: theme.primary }]}>
                    Create New Task
                  </Text>
                </TouchableOpacity>

                {showQuickTask && (
                  <View style={[styles.quickTaskForm, { paddingHorizontal: 16, paddingVertical: 12 }]}>
                    <TextInput
                      placeholder="Task title..."
                      value={quickTaskTitle}
                      onChangeText={setQuickTaskTitle}
                      style={[
                        styles.quickTaskInput,
                        {
                          color: theme.text,
                          backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                          borderColor: theme.border
                        }
                      ]}
                      placeholderTextColor={theme.textSecondary}
                      returnKeyType="next"
                      autoFocus
                    />
                    <TextInput
                      placeholder="Subject (optional)"
                      value={quickTaskSubject}
                      onChangeText={setQuickTaskSubject}
                      style={[
                        styles.quickTaskInput,
                        {
                          color: theme.text,
                          backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                          borderColor: theme.border
                        }
                      ]}
                      placeholderTextColor={theme.textSecondary}
                      returnKeyType="done"
                      onSubmitEditing={handleQuickTaskCreate}
                    />
                    <TouchableOpacity
                      style={[styles.quickTaskButton, { backgroundColor: theme.primary }]}
                      onPress={handleQuickTaskCreate}
                    >
                      <Text style={styles.quickTaskButtonText}>Create & Select</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ReAnimated.View>

              {/* Existing Tasks */}
              {activeTasks.map((task, index) => {
                const isSelected = selectedTasks.some(t => t.id === task.id);
                return (
                  <AnimatedTaskItem
                    key={task.id}
                    task={task}
                    isSelected={isSelected}
                    onPress={() => handleTaskSelection(task)}
                    index={index + 1} // +1 to account for "Create New Task" button
                    theme={theme}
                  />
                );
              })}
              
              {/* Summit mode: Done button */}
              {focusMode === 'summit' && selectedTasks.length > 0 && (
                <TouchableOpacity
                  style={[styles.doneButton, { backgroundColor: theme.primary }]}
                  onPress={() => setShowTaskSelector(false)}
                >
                  <Text style={styles.doneButtonText}>
                    Done ({selectedTasks.length} selected)
                  </Text>
                </TouchableOpacity>
              )}
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Nora Chat Modal */}
      <Modal
        visible={showNoraChat}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNoraChat(false)}
      >
        <KeyboardAvoidingView
          behavior="height"
          style={styles.modalOverlay}
        >
          <View style={[styles.noraChatModal, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <View style={styles.noraHeaderInfo}>
                <Text style={[styles.noraIcon, { color: theme.primary }]}>🐾</Text>
                <View>
                  <Text style={[styles.modalTitle, { color: theme.text }]}>Chat with Nora</Text>
                  <Text style={[styles.noraSubtitle, { color: theme.text + '70' }]}>Your AI study companion</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowNoraChat(false)}>
                <Ionicons name="close-outline" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            {/* Chat Messages */}
            <ScrollView 
              style={styles.chatContainer}
              contentContainerStyle={styles.chatContent}
              showsVerticalScrollIndicator={false}
            >
              {noraChatMessages.length === 0 ? (
                <View style={styles.welcomeMessageContainer}>
                  <Text style={[styles.noraWelcomeIcon, { color: theme.primary }]}>🐾</Text>
                  <Text style={[styles.welcomeMessage, { color: theme.text }]}>
                    Hi! I'm Nora, your AI study companion. I'm here to help you with focus techniques, study strategies, and motivation. What would you like to know?
                  </Text>
                </View>
              ) : (
                noraChatMessages.map((message) => (
                  <View
                    key={message.id}
                    style={[
                      styles.chatMessage,
                      message.isUser ? styles.userMessage : styles.noraMessage,
                      { backgroundColor: message.isUser ? theme.primary : theme.isDark ? theme.cardHover : '#f5f5f5' }
                    ]}
                  >
                    <Text style={[
                      styles.messageText,
                      { color: message.isUser ? '#fff' : theme.text }
                    ]}>
                      {message.text}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>

            {/* Chat Input */}
            <View
              style={[
                styles.chatInputContainer,
                {
                  borderTopColor: theme.border,
                  paddingBottom: Math.max(16, insets.bottom / 2),
                },
              ]}
            >
              <TextInput
                style={[styles.chatInput, { 
                  color: theme.text, 
                  borderColor: theme.border,
                  backgroundColor: theme.isDark ? theme.cardHover : '#f9f9f9'
                }]}
                placeholder="Ask Nora anything about studying..."
                placeholderTextColor={theme.text + '60'}
                value={noraChatInput}
                onChangeText={setNoraChatInput}
                multiline
                maxHeight={100}
                onSubmitEditing={handleSendNoraMessage}
                returnKeyType="send"
              />
              <TouchableOpacity
                style={[styles.sendButton, { 
                  backgroundColor: noraChatInput.trim() ? theme.primary : theme.border 
                }]}
                onPress={handleSendNoraMessage}
                disabled={!noraChatInput.trim()}
              >
                <Ionicons name="send-outline" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Color Fill Animation Overlay */}
      <Animated.View
        style={[
          styles.colorFillOverlay,
          {
            backgroundColor: theme.primary,
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  overlay: {
    flex: 1,
    zIndex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  warningText: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '500',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  spacer: {
    flex: 1,
  },
  taskSelectorButton: {
    paddingVertical: 20, // Reduced to fit in fixed container
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1, // Fill the available space in topSectionContainer
  },
  goButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  goButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonSpacer: {
    height: 60,
  },
  fullTimeSelectorContainer: {
    paddingVertical: 20,
    gap: 12,
  },
  timeSelectorRow: {
    gap: 8,
  },
  timeSelectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 20,
    marginBottom: 4,
  },
  timeSelectorLabelSmall: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 20,
    marginBottom: 4,
  },
  timeOptionsScroll: {
    paddingHorizontal: 20,
    gap: 12,
  },
  inlineTimeOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineTimeOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  closeSelectorButton: {
    alignSelf: 'center',
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  closeSelectorText: {
    fontSize: 16,
    fontWeight: '600',
  },
  goButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  topSectionContainer: {
    minHeight: 140, // Fixed minimum height to prevent layout shifts
    justifyContent: 'center',
    marginBottom: 20,
  },
  modeSelectionContainer: {
    paddingVertical: 16, // Reduced from 24
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  quickTaskSection: {
    width: '100%',
    marginBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  quickTaskToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  quickTaskToggleText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  quickTaskForm: {
    padding: 12,
    paddingTop: 0,
    gap: 12,
  },
  quickTaskInput: {
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
  quickTaskButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickTaskButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  modeDescription: {
    fontSize: 14,
    marginBottom: 16, // Reduced from 20
    textAlign: 'center',
  },
  modeButtons: {
    flexDirection: 'row',
    gap: 20,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modeButton: {
    paddingVertical: 12, // Reduced from 16
    paddingHorizontal: 16, // Reduced from 20
    borderRadius: 12, // Reduced from 16
    borderWidth: 2,
    alignItems: 'center',
    gap: 6, // Reduced from 8
    minWidth: 85, // Reduced from 100
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modeIconContainer: {
    width: 40, // Reduced from 50
    height: 40, // Reduced from 50
    borderRadius: 20, // Reduced from 25
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2, // Reduced from 4
  },
  tentIcon: {
    fontSize: 20, // Reduced from 24
  },
  mountainIcon: {
    fontSize: 20, // Reduced from 24
  },
  modeButtonTitle: {
    fontSize: 13, // Reduced from 14
    fontWeight: '600',
  },
  modeButtonSubtitle: {
    fontSize: 10, // Reduced from 11
    textAlign: 'center',
  },
  modeToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 12,
    gap: 8,
    alignSelf: 'center',
  },
  modeToggleIcon: {
    fontSize: 16,
  },
  modeToggleText: {
    fontSize: 14,
    fontWeight: '500',
  },
  taskSelectorLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    textAlign: 'center',
  },
  taskSelectorText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  // Mode selection text styles
  modeHeading: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  modeSubtext: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 18,
    textAlign: 'center',
  },
  disabledTab: {
    opacity: 0.6,
  },
  modeInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
    borderRadius: 8,
    gap: 8,
  },
  modeInfoText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  doneButton: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  controlTabs: {
    flexDirection: 'row',
    height: 70, // Reduced height since no hint text
    width: '100%',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    alignItems: 'center', // Center align for better stability
  },
  controlTab: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12, // Reduced padding
    paddingHorizontal: 16,
    gap: 6, // Reduced gap
    minWidth: 80,
  },
  leftTab: {
    // No additional positioning needed
  },
  centerTab: {
    // This will be centered by space-between
  },
  rightTab: {
    // No additional positioning needed
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  pawPrint: {
    fontSize: 32,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  timeSelectorModal: {
    maxHeight: '70%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  taskSelectorModal: {
    maxHeight: '70%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  timeOptionsContainer: {
    maxHeight: 400,
  },
  taskList: {
    maxHeight: 400,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  timeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  taskOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  timeOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  taskOptionText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    marginLeft: 12,
  },
  colorFillOverlay: {
    position: 'absolute',
    bottom: 180, // Position near the Go button
    left: '50%',
    width: 100,
    height: 100,
    borderRadius: 50,
    marginLeft: -50,
    zIndex: 1000,
  },
  // Nora Chat Modal Styles
  noraChatModal: {
    maxHeight: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  noraHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  noraIcon: {
    fontSize: 24,
  },
  noraSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  chatContainer: {
    maxHeight: 400,
    paddingHorizontal: 20,
  },
  chatContent: {
    paddingVertical: 16,
    gap: 12,
  },
  welcomeMessageContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  noraWelcomeIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  welcomeMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  chatMessage: {
    padding: 12,
    borderRadius: 16,
    maxWidth: '80%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  noraMessage: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  chatInputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    alignItems: 'flex-end',
    gap: 12,
  },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    textAlignVertical: 'top',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
