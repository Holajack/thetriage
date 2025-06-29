import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ScrollView, Alert, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { supabase } from '../../utils/supabase';
import { useSupabaseFocusSession, Task } from '../../utils/supabaseHooks';
const { useUserAppData } = require('../../utils/userAppData');

// Work Style Focus Durations (in seconds)
const getWorkStyleDuration = (focusMethod?: string) => {
  switch (focusMethod) {
    case 'deepwork':
    case 'Deep Work':
      return 90 * 60; // 90 minutes
    case 'sprint':
    case 'Sprint Focus':
      return 25 * 60; // 25 minutes
    case 'extended':
    case 'Extended Focus':
      return 60 * 60; // 60 minutes
    case 'balanced':
    case 'Balanced':
    case 'Balanced Focus':
    default:
      return 45 * 60; // 45 minutes
  }
};

const getDurationText = (focusMethod?: string) => {
  switch (focusMethod) {
    case 'deepwork':
    case 'Deep Work':
      return '90 minutes';
    case 'sprint':
    case 'Sprint Focus':
      return '25 minutes';
    case 'extended':
    case 'Extended Focus':
      return '60 minutes';
    case 'balanced':
    case 'Balanced':
    case 'Balanced Focus':
    default:
      return '45 minutes';
  }
};

const TESTING_MODE = false; // Set to false for production
const TEST_DURATION = 10; // 10 seconds for testing

