import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ScrollView, Alert, AppState, BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { supabase } from '../../utils/supabase';
import { useSupabaseFocusSession, Task } from '../../utils/supabaseHooks';
import { useBackgroundMusic } from '../../hooks/useBackgroundMusic';
import { getSoundPreference, getAutoPlaySetting } from '../../utils/musicPreferences';
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
  const { 
    startPlaylist,
    stopPlayback, 
    currentTrack, 
    currentPlaylist,
    currentTrackIndex,
    isPlaying,
    audioSupported,
    isPreviewMode,
    nextTrack,
    previousTrack,
    pausePlayback,
    getCurrentPlaylistTracks,
    volume,
    setVolume
  } = useBackgroundMusic();
  
  // Get user's sound preference from settings using centralized utility
  const userSoundPreference = getSoundPreference(userData);
  const autoPlaySound = getAutoPlaySetting(userData);
  
  // Navigation and route params - must be defined before useState calls
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const params = route.params as { 
    group?: boolean; 
    room?: any;
    autoStart?: boolean;
    selectedTask?: any;
    manualSelection?: boolean;
  } | undefined;

  // Add this missing state variable
  const [showBackConfirmModal, setShowBackConfirmModal] = useState(false);
  
  // Timer refs for background functionality
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const backgroundTimeRef = useRef<number | null>(null);
  const appStateRef = useRef(AppState.currentState);
  
  // Pre-session selection state - updated logic
  const [showPreSessionModal, setShowPreSessionModal] = useState(() => {
    // Show modal for custom/manual selection and ensure we have task data
    return params?.manualSelection === true;
  });
  const [selectionMode, setSelectionMode] = useState<'auto' | 'manual' | null>(() => {
    // Set initial selection mode based on navigation params
    if (params?.autoStart === true) return 'auto';
    if (params?.manualSelection === true) return 'manual';
    return null;
  });
  
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

  // Enhanced task selection logic using real Supabase data
  const currentTask = useMemo(() => {
    console.log('🎯 currentTask calculation triggered');
    console.log('   selectionMode:', selectionMode);
    console.log('   userData?.tasks length:', userData?.tasks?.length || 0);
    console.log('   taskOrder length:', taskOrder.length);

    if (selectionMode === 'manual' && taskOrder.length > 0) {
      console.log('🎯 Manual mode: returning first task from order');
      return taskOrder[0];
    }
    
    if (selectionMode === 'auto' && userData?.tasks) {
      console.log('🎯 Auto mode: processing available tasks');
      
      // More inclusive task filtering
      const availableTasks = userData.tasks.filter((task: any) => {
        const isAvailable = task.status !== 'completed' && 
                           task.status !== 'deleted' && 
                           task.status !== 'cancelled' &&
                           task.status !== 'archived';
        
        console.log(`   Task "${task.title}": status=${task.status}, available=${isAvailable}`);
        return isAvailable;
      });
      
      console.log(`🎯 Found ${availableTasks.length} available tasks`);
      
      if (availableTasks.length === 0) {
        console.log('🎯 No available tasks found');
        return null;
      }
      
      // Enhanced sorting with more criteria
      const priorityOrder = { 
        'High': 4, 'high': 4, 
        'Medium': 3, 'medium': 3, 
        'Low': 2, 'low': 2,
        'Lowest': 1, 'lowest': 1
      };
      
      const sortedTasks = [...availableTasks].sort((a: any, b: any) => {
        // 1. Priority (highest first)
        const aPriority = priorityOrder[a.priority] || 2;
        const bPriority = priorityOrder[b.priority] || 2;
        const priorityDiff = bPriority - aPriority;
        if (priorityDiff !== 0) {
          console.log(`   Priority comparison: ${a.title}(${aPriority}) vs ${b.title}(${bPriority}) = ${priorityDiff}`);
          return priorityDiff;
        }
        
        // 2. Due date (sooner first, if available)
        if (a.due_date && b.due_date) {
          const aDue = new Date(a.due_date).getTime();
          const bDue = new Date(b.due_date).getTime();
          const dueDiff = aDue - bDue;
          if (dueDiff !== 0) return dueDiff;
        } else if (a.due_date && !b.due_date) {
          return -1; // Tasks with due dates come first
        } else if (!a.due_date && b.due_date) {
          return 1;
        }
        
        // 3. Subtasks count (more subtasks = higher complexity)
        const aSubTasks = a.subtasks?.length || 0;
        const bSubTasks = b.subtasks?.length || 0;
        const subTaskDiff = bSubTasks - aSubTasks;
        if (subTaskDiff !== 0) return subTaskDiff;
        
        // 4. Creation date (newer first)
        const aDate = new Date(a.created_at || 0).getTime();
        const bDate = new Date(b.created_at || 0).getTime();
        return bDate - aDate;
      });
      
      const selectedTask = sortedTasks[0];
      
      if (selectedTask) {
        console.log(`🎯 AUTO SELECTED TASK: "${selectedTask.title}"`);
        console.log(`   Priority: ${selectedTask.priority}`);
        console.log(`   Status: ${selectedTask.status}`);
        console.log(`   Subtasks: ${selectedTask.subtasks?.length || 0}`);
        console.log(`   Due date: ${selectedTask.due_date || 'None'}`);
        console.log(`   Subject: ${selectedTask.subject || selectedTask.category || 'General Study'}`);
        return selectedTask;
      }
    }
    
    console.log('🎯 No suitable task found, will show general study');
    return null;
  }, [selectionMode, taskOrder, userData?.tasks]);

  // Enhanced task selection algorithm using real task data
  const selectBestTask = (tasks: any[]) => {
    console.log('🎯 Selecting best task from', tasks.length, 'candidates');
    
    // Priority scoring system (higher scores = higher priority)
    const priorityOrder = { 
      'high': 100, 'High': 100, 'HIGH': 100,
      'medium': 50, 'Medium': 50, 'MEDIUM': 50,
      'low': 10, 'Low': 10, 'LOW': 10 
    };
    
    const scoredTasks = tasks.map((task: any) => {
      let score = 0;
      
      // Priority score (70% weight) - this is the most important factor
      const priorityScore = priorityOrder[task.priority] || 25; // Default to medium if no priority
      score += priorityScore;
      
      // Subtask complexity (20% weight) - tasks with more subtasks get priority
      const subtaskCount = task.subtasks?.length || 0;
      score += subtaskCount * 5; // 5 points per subtask
      
      // Due date urgency (10% weight)
      if (task.due_date) {
        const dueDate = new Date(task.due_date);
        const now = new Date();
        const daysUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysUntilDue <= 1) {
          score += 20; // Very urgent
        } else if (daysUntilDue <= 3) {
          score += 10; // Somewhat urgent
        } else if (daysUntilDue <= 7) {
          score += 5; // Mildly urgent
        }
      }
      
      // Recency bonus - newer tasks get slight priority
      const taskAge = Date.now() - new Date(task.created_at || 0).getTime();
      const daysSinceCreation = taskAge / (1000 * 60 * 60 * 24);
      const recencyScore = Math.max(0, 5 - daysSinceCreation); // 5 points for tasks created today, decreasing
      score += recencyScore;
      
      return { ...task, selectionScore: score };
    });
    
    // Sort by score (highest first)
    const sortedTasks = scoredTasks.sort((a, b) => b.selectionScore - a.selectionScore);
    
    const selectedTask = sortedTasks[0];
    
    if (selectedTask) {
      console.log(`🎯 Selected highest priority task: "${selectedTask.title}"`);
      console.log(`   Priority: ${selectedTask.priority} (${priorityOrder[selectedTask.priority] || 25} points)`);
      console.log(`   Subtasks: ${selectedTask.subtasks?.length || 0}`);
      console.log(`   Due Date: ${selectedTask.due_date ? new Date(selectedTask.due_date).toLocaleDateString() : 'None'}`);
      console.log(`   Selection Score: ${selectedTask.selectionScore.toFixed(1)}`);
      console.log(`   Status: ${selectedTask.status || 'pending'}`);
      return selectedTask;
    }
    
    return null;
  };

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

  // Enhanced useEffect for starting session and music - auto-start with selected task
  useEffect(() => {
    // If coming from automatic mode, start session immediately with the auto-selected task
    if (params?.autoStart === true && !sessionStarted && currentTask) {
      console.log('🔄 Auto-starting session with selected task:', currentTask.title);
      
      // Get subject from current task or default to "General Study"
      const autoSubject = currentTask.subject || 'General Study';
      setSelectedSubject(autoSubject);
      
      // Start session automatically
      setTimeout(async () => {
        const sessionTypeParam = isGroupSession ? 'group' : 'individual';
        const roomId = room?.id || undefined;
        startSession(roomId, sessionTypeParam);
        startTimeRef.current = Date.now();
        setSessionStarted(true);
        
        // 🎵 AUTO-PLAY MUSIC FOR AUTOMATIC MODE
        if (autoPlaySound && userSoundPreference && userSoundPreference !== 'Silence') {
          console.log(`🎵 Auto-starting playlist for automatic session: ${userSoundPreference}`);
          try {
            await startPlaylist(userSoundPreference);
            console.log(`🎵 Successfully started ${userSoundPreference} playlist for automatic session`);
          } catch (error) {
            console.error('🎵 Failed to start auto-play music for automatic session:', error);
          }
        }
      }, 500);
    }
    // If auto-start is true but no task is found, start general study session
    else if (params?.autoStart === true && !sessionStarted && !currentTask) {
      console.log('🔄 Auto-starting general study session (no tasks available)');
      
      // Automatically set subject to "General Study" for auto mode with no tasks
      setSelectedSubject('General Study');
      
      setTimeout(async () => {
        const sessionTypeParam = isGroupSession ? 'group' : 'individual';
        const roomId = room?.id || undefined;
        startSession(roomId, sessionTypeParam);
        startTimeRef.current = Date.now();
        setSessionStarted(true);
        
        // 🎵 AUTO-PLAY MUSIC FOR GENERAL STUDY
        if (autoPlaySound && userSoundPreference && userSoundPreference !== 'Silence') {
          console.log(`🎵 Auto-starting playlist for general study session: ${userSoundPreference}`);
          try {
            await startPlaylist(userSoundPreference);
            console.log(`🎵 Successfully started ${userSoundPreference} playlist`);
          } catch (error) {
            console.error('🎵 Failed to start auto-play music:', error);
          }
        }
      }, 500);
    }
  }, [params?.autoStart, userData, sessionStarted, autoPlaySound, userSoundPreference, currentTask]);

  // Remove the old handleModeSelection function and replace with this simplified version:
  const handleModeSelection = (mode: 'auto' | 'manual') => {
    setSelectionMode(mode);
    
    if (mode === 'auto') {
      // This shouldn't happen anymore since auto mode bypasses the modal
      console.warn('Auto mode selected in modal - this should not happen');
      setShowPreSessionModal(false);
    }
    // Manual mode stays in the modal for task selection
  };

  // Enhanced manual setup complete function
  const handleManualSetupComplete = () => {
    if (taskOrder.length === 0) {
      Alert.alert('Select Tasks', 'Please select at least one task for your session.');
      return;
    }
    
    if (!selectedSubject) {
      Alert.alert('Select Subject', 'Please choose a subject for this session.');
      return;
    }
    
    // Close modal and start session
    setShowPreSessionModal(false);
    
    // Start session immediately after modal closes
    setTimeout(async () => {
      const sessionTypeParam = isGroupSession ? 'group' : 'individual';
      const roomId = room?.id || undefined;
      startSession(roomId, sessionTypeParam);
      startTimeRef.current = Date.now();
      setSessionStarted(true);
      
      // 🎵 AUTO-PLAY MUSIC FOR MANUAL MODE
      if (autoPlaySound && userSoundPreference && userSoundPreference !== 'Silence') {
        console.log(`🎵 Auto-starting playlist for manual session: ${userSoundPreference}`);
        try {
          await startPlaylist(userSoundPreference);
          console.log(`🎵 Successfully started ${userSoundPreference} playlist for manual session`);
        } catch (error) {
          console.error('🎵 Failed to start auto-play music for manual session:', error);
        }
      }
    }, 100);
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
      // 🎵 DON'T STOP MUSIC - Let it continue into break
      // await stopPlayback(); // Remove this line
      
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

  // Enhanced back button handling with confirmation
  const handleBack = async () => {
    // If session is active, show confirmation modal
    if (sessionStarted && timer > 0) {
      setShowBackConfirmModal(true);
      return;
    }
    
    // Otherwise, safe to go back
    // Stop music when leaving the session
    await stopPlayback();
    console.log('🎵 Stopped music when returning to home');
    navigation.goBack();
  };

  // Android hardware back button handling
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        if (sessionStarted && timer > 0) {
          setShowBackConfirmModal(true);
          return true; // Prevent default back behavior
        }
        return false; // Let default back behavior happen
      };

      // Store the subscription object returned by addEventListener
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      
      // Return a cleanup function that calls .remove() on the subscription
      return () => subscription.remove();
    }, [sessionStarted, timer])
  );

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
      // 🎵 DON'T STOP MUSIC - Let it continue into break
      // await stopPlayback(); // Remove this line
      
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

  // Enhanced music rendering with full audio features
  const renderMusicSettings = () => (
    <View style={styles.musicSection}>
      <View style={styles.musicHeader}>
        <Text style={styles.sectionTitle}>Background Music</Text>
        <View style={styles.musicControls}>
          {isPlaying && (
            <>
              <TouchableOpacity onPress={previousTrack} style={styles.musicControlBtn}>
                <Ionicons name="play-skip-back" size={20} color="#4CAF50" />
              </TouchableOpacity>
              <TouchableOpacity onPress={pausePlayback} style={styles.musicControlBtn}>
                <Ionicons name="pause" size={20} color="#E57373" />
              </TouchableOpacity>
              <TouchableOpacity onPress={nextTrack} style={styles.musicControlBtn}>
                <Ionicons name="play-skip-forward" size={20} color="#4CAF50" />
              </TouchableOpacity>
              <TouchableOpacity onPress={stopPlayback} style={styles.stopButton}>
                <Ionicons name="stop-circle" size={24} color="#E57373" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
      
      <View style={styles.currentMusicDisplay}>
        {!audioSupported ? (
          <View style={styles.musicStatus}>
            <Ionicons name="musical-notes-outline" size={16} color="#999" />
            <Text style={styles.musicStatusText}>
              Audio not available - install expo-av to enable music
            </Text>
          </View>
        ) : currentTrack ? (
          <View style={styles.musicStatus}>
            <Ionicons name="musical-notes" size={16} color="#4CAF50" />
            <View style={styles.trackInfo}>
              <Text style={styles.musicStatusText}>
                Now Playing: {currentTrack.name}
              </Text>
              <Text style={styles.playlistInfo}>
                {currentTrack?.category} • Track {currentTrackIndex + 1} of {getCurrentPlaylistTracks().length}
              </Text>
            </View>
            <Text style={styles.volumeText}>
              Volume: {Math.round(volume * 100)}%
            </Text>
          </View>
        ) : userSoundPreference && userSoundPreference !== 'Silence' ? (
          <View style={styles.musicStatus}>
            <Ionicons name="musical-notes-outline" size={16} color="#666" />
            <Text style={styles.musicStatusText}>
              Ready to play: {userSoundPreference}
            </Text>
            <Text style={styles.autoPlayStatus}>
              {autoPlaySound ? 'Auto-play enabled' : 'Manual start required'}
            </Text>
          </View>
        ) : (
          <View style={styles.musicStatus}>
            <Ionicons name="volume-mute-outline" size={16} color="#999" />
            <Text style={styles.musicStatusText}>
              No music selected (Silence mode)
            </Text>
          </View>
        )}
        
        {/* Manual Play Button - only show if auto-play is OFF or music isn't playing */}
        {!autoPlaySound && !isPlaying && userSoundPreference !== 'Silence' && (
          <TouchableOpacity 
            onPress={async () => {
              console.log(`🎵 Manual start playlist for: ${userSoundPreference}`);
              try {
                await startPlaylist(userSoundPreference);
                console.log(`🎵 Successfully started ${userSoundPreference} playlist manually`);
              } catch (error) {
                console.error('🎵 Failed to start manual music:', error);
                Alert.alert('Music Error', 'Unable to start music playback');
              }
            }}
            style={styles.playButton}
          >
            <Ionicons name="play-circle-outline" size={20} color="#4CAF50" />
            <Text style={styles.playButtonText}>Play Music</Text>
          </TouchableOpacity>
        )}

        {/* Volume Control */}
        {isPlaying && (
          <View style={styles.volumeControl}>
            <Text style={styles.volumeLabel}>Volume</Text>
            <View style={styles.volumeSliderContainer}>
              <TouchableOpacity onPress={() => setVolume(Math.max(0, volume - 0.1))}>
                <Ionicons name="volume-low" size={20} color="#666" />
              </TouchableOpacity>
              <View style={styles.volumeSlider}>
                <View style={[styles.volumeTrack, { width: '100%' }]} />
                <View style={[styles.volumeFill, { width: `${volume * 100}%` }]} />
              </View>
              <TouchableOpacity onPress={() => setVolume(Math.min(1, volume + 0.1))}>
                <Ionicons name="volume-high" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Pre-Session Selection Modal - Only for Manual/Custom Setup */}
      <Modal visible={showPreSessionModal} transparent animationType="slide">
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.modalBox, { maxHeight: '85%' }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={modalStyles.iconCircle}>
                <MaterialIcons name="tune" size={48} color="#2196F3" />
              </View>
              <Text style={modalStyles.modalTitle}>Customize Your Focus Session</Text>
              <Text style={modalStyles.modalDesc}>
                Select your tasks and arrange them in the order you want to focus on them during your study session.
              </Text>

              {/* Manual Setup Section */}
              <View style={modalStyles.manualSetup}>
                <Text style={modalStyles.sectionTitle}>Customize Your Session</Text>
                
                {/* Task Order Selection */}
                <View style={modalStyles.setupSection}>
                  <Text style={modalStyles.subsectionTitle}>Select & Order Tasks</Text>
                  <Text style={modalStyles.subsectionDesc}>
                    Choose tasks and tap to add them to your session. They will be ordered by selection.
                  </Text>
                  
                  {/* Available Tasks */}
                  <ScrollView style={modalStyles.taskList} nestedScrollEnabled>
                    {userData?.tasks && userData.tasks.length > 0 ? (
                      userData.tasks
                        .filter((task: any) => task.status === 'pending' || task.status === 'active' || task.status === 'in_progress')
                        .map((task: any, index: number) => {
                          const isSelected = taskOrder.find(t => t.id === task.id) !== undefined;
                          const orderIndex = taskOrder.findIndex(t => t.id === task.id);
                          
                          return (
                            <TouchableOpacity
                              key={task.id || index}
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
                              <View style={modalStyles.taskHeader}>
                                <View style={modalStyles.taskInfo}>
                                  <Text style={modalStyles.taskTitle}>{task.title}</Text>
                                  {task.description && (
                                    <Text style={modalStyles.taskDescription}>{task.description}</Text>
                                  )}
                                  <View style={modalStyles.taskMeta}>
                                    <View style={[modalStyles.priorityBadge, { backgroundColor: getPriorityColor(task.priority) }]}>
                                      <Text style={modalStyles.priorityText}>{task.priority}</Text>
                                    </View>
                                    {task.due_date && (
                                      <Text style={modalStyles.timeRemaining}>
                                        Due: {new Date(task.due_date).toLocaleDateString()}
                                      </Text>
                                    )}
                                  </View>
                                </View>
                                {isSelected ? (
                                  <View style={modalStyles.selectedIndicator}>
                                    <Text style={modalStyles.selectedNumber}>{orderIndex + 1}</Text>
                                    <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                                  </View>
                                ) : (
                                  <Ionicons name="add-circle-outline" size={24} color="#888" />
                                )}
                              </View>
                            </TouchableOpacity>
                          );
                        })
                    ) : (
                      <View style={modalStyles.noTasksContainer}>
                        <MaterialIcons name="assignment" size={48} color="#ccc" />
                        <Text style={modalStyles.noTasksText}>
                          No tasks available for selection.
                        </Text>
                        <Text style={modalStyles.noTasksSubtext}>
                          Create some tasks on the Home screen first, then try custom setup again.
                        </Text>
                        <TouchableOpacity 
                          style={modalStyles.createTaskBtn}
                          onPress={() => {
                            setShowPreSessionModal(false);
                            navigation.navigate('Main', { screen: 'Home' });
                          }}
                        >
                          <Text style={modalStyles.createTaskBtnText}>Create Tasks</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </ScrollView>
                  
                  {/* Subject Selection - Always show */}
                  <View style={modalStyles.setupSection}>
                    <Text style={modalStyles.subsectionTitle}>Select Subject</Text>
                    <ScrollView style={modalStyles.subjectScrollList} nestedScrollEnabled>
                      {availableSubjects.length > 0 ? availableSubjects.map((subject, index) => (
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
                      )) : (
                        ['General Study', 'Mathematics', 'Science', 'History', 'Literature', 'Languages'].map((subject, index) => (
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
                        ))
                      )}
                    </ScrollView>
                  </View>

                  {/* Action Buttons */}
                  <View style={modalStyles.setupActions}>
                    <TouchableOpacity 
                      style={[modalStyles.startBtn, (!selectedSubject || (!taskOrder.length && userData?.tasks?.length > 0)) && modalStyles.startBtnDisabled]}
                      onPress={handleManualSetupComplete}
                      disabled={!selectedSubject || (!taskOrder.length && userData?.tasks?.length > 0)}
                    >
                      <Text style={modalStyles.startBtnText}>
                        {taskOrder.length > 0 ? `Start with ${taskOrder.length} Task${taskOrder.length > 1 ? 's' : ''}` : 'Start General Study'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={modalStyles.backBtn}
                      onPress={() => navigation.navigate('Main', { screen: 'Home' })}
                    >
                      <Text style={modalStyles.backBtnText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Rest of the component - timer interface */}
      {(sessionStarted || params?.autoStart) && (
        <>
          {/* Timer Interface */}
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.iconBtn} onPress={handleBack}>
              <Ionicons name="arrow-back" size={24} color="#222" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {currentTask?.title || 'General Study'}
            </Text>
            <TouchableOpacity style={styles.iconBtn} onPress={handleTimerCustomization}>
              <Ionicons name="settings-outline" size={24} color="#222" />
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

            {/* Enhanced Current Task Card with Real Data */}
            <View style={styles.taskCard}>
              {currentTask ? (
                <>
                  <Text style={styles.taskCardLabel}>
                    {selectionMode === 'manual' ? 'Current Task (Custom Order)' : 'Auto-Selected Task (Highest Priority)'}
                  </Text>
                  <Text style={styles.taskTitle}>{currentTask.title}</Text>
                  <Text style={styles.taskDescription}>
                    {currentTask.description || 'No description provided'}
                  </Text>
                  
                  {/* Task metadata */}
                  <View style={styles.taskMeta}>
                    <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(currentTask.priority) }]}>
                      <Text style={styles.priorityText}>{currentTask.priority || 'Medium'}</Text>
                    </View>
                    
                    {currentTask.subtasks && currentTask.subtasks.length > 0 && (
                      <View style={styles.subTaskBadge}>
                        <MaterialIcons name="list" size={12} color="#2196F3" />
                        <Text style={styles.subTaskText}>{currentTask.subtasks.length} subtasks</Text>
                      </View>
                    )}
                    
                    {currentTask.due_date && (
                      <View style={styles.dueDateBadge}>
                        <MaterialIcons name="schedule" size={12} color="#F57C00" />
                        <Text style={styles.dueDateText}>
                          Due: {new Date(currentTask.due_date).toLocaleDateString()}
                        </Text>
                      </View>
                    )}
                    
                    <Text style={styles.timeRemaining}>
                      {formatTime(timer)} remaining
                    </Text>
                  </View>
                  
                  {/* Show subtasks if available */}
                  {currentTask.subtasks && currentTask.subtasks.length > 0 && (
                    <View style={styles.subtasksList}>
                      <Text style={styles.subtasksTitle}>Subtasks ({currentTask.subtasks.length}):</Text>
                      {currentTask.subtasks.slice(0, 3).map((subtask: any, index: number) => (
                        <View key={subtask.id || index} style={styles.subtaskItem}>
                          <Ionicons 
                            name={subtask.completed ? "checkmark-circle" : "ellipse-outline"} 
                            size={16} 
                            color={subtask.completed ? "#4CAF50" : "#666"} 
                          />
                          <Text style={[
                            styles.subtaskText, 
                            subtask.completed && styles.subtaskCompleted
                          ]}>
                            {subtask.title || subtask.text}
                          </Text>
                        </View>
                      ))}
                      {currentTask.subtasks.length > 3 && (
                        <Text style={styles.moreSubtasks}>
                          +{currentTask.subtasks.length - 3} more subtasks
                        </Text>
                      )}
                    </View>
                  )}
                  
                  {selectionMode === 'auto' && (
                    <View style={styles.selectionReason}>
                      <MaterialIcons name="auto-awesome" size={14} color="#4CAF50" />
                      <Text style={styles.selectionReasonText}>
                        Auto-selected: {currentTask.priority} priority, {currentTask.subtasks?.length || 0} subtasks
                        {currentTask.due_date && ', due soon'}
                      </Text>
                    </View>
                  )}
                  
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
                  <Text style={styles.taskCardLabel}>General Study Session</Text>
                  <Text style={styles.taskTitle}>No Active Tasks Found</Text>
                  <Text style={styles.taskDescription}>
                    Focus on your studies without a specific task assignment.
                  </Text>
                  <View style={styles.generalStudyHint}>
                    <MaterialIcons name="lightbulb-outline" size={16} color="#F57C00" />
                    <Text style={styles.generalStudyHintText}>
                      Create tasks on the Home screen to get automatic task selection based on priority, due dates, and complexity.
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* Enhanced Music Selection Section - Only in Manual Mode */}
            {selectionMode === 'manual' && renderMusicSettings()}
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

          {/* Back Button Confirmation Modal */}
          <Modal visible={showBackConfirmModal} transparent animationType="fade">
            <View style={modalStyles.overlay}>
              <View style={modalStyles.modalBox}>
                <MaterialIcons name="warning" size={48} color="#FF9800" />
                <Text style={modalStyles.modalTitle}>End Session?</Text>
                <Text style={modalStyles.modalDesc}>
                  Leaving now will end your current session. Your progress will not be saved.
                </Text>
                <TouchableOpacity 
                  style={modalStyles.continueBtn} 
                  onPress={() => setShowBackConfirmModal(false)}
                >
                  <Text style={modalStyles.continueBtnText}>Continue Session</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={modalStyles.endNowBtn} 
                  onPress={async () => {
                    setShowBackConfirmModal(false);
                    await stopPlayback();
                    navigation.goBack();
                  }}
                >
                  <Text style={modalStyles.endNowBtnText}>End Session</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FCF8' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  iconBtn: { padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#4CAF50', flex: 1, textAlign: 'center' },
  sessionTypeBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8F5E9', paddingVertical: 8, paddingHorizontal: 12, marginHorizontal: 16, marginTop: 8, borderRadius: 8 },
  sessionTypeText: { fontSize: 14, color: '#4CAF50', fontWeight: 'bold', marginLeft: 8, marginRight: 8 },
  timerAdjustText: { fontSize: 12, color: '#81C784', fontStyle: 'italic' },
  container: { flex: 1, alignItems: 'center', paddingHorizontal: 16, paddingTop: 20 },
  timerBox: { backgroundColor: '#F1F8E9', borderRadius: 16, padding: 32, marginVertical: 16, minWidth: 220, alignItems: 'center' },
  timerText: { fontSize: 48, fontWeight: 'bold', color: '#222', letterSpacing: 2 },
  subjectText: { fontSize: 14, color: '#4CAF50', marginTop: 8, fontWeight: 'bold' },
  controlsRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 18 },
  pauseBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 28, marginRight: 12, borderWidth: 1, borderColor: '#E0E0E0' },
  pauseBtnText: { marginLeft: 6, fontSize: 14, color: '#222', fontWeight: 'bold' },
  endBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 28, borderWidth: 1, borderColor: '#E0E0E0' },
  endBtnText: { marginLeft: 6, fontSize: 14, color: '#222', fontWeight: 'bold' },
  taskCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginTop: 16, width: '100%', borderWidth: 1, borderColor: '#E8F5E9' },
  taskCardLabel: { fontSize: 12, color: '#81C784', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 8 },
  taskTitle: { fontSize: 16, fontWeight: 'bold', color: '#1B5E20', marginBottom: 4 },
  taskDescription: { fontSize: 14, color: '#666', marginBottom: 8 },
  taskMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginRight: 8 },
  priorityText: { fontSize: 12, fontWeight: 'bold', color: '#fff' },
  timeRemaining: { fontSize: 12, color: '#666' },
  
  // Music section styles
  musicSection: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E8F5E9',
  },
  musicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  currentMusicDisplay: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  nowPlaying: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nowPlayingText: {
    flex: 1,
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    marginLeft: 8,
  },
  playlistInfo: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  stopButton: {
    padding: 4,
  },
  musicStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  musicStatusText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  playButton: {
    flexDirection: 'row',
 alignItems: 'center',
 paddingVertical: 4,
 paddingHorizontal: 8,
 borderRadius: 6,
 backgroundColor: '#E8F5E9',
  },
  playButtonText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
    marginLeft: 4,
  },
  
  subTaskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginHorizontal: 8,
  },
  subTaskText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '600',
    marginLeft: 4,
  },
  selectionReason: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E8F5E9',
  },
  selectionReasonText: {
    fontSize: 12,
    color: '#4CAF50',
    fontStyle: 'italic',
    marginLeft: 4,
  },
  generalStudyHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 8,
    backgroundColor: '#FFF3E0',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  generalStudyHintText: {
    fontSize: 12,
    color: '#F57C00',
    marginLeft: 6,
    flex: 1,
  },
  
  // Missing styles for music controls
  trackInfo: {
    flex: 1,
    marginLeft: 8,
  },
  volumeText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  autoPlayStatus: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  
  // Missing styles for task due dates
  dueDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginHorizontal: 8,
  },
  dueDateText: {
    fontSize: 12,
    color: '#F57C00',
    fontWeight: '600',
    marginLeft: 4,
  },
  
  // Missing styles for subtasks
  subtasksList: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8F5E9',
  },
  subtasksTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 8,
  },
  subtaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  subtaskText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  subtaskCompleted: {
    textDecorationLine: 'line-through',
    color: '#888',
  },
  moreSubtasks: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
    marginLeft: 24,
  },
});

