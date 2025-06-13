import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { useUserAppData } from '../../utils/userAppData';

const DEFAULT_BREAK_DURATION = 15 * 60; // 15 minutes in seconds

export const BreakTimerScreen = () => {
  const [timer, setTimer] = useState(DEFAULT_BREAK_DURATION);
  const [isPaused, setIsPaused] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { data: userData } = useUserAppData();
  const [autoStartEnabled, setAutoStartEnabled] = useState(false);
  const [nextTask, setNextTask] = useState<any>(null);

  // Get session data from route params
  const params = route.params as { sessionData?: any } | undefined;
  const sessionData = params?.sessionData;

  // Get break duration from user settings or use default
  const breakDuration = React.useMemo(() => {
    if (userData?.settings?.break_duration) {
      return userData.settings.break_duration * 60; // Convert minutes to seconds
    }
    if (userData?.onboarding?.focus_method === 'Pomodoro Technique') {
      return 5 * 60; // 5 minutes for Pomodoro
    }
    if (userData?.onboarding?.focus_method === 'Deep Focus') {
      return 10 * 60; // 10 minutes for Deep Focus
    }
    return DEFAULT_BREAK_DURATION; // Default 15 minutes
  }, [userData]);

  // Initialize timer with user's break duration
  useEffect(() => {
    setTimer(breakDuration);
  }, [breakDuration]);

  useEffect(() => {
    if (!isPaused && timer > 0) {
      intervalRef.current = setInterval(() => {
        setTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPaused, timer]);

  // Handle timer completion
  useEffect(() => {
    if (timer === 0) {
      // Timer has completed, automatically navigate to SessionReportScreen
      handleBreakComplete();
    }
  }, [timer]);

  // Check if auto-start is enabled and get next task
  useEffect(() => {
    const checkAutoStartSettings = async () => {
      try {
        // Check user's auto-start preference from settings
        const autoStartSetting = userData?.settings?.auto_start_next || false;
        setAutoStartEnabled(autoStartSetting);

        if (autoStartSetting && userData?.activeTasks) {
          // Get next highest priority task
          const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
          const sortedTasks = [...userData.activeTasks].sort((a, b) => {
            const priorityDiff = (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - 
                                (priorityOrder[a.priority as keyof typeof priorityOrder] || 0);
            if (priorityDiff !== 0) return priorityDiff;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          });

          setNextTask(sortedTasks[0] || null);
        }
      } catch (error) {
        console.error('Error checking auto-start settings:', error);
      }
    };

    checkAutoStartSettings();
  }, [userData]);

  // Auto-start logic when break timer ends
  useEffect(() => {
    if (timer === 0 && autoStartEnabled && nextTask) {
      // Automatically start next session
      handleAutoStartNextSession();
    }
  }, [timer, autoStartEnabled, nextTask]);

  const handleBreakComplete = () => {
    navigation.navigate('SessionReportScreen');
  };

  const handleAutoStartNextSession = () => {
    console.log('Auto-starting next session for task:', nextTask.title);
    
    // Navigate directly to StudySessionScreen without priority modal
    navigation.navigate('StudySessionScreen', { 
      autoStart: true,
      selectedTask: nextTask 
    });
  };

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60).toString().padStart(2, '0');
    const sec = (seconds % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
  };

  const handleBack = () => {
    navigation.navigate('Main', { screen: 'Home' });
  };

  const handleEndBreak = () => {
    setIsPaused(true);
    setShowEndModal(true);
  };

  const handleContinueBreak = () => {
    setShowEndModal(false);
    setIsPaused(false);
  };

  const handleShowConfirm = () => {
    setShowEndModal(false);
    setShowConfirmModal(true);
  };

  const handleConfirmEndBreak = () => {
    setShowConfirmModal(false);
    navigation.navigate('SessionReportScreen');
  };

  const handleCancelEndBreak = () => {
    setShowConfirmModal(false);
    setIsPaused(false);
  };

  const getFocusMethodInfo = () => {
    const method = userData?.onboarding?.focus_method || 'Balanced';
    switch (method) {
      case 'Pomodoro Technique':
        return { name: 'Pomodoro', duration: '5min', color: '#E57373' };
      case 'Deep Focus':
        return { name: 'Deep Focus', duration: '10min', color: '#64B5F6' };
      default:
        return { name: 'Balanced', duration: '15min', color: '#81C784' };
    }
  };

  const methodInfo = getFocusMethodInfo();

  const renderBreakCompleteContent = () => {
    if (autoStartEnabled && nextTask) {
      return (
        <View style={styles.autoStartContainer}>
          <MaterialIcons name="autorenew" size={48} color="#4CAF50" />
          <Text style={styles.autoStartTitle}>Auto-Starting Next Session</Text>
          <Text style={styles.autoStartSubtitle}>
            Next up: {nextTask.title}
          </Text>
          <Text style={styles.autoStartDescription}>
            Priority: {nextTask.priority} • Auto-start is enabled
          </Text>
          
          <TouchableOpacity 
            style={styles.cancelAutoStartButton}
            onPress={() => setAutoStartEnabled(false)}
          >
            <Text style={styles.cancelAutoStartText}>Cancel Auto-Start</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.breakCompleteContainer}>
        <MaterialIcons name="celebration" size={48} color="#4CAF50" />
        <Text style={styles.breakCompleteTitle}>Break Complete!</Text>
        <Text style={styles.breakCompleteSubtitle}>
          Ready for your next focus session?
        </Text>
        
        <TouchableOpacity 
          style={styles.startNextButton}
          onPress={() => navigation.navigate('StudySessionScreen')}
        >
          <Text style={styles.startNextButtonText}>Start Next Session</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      {/* Top Navigation Bar */}
      <View style={styles.topNavBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#222" />
        </TouchableOpacity>
        <View style={styles.topNavTitleRow}>
          <Text style={styles.currentTaskLabel}>
            <Text style={{ color: '#888' }}>Break Time: </Text>
            <Text style={styles.currentTaskName}>{methodInfo.name} Break</Text>
            <MaterialIcons name="free-breakfast" size={18} color={methodInfo.color} style={{ marginLeft: 4 }} />
          </Text>
        </View>
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="refresh" size={22} color="#888" />
        </TouchableOpacity>
      </View>

      {/* Break Mode Banner */}
      <View style={styles.priorityModeRow}>
        <MaterialIcons name="free-breakfast" size={18} color="#FF9800" />
        <Text style={styles.priorityModeText}>
          Break Mode <Text style={{ color: '#888' }}>
            (Time to recharge and refresh your mind)
          </Text>
        </Text>
      </View>

      {/* Main Content */}
      <View style={styles.container}>
        {/* Timer */}
        <View style={styles.timerBox}>
          <Text style={styles.timerText}>{formatTime(timer)}</Text>
        </View>

        {/* Controls */}
        <View style={styles.controlsRow}>
          <TouchableOpacity style={styles.pauseBtn} onPress={() => setIsPaused((p) => !p)}>
            <Ionicons name={isPaused ? 'play' : 'pause'} size={22} color="#222" />
            <Text style={styles.pauseBtnText}>{isPaused ? 'Resume' : 'Pause'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.endBtn} onPress={handleEndBreak}>
            <Ionicons name="checkmark" size={22} color="#222" />
            <Text style={styles.endBtnText}>End Break</Text>
          </TouchableOpacity>
        </View>

        {/* Completed Session Summary */}
        {sessionData && (
          <View style={styles.sessionSummaryCard}>
            <Text style={styles.sessionSummaryLabel}>Completed Session Summary</Text>
            <View style={styles.summaryRow}>
              <MaterialIcons name="schedule" size={16} color="#666" />
              <Text style={styles.summaryText}>
                Duration: {Math.floor(sessionData.duration / 60)}m {sessionData.duration % 60}s
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <MaterialIcons name="task" size={16} color="#666" />
              <Text style={styles.summaryText}>Task: {sessionData.task}</Text>
            </View>
            <View style={styles.summaryRow}>
              <MaterialIcons name="visibility" size={16} color="#666" />
              <Text style={styles.summaryText}>Focus Rating: {sessionData.focusRating}/5</Text>
            </View>
            <View style={styles.summaryRow}>
              <MaterialIcons name="trending-up" size={16} color="#666" />
              <Text style={styles.summaryText}>Productivity Rating: {sessionData.productivityRating}/5</Text>
            </View>
            {sessionData.notes && (
              <View style={styles.summaryRow}>
                <MaterialIcons name="note" size={16} color="#666" />
                <Text style={styles.summaryText}>Notes: {sessionData.notes}</Text>
              </View>
            )}
          </View>
        )}

        {/* Break Activity Suggestions */}
        <View style={styles.taskCard}>
          <Text style={styles.taskCardLabel}>Suggested Break Activities</Text>
          <Text style={styles.taskCardName}>Make the most of your break time</Text>
          <View style={styles.suggestionsList}>
            <View style={styles.suggestionRow}>
              <MaterialIcons name="directions-walk" size={18} color="#4CAF50" />
              <Text style={styles.suggestionText}>Take a short walk</Text>
            </View>
            <View style={styles.suggestionRow}>
              <MaterialIcons name="local-drink" size={18} color="#2196F3" />
              <Text style={styles.suggestionText}>Hydrate with water</Text>
            </View>
            <View style={styles.suggestionRow}>
              <MaterialIcons name="visibility" size={18} color="#FF9800" />
              <Text style={styles.suggestionText}>Look away from screens</Text>
            </View>
            <View style={styles.suggestionRow}>
              <MaterialIcons name="air" size={18} color="#9C27B0" />
              <Text style={styles.suggestionText}>Practice deep breathing</Text>
            </View>
          </View>
        </View>

        {/* Break Complete Content */}
        {renderBreakCompleteContent()}
      </View>

      {/* First End Break Modal */}
      <Modal
        visible={showEndModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEndModal(false)}
      >
        <View style={modalStyles.overlay}>
          <View style={modalStyles.modalBox}>
            <View style={modalStyles.iconCircle}>
              <Ionicons name="warning-outline" size={48} color="#FF9800" />
            </View>
            <Text style={modalStyles.modalTitle}>End Break Early?</Text>
            <Text style={modalStyles.modalDesc}>
              Taking a full break helps you return to studying refreshed and more focused. Are you sure you want to cut your break short?
            </Text>
            <View style={modalStyles.infoRow}>
              <Ionicons name="bulb-outline" size={20} color="#4CAF50" />
              <Text style={modalStyles.infoText}>Breaks improve focus and prevent burnout.</Text>
            </View>
            <TouchableOpacity style={modalStyles.continueBtn} onPress={handleContinueBreak}>
              <Text style={modalStyles.continueBtnText}>Continue Break</Text>
            </TouchableOpacity>
            <TouchableOpacity style={modalStyles.endNowBtn} onPress={handleShowConfirm}>
              <Text style={modalStyles.endNowBtnText}>End Break Anyway</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={modalStyles.overlay}>
          <View style={modalStyles.modalBox}>
            <View style={modalStyles.iconCircle}>
              <Ionicons name="alert-circle-outline" size={48} color="#F44336" />
            </View>
            <Text style={modalStyles.modalTitle}>Final Confirmation</Text>
            <Text style={modalStyles.modalDesc}>
              This is your second confirmation. Ending your break early may reduce the effectiveness of your next study session. Are you absolutely sure?
            </Text>
            <View style={modalStyles.infoRow}>
              <Ionicons name="time-outline" size={20} color="#F44336" />
              <Text style={modalStyles.infoText}>You still have {formatTime(timer)} remaining.</Text>
            </View>
            <TouchableOpacity style={modalStyles.continueBtn} onPress={handleCancelEndBreak}>
              <Text style={modalStyles.continueBtnText}>Cancel - Continue Break</Text>
            </TouchableOpacity>
            <TouchableOpacity style={modalStyles.endNowBtn} onPress={handleConfirmEndBreak}>
              <Text style={modalStyles.endNowBtnText}>Yes, End Break Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingTop: 0,
    paddingBottom: 4,
    backgroundColor: '#FAFCFA',
    minHeight: 48,
    borderBottomWidth: 0,
    zIndex: 10,
  },
  topNavTitleRow: {
    flex: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  iconBtn: { padding: 4 },
  currentTaskLabel: { textAlign: 'center', fontSize: 16, fontWeight: 'bold', color: '#222' },
  currentTaskName: { color: '#222', fontWeight: 'bold', fontSize: 16 },
  priorityModeRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    alignSelf: 'center', 
    backgroundColor: '#FFF3E0', 
    borderRadius: 8, 
    paddingHorizontal: 12, 
    paddingVertical: 4, 
    marginBottom: 16, 
    marginTop: 0 
  },
  priorityModeText: { color: '#FF9800', fontWeight: 'bold', marginLeft: 6, fontSize: 14 },
  container: { flex: 1, justifyContent: 'center', padding: 16 },
  timerBox: { 
    alignSelf: 'center', 
    backgroundColor: '#FFF3E0', 
    borderRadius: 16, 
    padding: 32, 
    marginVertical: 16, 
    minWidth: 220, 
    alignItems: 'center' 
  },
  timerText: { fontSize: 48, fontWeight: 'bold', color: '#FF9800', letterSpacing: 2 },
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
  sessionSummaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  sessionSummaryLabel: {
    color: '#FF9800',
    fontWeight: 'bold',
    fontSize: 13,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryText: {
    color: '#666',
    fontSize: 14,
    marginLeft: 8,
  },
  taskCard: { 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    padding: 18, 
    marginVertical: 16, 
    borderWidth: 1, 
    borderColor: '#E0E0E0' 
  },
  taskCardLabel: { color: '#FF9800', fontWeight: 'bold', fontSize: 13, marginBottom: 6 },
  taskCardName: { fontWeight: 'bold', fontSize: 16, color: '#222', marginBottom: 12 },
  suggestionsList: { gap: 8 },
  suggestionRow: { flexDirection: 'row', alignItems: 'center' },
  suggestionText: { color: '#666', fontSize: 14, marginLeft: 8 },
  autoStartContainer: {
    alignSelf: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 18,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  autoStartTitle: {
    color: '#2E7D32',
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  autoStartSubtitle: {
    color: '#2E7D32',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
    textAlign: 'center',
  },
  autoStartDescription: {
    color: '#666',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  cancelAutoStartButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginTop: 12,
  },
  cancelAutoStartText: {
    color: '#222',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
  breakCompleteContainer: {
    alignSelf: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 18,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  breakCompleteTitle: {
    color: '#2E7D32',
    fontWeight: 'bold',
    fontSize: 18,
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  breakCompleteSubtitle: {
    color: '#2E7D32',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  startNextButton: {
    backgroundColor: '#FF9800',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 30,
    width: '100%',
  },
  startNextButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 24, 
    marginHorizontal: 20, 
    maxWidth: 400, 
    width: '90%' 
  },
  iconCircle: { 
    alignSelf: 'center', 
    backgroundColor: '#FFF3E0', 
    borderRadius: 32, 
    padding: 16, 
    marginBottom: 16 
  },
  modalTitle: { 
    fontWeight: 'bold', 
    fontSize: 18, 
    color: '#222', 
    textAlign: 'center', 
    marginBottom: 8 
  },
  modalDesc: { 
    color: '#666', 
    fontSize: 15, 
    textAlign: 'center', 
    lineHeight: 22, 
    marginBottom: 16 
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  infoText: { color: '#4CAF50', fontWeight: 'bold', fontSize: 15, marginLeft: 6 },
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
  endNowBtn: { backgroundColor: '#FF9800', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 30, width: '100%' },
  endNowBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16, textAlign: 'center' },
});

export default BreakTimerScreen;
