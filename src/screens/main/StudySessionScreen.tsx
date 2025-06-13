import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ScrollView } from 'react-native';
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
    case 'balanced':
    case 'Balanced Focus':
    default:
      return 45 * 60; // 45 minutes
  }
};

const TESTING_MODE = false; // Set to false for production
const TEST_DURATION = 10; // 10 seconds for testing

export const StudySessionScreen = () => {
  // Get user data to determine focus method
  const { data: userData } = useUserAppData();
  
  // Calculate initial timer duration based on user's focus method
  const initialDuration = useMemo(() => {
    if (TESTING_MODE) {
      return TEST_DURATION;
    }
    return getWorkStyleDuration(userData?.onboarding?.focus_method);
  }, [userData?.onboarding?.focus_method]);
  
  const [timer, setTimer] = useState(initialDuration);
  const [isPaused, setIsPaused] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showSessionCompleteModal, setShowSessionCompleteModal] = useState(false);
  
  // Inline session report state
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
  } | undefined;
  
  const isAutoStart = params?.autoStart || false;
  const preSelectedTask = params?.selectedTask;

  // Update currentTask selection to use preSelectedTask if auto-started
  const currentTask = useMemo(() => {
    // If auto-started with a specific task, use that
    if (isAutoStart && preSelectedTask) {
      return preSelectedTask;
    }

    // Otherwise use existing priority logic
    if (!userData?.activeTasks || userData.activeTasks.length === 0) {
      return null;
    }

    const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
    const sortedTasks = [...userData.activeTasks].sort((a, b) => {
      const priorityDiff = (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - 
                          (priorityOrder[a.priority as keyof typeof priorityOrder] || 0);
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return sortedTasks[0];
  }, [userData?.activeTasks, isAutoStart, preSelectedTask]);

  // Get the priority color based on task priority
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return '#E57373';
      case 'Medium': return '#FFB74D';
      case 'Low': return '#81C784';
      default: return '#888';
    }
  };

  // Update timer when initial duration changes (userData loads)
  useEffect(() => {
    setTimer(initialDuration);
  }, [initialDuration]);

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

  useEffect(() => {
    // Start session based on whether it's a group or individual session
    const sessionType = isGroupSession ? 'group' : 'individual';
    const roomId = room?.id || undefined;
    startSession(roomId, sessionType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle timer completion
  useEffect(() => {
    if (timer === 0) {
      // Timer has completed, automatically end session
      handleTimerComplete();
    }
  }, [timer]);

  const handleTimerComplete = async () => {
    try {
      const sessionResult = await endSession();
      
      // Store the completed session data for the report
      setCompletedSessionData(sessionResult);
      
      // Show the inline session report modal
      setShowSessionCompleteModal(true);
    } catch (error) {
      console.error('Error ending session on timer completion:', error);
      // Show modal anyway to prevent user from being stuck
      setShowSessionCompleteModal(true);
    }
  };

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60).toString().padStart(2, '0');
    const sec = (seconds % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
  };

  const handleBack = () => {
    navigation.navigate('Main', { screen: 'Home' });
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
    setShowEndModal(false);
    try {
      await endSession();
      navigation.navigate('SessionReportScreen');
    } catch (error) {
      console.error('Error ending session:', error);
      // Navigate anyway to prevent user from being stuck
      navigation.navigate('SessionReportScreen');
    }
  };

  const handleSessionReportSubmit = () => {
    // Close the modal
    setShowSessionCompleteModal(false);
    
    // Navigate to BreakTimerScreen with session data
    navigation.navigate('BreakTimerScreen', {
      sessionData: {
        duration: completedSessionData?.duration || initialDuration - timer,
        task: currentTask?.title || 'Study Session',
        focusRating,
        productivityRating,
        notes: sessionNotes
      }
    });
  };

  const handleSkipSessionReport = () => {
    // Close the modal and go directly to break timer
    setShowSessionCompleteModal(false);
    navigation.navigate('BreakTimerScreen');
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
            <Text style={{ color: '#888' }}>Current: </Text>
            <Text style={styles.currentTaskName}>
              {currentTask ? currentTask.title : 'No tasks available'}
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
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="sync" size={22} color="#888" />
        </TouchableOpacity>
      </View>

      {/* Auto Priority Mode Banner */}
      <View style={styles.priorityModeRow}>
        <MaterialIcons name={isAutoStart ? "autorenew" : "list"} size={18} color="#388E3C" />
        <Text style={styles.priorityModeText}>
          {isAutoStart ? 'Auto-Started Session' : 'Auto Priority Mode'} 
          <Text style={{ color: '#888' }}>
            {currentTask 
              ? `(${isAutoStart ? 'Auto-selected' : 'Prioritizing'} ${currentTask.priority.toLowerCase()} priority tasks${isAutoStart ? '' : ' first'})` 
              : '(No active tasks found)'
            }
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
          <TouchableOpacity style={styles.endBtn} onPress={handleEndSession}>
            <Ionicons name="stop" size={22} color="#222" />
            <Text style={styles.endBtnText}>End Session</Text>
              </TouchableOpacity>
        </View>

        {/* Current High Priority Task Card */}
        <View style={styles.taskCard}>
          {currentTask ? (
            <>
              <Text style={styles.taskCardLabel}>Current High Priority Task</Text>
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
            </>
          ) : (
            <>
              <Text style={styles.taskCardLabel}>No Active Tasks</Text>
              <Text style={styles.taskCardName}>Create some tasks to get started!</Text>
              <Text style={styles.taskCardDesc}>
                Go to the Home screen to add new tasks, then return here to start your focused study session.
              </Text>
            </>
          )}
        </View>
        </View>

      <Modal
        visible={showEndModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEndModal(false)}
      >
        <View style={modalStyles.overlay}>
          <View style={modalStyles.modalBox}>
            <View style={modalStyles.iconCircle}>
              <Ionicons name="alert-circle-outline" size={48} color="#FFB300" />
            </View>
            <Text style={modalStyles.modalTitle}>End Session Early?</Text>
            <Text style={modalStyles.modalDesc}>
              You still have time left on your focus session. Staying focused for the full duration will help you achieve better results!
            </Text>
            <View style={modalStyles.infoRow}>
              <Ionicons name="time-outline" size={20} color="#6C63FF" />
              <Text style={modalStyles.infoText}>Consistency builds better focus habits.</Text>
            </View>
            <TouchableOpacity style={modalStyles.continueBtn} onPress={handleContinueFocusing}>
              <Text style={modalStyles.continueBtnText}>Continue Focusing</Text>
            </TouchableOpacity>
            <TouchableOpacity style={modalStyles.endNowBtn} onPress={handleEndSessionNow}>
              <Text style={modalStyles.endNowBtnText}>End Session Now</Text>
          </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Inline Session Report Modal */}
      <Modal
        visible={showSessionCompleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSessionCompleteModal(false)}
      >
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.modalBox, { maxHeight: '80%' }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={modalStyles.iconCircle}>
                <MaterialIcons name="emoji-events" size={48} color="#4CAF50" />
              </View>
              <Text style={modalStyles.modalTitle}>Session Complete!</Text>
              <Text style={modalStyles.modalDesc}>
                Great job finishing your focus session! Take a moment to reflect on your study experience.
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
                  placeholder="What did you work on? Any insights or breakthroughs?"
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
  container: { flex: 1, justifyContent: 'center', padding: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 10 },
  iconBtn: { padding: 4 },
  currentTaskLabel: { textAlign: 'center', fontSize: 16, fontWeight: 'bold', color: '#222' },
  currentTaskName: { color: '#222', fontWeight: 'bold', fontSize: 16 },
  priorityModeRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', backgroundColor: '#E8F5E9', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 16, marginTop: 0 },
  priorityModeText: { color: '#388E3C', fontWeight: 'bold', marginLeft: 6, fontSize: 14 },
  timerBox: { alignSelf: 'center', backgroundColor: '#F1F8E9', borderRadius: 16, padding: 32, marginVertical: 16, minWidth: 220, alignItems: 'center' },
  timerText: { fontSize: 48, fontWeight: 'bold', color: '#222', letterSpacing: 2 },
  controlsRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 18 },
  pauseBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 28, marginRight: 12, borderWidth: 1, borderColor: '#E0E0E0' },
  pauseBtnText: { fontWeight: 'bold', color: '#222', marginLeft: 8, fontSize: 16 },
  endBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 28, borderWidth: 1, borderColor: '#E0E0E0' },
  endBtnText: { fontWeight: 'bold', color: '#222', marginLeft: 8, fontSize: 16 },
  taskCard: { backgroundColor: '#fff', borderRadius: 12, borderLeftWidth: 6, borderLeftColor: '#E57373', padding: 18, marginTop: 8, marginHorizontal: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  taskCardLabel: { color: '#388E3C', fontWeight: 'bold', fontSize: 14, marginBottom: 4 },
  taskCardName: { fontWeight: 'bold', fontSize: 20, color: '#222', marginBottom: 4 },
  priorityRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  priorityText: { color: '#E57373', fontWeight: 'bold', marginLeft: 4, fontSize: 15 },
  taskCardDesc: { color: '#888', fontSize: 14, marginTop: 2 },
});

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
    marginBottom: 10,
  },
  modalTitle: { fontWeight: 'bold', fontSize: 20, color: '#1B5E20', marginBottom: 10, textAlign: 'center' },
  modalDesc: { color: '#333', fontSize: 15, marginBottom: 16, textAlign: 'center' },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  infoText: { color: '#6C63FF', fontWeight: 'bold', fontSize: 15, marginLeft: 6 },
  continueBtn: { backgroundColor: '#fff', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 30, borderWidth: 1, borderColor: '#E0E0E0', marginBottom: 10, width: '100%' },
  continueBtnText: { color: '#222', fontWeight: 'bold', fontSize: 16, textAlign: 'center' },
  endNowBtn: { backgroundColor: '#6C63FF', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 30, width: '100%' },
  endNowBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16, textAlign: 'center' },
  
  // Inline session report styles
  ratingSection: { width: '100%', marginBottom: 20 },
  ratingLabel: { fontSize: 16, fontWeight: 'bold', color: '#1B5E20', marginBottom: 10, textAlign: 'left' },
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
  submitBtn: { backgroundColor: '#4CAF50', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 30, marginBottom: 8, width: '100%' },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16, textAlign: 'center' },
  skipBtn: { backgroundColor: 'transparent', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 30, width: '100%' },
  skipBtnText: { color: '#888', fontSize: 14, textAlign: 'center' },
});