// Modal styles - separate StyleSheet for modals
const modalStyles = StyleSheet.create({
  overlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    justifyContent: 'center', 
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modal: { 
    backgroundColor: '#ffffff',
    borderRadius: 16, 
    padding: 24, 
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  modalBox: { 
    backgroundColor: '#ffffff',
    borderRadius: 16, 
    padding: 24, 
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: '#1B5E20',
    textAlign: 'center',
    flex: 1,
  },
  modalDesc: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  closeBtn: { 
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  
  // Session Complete Modal styles
  ratingSection: { 
    width: '100%', 
    marginBottom: 24,
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
  },
  ratingLabel: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#1B5E20', 
    marginBottom: 12,
    textAlign: 'center',
  },
  ratingRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  ratingButton: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    borderWidth: 2, 
    borderColor: '#E0E0E0', 
    backgroundColor: '#fff', 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  ratingButtonSelected: { 
    borderColor: '#4CAF50', 
    backgroundColor: '#4CAF50',
    transform: [{ scale: 1.1 }],
  },
  ratingButtonText: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#888' 
  },
  ratingButtonTextSelected: { 
    color: '#fff' 
  },
  notesSection: { 
    width: '100%', 
    marginBottom: 24 
  },
  notesInput: { 
    borderWidth: 1, 
    borderColor: '#E0E0E0', 
    borderRadius: 12, 
    padding: 16, 
    fontSize: 16, 
    textAlignVertical: 'top', 
    minHeight: 100,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  actionButtonsContainer: { 
    width: '100%',
    gap: 12,
  },
  submitBtn: { 
    backgroundColor: '#4CAF50', 
    borderRadius: 12, 
    paddingVertical: 16, 
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  submitBtnText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 16 
  },
  skipBtn: { 
    backgroundColor: 'transparent', 
    paddingVertical: 12, 
    alignItems: 'center' 
  },
  skipBtnText: { 
    color: '#888', 
    fontSize: 14 
  },
  
  // End session modal styles
  continueBtn: { 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    paddingVertical: 16, 
    paddingHorizontal: 24, 
    borderWidth: 2, 
    borderColor: '#4CAF50', 
    alignItems: 'center',
    marginBottom: 12,
  },
  continueBtnText: { 
    color: '#4CAF50', 
    fontWeight: 'bold', 
    fontSize: 16 
  },
  endNowBtn: { 
    backgroundColor: '#E57373', 
    borderRadius: 12, 
    paddingVertical: 16, 
    paddingHorizontal: 24, 
    alignItems: 'center',
    shadowColor: '#E57373',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  endNowBtnText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 16 
  },

  // Mode selection styles
  modeSelection: { width: '100%', marginBottom: 20 },
  modeOptions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modeCard: { flex: 1, padding: 16, marginHorizontal: 8, borderRadius: 12, alignItems: 'center', borderWidth: 2 },
  autoModeCard: { backgroundColor: '#F1F8E9', borderColor: '#4CAF50' },
  manualModeCard: { backgroundColor: '#E3F2FD', borderColor: '#2196F3' },
  modeTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 12, marginBottom: 8 },
  modeDesc: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 12 },
  
  // Manual setup styles
  manualSetup: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginTop: 16,
  },
  setupSection: {
    width: '100%',
    marginBottom: 24,
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
    lineHeight: 20,
  },
  taskList: {
    maxHeight: 200,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 8,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  taskItemSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  taskHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  taskDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  timeRemaining: {
    fontSize: 12,
    color: '#666',
  },
  selectedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginRight: 4,
  },
  noTasksText: {
    textAlign: 'center',
    color: '#888',
    fontSize: 14,
    padding: 16,
  },
  noTasksContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    marginVertical: 16,
  },
  noTasksSubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  createTaskBtn: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  createTaskBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  startBtnDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  
  remainingTasks: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#F3E5F5',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E1BEE7',
  },
  remainingTasksLabel: {
    fontSize: 12,
    color: '#7B1FA2',
    fontWeight: '600',
  },
  
  // Subject selection styles
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  
  subjectScrollList: {
    maxHeight: 150,
    marginBottom: 16,
  },
  
  subjectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  
  subjectItemSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  
  subjectItemText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  
  subjectItemTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  
  setupActions: {
    marginTop: 20,
    gap: 12,
  },
  
  startBtn: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  
  startBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  
  backBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  
  backBtnText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 14,
  },
  
  // Music settings styles
  musicSection: {
    width: '100%',
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#fff',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  musicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  musicControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  musicControlBtn: {
    padding: 8,
    borderRadius: 50,
    marginLeft: 8,
    marginRight: 8,
    backgroundColor: '#F1F8E9',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  currentMusicDisplay: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginTop: 12,
  },
  trackInfo: {
    flex: 1,
    marginLeft: 8,
  },
  volumeControl: {
    marginTop: 12,
    alignItems: 'center',
  },
  volumeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  volumeSliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  volumeSlider: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0E0E0',
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  volumeTrack: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  volumeFill: {
    height: '100%',
    backgroundColor: '#81C784',
  },
  
  // Custom timer modal styles
  customSection: {
    width: '100%',
    marginTop: 16,
  },
  customInput: {
    borderWidth: 1, 
    borderColor: '#E0E0E0', 
    borderRadius: 12, 
    padding: 16, 
    fontSize: 16, 
    textAlign: 'center',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  setCustomBtn: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  setCustomBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  cancelBtnText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 14,
  },
  
  // Common modal styles
  modalTitle: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: '#1B5E20',
    textAlign: 'center',
    flex: 1,
  },
  modalDesc: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  closeBtn: { 
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
});