import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
const { useUserAppData } = require('../../utils/userAppData');
import { useBackgroundMusic } from '../../hooks/useBackgroundMusic';

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

  // Get environment colors from user settings (fallback to default)
  const getEnvironmentColors = () => {
    const envTheme = userData?.settings?.environment_theme || 'forest';
    
    switch (envTheme) {
      case 'ocean':
        return {
          primary: '#2196F3',
          secondary: '#E3F2FD',
          accent: '#1976D2',
          background: '#F0F8FF'
        };
      case 'sunset':
        return {
          primary: '#FF5722',
          secondary: '#FFE0B2',
          accent: '#D84315',
          background: '#FFF8E1'
        };
      case 'night':
        return {
          primary: '#9C27B0',
          secondary: '#E1BEE7',
          accent: '#7B1FA2',
          background: '#F3E5F5'
        };
      case 'forest':
      default:
        return {
          primary: '#4CAF50',
          secondary: '#E8F5E9',
          accent: '#388E3C',
          background: '#F1F8E9'
        };
    }
  };

  const colors = getEnvironmentColors();

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

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60).toString().padStart(2, '0');
    const sec = (seconds % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
  };

  const handleBreakComplete = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
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
    currentTrack, 
    currentPlaylist,
    currentTrackIndex,
    isPlaying,
    stopPlayback,
    audioSupported,
    isPreviewMode
  } = useBackgroundMusic();

  const renderMusicStatus = () => {
    if (!audioSupported) return null;

    return (
      <View style={[styles.musicStatusCard, { backgroundColor: colors.secondary }]}>
        <MaterialIcons name={isPlaying ? "music-note" : "music-off"} size={24} color={colors.primary} />
        <Text style={[styles.musicStatusText, { color: colors.primary }]}>
          {isPlaying ? `Now Playing: ${currentTrack?.title}` : 'Music Paused'}
        </Text>
        <TouchableOpacity style={styles.musicControlBtn} onPress={stopPlayback}>
          <Ionicons name="stop" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={["top", "left", "right"]}>
      {/* Top Navigation Bar - Same style as HomeScreen */}
      <View style={[styles.topNavBar, { backgroundColor: colors.background }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Main', { screen: 'Home' })}>
          <Ionicons name="arrow-back" size={24} color="#222" />
        </TouchableOpacity>
        <View style={styles.topNavTitleRow}>
          <Text style={styles.topNavTitle}>
            Break Timer: {getBreakTypeText(userData?.onboarding?.focus_method)}
          </Text>
        </View>
        <View style={styles.iconBtn} />
      </View>

      {/* Main Content */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Session Summary Card */}
        {sessionData && (
          <View style={[styles.sessionSummaryCard, { borderLeftColor: colors.primary }]}>
            <Text style={[styles.sessionSummaryTitle, { color: colors.accent }]}>Session Complete!</Text>
            
            <View style={styles.summaryRow}>
              <MaterialIcons name="schedule" size={20} color={colors.primary} />
              <Text style={styles.summaryText}>
                Duration: {sessionData.duration} min {sessionData.completedFullSession ? '(Full session)' : '(Ended early)'}
              </Text>
            </View>
            
            <View style={styles.summaryRow}>
              <MaterialIcons name="task-alt" size={20} color={colors.primary} />
              <Text style={styles.summaryText}>Task: {sessionData.task}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <MaterialIcons name="subject" size={20} color={colors.primary} />
              <Text style={styles.summaryText}>Subject: {sessionData.subject}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <MaterialIcons name="psychology" size={20} color={colors.primary} />
              <Text style={styles.summaryText}>Focus: </Text>
              <View style={styles.starsRow}>
                {renderStars(sessionData.focusRating)}
              </View>
            </View>
            
            <View style={styles.summaryRow}>
              <MaterialIcons name="trending-up" size={20} color={colors.primary} />
              <Text style={styles.summaryText}>Productivity: </Text>
              <View style={styles.starsRow}>
                {renderStars(sessionData.productivityRating)}
              </View>
            </View>
            
            {sessionData.notes && (
              <View style={styles.notesSection}>
                <Text style={[styles.notesLabel, { color: colors.accent }]}>Notes:</Text>
                <Text style={styles.notesText}>"{sessionData.notes}"</Text>
              </View>
            )}
          </View>
        )}

        {/* Break Timer Card - Same style as HomeScreen timer */}
        <View style={[styles.timerCard, { backgroundColor: colors.secondary }]}>
          <MaterialIcons name="free-breakfast" size={32} color={colors.primary} />
          <Text style={[styles.timerCardTitle, { color: colors.accent }]}>Take a Well-Deserved Break</Text>
          
          {/* Timer Display - Same style as StudySessionScreen */}
          <View style={[styles.timerBox, { backgroundColor: colors.background }]}>
            <Text style={[styles.timerText, { color: '#222' }]}>{formatTime(timer)}</Text>
          </View>
          
          {/* Break Tips */}
          <View style={styles.tipsSection}>
            <Text style={[styles.tipsTitle, { color: colors.accent }]}>Break Suggestions:</Text>
            <Text style={styles.tipText}>• Stretch your body and neck</Text>
            <Text style={styles.tipText}>• Hydrate with water</Text>
            <Text style={styles.tipText}>• Take deep breaths</Text>
            <Text style={styles.tipText}>• Rest your eyes by looking away from screens</Text>
          </View>

          {/* Timer Controls */}
          <View style={styles.controlsRow}>
            <TouchableOpacity style={styles.pauseBtn} onPress={handlePause}>
              <Ionicons name={isPaused ? 'play' : 'pause'} size={22} color="#222" />
              <Text style={styles.pauseBtnText}>{isPaused ? 'Resume' : 'Pause'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.endBtn, { backgroundColor: colors.primary }]} onPress={handleEndBreak}>
              <Ionicons name="stop" size={22} color="#fff" />
              <Text style={styles.endBtnText}>End Break</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 🎵 ADD MUSIC STATUS CARD HERE */}
        {renderMusicStatus()}

        {/* Background Timer Indicator */}
        {AppState.currentState === 'background' && !isPaused && (
          <View style={[styles.backgroundIndicator, { backgroundColor: colors.secondary }]}>
            <MaterialIcons name="schedule" size={16} color={colors.primary} />
            <Text style={[styles.backgroundText, { color: colors.primary }]}>Break timer running in background</Text>
          </View>
        )}
      </ScrollView>

      {/* End Break Confirmation Modal */}
      <Modal visible={showEndModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <MaterialIcons name="warning" size={48} color="#FF9800" />
            <Text style={styles.modalTitle}>End Break Early?</Text>
            <Text style={styles.modalDesc}>
              Taking full breaks helps maintain your focus for the next session. You still have {formatTime(timer)} remaining.
            </Text>
            <TouchableOpacity style={[styles.continueBtn, { borderColor: colors.primary }]} onPress={handleCancelEndBreak}>
              <Text style={[styles.continueBtnText, { color: colors.primary }]}>Continue Break</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.endNowBtn, { backgroundColor: colors.primary }]} onPress={handleFirstEndConfirm}>
              <Text style={styles.endNowBtnText}>End Break Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Double Confirmation Modal */}
      <Modal visible={showConfirmEndModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <MaterialIcons name="error" size={48} color="#F44336" />
            <Text style={styles.modalTitle}>Are You Sure?</Text>
            <Text style={styles.modalDesc}>
              This is your second confirmation. Ending your break early may reduce the effectiveness of your next study session.
            </Text>
            <TouchableOpacity style={[styles.continueBtn, { borderColor: colors.primary }]} onPress={handleCancelEndBreak}>
              <Text style={[styles.continueBtnText, { color: colors.primary }]}>Cancel - Continue Break</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmEndBtn} onPress={handleConfirmEndBreak}>
              <Text style={styles.confirmEndBtnText}>Yes, End Break Now</Text>
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
});

export default BreakTimerScreen;