export const StudySessionScreen = () => {
  const { data: userData } = useUserAppData();
  
  // Timer refs for background functionality
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const backgroundTimeRef = useRef<number | null>(null);
  const appStateRef = useRef(AppState.currentState);
  
  // Pre-session selection state
  const [showPreSessionModal, setShowPreSessionModal] = useState(true);
  const [selectionMode, setSelectionMode] = useState<'auto' | 'manual' | null>(null);
  
  // Session configuration state
  const [selectedDuration, setSelectedDuration] = useState<number>(0);
  const [selectedTasks, setSelectedTasks] = useState<Task[]>([]);
  const [taskOrder, setTaskOrder] = useState<Task[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [customMinutes, setCustomMinutes] = useState('');
  const [sessionStarted, setSessionStarted] = useState(false);
  
  // Calculate initial timer duration based on user's focus method or selection
  const initialDuration = useMemo(() => {
    if (TESTING_MODE) {
      return TEST_DURATION;
    }
    if (selectedDuration > 0) {
      return selectedDuration;
    }
    return getWorkStyleDuration(userData?.onboarding?.focus_method);
  }, [userData?.onboarding?.focus_method, selectedDuration]);
  
  const [timer, setTimer] = useState(initialDuration);
  const [isPaused, setIsPaused] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showSessionCompleteModal, setShowSessionCompleteModal] = useState(false);
  const [showTimerCustomization, setShowTimerCustomization] = useState(false);
  const [customDuration, setCustomDuration] = useState('');
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  
  // Session report state
  const [focusRating, setFocusRating] = useState(0);
  const [productivityRating, setProductivityRating] = useState(0);
  const [sessionNotes, setSessionNotes] = useState('');
  const [completedSessionData, setCompletedSessionData] = useState<any>(null);
  
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const params = route.params as { 
    group?: boolean; 
    room?: any;
    autoStart?: boolean;
    selectedTask?: any;
    manualSelection?: boolean;
  } | undefined;

  // Determine current task based on selection mode
  const currentTask = useMemo(() => {
    if (selectionMode === 'manual' && taskOrder.length > 0) {
      return taskOrder[0]; // First task in manual order
    }
    
    if (selectionMode === 'auto' && userData?.tasks) {
      // Auto mode: select highest priority task
      const highPriorityTasks = userData.tasks.filter((task: Task) => task.priority === 'High');
      if (highPriorityTasks.length > 0) return highPriorityTasks[0];
      
      const mediumPriorityTasks = userData.tasks.filter((task: Task) => task.priority === 'Medium');
      if (mediumPriorityTasks.length > 0) return mediumPriorityTasks[0];
      
      return userData.tasks[0] || null;
    }
    
    return null;
  }, [selectionMode, taskOrder, userData?.tasks]);

  const isGroupSession = params?.group || false;
  const room = params?.room;

  const {
    isSessionActive,
    sessionDuration,
    startSession,
    endSession,
    pauseSession,
    resumeSession,
  } = useSupabaseFocusSession();

  // Extract subjects from tasks
  useEffect(() => {
    if (userData?.tasks) {
      const subjects = [...new Set(userData.tasks.map((task: Task) => task.subject || 'General Study'))];
      setAvailableSubjects(subjects);
    }
  }, [userData]);

  // Update timer when initial duration changes
  useEffect(() => {
    setTimer(initialDuration);
    if (sessionStarted) {
      startTimeRef.current = Date.now();
    }
  }, [initialDuration, sessionStarted]);

  const handleModeSelection = (mode: 'auto' | 'manual') => {
    setSelectionMode(mode);
    
    if (mode === 'auto') {
      // Auto mode: set up based on user preferences
      if (userData?.tasks) {
        const highPriorityTasks = userData.tasks.filter((task: Task) => task.priority === 'High');
        if (highPriorityTasks.length > 0) {
          setSelectedSubject(highPriorityTasks[0].subject || 'General Study');
        }
      }
      setShowPreSessionModal(false);
      startSessionFlow();
    }
    // Manual mode continues to task selection
  };

  const handleManualSetupComplete = () => {
    if (taskOrder.length === 0) {
      Alert.alert('Select Tasks', 'Please select at least one task for your session.');
      return;
    }
    
    if (!selectedSubject) {
      Alert.alert('Select Subject', 'Please choose a subject for this session.');
      return;
    }
    
    setShowPreSessionModal(false);
    startSessionFlow();
  };

  const startSessionFlow = () => {
    const sessionTypeParam = isGroupSession ? 'group' : 'individual';
    const roomId = room?.id || undefined;
    startSession(roomId, sessionTypeParam);
    startTimeRef.current = Date.now();
    setSessionStarted(true);
  };

  const handleTaskReorder = (tasks: Task[]) => {
    setTaskOrder([...tasks]);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return '#E57373';
      case 'Medium': return '#FFB74D';
      case 'Low': return '#81C784';
      default: return '#888';
    }
  };

  const getSessionTypeDisplay = () => {
    if (selectionMode === 'manual') {
      return `Manual Session - ${currentTask?.priority || 'Custom'} Priority`;
    }
    return `Auto Session - ${currentTask?.priority || 'High'} Priority`;
  };

  // Background timer functionality
  const startBackgroundTimer = () => {
    if (!isPaused) {
      startTimeRef.current = Date.now();
    }
  };

  const calculateElapsedTime = () => {
    if (startTimeRef.current && !isPaused) {
      return Math.floor((Date.now() - startTimeRef.current) / 1000);
    }
    return 0;
  };

  const updateTimerFromBackground = () => {
    const elapsed = calculateElapsedTime();
    if (elapsed > 0) {
      setTimer(prev => {
        const newTime = Math.max(0, prev - elapsed);
        return newTime;
      });
      startTimeRef.current = Date.now();
    }
  };

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (appStateRef.current === 'background' && nextAppState === 'active') {
        updateTimerFromBackground();
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [isPaused]);

  // Timer effect
  useEffect(() => {
    if (!isPaused && timer > 0 && sessionStarted) {
      startBackgroundTimer();
      intervalRef.current = setInterval(() => {
        updateTimerFromBackground();
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPaused, timer, sessionStarted]);

  // Handle timer completion
  useEffect(() => {
    if (timer === 0 && sessionStarted) {
      handleTimerComplete();
    }
  }, [timer, sessionStarted]);

  const handleTimerComplete = async () => {
    try {
      startTimeRef.current = null;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      const sessionResult = await endSession();
      setCompletedSessionData(sessionResult);
      setShowSessionCompleteModal(true);
    } catch (error) {
      console.error('Error ending session on timer completion:', error);
      const fallbackData = {
        id: 'fallback-' + Date.now(),
        duration_seconds: initialDuration - timer,
        created_at: new Date().toISOString(),
        task_focused_on: currentTask?.title || 'General Study',
        completed_full_session: timer === 0
      };
      setCompletedSessionData(fallbackData);
      setShowSessionCompleteModal(true);
    }
  };

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60).toString().padStart(2, '0');
    const sec = (seconds % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
  };

  const handleBack = () => {
    if (showPreSessionModal) {
      navigation.navigate('Main', { screen: 'Home' });
      return;
    }
    
    startTimeRef.current = null;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    navigation.navigate('Main', { screen: 'Home' });
  };

  const handlePause = () => {
    setIsPaused(prev => {
      const newPaused = !prev;
      if (newPaused) {
        updateTimerFromBackground();
      } else {
        startTimeRef.current = Date.now();
      }
      return newPaused;
    });
  };

  const handleEndSession = () => {
    setIsPaused(true);
    setShowEndModal(true);
  };

  const handleContinueFocusing = () => {
    setShowEndModal(false);
    setIsPaused(false);
  };

  const handleEndSessionNow = async () => {
    try {
      startTimeRef.current = null;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      const sessionResult = await endSession();
      setCompletedSessionData(sessionResult);
      setShowEndModal(false);
      setShowSessionCompleteModal(true);
    } catch (error) {
      console.error('Error ending session:', error);
      const fallbackData = {
        id: 'fallback-' + Date.now(),
        duration_seconds: initialDuration - timer,
        created_at: new Date().toISOString(),
        task_focused_on: currentTask?.title || 'General Study',
        completed_full_session: false
      };
      setCompletedSessionData(fallbackData);
      setShowEndModal(false);
      setShowSessionCompleteModal(true);
    }
  };

  const handleSessionReportSubmit = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const reportData = {
          user_id: session.user.id,
          session_id: completedSessionData?.id || null,
          focus_rating: focusRating,
          productivity_rating: productivityRating,
          notes: sessionNotes,
          task_worked_on: currentTask?.title || 'No specific task',
          subject: selectedSubject || 'General Study',
          session_duration: Math.floor((initialDuration - timer) / 60),
          completed_full_session: timer === 0,
          session_type: selectionMode || 'auto',
          created_at: new Date().toISOString()
        };

        // Try to insert with error handling
        try {
          const { error } = await supabase
            .from('session_reports')
            .insert([reportData]);

          if (error) {
            console.error('Error saving session report:', error);
          } else {
            console.log('✅ Session report saved successfully');
          }
        } catch (reportError) {
          console.error('Session report table may not exist:', reportError);
        }
      }
    } catch (error) {
      console.error('Error in session report submit:', error);
    }

    handleSkipSessionReport();
  };

  const handleSkipSessionReport = () => {
    setShowSessionCompleteModal(false);
    
    const sessionData = {
      duration: Math.floor((initialDuration - timer) / 60),
      task: currentTask?.title || 'No specific task',
      focusRating: focusRating || 0,
      productivityRating: productivityRating || 0,
      notes: sessionNotes || '',
      completedFullSession: timer === 0,
      sessionType: selectionMode || 'auto',
      subject: selectedSubject || 'General Study',
      plannedDuration: Math.floor(initialDuration / 60)
    };
    
    navigation.navigate('BreakTimerScreen', { sessionData });
  };

  const handleTimerCustomization = () => {
    if (selectionMode === 'manual') {
      setShowTimerCustomization(true);
    } else {
      Alert.alert('Timer Adjustment', 'Timer can only be adjusted in manual mode. Please start a new session in manual mode to customize the timer.');
    }
  };

  const handleCustomTimerSet = () => {
    const minutes = parseInt(customDuration);
    if (minutes && minutes > 0 && minutes <= 180) {
      setTimer(minutes * 60);
      setSelectedDuration(minutes * 60);
      startTimeRef.current = Date.now();
      setShowTimerCustomization(false);
    } else {
      Alert.alert('Invalid Duration', 'Please enter a duration between 1 and 180 minutes.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      {/* Pre-Session Selection Modal */}
      <Modal visible={showPreSessionModal} transparent animationType="slide">
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.modalBox, { maxHeight: '85%' }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={modalStyles.iconCircle}>
                <MaterialIcons name="psychology" size={48} color="#4CAF50" />
              </View>
              <Text style={modalStyles.modalTitle}>Start Your Focus Session</Text>
              <Text style={modalStyles.modalDesc}>
                Choose how you'd like to set up your study session for optimal focus and productivity.
              </Text>

              {!selectionMode && (
                <View style={modalStyles.modeSelection}>
                  {/* Auto Mode */}
                  <TouchableOpacity 
                    style={[modalStyles.modeCard, modalStyles.autoModeCard]}
                    onPress={() => handleModeSelection('auto')}
                  >
                    <MaterialIcons name="autorenew" size={32} color="#4CAF50" />
                    <Text style={modalStyles.modeTitle}>Automatic Selection</Text>
                    <Text style={modalStyles.modeDesc}>
                      Smart selection based on your work style and task priorities
                    </Text>
                    <View style={modalStyles.modeFeatures}>
                      <Text style={modalStyles.featureText}>• Duration: {getDurationText(userData?.onboarding?.focus_method)}</Text>
                      <Text style={modalStyles.featureText}>• Subject: From highest priority task</Text>
                      <Text style={modalStyles.featureText}>• Tasks: Priority-based order</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Manual Mode */}
                  <TouchableOpacity 
                    style={[modalStyles.modeCard, modalStyles.manualModeCard]}
                    onPress={() => handleModeSelection('manual')}
                  >
                    <MaterialIcons name="tune" size={32} color="#2196F3" />
                    <Text style={modalStyles.modeTitle}>Manual Selection</Text>
                    <Text style={modalStyles.modeDesc}>
                      Customize every aspect of your study session
                    </Text>
                    <View style={modalStyles.modeFeatures}>
                      <Text style={modalStyles.featureText}>• Duration: Adjustable during session</Text>
                      <Text style={modalStyles.featureText}>• Subject: Your choice</Text>
                      <Text style={modalStyles.featureText}>• Tasks: Custom order</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}

              {selectionMode === 'manual' && (
                <View style={modalStyles.manualSetup}>
                  <Text style={modalStyles.sectionTitle}>Customize Your Session</Text>
                  
                  {/* Task Order Selection */}
                  <View style={modalStyles.setupSection}>
                    <Text style={modalStyles.subsectionTitle}>Select & Order Tasks</Text>
                    <Text style={modalStyles.subsectionDesc}>
                      Choose tasks and drag to reorder them for your session
                    </Text>
                    
                    <ScrollView style={modalStyles.taskList} nestedScrollEnabled>
                      {userData?.tasks?.map((task: Task, index: number) => {
                        const isSelected = taskOrder.find(t => t.id === task.id) !== undefined;
                        const orderIndex = taskOrder.findIndex(t => t.id === task.id);
                        
                        return (
                          <TouchableOpacity
                            key={task.id}
                            style={[
                              modalStyles.taskItem,
                              isSelected && modalStyles.taskItemSelected
                            ]}
                            onPress={() => {
                              if (isSelected) {
                                setTaskOrder(taskOrder.filter(t => t.id !== task.id));
                              } else {
                                setTaskOrder([...taskOrder, task]);
                              }
                            }}
                          >
                            <View style={modalStyles.taskItemContent}>
                              {isSelected && (
                                <View style={modalStyles.orderBadge}>
                                  <Text style={modalStyles.orderBadgeText}>{orderIndex + 1}</Text>
                                </View>
                              )}
                              <View style={modalStyles.taskInfo}>
                                <Text style={[
                                  modalStyles.taskItemTitle,
                                  isSelected && modalStyles.taskItemTitleSelected
                                ]}>
                                  {task.title}
                                </Text>
                                <View style={modalStyles.taskMeta}>
                                  <MaterialIcons 
                                    name="flag" 
                                    size={14} 
                                    color={getPriorityColor(task.priority)} 
                                  />
                                  <Text style={[
                                    modalStyles.taskItemPriority,
                                    isSelected && modalStyles.taskItemTextSelected
                                  ]}>
                                    {task.priority}
                                  </Text>
                                </View>
                              </View>
                            </View>
                            {isSelected && (
                              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                            )}
                          </TouchableOpacity>
                        );
                      }) || (
                        <Text style={modalStyles.noTasksText}>
                          No tasks available. Create some tasks first.
                        </Text>
                      )}
                    </ScrollView>
                  </View>

                  {/* Subject Selection */}
                  <View style={modalStyles.setupSection}>
                    <Text style={modalStyles.subsectionTitle}>Select Subject</Text>
                    <ScrollView style={modalStyles.subjectScrollList} nestedScrollEnabled>
                      {availableSubjects.map((subject, index) => (
                        <TouchableOpacity
                          key={index}
                          style={[
                            modalStyles.subjectItem,
                            selectedSubject === subject && modalStyles.subjectItemSelected
                          ]}
                          onPress={() => setSelectedSubject(subject)}
                        >
                          <Text style={[
                            modalStyles.subjectItemText,
                            selectedSubject === subject && modalStyles.subjectItemTextSelected
                          ]}>
                            {subject}
                          </Text>
                          {selectedSubject === subject && (
                            <Ionicons name="checkmark" size={16} color="#fff" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {/* Duration Note */}
                  <View style={modalStyles.durationNote}>
                    <MaterialIcons name="info" size={20} color="#2196F3" />
                    <Text style={modalStyles.durationNoteText}>
                      Timer can be adjusted during your session in manual mode
                    </Text>
                  </View>

                  {/* Action Buttons */}
                  <View style={modalStyles.setupActions}>
                    <TouchableOpacity 
                      style={modalStyles.startBtn}
                      onPress={handleManualSetupComplete}
                    >
                      <Text style={modalStyles.startBtnText}>Start Focus Session</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={modalStyles.backBtn}
                      onPress={() => setSelectionMode(null)}
                    >
                      <Text style={modalStyles.backBtnText}>Back to Mode Selection</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Cancel Button */}
              <TouchableOpacity 
                style={modalStyles.cancelBtn}
                onPress={() => navigation.navigate('Main', { screen: 'Home' })}
              >
                <Text style={modalStyles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Rest of the component remains the same but only shows when session is started */}
      {sessionStarted && (
        <>
          {/* Top Navigation Bar */}
          <View style={styles.topNavBar}>
            <TouchableOpacity style={styles.iconBtn} onPress={handleBack}>
              <Ionicons name="arrow-back" size={24} color="#222" />
            </TouchableOpacity>
            <View style={styles.topNavTitleRow}>
              <Text style={styles.currentTaskLabel}>
                <Text style={{ color: '#888' }}>Focus: </Text>
                <Text style={styles.currentTaskName}>
                  {currentTask?.title || 'General Study'}
                </Text>
                {currentTask && (
                  <MaterialIcons 
                    name="flag" 
                    size={18} 
                    color={getPriorityColor(currentTask.priority)} 
                    style={{ marginLeft: 4 }} 
                  />
                )}
              </Text>
            </View>
            <TouchableOpacity style={styles.iconBtn} onPress={handleTimerCustomization}>
              <Ionicons 
                name="settings-outline" 
                size={22} 
                color={selectionMode === 'manual' ? "#4CAF50" : "#CCC"} 
              />
            </TouchableOpacity>
          </View>

          {/* Session Type Banner */}
          <View style={styles.sessionTypeBanner}>
            <MaterialIcons 
              name={selectionMode === 'manual' ? "tune" : "autorenew"} 
              size={18} 
              color="#4CAF50" 
            />
            <Text style={styles.sessionTypeText}>
              {getSessionTypeDisplay()}
            </Text>
            {selectionMode === 'manual' && (
              <Text style={styles.timerAdjustText}>Timer Adjustable</Text>
            )}
          </View>

          {/* Main Content */}
          <View style={styles.container}>
            {/* Timer */}
            <View style={styles.timerBox}>
              <Text style={styles.timerText}>{formatTime(timer)}</Text>
              {selectedSubject && (
                <Text style={styles.subjectText}>Subject: {selectedSubject}</Text>
              )}
            </View>

            {/* Controls */}
            <View style={styles.controlsRow}>
              <TouchableOpacity style={styles.pauseBtn} onPress={handlePause}>
                <Ionicons name={isPaused ? 'play' : 'pause'} size={22} color="#222" />
                <Text style={styles.pauseBtnText}>{isPaused ? 'Resume' : 'Pause'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.endBtn} onPress={handleEndSession}>
                <Ionicons name="stop" size={22} color="#222" />
                <Text style={styles.endBtnText}>End Session</Text>
              </TouchableOpacity>
            </View>

            {/* Current Task Card */}
            <View style={styles.taskCard}>
              {currentTask ? (
                <>
                  <Text style={styles.taskCardLabel}>
                    {selectionMode === 'manual' ? 'Current Task (Custom Order)' : 'Current Task (Priority-Based)'}
                  </Text>
                  <Text style={styles.taskCardName}>{currentTask.title}</Text>
                  <View style={styles.priorityRow}>
                    <MaterialIcons 
                      name="flag" 
                      size={18} 
                      color={getPriorityColor(currentTask.priority)} 
                    />
                    <Text style={styles.priorityText}>
                      Priority: <Text style={{ 
                        color: getPriorityColor(currentTask.priority), 
                        fontWeight: 'bold' 
                      }}>
                        {currentTask.priority}
                      </Text>
                    </Text>
                  </View>
                  <Text style={styles.taskCardDesc}>
                    {currentTask.description || 'No description provided'}
                  </Text>
                  
                  {/* Show remaining tasks in manual mode */}
                  {selectionMode === 'manual' && taskOrder.length > 1 && (
                    <View style={styles.remainingTasks}>
                      <Text style={styles.remainingTasksLabel}>
                        Next Tasks: {taskOrder.slice(1).map(t => t.title).join(', ')}
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <>
                  <Text style={styles.taskCardLabel}>No Active Tasks</Text>
                  <Text style={styles.taskCardName}>General Study Session</Text>
                  <Text style={styles.taskCardDesc}>
                    Focus on your studies without a specific task assignment.
                  </Text>
                </>
              )}
            </View>
          </View>

          {/* Timer Customization Modal - Only available in manual mode */}
          <Modal visible={showTimerCustomization} transparent animationType="slide">
            <View style={modalStyles.overlay}>
              <View style={modalStyles.modalBox}>
                <Text style={modalStyles.modalTitle}>Adjust Timer</Text>
                <Text style={modalStyles.modalDesc}>
                  Customize your session duration. This is only available in manual mode.
                </Text>
                
                <View style={modalStyles.customSection}>
                  <Text style={modalStyles.sectionTitle}>New Duration (Minutes)</Text>
                  <TextInput
                    style={modalStyles.customInput}
                    placeholder="Enter minutes (1-180)"
                    value={customDuration}
                    onChangeText={setCustomDuration}
                    keyboardType="numeric"
                    maxLength={3}
                  />
                  <TouchableOpacity 
                    style={modalStyles.setCustomBtn}
                    onPress={handleCustomTimerSet}
                  >
                    <Text style={modalStyles.setCustomBtnText}>Update Timer</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity 
                  style={modalStyles.cancelBtn}
                  onPress={() => setShowTimerCustomization(false)}
                >
                  <Text style={modalStyles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* End Session Modal */}
          <Modal visible={showEndModal} transparent animationType="fade">
            <View style={modalStyles.overlay}>
              <View style={modalStyles.modalBox}>
                <View style={modalStyles.iconCircle}>
                  <Ionicons name="alert-circle-outline" size={48} color="#FFB300" />
                </View>
                <Text style={modalStyles.modalTitle}>End Session Early?</Text>
                <Text style={modalStyles.modalDesc}>
                  You still have time left on your focus session. Completing the full duration builds better focus habits!
                </Text>
                <TouchableOpacity style={modalStyles.continueBtn} onPress={handleContinueFocusing}>
                  <Text style={modalStyles.continueBtnText}>Continue Focusing</Text>
                </TouchableOpacity>
                <TouchableOpacity style={modalStyles.endNowBtn} onPress={handleEndSessionNow}>
                  <Text style={modalStyles.endNowBtnText}>End Session Now</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Session Complete Modal */}
          <Modal visible={showSessionCompleteModal} transparent animationType="fade">
            <View style={modalStyles.overlay}>
              <View style={[modalStyles.modalBox, { maxHeight: '80%' }]}>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={modalStyles.iconCircle}>
                    <MaterialIcons name="emoji-events" size={48} color="#4CAF50" />
                  </View>
                  <Text style={modalStyles.modalTitle}>Session Complete!</Text>
                  <Text style={modalStyles.modalDesc}>
                    Great job! Rate your session to help improve your future focus sessions.
                  </Text>

                  {/* Focus Rating */}
                  <View style={modalStyles.ratingSection}>
                    <Text style={modalStyles.ratingLabel}>How was your focus? (1-5)</Text>
                    <View style={modalStyles.ratingRow}>
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <TouchableOpacity
                          key={rating}
                          style={[
                            modalStyles.ratingButton,
                            focusRating === rating && modalStyles.ratingButtonSelected
                          ]}
                          onPress={() => setFocusRating(rating)}
                        >
                          <Text style={[
                            modalStyles.ratingButtonText,
                            focusRating === rating && modalStyles.ratingButtonTextSelected
                          ]}>{rating}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Productivity Rating */}
                  <View style={modalStyles.ratingSection}>
                    <Text style={modalStyles.ratingLabel}>How productive did you feel? (1-5)</Text>
                    <View style={modalStyles.ratingRow}>
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <TouchableOpacity
                          key={rating}
                          style={[
                            modalStyles.ratingButton,
                            productivityRating === rating && modalStyles.ratingButtonSelected
                          ]}
                          onPress={() => setProductivityRating(rating)}
                        >
                          <Text style={[
                            modalStyles.ratingButtonText,
                            productivityRating === rating && modalStyles.ratingButtonTextSelected
                          ]}>{rating}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Session Notes */}
                  <View style={modalStyles.notesSection}>
                    <Text style={modalStyles.ratingLabel}>Session Notes (optional)</Text>
                    <TextInput
                      style={modalStyles.notesInput}
                      placeholder="What did you work on? Any insights?"
                      multiline
                      numberOfLines={3}
                      value={sessionNotes}
                      onChangeText={setSessionNotes}
                      placeholderTextColor="#888"
                    />
                  </View>

                  {/* Action Buttons */}
                  <View style={modalStyles.actionButtonsContainer}>
                    <TouchableOpacity style={modalStyles.submitBtn} onPress={handleSessionReportSubmit}>
                      <Text style={modalStyles.submitBtnText}>Continue to Break</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={modalStyles.skipBtn} onPress={handleSkipSessionReport}>
                      <Text style={modalStyles.skipBtnText}>Skip for now</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </View>
          </Modal>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFCFA' },
  topNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#FAFCFA',
    minHeight: 48,
  },
  topNavTitleRow: {
    flex: 1,
    alignItems: 'center',
  },
  iconBtn: { padding: 4 },
  currentTaskLabel: { textAlign: 'center', fontSize: 16, fontWeight: 'bold', color: '#222' },
  currentTaskName: { color: '#222', fontWeight: 'bold', fontSize: 16 },
  sessionTypeBanner: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: '#E8F5E9', 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16 
  },
  sessionTypeText: { color: '#388E3C', fontWeight: 'bold', marginLeft: 6, fontSize: 14 },
  timerAdjustText: { color: '#4CAF50', fontSize: 12, marginLeft: 8, fontStyle: 'italic' },
  container: { flex: 1, justifyContent: 'center', padding: 16 },
  timerBox: { 
    alignSelf: 'center', 
    backgroundColor: '#F1F8E9', 
    borderRadius: 16, 
    padding: 32, 
    marginVertical: 16, 
    minWidth: 220, 
    alignItems: 'center' 
  },
  timerText: { fontSize: 48, fontWeight: 'bold', color: '#222', letterSpacing: 2 },
  subjectText: { fontSize: 14, color: '#4CAF50', marginTop: 8, fontWeight: 'bold' },
  controlsRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 18 },
  pauseBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    borderRadius: 8, 
    paddingVertical: 10, 
    paddingHorizontal: 28, 
    marginRight: 12, 
    borderWidth: 1, 
    borderColor: '#E0E0E0' 
  },
  pauseBtnText: { fontWeight: 'bold', color: '#222', marginLeft: 8, fontSize: 16 },
  endBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    borderRadius: 8, 
    paddingVertical: 10, 
    paddingHorizontal: 28, 
    borderWidth: 1, 
    borderColor: '#E0E0E0' 
  },
  endBtnText: { fontWeight: 'bold', color: '#222', marginLeft: 8, fontSize: 16 },
  taskCard: { 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    borderLeftWidth: 6, 
    borderLeftColor: '#E57373', 
    padding: 18, 
    marginTop: 8, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.06, 
    shadowRadius: 4, 
    elevation: 1 
  },
  taskCardLabel: { color: '#388E3C', fontWeight: 'bold', fontSize: 14, marginBottom: 4 },
  taskCardName: { fontWeight: 'bold', fontSize: 20, color: '#222', marginBottom: 4 },
  priorityRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  priorityText: { color: '#E57373', fontWeight: 'bold', marginLeft: 4, fontSize: 15 },
  taskCardDesc: { color: '#888', fontSize: 14, marginTop: 2 },
  remainingTasks: { marginTop: 12, padding: 12, backgroundColor: '#F5F5F5', borderRadius: 8 },
  remainingTasksLabel: { fontSize: 12, color: '#666', fontWeight: 'bold' },
});

// Modal styles remain exactly the same...
const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    width: '90%',
    alignItems: 'center',
  },
  iconCircle: {
    backgroundColor: '#FFF8E1',
    borderRadius: 40,
    padding: 12,
    marginBottom: 16,
  },
  modalTitle: { fontWeight: 'bold', fontSize: 20, color: '#1B5E20', marginBottom: 10, textAlign: 'center' },
  modalDesc: { color: '#333', fontSize: 15, marginBottom: 20, textAlign: 'center', lineHeight: 22 },
  
  // Mode selection styles
  modeSelection: {
    width: '100%',
    marginBottom: 20,
  },
  modeCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 2,
  },
  autoModeCard: {
    backgroundColor: '#F1F8E9',
    borderColor: '#4CAF50',
  },
  manualModeCard: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  modeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  modeDesc: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  modeFeatures: {
    alignItems: 'flex-start',
    width: '100%',
  },
  featureText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  
  // Manual setup styles
  manualSetup: {
    width: '100%',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  setupSection: {
    marginBottom: 20,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subsectionDesc: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  taskList: {
    maxHeight: 200,
    marginBottom: 8,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  taskItemSelected: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  taskItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderBadge: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  orderBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  taskInfo: {
    flex: 1,
  },
  taskItemTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  taskItemTitleSelected: {
    color: '#2E7D32',
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskItemPriority: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  taskItemTextSelected: {
    color: '#2E7D32',
  },
  noTasksText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  subjectScrollList: {
    maxHeight: 120,
  },
  subjectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F5F5F5',
  },
  subjectItemSelected: {
    backgroundColor: '#4CAF50',
  },
  subjectItemText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  subjectItemTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  durationNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  durationNoteText: {
    flex: 1,
    fontSize: 14,
    color: '#1976D2',
    marginLeft: 8,
  },
  setupActions: {
    width: '100%',
    marginBottom: 20,
  },
  startBtn: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  startBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  backBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  backBtnText: {
    color: '#666',
    fontSize: 14,
  },
  cancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#666',
    fontSize: 16,
  },
  
  // Timer customization styles
  customSection: {
    width: '100%',
    marginBottom: 20,
  },
  customInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  setCustomBtn: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  setCustomBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  
  // Session complete modal styles
  ratingSection: { width: '100%', marginBottom: 20 },
  ratingLabel: { fontSize: 16, fontWeight: 'bold', color: '#1B5E20', marginBottom: 10 },
  ratingRow: { flexDirection: 'row', justifyContent: 'space-between' },
  ratingButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingButtonSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#4CAF50',
  },
  ratingButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#888',
  },
  ratingButtonTextSelected: {
    color: '#fff',
  },
  notesSection: { width: '100%', marginBottom: 20 },
  notesInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  actionButtonsContainer: { width: '100%' },
  submitBtn: { 
    backgroundColor: '#4CAF50', 
    borderRadius: 8, 
    paddingVertical: 12, 
    alignItems: 'center',
    marginBottom: 8 
  },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  skipBtn: { 
    backgroundColor: 'transparent', 
    paddingVertical: 8, 
    alignItems: 'center' 
  },
  skipBtnText: { color: '#888', fontSize: 14 },
  continueBtn: { 
    backgroundColor: '#fff', 
    borderRadius: 8, 
    paddingVertical: 12, 
    paddingHorizontal: 30, 
    borderWidth: 1, 
    borderColor: '#E0E0E0', 
    marginBottom: 10, 
    width: '100%' 
  },
  continueBtnText: { color: '#222', fontWeight: 'bold', fontSize: 16, textAlign: 'center' },
  endNowBtn: { 
    backgroundColor: '#6C63FF', 
    borderRadius: 8, 
    paddingVertical: 12, 
    paddingHorizontal: 30, 
    width: '100%' 
  },
  endNowBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16, textAlign: 'center' },
});

export default StudySessionScreen;