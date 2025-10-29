import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { useBackgroundMusic } from '../../hooks/useBackgroundMusic';
import { useTheme } from '../../context/ThemeContext';
const { useUserAppData } = require('../../utils/userAppData');

// Break duration based on focus method
const getBreakDuration = (focusMethod?: string, sessionDuration?: number) => {
  // Base break duration on session length and focus method
  const sessionMinutes = sessionDuration || 45;
  
  switch (focusMethod) {
    case 'deepwork':
    case 'Deep Work':
      return Math.max(15, Math.floor(sessionMinutes * 0.2)); // 20% of session, min 15 min
    case 'sprint':
    case 'Sprint Focus':
      return 5; // Standard Pomodoro break
    case 'extended':
    case 'Extended Focus':
      return Math.max(10, Math.floor(sessionMinutes * 0.15)); // 15% of session, min 10 min
    case 'balanced':
    case 'Balanced':
    case 'Balanced Focus':
    default:
      return Math.max(10, Math.floor(sessionMinutes * 0.2)); // 20% of session, min 10 min
  }
};

const getBreakTypeText = (focusMethod?: string) => {
  switch (focusMethod) {
    case 'deepwork':
    case 'Deep Work':
      return 'Deep Work Break';
    case 'sprint':
    case 'Sprint Focus':
      return 'Sprint Break';
    case 'extended':
    case 'Extended Focus':
      return 'Extended Break';
    case 'balanced':
    case 'Balanced':
    case 'Balanced Focus':
    default:
      return 'Balanced Break';
  }
};

