import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, Alert, Dimensions, Animated, KeyboardAvoidingView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ThemedImageBackground } from '../../components/ThemedImage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useSupabaseTasks } from '../../utils/supabaseHooks';
import { getUserSettings } from '../../utils/userSettings';
import { startFocusSessionWithDND } from '../../utils/doNotDisturb';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function FocusPreparationScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { tasks, addTask } = useSupabaseTasks();
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
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isManualProgression, setIsManualProgression] = useState(true);
  const [showTimeSelector, setShowTimeSelector] = useState(false);
  const [showInlineTimeSelector, setShowInlineTimeSelector] = useState(false);
  const [showTaskCreator, setShowTaskCreator] = useState(false);
  const [showTaskSelector, setShowTaskSelector] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showWorkStyleWarning, setShowWorkStyleWarning] = useState(false);
  const [userSettings, setUserSettings] = useState<any>(null);
  
  // Basecamp/Summit system states
  const [focusMode, setFocusMode] = useState<'basecamp' | 'summit' | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<any[]>([]);
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [showNotification, setShowNotification] = useState('');
  
  // Nora chat modal states
  const [showNoraChat, setShowNoraChat] = useState(false);
  const [noraChatInput, setNoraChatInput] = useState('');
  const [noraChatMessages, setNoraChatMessages] = useState<{id: string, text: string, isUser: boolean, timestamp: Date}[]>([]);
  
  // Color fill animation
  const colorFillAnim = useRef(new Animated.Value(0)).current;
  


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

  const handleTimeSelection = (time: number, isWorkStyle: boolean) => {
    setSelectedTime(time);
    setShowTimeSelector(false);
    
    // Show warning if not using default work style
    if (!isWorkStyle && time !== defaultWorkStyle.focusTime) {
      setShowWorkStyleWarning(true);
      setTimeout(() => setShowWorkStyleWarning(false), 3000);
    }
  };

  const handleTaskCreation = async () => {
    if (!newTaskTitle.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    try {
      await addTask(newTaskTitle, '', 'Medium');
      const newTask = { id: 'temp', title: newTaskTitle, description: '' };
      
      // Handle task selection based on focus mode
      if (focusMode === 'basecamp') {
        setSelectedTask(newTask);
        setSelectedTasks([newTask]);
      } else if (focusMode === 'summit') {
        setSelectedTasks(prev => [...prev, newTask]);
        if (selectedTasks.length === 0) {
          setSelectedTask(newTask); // Set first task as primary
        }
      }
      
      setNewTaskTitle('');
      setShowTaskCreator(false);
      setShowTaskSelector(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to create task');
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
      navigation.navigate('StudySessionScreen' as never, {
        duration: selectedTime,
        task: selectedTask,
        tasks: selectedTasks,
        focusMode: focusMode,
        autoProgress: !isManualProgression,
        autoStart: true
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
        
        {/* Curved Dotted Path System - Following the exact path in triage-background-image.png */}
        <View style={styles.curvedPathContainer}>
          {/* Multiple dotted path segments to create the curve */}
          <View style={styles.pathSegment1} />
          <View style={styles.pathSegment2} />
          <View style={styles.pathSegment3} />
          <View style={styles.pathSegment4} />
          <View style={styles.pathSegment5} />
          
          {/* Progress fill segments */}
          <View style={[styles.fillSegment1, { backgroundColor: theme.primary }]} />
          <View style={[styles.fillSegment2, { backgroundColor: theme.primary }]} />
          
          {/* Progress circle */}
          <View style={[styles.curvedProgressCircle, { backgroundColor: theme.primary }]}>
            <View style={[styles.circleInner, { backgroundColor: '#fff' }]} />
          </View>
        </View>
      </View>

      {/* Overlay Content */}
      <SafeAreaView style={styles.overlay}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={dynamicStyles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* Work Style Warning */}
        {showWorkStyleWarning && (
          <View style={[dynamicStyles.warningBanner, { backgroundColor: theme.isDark ? 'rgba(33, 33, 33, 0.9)' : theme.primary + '20' }]}>
            <Ionicons name="information-circle" size={16} color={theme.primary} />
            <Text style={[styles.warningText, { color: theme.primary }]}>
              Outside your {defaultWorkStyle.name} work style
            </Text>
          </View>
        )}

        {/* Mode Selection Notification */}
        {showNotification && (
          <View style={[dynamicStyles.warningBanner, { backgroundColor: theme.isDark ? 'rgba(255, 107, 107, 0.2)' : 'rgba(255, 107, 107, 0.1)' }]}>
            <Ionicons name="alert-circle" size={16} color="#FF6B6B" />
            <Text style={[styles.warningText, { color: '#FF6B6B' }]}>
              {showNotification}
            </Text>
          </View>
        )}

        {/* Spacer to push menu to bottom */}
        <View style={styles.spacer} />

        {/* Menu Container - Like in IMG_0021.PNG */}
        <View style={dynamicStyles.menuContainer}>
          {/* Focus Mode and Task Selection - Fixed height container */}
          <View style={styles.topSectionContainer}>
            {!focusMode ? (
              /* Mode Selection - Basecamp vs Summit */
              <View style={styles.modeSelectionContainer}>
                <Text style={[styles.taskSelectorLabel, { color: theme.text + '80' }]}>
                  What do you like to focus on now?
                </Text>
                <Text style={[styles.modeDescription, { color: theme.text + '60' }]}>
                  Choose your focus approach
                </Text>
                
                <View style={styles.modeButtons}>
                  <TouchableOpacity
                    style={[styles.modeButton, { backgroundColor: theme.card, borderColor: theme.primary }]}
                    onPress={() => handleModeSelection('basecamp')}
                  >
                    <View style={[styles.modeIconContainer, { backgroundColor: theme.primary + '20' }]}>
                      <Text style={[styles.tentIcon, { color: theme.primary }]}>⛺</Text>
                    </View>
                    <Text style={[styles.modeButtonTitle, { color: theme.text }]}>Basecamp</Text>
                    <Text style={[styles.modeButtonSubtitle, { color: theme.text + '70' }]}>
                      One task
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.modeButton, { backgroundColor: theme.card, borderColor: theme.primary }]}
                    onPress={() => handleModeSelection('summit')}
                  >
                    <View style={[styles.modeIconContainer, { backgroundColor: theme.primary + '20' }]}>
                      <Text style={[styles.mountainIcon, { color: theme.primary }]}>🏔️</Text>
                    </View>
                    <Text style={[styles.modeButtonTitle, { color: theme.text }]}>Summit</Text>
                    <Text style={[styles.modeButtonSubtitle, { color: theme.text + '70' }]}>
                      Multiple tasks
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* Task Selection After Mode Selection */
              <>
                <TouchableOpacity
                  style={styles.taskSelectorButton}
                  onPress={() => setShowTaskSelector(true)}
                >
                  <Text style={[styles.taskSelectorLabel, { color: theme.text + '80' }]}>
                    {focusMode === 'basecamp' ? 'Select your task' : 'Select your tasks'}
                  </Text>
                  <Text style={[styles.taskSelectorText, { color: theme.text }]}>
                    {selectedTasks.length > 0 
                      ? focusMode === 'basecamp' 
                        ? selectedTask?.title 
                        : `${selectedTasks.length} task${selectedTasks.length > 1 ? 's' : ''} selected`
                      : focusMode === 'basecamp' 
                        ? 'Choose one task' 
                        : 'Choose multiple tasks'
                    }
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={theme.text} />
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
          <TouchableOpacity
            style={[styles.goButton, { backgroundColor: theme.primary }]}
            onPress={handleStartFocus}
          >
            <Text style={styles.goButtonText}>Go</Text>
          </TouchableOpacity>

          {/* Spacer for extra space */}
          <View style={styles.buttonSpacer} />

          {/* Time Selector OR Control Tabs - Only show one at a time */}
          {showInlineTimeSelector ? (
            /* Full Time Selector - Takes over bottom area like IMG_0133.PNG */
            <View style={styles.fullTimeSelectorContainer}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.timeOptionsScroll}
              >
                {/* Work Styles */}
                {timeOptions.filter(option => option.isWorkStyle).map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.inlineTimeOption,
                      selectedTime === option.value && { backgroundColor: theme.primary },
                      { borderColor: theme.primary }
                    ]}
                    onPress={() => {
                      handleTimeSelection(option.value, option.isWorkStyle);
                      setShowInlineTimeSelector(false);
                    }}
                  >
                    <Text style={[
                      styles.inlineTimeOptionText,
                      { color: selectedTime === option.value ? '#fff' : theme.text }
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
                
                {/* Custom Times */}
                {timeOptions.filter(option => !option.isWorkStyle).map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.inlineTimeOption,
                      selectedTime === option.value && { backgroundColor: theme.primary },
                      { borderColor: theme.primary }
                    ]}
                    onPress={() => {
                      handleTimeSelection(option.value, option.isWorkStyle);
                      setShowInlineTimeSelector(false);
                    }}
                  >
                    <Text style={[
                      styles.inlineTimeOptionText,
                      { color: selectedTime === option.value ? '#fff' : theme.text }
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
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
        </View>
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
                <Ionicons name="close" size={24} color={theme.text} />
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
                    <Ionicons name="checkmark" size={20} color="#fff" />
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
                    <Ionicons name="checkmark" size={20} color="#fff" />
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
        <View style={styles.modalOverlay}>
          <View style={[styles.taskSelectorModal, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Select Task</Text>
              <TouchableOpacity onPress={() => setShowTaskSelector(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.taskList}>
              {/* Mode Info */}
              <View style={[styles.modeInfoBanner, { backgroundColor: theme.primary + '10' }]}>
                <Ionicons 
                  name={focusMode === 'basecamp' ? 'target-outline' : 'layers-outline'} 
                  size={16} 
                  color={theme.primary} 
                />
                <Text style={[styles.modeInfoText, { color: theme.primary }]}>
                  {focusMode === 'basecamp' 
                    ? 'Basecamp: Select one task to focus on' 
                    : 'Summit: Select multiple tasks/subjects'}
                </Text>
              </View>

              {/* Create New Task Button */}
              <TouchableOpacity
                style={[styles.taskOption, { borderBottomColor: theme.background }]}
                onPress={() => setShowTaskCreator(true)}
              >
                <Ionicons name="add-circle-outline" size={24} color={theme.primary} />
                <Text style={[styles.taskOptionText, { color: theme.primary }]}>
                  Create New Task
                </Text>
              </TouchableOpacity>

              {/* Existing Tasks */}
              {activeTasks.map((task) => {
                const isSelected = selectedTasks.some(t => t.id === task.id);
                return (
                  <TouchableOpacity
                    key={task.id}
                    style={[
                      styles.taskOption,
                      isSelected && { backgroundColor: theme.primary + '20' },
                      { borderBottomColor: theme.background }
                    ]}
                    onPress={() => handleTaskSelection(task)}
                  >
                    <Text style={[
                      styles.taskOptionText,
                      { color: theme.text }
                    ]}>
                      {task.title}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={20} color={theme.primary} />
                    )}
                  </TouchableOpacity>
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
      </Modal>

      {/* Task Creator Modal */}
      <Modal
        visible={showTaskCreator}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTaskCreator(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.taskCreatorModal, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Create New Task</Text>
              <TouchableOpacity onPress={() => setShowTaskCreator(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={[styles.taskInput, { color: theme.text, borderColor: theme.primary }]}
              placeholder="Enter task title..."
              placeholderTextColor={theme.text + '80'}
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
              autoFocus
            />

            <View style={styles.taskCreatorButtons}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: theme.text + '40' }]}
                onPress={() => setShowTaskCreator(false)}
              >
                <Text style={[styles.cancelButtonText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.createButton, { backgroundColor: theme.primary }]}
                onPress={handleTaskCreation}
              >
                <Text style={styles.createButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
                <Ionicons name="close" size={24} color={theme.text} />
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
                <Ionicons name="send" size={18} color="#fff" />
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
  curvedPathContainer: {
    position: 'absolute',
    top: height * 0.15, // Start from the very beginning of the path
    left: 0,
    right: 0,
    bottom: height * 0.25,
    zIndex: 1,
  },
  // Dotted path segments following the curve in triage-background-image.png
  pathSegment1: {
    position: 'absolute',
    top: 0,
    left: width * 0.1,
    width: width * 0.2,
    height: 3,
    borderTopWidth: 3,
    borderColor: 'rgba(150, 150, 150, 0.6)',
    borderStyle: 'dotted',
    transform: [{ rotate: '15deg' }],
  },
  pathSegment2: {
    position: 'absolute',
    top: height * 0.08,
    left: width * 0.25,
    width: width * 0.3,
    height: 3,
    borderTopWidth: 3,
    borderColor: 'rgba(150, 150, 150, 0.6)',
    borderStyle: 'dotted',
    transform: [{ rotate: '25deg' }],
  },
  pathSegment3: {
    position: 'absolute',
    top: height * 0.18,
    left: width * 0.45,
    width: width * 0.25,
    height: 3,
    borderTopWidth: 3,
    borderColor: 'rgba(150, 150, 150, 0.6)',
    borderStyle: 'dotted',
    transform: [{ rotate: '10deg' }],
  },
  pathSegment4: {
    position: 'absolute',
    top: height * 0.25,
    left: width * 0.6,
    width: width * 0.2,
    height: 3,
    borderTopWidth: 3,
    borderColor: 'rgba(150, 150, 150, 0.6)',
    borderStyle: 'dotted',
    transform: [{ rotate: '-5deg' }],
  },
  pathSegment5: {
    position: 'absolute',
    top: height * 0.3,
    left: width * 0.75,
    width: width * 0.15,
    height: 3,
    borderTopWidth: 3,
    borderColor: 'rgba(150, 150, 150, 0.6)',
    borderStyle: 'dotted',
    transform: [{ rotate: '-15deg' }],
  },
  // Progress fill segments (showing completed portions)
  fillSegment1: {
    position: 'absolute',
    top: 0,
    left: width * 0.1,
    width: width * 0.2,
    height: 3,
    borderRadius: 1.5,
    transform: [{ rotate: '15deg' }],
    zIndex: 2,
  },
  fillSegment2: {
    position: 'absolute',
    top: height * 0.08,
    left: width * 0.25,
    width: width * 0.15, // Only partial fill
    height: 3,
    borderRadius: 1.5,
    transform: [{ rotate: '25deg' }],
    zIndex: 2,
  },
  curvedProgressCircle: {
    position: 'absolute',
    top: height * 0.1,
    left: width * 0.35,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
    zIndex: 3,
  },
  circleInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
  },
  buttonSpacer: {
    height: 60,
  },
  fullTimeSelectorContainer: {
    paddingVertical: 20,
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
  taskCreatorModal: {
    margin: 20,
    borderRadius: 20,
    padding: 20,
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
  taskInput: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginVertical: 20,
  },
  taskCreatorButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  createButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
