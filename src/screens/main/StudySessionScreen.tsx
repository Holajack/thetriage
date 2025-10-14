import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ScrollView, Alert, AppState, BackHandler, ImageBackground, Animated, Image } from 'react-native';
import { ThemedImage, ThemedImageBackground } from '../../components/ThemedImage';
import Svg, { Rect, G, LinearGradient, Stop, Defs, Filter, FeOffset, FeGaussianBlur, FeColorMatrix, FeBlend, Ellipse, Circle, Line, Polygon, Text as SvgText, TSpan, Pattern, Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Gesture } from 'react-native-gesture-handler';
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
import { useTheme } from '../../context/ThemeContext';
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
  const { theme } = useTheme();
  const environmentColors = theme;
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
  
  // Debug logging for music preferences
  useEffect(() => {
    console.log('🎵 Music Settings Debug:', {
      userSoundPreference,
      autoPlaySound,
      userData: {
        onboarding: userData?.onboarding?.sound_preference,
        profile: userData?.profile?.soundpreference,
        settings: userData?.settings?.sound_enabled,
        autoPlay: userData?.onboarding?.auto_play_sound
      }
    });
  }, [userSoundPreference, autoPlaySound, userData]);
  
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
  const musicStartAttemptedRef = useRef<boolean>(false);
  
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
        console.log('🎵 Auto-play check:', { autoPlaySound, userSoundPreference, audioSupported });
        if (autoPlaySound && userSoundPreference && userSoundPreference !== 'Silence') {
          console.log(`🎵 Auto-starting playlist for automatic session: ${userSoundPreference}`);
          try {
            await startPlaylist(userSoundPreference);
            console.log(`🎵 Successfully started ${userSoundPreference} playlist for automatic session`);
          } catch (error) {
            console.error('🎵 Failed to start auto-play music for automatic session:', error);
          }
        } else {
          console.log('🎵 Auto-play conditions not met:', { 
            autoPlaySound, 
            userSoundPreference, 
            isSilence: userSoundPreference === 'Silence' 
          });
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
        console.log('🎵 Auto-play check (general study):', { autoPlaySound, userSoundPreference });
        if (autoPlaySound && userSoundPreference && userSoundPreference !== 'Silence') {
          console.log(`🎵 Auto-starting playlist for general study session: ${userSoundPreference}`);
          try {
            await startPlaylist(userSoundPreference);
            console.log(`🎵 Successfully started ${userSoundPreference} playlist`);
          } catch (error) {
            console.error('🎵 Failed to start auto-play music:', error);
          }
        } else {
          console.log('🎵 Auto-play conditions not met (general study):', { 
            autoPlaySound, 
            userSoundPreference, 
            isSilence: userSoundPreference === 'Silence' 
          });
        }
      }, 500);
    }
  }, [params?.autoStart, userData, sessionStarted, autoPlaySound, userSoundPreference, currentTask]);

  // Separate effect to handle music auto-play when userData loads after session has started
  useEffect(() => {
    // Only trigger if session is started, music conditions are met, and we haven't attempted yet
    if (sessionStarted && 
        autoPlaySound && 
        userSoundPreference && 
        userSoundPreference !== 'Silence' && 
        !isPlaying && 
        !musicStartAttemptedRef.current) {
      
      console.log('🎵 Starting music after userData loaded:', { 
        autoPlaySound, 
        userSoundPreference, 
        isPlaying,
        sessionStarted,
        attemptedBefore: musicStartAttemptedRef.current
      });
      
      musicStartAttemptedRef.current = true;
      
      const startMusicDelayed = async () => {
        try {
          await startPlaylist(userSoundPreference);
          console.log(`🎵 Successfully started ${userSoundPreference} playlist after userData load`);
        } catch (error) {
          console.error('🎵 Failed to start music after userData load:', error);
          // Reset the flag on error so user can try again
          musicStartAttemptedRef.current = false;
        }
      };
      
      // Small delay to ensure session is fully initialized
      setTimeout(startMusicDelayed, 1000);
    }
  }, [sessionStarted, autoPlaySound, userSoundPreference, isPlaying, startPlaylist]);

  // Auto-play music when entering the screen (before session starts)
  useEffect(() => {
    // Start music immediately when entering screen if user has music preference
    if (userData && 
        userSoundPreference && 
        userSoundPreference !== 'Silence' && 
        !isPlaying && 
        !musicStartAttemptedRef.current) {
      
      console.log('🎵 Starting music on screen entry:', { 
        userSoundPreference, 
        isPlaying 
      });
      
      musicStartAttemptedRef.current = true;
      
      const startMusicOnEntry = async () => {
        try {
          await startPlaylist(userSoundPreference);
          console.log(`🎵 Successfully started ${userSoundPreference} playlist on screen entry`);
        } catch (error) {
          console.error('🎵 Failed to start music on screen entry:', error);
          // Reset the flag on error so user can try again
          musicStartAttemptedRef.current = false;
        }
      };
      
      // Small delay to ensure everything is loaded
      setTimeout(startMusicOnEntry, 500);
    }
  }, [userData, userSoundPreference, isPlaying, startPlaylist]);

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
      console.log('🎵 Auto-play check (manual mode):', { autoPlaySound, userSoundPreference });
      if (autoPlaySound && userSoundPreference && userSoundPreference !== 'Silence') {
        console.log(`🎵 Auto-starting playlist for manual session: ${userSoundPreference}`);
        try {
          await startPlaylist(userSoundPreference);
          console.log(`🎵 Successfully started ${userSoundPreference} playlist for manual session`);
        } catch (error) {
          console.error('🎵 Failed to start auto-play music for manual session:', error);
        }
      } else {
        console.log('🎵 Auto-play conditions not met (manual mode):', { 
          autoPlaySound, 
          userSoundPreference, 
          isSilence: userSoundPreference === 'Silence' 
        });
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

  // const handlePause = () => {
  //   setIsPaused(prev => {
  //     const newPaused = !prev;
  //     if (newPaused) {
  //       updateTimerFromBackground();
  //     } else {
  //       startTimeRef.current = Date.now();
  //     }
  //     return newPaused;
  //   });
  // };

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

  // Music controls are now integrated into the new UI design

  const [showMusicControls, setShowMusicControls] = useState(false);
  const [showTaskInfo, setShowTaskInfo] = useState(false);
  const [longPressTimeout, setLongPressTimeout] = useState<NodeJS.Timeout | null>(null);
  const [musicEnabled, setMusicEnabled] = useState(true);
  
  // Music control functions
  const handlePlayPause = () => {
    if (!audioSupported) {
      return;
    }
    // If we already have a playlist, toggle pause/resume.
    if (currentPlaylist && currentPlaylist.length > 0) {
      pausePlayback();
    } else {
      // Otherwise start a playlist based on user preference, fallback to ambient.
      const category = (userSoundPreference as any) || 'ambient';
      startPlaylist(category);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  
  const handleNextTrack = () => {
    nextTrack();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  
  const handlePreviousTrack = () => {
    previousTrack();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  
  // Bottom sheet animation refs
  const bottomSheetTranslateY = useRef(new Animated.Value(400)).current;
  const bottomSheetOpacity = useRef(new Animated.Value(0)).current;
  
  // Bottom sheet animation functions
  const openMusicModal = () => {
    console.log('🎵 Opening music modal...');
    console.log('🔄 Starting animation...');
    console.log('📏 Initial translateY:', bottomSheetTranslateY);
    setShowMusicControls(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.parallel([
      Animated.timing(bottomSheetOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.spring(bottomSheetTranslateY, {
        toValue: 0,
        damping: 20,
        stiffness: 90,
        useNativeDriver: false,
      }),
    ]).start(() => {
      console.log('🎵 Music modal animation complete');
      console.log('✅ Animation finished successfully');
    });
  };
  
  const closeMusicModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.parallel([
      Animated.timing(bottomSheetOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }),
      Animated.timing(bottomSheetTranslateY, {
        toValue: 400,
        duration: 250,
        useNativeDriver: false,
      }),
    ]).start(() => {
      setShowMusicControls(false);
    });
  };
  
  // Pan gesture for swipe-to-dismiss
  const panGesture = Gesture.Pan()
    .onChange((event) => {
      if (event.translationY > 0) {
        bottomSheetTranslateY.setValue(event.translationY);
      }
    })
    .onEnd((event) => {
      if (event.translationY > 100 || event.velocityY > 500) {
        closeMusicModal();
      } else {
        Animated.spring(bottomSheetTranslateY, {
          toValue: 0,
          damping: 20,
          stiffness: 90,
          useNativeDriver: false,
        }).start();
      }
    });

  const handleLongPressStart = () => {
    // Start one long continuous haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    // Set timeout for modal
    const timeout = setTimeout(() => {
      // Final strong haptic for modal
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setShowEndModal(true);
    }, 800); // 800ms long press
    setLongPressTimeout(timeout);
  };

  const handleLongPressEnd = () => {
    if (longPressTimeout) {
      clearTimeout(longPressTimeout);
      setLongPressTimeout(null);
    }
  };

  // const getCurrentModeText = () => {
  //   if (selectionMode === 'manual') {
  //     return 'Manual Mode - Choose task order';
  //   }
  //   return 'Automatic Mode - Tasks organized by priority';
  // };

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

      {/* New Focus Screen Layout - Full Screen Background */}
      {(sessionStarted || params?.autoStart) && (
        <>
          <ThemedImageBackground 
            source={require('../../../assets/nora-walking-cute.png')} 
            style={styles.fullScreenBackgroundFixed}
            resizeMode="cover"
            applyFilter={true}
          />
          <View style={styles.newContainer}>

          {/* Top Controls Bar - Matches IMG_0022.PNG */}
          <View style={styles.topControlsBar}>
            {/* Music Button (Top Left) */}
            <TouchableOpacity 
              style={[styles.musicButton, { backgroundColor: environmentColors.primary }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                openMusicModal();
              }}
            >
              <Ionicons name="musical-notes" size={24} color={environmentColors.card} />
            </TouchableOpacity>

            {/* Small Discrete Timer (Top Center) - Matches IMG_0022.PNG */}
            <View style={styles.discreteTimerContainer}>
              <Text style={styles.discreteTimerText}>{formatTime(timer)}</Text>
            </View>

            {/* Long-press End Session Button (Top Right) */}
            <TouchableOpacity
              style={[styles.endSessionButton, { backgroundColor: environmentColors.primary }]}
              onPressIn={handleLongPressStart}
              onPressOut={handleLongPressEnd}
              onPress={() => {}} // Empty onPress to prevent accidental taps
            >
              <Ionicons name="checkmark" size={24} color={environmentColors.card} />
            </TouchableOpacity>
          </View>

          {/* Task Info Icon (Left Side, Further Down) */}
          <TouchableOpacity 
            style={[styles.taskInfoIcon, { backgroundColor: environmentColors.primary }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowTaskInfo(true);
            }}
          >
            <Ionicons name="information-circle-outline" size={28} color={environmentColors.card} />
          </TouchableOpacity>

          {/* Mode Notification for Full Screen */}
          <View style={styles.modeNotificationFullScreen}>
            <Text style={styles.modeNotificationFullScreenText}>
              {selectionMode === 'manual' ? 'Manual Mode' : 'Auto Mode'}
            </Text>
          </View>

          {/* Music Bottom Sheet Modal - Matches IMG_0025.PNG */}
          <Modal 
            visible={showMusicControls} 
            transparent 
            animationType="none"
            onRequestClose={closeMusicModal}
          >
            <Animated.View 
              style={[
                {
                  flex: 1,
                  backgroundColor: 'rgba(0, 0, 0, 0.4)',
                  justifyContent: 'flex-end',
                },
                { opacity: bottomSheetOpacity }
              ]}
            >
              <TouchableOpacity 
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                }}
                activeOpacity={1}
                onPress={closeMusicModal}
              />
              <Animated.View
                style={[
                  modalStyles.musicBottomSheet,
                  { 
                    backgroundColor: environmentColors.card,
                    height: '58%',
                    width: '100%',
                    position: 'absolute',
                    bottom: 0,
                    transform: [{ translateY: bottomSheetTranslateY }]
                  }
                ]}
              >
                <View style={{ flex: 1 }}>
                      {/* Handle Bar */}
                      <View style={[modalStyles.modalHandle, { backgroundColor: environmentColors.textSecondary }]} />
                      
                      {/* Focus Music Header - Condensed */}
                      <View style={[modalStyles.focusMusicHeader, { marginBottom: 8 }]}>
                        <Text style={[modalStyles.focusMusicTitle, { color: environmentColors.text, fontSize: 18 }]}>Focus Music</Text>
                        <TouchableOpacity 
                          style={[modalStyles.focusToggle, { backgroundColor: musicEnabled ? '#007AFF' : 'rgba(120, 120, 128, 0.16)' }]}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setMusicEnabled(!musicEnabled);
                          }}
                        >
                          <View style={[modalStyles.toggleKnob, { 
                            backgroundColor: '#FFFFFF',
                            alignSelf: musicEnabled ? 'flex-end' : 'flex-start'
                          }]} />
                        </TouchableOpacity>
                      </View>

                      {/* Interactive Walkman UI - Condensed */}
                      <View style={[modalStyles.musicPlayerSection, { backgroundColor: 'transparent', padding: 0, marginBottom: 8, width: '100%', height: 220 }]}>
                        <Svg width="100%" height="100%" viewBox="0 0 1280 680" preserveAspectRatio="xMidYMin meet" style={{ backgroundColor: 'transparent' }}>
                          <Defs>
                            <LinearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
                              <Stop offset="0%" stopColor="#efe7d8"/>
                              <Stop offset="100%" stopColor="#e7dcc6"/>
                            </LinearGradient>
                            <LinearGradient id="bevel" x1="0" y1="0" x2="1" y2="1">
                              <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.7"/>
                              <Stop offset="100%" stopColor="#c7b99f" stopOpacity="0.4"/>
                            </LinearGradient>
                            <LinearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
                              <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.35"/>
                              <Stop offset="100%" stopColor="#cfd6df" stopOpacity="0.15"/>
                            </LinearGradient>
                            <Pattern id="microStripes" width="6" height="6" patternUnits="userSpaceOnUse">
                              <Rect width="6" height="6" fill="none"/>
                              <Rect width="6" height="1" y="0" fill="#e9dfcc" opacity="0.6"/>
                              <Rect width="6" height="1" y="3" fill="#e9dfcc" opacity="0.4"/>
                            </Pattern>
                          </Defs>

                          <G id="device">
                            {/* Base body */}
                            <Rect x="30" y="30" width="1220" height="700" rx="56" ry="56" fill="url(#bodyGrad)" stroke="#d1c2a7" strokeWidth="5"/>
                            <Rect x="30" y="30" width="1220" height="700" rx="56" ry="56" fill="url(#microStripes)" opacity="0.35"/>

                            {/* Right-side volume wheel */}
                            <G transform="translate(1230,380)">
                              <Ellipse rx="18" ry="90" fill="#b49f82" stroke="#8f7d63" strokeWidth="3"/>
                              <G fill="#8f7d63" opacity="0.6">
                                <Rect x="-20" y="-80" width="4" height="12"/>
                                <Rect x="-20" y="-60" width="4" height="12"/>
                                <Rect x="-20" y="-40" width="4" height="12"/>
                                <Rect x="-20" y="-20" width="4" height="12"/>
                                <Rect x="-20" y="0" width="4" height="12"/>
                                <Rect x="-20" y="20" width="4" height="12"/>
                                <Rect x="-20" y="40" width="4" height="12"/>
                                <Rect x="-20" y="60" width="4" height="12"/>
                              </G>
                            </G>

                            {/* Top details: jack & HOLD slider */}
                            <G transform="translate(180,30)">
                              <Circle cx="0" cy="0" r="16" fill="#7c8b98" stroke="#5a6a76" strokeWidth="3"/>
                              <Circle cx="0" cy="0" r="7" fill="#1a1f24"/>
                              <SvgText x="-38" y="-12" fontSize="18" fill="#6a6460" fontFamily="ui-monospace, Menlo, Consolas, monospace">PHONES</SvgText>
                              
                              <G transform="translate(200,-8)">
                                <Rect x="0" y="0" width="180" height="30" rx="10" ry="10" fill="#d7dfe6" stroke="#aeb9c3" strokeWidth="3"/>
                                <Rect x="14" y="5" width="42" height="20" rx="8" fill="#9fb6c8" stroke="#7c92a3" strokeWidth="2"/>
                                <SvgText x="64" y="21" fontSize="18" fill="#6a6460" fontFamily="ui-monospace, Menlo, Consolas, monospace">HOLD</SvgText>
                              </G>
                            </G>

                            {/* Branding badge */}
                            <G transform="translate(980,70)">
                              <Rect width="240" height="44" rx="10" fill="#2f3b48"/>
                              <SvgText x="120" y="30" textAnchor="middle" fontSize="16" fontWeight="700" letterSpacing="0.18em" fill="#eae6df">HIKE•WISE</SvgText>
                            </G>

                            {/* Album art window */}
                            <G>
                              <Rect x="100" y="220" width="360" height="340" rx="28" ry="28" fill="#cfd9e3" stroke="#a7b3bf" strokeWidth="6"/>
                              <Rect x="110" y="230" width="340" height="320" rx="22" ry="22" fill="#dde6ec" stroke="#b7c2cc" strokeWidth="5"/>
                              <Path d="M110,230 h340 v50 l-320,0 z" fill="url(#glass)" opacity="0.7"/>
                              
                              {/* Album art placeholder */}
                              <G transform="translate(120,240)" opacity="0.3">
                                <Rect width="320" height="300" rx="18" fill="#4CAF50"/>
                                <Circle cx="160" cy="150" r="60" fill="#FFFFFF" opacity="0.8"/>
                                <SvgText x="160" y="165" textAnchor="middle" fontSize="48" fill="#4CAF50" fontWeight="bold">♪</SvgText>
                              </G>
                            </G>

                            {/* Right information screen */}
                            <G>
                              <Rect x="500" y="150" width="700" height="320" rx="26" ry="26" fill="#edf2f7" stroke="#c0cad4" strokeWidth="5"/>
                              
                              {/* Top grille */}
                              <G transform="translate(530,172)" fill="#cad4de">
                                <Rect width="66" height="16" rx="7"/>
                                <Rect x="86" width="132" height="16" rx="7"/>
                                <Rect x="238" width="200" height="16" rx="7"/>
                              </G>
                              
                              <Line x1="520" y1="214" x2="1180" y2="214" stroke="#9aa9b8" strokeWidth="2" opacity="0.6"/>
                              
                              {/* Dynamic title */}
                              <SvgText x="520" y="274" fontSize="48" fontWeight="800" letterSpacing="1px" fill="#2a3a4a">
                                Hike Wise Focus
                              </SvgText>
                              
                              <Line x1="520" y1="300" x2="1180" y2="300" stroke="#9aa9b8" strokeWidth="2" opacity="0.6"/>
                              
                              {/* Dynamic subtitle */}
                              <SvgText x="520" y="352" fontSize="32" opacity="0.9" fill="#2a3a4a">
                                {currentTrack?.title || 'No track selected'}
                              </SvgText>

                              {/* Power LED */}
                              <Circle cx="1188" cy="164" r="8" fill={isPlaying ? "#36d736" : "#2c3e50"} stroke="#aab6c1" strokeWidth="3"/>
                            </G>

                            {/* Speaker grill */}
                            <G transform="translate(100,580)">
                              <Rect width="260" height="80" rx="14" fill="#d8e0e6" stroke="#b3bec8" strokeWidth="4"/>
                              <G fill="#8fa1af" opacity="0.9">
                                <Circle cx="30" cy="26" r="4"/><Circle cx="62" cy="26" r="4"/><Circle cx="94" cy="26" r="4"/><Circle cx="126" cy="26" r="4"/><Circle cx="158" cy="26" r="4"/><Circle cx="190" cy="26" r="4"/><Circle cx="222" cy="26" r="4"/>
                                <Circle cx="30" cy="50" r="4"/><Circle cx="62" cy="50" r="4"/><Circle cx="94" cy="50" r="4"/><Circle cx="126" cy="50" r="4"/><Circle cx="158" cy="50" r="4"/><Circle cx="190" cy="50" r="4"/><Circle cx="222" cy="50" r="4"/>
                                <Circle cx="30" cy="74" r="4"/><Circle cx="62" cy="74" r="4"/><Circle cx="94" cy="74" r="4"/><Circle cx="126" cy="74" r="4"/><Circle cx="158" cy="74" r="4"/><Circle cx="190" cy="74" r="4"/><Circle cx="222" cy="74" r="4"/>
                              </G>
                            </G>

                            {/* Control buttons - Repositioned for better visibility */}
                            {/* Previous button (icon_prev.svg) */}
                            <G transform="translate(520,490)">
                              <Rect width="140" height="100" rx="20" ry="20" fill="#ffffff" stroke="#465a6b" strokeWidth="4" onPress={handlePreviousTrack}/>
                              {/* Previous track icon - matches icon_prev.svg */}
                              <G transform="translate(22,12)" fill="#465a6b">
                                <Polygon points="52,20 52,76 20,48" />
                                <Rect x="64" y="20" width="8" height="56" rx="2" />
                              </G>
                            </G>

                            {/* Play/Pause button (icon_play.svg / icon_pause.svg) */}
                            <G transform="translate(740,490)">
                              <Rect width="140" height="100" rx="20" ry="20" fill="#ffffff" stroke="#465a6b" strokeWidth="4" onPress={handlePlayPause}/>
                              {/* Play/Pause icon - matches SVG files */}
                              <G transform="translate(22,12)" fill="#465a6b">
                                {isPlaying ? (
                                  <G>
                                    <Rect x="30" y="18" width="14" height="60" rx="3" />
                                    <Rect x="52" y="18" width="14" height="60" rx="3" />
                                  </G>
                                ) : (
                                  <Polygon points="34,18 34,78 76,48" />
                                )}
                              </G>
                            </G>

                            {/* Next button (icon_next.svg) */}
                            <G transform="translate(960,490)">
                              <Rect width="140" height="100" rx="20" ry="20" fill="#ffffff" stroke="#465a6b" strokeWidth="4" onPress={handleNextTrack}/>
                              {/* Next track icon - matches icon_next.svg */}
                              <G transform="translate(22,12)" fill="#465a6b">
                                <Polygon points="44,20 44,76 76,48" />
                                <Rect x="24" y="20" width="8" height="56" rx="2" />
                              </G>
                            </G>
                          </G>
                        </Svg>
                      </View>

                      {/* Compact Music Services - Condensed */}
                      <View style={[modalStyles.musicServicesSection, { marginBottom: 8 }]}>
                        <TouchableOpacity style={[modalStyles.musicServiceOption, { paddingVertical: 8 }]}>
                          <Ionicons name="musical-notes" size={18} color={environmentColors.text} />
                          <Text style={[modalStyles.serviceOptionText, { color: environmentColors.text, fontSize: 12 }]}>Default Music</Text>
                          <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                        </TouchableOpacity>
                        
                        <TouchableOpacity style={[modalStyles.musicServiceOption, { paddingVertical: 8 }]}>
                          <Ionicons name="logo-apple" size={18} color={environmentColors.text} />
                          <Text style={[modalStyles.serviceOptionText, { color: environmentColors.text, fontSize: 12 }]}>Apple Music</Text>
                          <TouchableOpacity style={[modalStyles.connectButton, { backgroundColor: '#007AFF', paddingHorizontal: 8, paddingVertical: 4 }]}>
                            <Text style={[modalStyles.connectButtonText, { color: '#FFFFFF', fontSize: 10 }]}>Connect</Text>
                          </TouchableOpacity>
                        </TouchableOpacity>
                        
                        <TouchableOpacity style={[modalStyles.musicServiceOption, { paddingVertical: 8 }]}>
                          <Text style={{ fontSize: 18, color: '#1DB954' }}>♪</Text>
                          <Text style={[modalStyles.serviceOptionText, { color: environmentColors.text, fontSize: 12 }]}>Spotify</Text>
                          <TouchableOpacity style={[modalStyles.installButton, { backgroundColor: '#1DB954', paddingHorizontal: 8, paddingVertical: 4 }]}>
                            <Text style={[modalStyles.installButtonText, { color: '#FFFFFF', fontSize: 10 }]}>Install</Text>
                          </TouchableOpacity>
                        </TouchableOpacity>
                      </View>

                      {/* Compact Environment Sounds - Condensed */}
                      <View style={[modalStyles.environmentSoundsContainer, { gap: 6 }]}>
                        <TouchableOpacity style={[modalStyles.environmentSoundBtn, { alignItems: 'center', padding: 6 }]}>
                          <Ionicons name="leaf" size={20} color="#4CAF50" />
                          <Text style={[modalStyles.environmentSoundLabel, { color: environmentColors.textSecondary, fontSize: 9 }]}>Forest</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity style={[modalStyles.environmentSoundBtn, { alignItems: 'center', padding: 6 }]}>
                          <Ionicons name="rainy" size={20} color="#2196F3" />
                          <Text style={[modalStyles.environmentSoundLabel, { color: environmentColors.textSecondary, fontSize: 9 }]}>Rain</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity style={[modalStyles.environmentSoundBtn, { alignItems: 'center', padding: 6 }]}>
                          <Ionicons name="radio" size={20} color="#9E9E9E" />
                          <Text style={[modalStyles.environmentSoundLabel, { color: environmentColors.textSecondary, fontSize: 9 }]}>Noise</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity style={[modalStyles.environmentSoundBtn, { alignItems: 'center', padding: 6 }]}>
                          <Ionicons name="flower" size={20} color="#9C27B0" />
                          <Text style={[modalStyles.environmentSoundLabel, { color: environmentColors.textSecondary, fontSize: 9 }]}>Zen</Text>
                        </TouchableOpacity>
                      </View>
                </View>
              </Animated.View>
            </Animated.View>
          </Modal>

          {/* Task Information Overlay */}
          <Modal visible={showTaskInfo} transparent animationType="slide">
            <View style={styles.taskInfoOverlay}>
              <View style={styles.taskInfoContainer}>
                <View style={styles.taskInfoHeader}>
                  <Text style={styles.taskInfoTitle}>Task Details</Text>
                  <TouchableOpacity onPress={() => setShowTaskInfo(false)}>
                    <Ionicons name="close" size={24} color="#333" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.taskInfoContent}>
                  {currentTask ? (
                    <>
                      <Text style={styles.taskInfoTaskTitle}>{currentTask.title}</Text>
                      <Text style={styles.taskInfoDescription}>
                        {currentTask.description || 'No description available'}
                      </Text>
                      
                      <View style={styles.taskInfoMeta}>
                        <View style={[styles.taskInfoPriorityBadge, { backgroundColor: getPriorityColor(currentTask.priority) }]}>
                          <Text style={styles.taskInfoPriorityText}>{currentTask.priority}</Text>
                        </View>
                        
                        {currentTask.due_date && (
                          <Text style={styles.taskInfoDueDate}>
                            Due: {new Date(currentTask.due_date).toLocaleDateString()}
                          </Text>
                        )}
                      </View>

                      {currentTask.subtasks && currentTask.subtasks.length > 0 && (
                        <View style={styles.taskInfoSubtasks}>
                          <Text style={styles.taskInfoSubtasksTitle}>
                            Subtasks ({currentTask.subtasks.length}):
                          </Text>
                          {currentTask.subtasks.map((subtask: any, index: number) => (
                            <View key={index} style={styles.taskInfoSubtaskItem}>
                              <Ionicons 
                                name={subtask.completed ? "checkmark-circle" : "ellipse-outline"} 
                                size={16} 
                                color={subtask.completed ? "#4CAF50" : "#666"} 
                              />
                              <Text style={styles.taskInfoSubtaskText}>
                                {subtask.title || subtask.text}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}

                      <View style={styles.taskInfoSession}>
                        <Text style={styles.taskInfoSessionTitle}>Session Info:</Text>
                        <Text style={styles.taskInfoSessionText}>Subject: {selectedSubject}</Text>
                        <Text style={styles.taskInfoSessionText}>Mode: {selectionMode === 'manual' ? 'Manual' : 'Automatic'}</Text>
                        <Text style={styles.taskInfoSessionText}>Time Remaining: {formatTime(timer)}</Text>
                      </View>
                    </>
                  ) : (
                    <View style={styles.taskInfoEmpty}>
                      <Text style={styles.taskInfoEmptyTitle}>General Study Session</Text>
                      <Text style={styles.taskInfoEmptyText}>
                        No specific task selected. Focus on your general studies.
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            </View>
          </Modal>

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
        </View>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent', zIndex: 1 },
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

  // New Focus Screen Styles (IMG_0022.PNG Layout)
  newContainer: {
    flex: 1,
    position: 'relative',
  },
  absoluteFullScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 0,
  },
  fullScreenBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  fullScreenBackgroundFixed: {
    position: 'absolute',
    top: -100,
    left: 0,
    right: 0,
    bottom: -100,
    width: '100%',
    height: '120%',
    zIndex: -1,
  },
  backgroundImageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  topControlsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 10,
  },
  musicButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  modeNotification: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  modeNotificationText: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '600',
    textAlign: 'center',
  },
  endSessionButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  discreteTimerContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  discreteTimerText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    letterSpacing: 1,
  },
  taskInfoIcon: {
    position: 'absolute',
    left: 30,
    bottom: 120,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  modeNotificationFullScreen: {
    position: 'absolute',
    top: 120,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  modeNotificationFullScreenText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  timerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  timerCircle: {
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    marginBottom: 30,
  },
  newTimerText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#2E7D32',
    letterSpacing: 2,
  },
  newSubjectText: {
    fontSize: 16,
    color: '#4CAF50',
    marginTop: 8,
    fontWeight: '600',
  },
  pauseResumeButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  taskInfoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    alignSelf: 'center',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  taskInfoButtonText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // Music Controls Overlay
  musicControlsOverlay: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(46, 125, 50, 0.95)',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  musicControlsContainer: {
    alignItems: 'center',
  },
  musicControlsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  currentTrackText: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 15,
    textAlign: 'center',
  },
  musicButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    marginBottom: 15,
  },
  musicControlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeMusicButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 15,
  },
  closeMusicButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },

  // Task Info Modal Styles
  taskInfoOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  taskInfoContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  taskInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  taskInfoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  taskInfoContent: {
    padding: 20,
  },
  taskInfoTaskTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 10,
  },
  taskInfoDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
    lineHeight: 22,
  },
  taskInfoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 10,
  },
  taskInfoPriorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  taskInfoPriorityText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  taskInfoDueDate: {
    fontSize: 14,
    color: '#F57C00',
    fontWeight: '600',
  },
  taskInfoSubtasks: {
    marginBottom: 20,
  },
  taskInfoSubtasksTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  taskInfoSubtaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskInfoSubtaskText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 10,
    flex: 1,
  },
  taskInfoSession: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 10,
  },
  taskInfoSessionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  taskInfoSessionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  taskInfoEmpty: {
    alignItems: 'center',
    padding: 40,
  },
  taskInfoEmptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  taskInfoEmptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
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

  // Music Bottom Sheet Modal Styles - Matches IMG_0025.PNG
  musicModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  overlayTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  musicBottomSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 50,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 15,
  },
  modalHandle: {
    width: 50,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 24,
    opacity: 0.7,
  },
  focusMusicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  focusMusicTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  focusToggle: {
    width: 54,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 3,
  },
  toggleKnob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  musicPlayerSection: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  albumSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  albumArt: {
    width: 80,
    height: 80,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  trackSubtitle: {
    fontSize: 15,
    opacity: 0.8,
  },
  playerControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    marginBottom: 16,
  },
  playerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  trackProgressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  trackProgress: {
    height: '100%',
    width: '35%',
    borderRadius: 3,
  },
  musicServicesSection: {
    marginBottom: 24,
  },
  musicServiceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  serviceOptionText: {
    fontSize: 17,
    fontWeight: '500',
    flex: 1,
    marginLeft: 16,
  },
  connectButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  connectButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  installButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  installButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  environmentSoundsTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'left',
  },
  environmentSoundsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  environmentSoundBtn: {
    width: 70,
    height: 70,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 5,
  },
  environmentSoundLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
});