export const BreakTimerScreen = () => {
  const { data: userData } = useUserAppData();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const { theme } = useTheme();

  const params = route.params as {
    sessionData?: {
      duration: number;
      task: string;
      focusRating: number;
      productivityRating: number;
      notes?: string;
      completedFullSession: boolean;
      sessionType: 'auto' | 'manual';
      subject: string;
      plannedDuration: number;
    };
    focusMode?: 'basecamp' | 'summit';
    tasks?: any[];
    nextTaskIndex?: number;
    completedTasksData?: any[];
    duration?: number;
    autoProgress?: boolean;
  } | undefined;

  const sessionData = params?.sessionData;

  // Calculate break duration based on completed session
  const breakDurationMinutes = getBreakDuration(
    userData?.onboarding?.focus_method,
    sessionData?.duration || sessionData?.plannedDuration
  );

  // Timer refs for background functionality
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const appStateRef = useRef(AppState.currentState);

  const [timer, setTimer] = useState(breakDurationMinutes * 60); // Convert to seconds
  const [isPaused, setIsPaused] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showConfirmEndModal, setShowConfirmEndModal] = useState(false);
  const [showNextSessionWarning, setShowNextSessionWarning] = useState(false);
  const [warningCountdown, setWarningCountdown] = useState(3);

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
    if (!isPaused && timer > 0) {
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
  }, [isPaused, timer]);

  // Auto-complete break when timer reaches 0
  useEffect(() => {
    if (timer === 0) {
      handleBreakComplete();
    }
  }, [timer]);

  // Countdown timer for warning modal
  useEffect(() => {
    if (showNextSessionWarning && warningCountdown > 0) {
      const countdownTimer = setTimeout(() => {
        setWarningCountdown(prev => prev - 1);
      }, 1000);

      return () => clearTimeout(countdownTimer);
    } else if (showNextSessionWarning && warningCountdown === 0) {
      // Auto-proceed to next session when countdown reaches 0
      handleProceedToNextSession();
    }
  }, [showNextSessionWarning, warningCountdown]);

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60).toString().padStart(2, '0');
    const sec = (seconds % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
  };

  const handleProceedToNextSession = () => {
    if (!params?.tasks || params?.nextTaskIndex === undefined) return;

    const nextTask = params.tasks[params.nextTaskIndex];
    console.log('🎯 Proceeding to next session:', nextTask);

    const navigationParams = {
      focusMode: 'summit' as const,
      tasks: params.tasks,
      currentTaskIndex: params.nextTaskIndex,
      completedTasksData: params.completedTasksData,
      task: nextTask,
      selectedTask: nextTask,
      duration: params.duration,
      autoProgress: params.autoProgress,
      autoStart: true,
      manualSelection: false
    };

    setShowNextSessionWarning(false);
    navigation.navigate('StudySessionScreen', navigationParams);
  };

  const handleStopSummitMode = () => {
    console.log('🎯 User stopped summit mode, showing session report');
    const allTasksData = params?.completedTasksData || [];

    setShowNextSessionWarning(false);
    navigation.navigate('SessionReportScreen', {
      focusMode: 'summit',
      completedTasksData: allTasksData,
      sessionDuration: allTasksData.reduce((sum, task) => sum + task.duration, 0),
      breakDuration: breakDurationMinutes * allTasksData.length,
      taskCompleted: true,
      focusRating: allTasksData.length > 0
        ? Math.round(allTasksData.reduce((sum, task) => sum + task.focusRating, 0) / allTasksData.length)
        : 0,
      productivity: allTasksData.length > 0
        ? Math.round(allTasksData.reduce((sum, task) => sum + task.productivityRating, 0) / allTasksData.length)
        : 0,
      notes: allTasksData.map(task => `${task.task}: ${task.notes}`).filter(n => n).join('\n'),
      sessionType: allTasksData[0]?.sessionType || 'auto',
      subject: 'Multiple Subjects',
      plannedDuration: allTasksData.reduce((sum, task) => sum + task.plannedDuration, 0)
    });
  };

  const handleBreakComplete = () => {
    console.log('🎯 BreakTimerScreen: handleBreakComplete called');
    console.log('🎯 Focus Mode:', params?.focusMode);
    console.log('🎯 Tasks:', params?.tasks?.length || 0);
    console.log('🎯 Next Task Index:', params?.nextTaskIndex);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Summit mode: check if there are more tasks
    if (params?.focusMode === 'summit' && params?.tasks && params.nextTaskIndex !== undefined) {
      const hasMoreTasks = params.nextTaskIndex < params.tasks.length;
      console.log('🎯 Summit Mode: Has more tasks?', hasMoreTasks);

      if (hasMoreTasks) {
        // Show warning modal before starting next session
        console.log('🎯 Summit Mode: Showing next session warning');
        setShowNextSessionWarning(true);
        setWarningCountdown(3);
      } else {
        // All tasks complete - go to final session report
        console.log('🎯 Summit Mode: All tasks complete, showing final report');
        const allTasksData = params.completedTasksData || [];
        navigation.navigate('SessionReportScreen', {
          focusMode: 'summit',
          completedTasksData: allTasksData,
          sessionDuration: allTasksData.reduce((sum, task) => sum + task.duration, 0),
          breakDuration: breakDurationMinutes * allTasksData.length,
          taskCompleted: true,
          focusRating: Math.round(allTasksData.reduce((sum, task) => sum + task.focusRating, 0) / allTasksData.length),
          productivity: Math.round(allTasksData.reduce((sum, task) => sum + task.productivityRating, 0) / allTasksData.length),
          notes: allTasksData.map(task => `${task.task}: ${task.notes}`).filter(n => n).join('\n'),
          sessionType: sessionData?.sessionType || 'auto',
          subject: 'Multiple Subjects',
          plannedDuration: allTasksData.reduce((sum, task) => sum + task.plannedDuration, 0)
        });
      }
    } else {
      // Basecamp mode or single task - normal flow
      navigation.navigate('SessionReportScreen', {
        sessionDuration: sessionData?.duration || 0,
        breakDuration: breakDurationMinutes,
        taskCompleted: sessionData?.completedFullSession || false,
        focusRating: sessionData?.focusRating || 0,
        notes: sessionData?.notes || '',
        sessionType: sessionData?.sessionType || 'auto',
        subject: sessionData?.subject || 'General Study',
        plannedDuration: sessionData?.plannedDuration || 0,
        productivity: sessionData?.productivityRating || 0
      });
    }
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

  const handleEndBreak = () => {
    setIsPaused(true);
    setShowEndModal(true);
  };

  const handleCancelEndBreak = () => {
    setShowEndModal(false);
    setShowConfirmEndModal(false);
    setIsPaused(false);
  };

  const handleConfirmEndBreak = () => {
    setShowEndModal(false);
    setShowConfirmEndModal(false);
    handleBreakComplete();
  };

  const handleFirstEndConfirm = () => {
    setShowEndModal(false);
    setShowConfirmEndModal(true);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Ionicons
        key={i}
        name={i < rating ? 'star' : 'star-outline'}
        size={16}
        color={i < rating ? '#FFD700' : '#DDD'}
      />
    ));
  };

  // Add music hook
  const {
    stopPlayback,
    audioSupported,
  } = useBackgroundMusic();

  // Stop music immediately on mount - CRITICAL for break screen
  useEffect(() => {
    let isMounted = true;

    const stopMusicImmediately = async () => {
      try {
        console.log('🎵 BreakTimerScreen: Stopping music on entry...');
        await stopPlayback();
        if (isMounted) {
          console.log('🎵 BreakTimerScreen: Music stopped successfully');
        }
      } catch (error) {
        if (isMounted) {
          console.error('🎵 BreakTimerScreen: Failed to stop music on break entry:', error);
        }
      }
    };

    stopMusicImmediately();

    return () => {
      isMounted = false;
    };
  }, [stopPlayback]);

  const renderMusicStatus = () => {
    if (!audioSupported) return null;

    return (
      <View style={[styles.musicStatusCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <MaterialIcons name="music-off" size={24} color={theme.primary} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.musicStatusText, { color: theme.text }]}>Focus music is paused during breaks</Text>
          <Text style={[styles.musicSubText, { color: theme.textSecondary }]}>Music will resume when your next focus session starts.</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={["top", "left", "right"]}>
      {/* Top Navigation Bar - Same style as HomeScreen */}
      <View style={[styles.topNavBar, { backgroundColor: theme.background }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Main', { screen: 'Home' })}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.topNavTitleRow}>
          <Text style={[styles.topNavTitle, { color: theme.text }]}>
            Break Timer: {getBreakTypeText(userData?.onboarding?.focus_method)}
          </Text>
        </View>
        <View style={styles.iconBtn} />
      </View>

      {/* Main Content */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Session Summary Card */}
        {sessionData && (
          <View style={[styles.sessionSummaryCard, { backgroundColor: theme.card, borderLeftColor: theme.primary, borderColor: theme.primary + '33' }]}>
            <Text style={[styles.sessionSummaryTitle, { color: theme.text }]}>Session Complete!</Text>

            <View style={styles.summaryRow}>
              <MaterialIcons name="schedule" size={20} color={theme.primary} />
              <Text style={[styles.summaryText, { color: theme.text }]}>
                Duration: {sessionData.duration} min {sessionData.completedFullSession ? '(Full session)' : '(Ended early)'}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <MaterialIcons name="task-alt" size={20} color={theme.primary} />
              <Text style={[styles.summaryText, { color: theme.text }]}>Task: {sessionData.task}</Text>
            </View>

            <View style={styles.summaryRow}>
              <MaterialIcons name="subject" size={20} color={theme.primary} />
              <Text style={[styles.summaryText, { color: theme.text }]}>Subject: {sessionData.subject}</Text>
            </View>

            <View style={styles.summaryRow}>
              <MaterialIcons name="psychology" size={20} color={theme.primary} />
              <Text style={[styles.summaryText, { color: theme.text }]}>Focus: </Text>
              <View style={styles.starsRow}>
                {renderStars(sessionData.focusRating)}
              </View>
            </View>

            <View style={styles.summaryRow}>
              <MaterialIcons name="trending-up" size={20} color={theme.primary} />
              <Text style={[styles.summaryText, { color: theme.text }]}>Productivity: </Text>
              <View style={styles.starsRow}>
                {renderStars(sessionData.productivityRating)}
              </View>
            </View>

            {sessionData.notes && (
              <View style={[styles.notesSection, { backgroundColor: theme.card + '80' }]}>
                <Text style={[styles.notesLabel, { color: theme.text }]}>Notes:</Text>
                <Text style={[styles.notesText, { color: theme.text + '99' }]}>"{sessionData.notes}"</Text>
              </View>
            )}
          </View>
        )}

        {/* Break Timer Card - Same style as HomeScreen timer */}
        <View style={[styles.timerCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <MaterialIcons name="free-breakfast" size={32} color={theme.primary} />
          <Text style={[styles.timerCardTitle, { color: theme.text }]}>Take a Well-Deserved Break</Text>

          {/* Timer Display - Fixed width to prevent layout shifts */}
          <View style={[styles.timerBox, { backgroundColor: theme.background }]}>
            <Text style={[styles.timerText, { color: theme.text }]}>{formatTime(timer)}</Text>
          </View>

          {/* Break Tips */}
          <View style={styles.tipsSection}>
            <Text style={[styles.tipsTitle, { color: theme.text }]}>Break Suggestions:</Text>
            <Text style={[styles.tipText, { color: theme.textSecondary }]}>• Stretch your body and neck</Text>
            <Text style={[styles.tipText, { color: theme.textSecondary }]}>• Hydrate with water</Text>
            <Text style={[styles.tipText, { color: theme.textSecondary }]}>• Rest your eyes from screens</Text>
            <Text style={[styles.tipText, { color: theme.textSecondary, marginTop: 10 }]}>
              Taking full breaks helps maintain your focus for the next session.
            </Text>
          </View>

          {/* Controls */}
          <View style={styles.controlsRow}>
            <TouchableOpacity style={[styles.pauseBtn, { borderColor: theme.border, backgroundColor: 'rgba(255, 255, 255, 0.05)' }]} onPress={handlePause}>
              <Ionicons name={isPaused ? "play" : "pause"} size={22} color={theme.text} />
              <Text style={[styles.pauseBtnText, { color: theme.text }]}>{isPaused ? 'Resume' : 'Pause'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.endBtn, { backgroundColor: theme.primary }]} onPress={handleEndBreak}>
              <MaterialIcons name="timer-off" size={22} color="#fff" />
              <Text style={styles.endBtnText}>End Break</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Add music controls */}
        {renderMusicStatus()}
      </ScrollView>
      
      {/* End Break Modal */}
      <Modal visible={showEndModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.card, borderColor: theme.primary + '33' }]}>
            <MaterialIcons name="warning" size={48} color="#FF9800" />
            <Text style={[styles.modalTitle, { color: theme.text }]}>End Break Early?</Text>
            <Text style={[styles.modalDesc, { color: theme.text + '99' }]}>
              Taking full breaks helps maintain your focus for the next session.
            </Text>
            <TouchableOpacity style={[styles.continueBtn, { borderColor: theme.primary }]} onPress={handleCancelEndBreak}>
              <Text style={[styles.continueBtnText, { color: theme.primary }]}>Continue Break</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.endNowBtn, { backgroundColor: '#FF9800' }]} onPress={handleFirstEndConfirm}>
              <Text style={styles.endNowBtnText}>End Break Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Double Confirmation Modal */}
      <Modal visible={showConfirmEndModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.card, borderColor: theme.primary + '33' }]}>
            <MaterialIcons name="error" size={48} color="#F44336" />
            <Text style={[styles.modalTitle, { color: theme.text }]}>Are You Sure?</Text>
            <Text style={[styles.modalDesc, { color: theme.text + '99' }]}>
              This is your second confirmation. Ending your break early may reduce the effectiveness of your next study session.
            </Text>
            <TouchableOpacity style={[styles.continueBtn, { borderColor: theme.primary }]} onPress={handleCancelEndBreak}>
              <Text style={[styles.continueBtnText, { color: theme.primary }]}>Cancel - Continue Break</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmEndBtn} onPress={handleConfirmEndBreak}>
              <Text style={styles.confirmEndBtnText}>Yes, End Break Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Next Session Warning Modal - Summit Mode Only */}
      <Modal visible={showNextSessionWarning} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.card, borderColor: theme.primary + '33' }]}>
            <View style={[styles.countdownCircle, { borderColor: theme.primary }]}>
              <Text style={[styles.countdownText, { color: theme.primary }]}>{warningCountdown}</Text>
            </View>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Next Focus Session Starting</Text>
            <Text style={[styles.modalDesc, { color: theme.text + '99' }]}>
              {params?.tasks && params?.nextTaskIndex !== undefined && params.tasks[params.nextTaskIndex]
                ? `Get ready to focus on: ${params.tasks[params.nextTaskIndex].title || 'Next Task'}`
                : 'Prepare for your next focus session'}
            </Text>
            <Text style={[styles.modalDesc, { color: theme.text + '66', fontSize: 14, marginTop: 8 }]}>
              Starting automatically in {warningCountdown} second{warningCountdown !== 1 ? 's' : ''}...
            </Text>
            <TouchableOpacity
              style={[styles.endNowBtn, { backgroundColor: '#F44336', marginTop: 20 }]}
              onPress={handleStopSummitMode}
            >
              <MaterialIcons name="stop" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.endNowBtnText}>Stop & View Report</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.continueBtn, { borderColor: theme.primary, marginTop: 12 }]}
              onPress={handleProceedToNextSession}
            >
              <Text style={[styles.continueBtnText, { color: theme.primary }]}>Start Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  topNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 56,
  },
  topNavTitleRow: {
    flex: 1,
    alignItems: 'center',
  },
  topNavTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
  },
  iconBtn: { 
    padding: 8,
    minWidth: 40,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sessionSummaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginVertical: 16,
    borderLeftWidth: 6,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sessionSummaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  notesSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  notesLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  timerCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
  },
  timerCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 20,
    textAlign: 'center',
  },
  timerBox: {
    borderRadius: 16,
    padding: 32,
    marginVertical: 16,
    minWidth: 220,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    letterSpacing: 2,
    minWidth: 150,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  tipsSection: {
    alignItems: 'flex-start',
    marginVertical: 20,
    paddingHorizontal: 20,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    lineHeight: 20,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 20,
  },
  pauseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  pauseBtnText: {
    fontWeight: 'bold',
    color: '#222',
    marginLeft: 8,
    fontSize: 16,
  },
  endBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  endBtnText: {
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
    fontSize: 16,
  },
  backgroundIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
  },
  backgroundText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    width: '85%',
    alignItems: 'center',
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalDesc: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  continueBtn: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderWidth: 2,
    marginBottom: 12,
    width: '100%',
  },
  continueBtnText: {
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  endNowBtn: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 30,
    width: '100%',
  },
  endNowBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  confirmEndBtn: {
    backgroundColor: '#F44336',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 30,
    width: '100%',
  },
  confirmEndBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  musicStatusCard: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 12,
    marginHorizontal: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  musicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  musicTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  musicStatusText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  nowPlayingContainer: {
    alignItems: 'center',
  },
  nowPlayingText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  playlistProgress: {
    fontSize: 12,
    color: '#81C784',
    marginBottom: 12,
  },
  stopMusicButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  stopMusicText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  countdownCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  countdownText: {
    fontSize: 36,
    fontWeight: 'bold',
  },
});

export default BreakTimerScreen;
