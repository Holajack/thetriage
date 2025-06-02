import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { supabase } from '../../utils/supabase';
import { useSupabaseFocusSession } from '../../utils/supabaseHooks';

const MOCK_TASK = {
  name: 'Take Abigail',
  priority: 'High',
  description: 'Working on high priority tasks first',
};

const FOCUS_DURATION = 45 * 60; // 45 minutes in seconds

export const StudySessionScreen = () => {
  const [timer, setTimer] = useState(FOCUS_DURATION);
  const [isPaused, setIsPaused] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { sessionId, startSession, endSession, loading, error } = useSupabaseFocusSession();
  
  // Get parameters from route
  const params = route.params as { group?: boolean; room?: any } | undefined;
  const isGroupSession = params?.group || false;
  const room = params?.room;

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
            <Text style={styles.currentTaskName}>{MOCK_TASK.name}</Text>
            <MaterialIcons name="flag" size={18} color="#E57373" style={{ marginLeft: 4 }} />
          </Text>
        </View>
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="sync" size={22} color="#888" />
        </TouchableOpacity>
      </View>

      {/* Auto Priority Mode Banner */}
      <View style={styles.priorityModeRow}>
        <MaterialIcons name="list" size={18} color="#388E3C" />
        <Text style={styles.priorityModeText}>
          Auto Priority Mode <Text style={{ color: '#888' }}>(Prioritizing high tasks first)</Text>
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
          <Text style={styles.taskCardLabel}>Current High Priority Task</Text>
          <Text style={styles.taskCardName}>{MOCK_TASK.name}</Text>
          <View style={styles.priorityRow}>
            <MaterialIcons name="flag" size={18} color="#E57373" />
            <Text style={styles.priorityText}>Priority: <Text style={{ color: '#E57373', fontWeight: 'bold' }}>High</Text></Text>
          </View>
          <Text style={styles.taskCardDesc}>{MOCK_TASK.description}</Text>
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
}); 