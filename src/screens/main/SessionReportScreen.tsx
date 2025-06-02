import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, CommonActions } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';

const MOCK_REPORT = {
  duration: '00:00',
  milestones: 0,
  totalMilestones: 3,
  focusScore: 3,
  date: 'May 19th, 2025',
  environment: 'Park',
  status: 'Ended Early',
  notes: '',
};

const SessionReportScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      {/* Top Navigation Bar */}
      <View style={styles.topNavBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Main', { screen: 'Results' })}>
          <Ionicons name="arrow-back" size={24} color="#222" />
        </TouchableOpacity>
        <View style={styles.topNavTitleRow}>
          <Text style={styles.topNavTitle}>Session Report</Text>
        </View>
        <View style={styles.iconBtn} />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Session Duration & Focus Score */}
        <View style={styles.cardRow}>
          <View style={styles.cardBox}>
            <Ionicons name="time-outline" size={32} color="#6C63FF" style={{ alignSelf: 'center' }} />
            <Text style={styles.cardTitle}>Session Duration</Text>
            <Text style={styles.cardValue}>{MOCK_REPORT.duration}</Text>
            <Text style={styles.cardSub}>{`Completed ${MOCK_REPORT.milestones} of ${MOCK_REPORT.totalMilestones} milestones`}</Text>
          </View>
          <View style={styles.cardBox}>
            <MaterialIcons name="center-focus-strong" size={32} color="#6C63FF" style={{ alignSelf: 'center' }} />
            <Text style={styles.cardTitle}>Focus Score</Text>
            <Text style={styles.cardValue}>{MOCK_REPORT.focusScore}%</Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${MOCK_REPORT.focusScore}%` }]} />
            </View>
          </View>
        </View>
        {/* Session Details */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>Session Details</Text>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>Date</Text><Text style={styles.detailValue}>{MOCK_REPORT.date}</Text></View>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>Environment</Text><Text style={styles.detailValue}>{MOCK_REPORT.environment}</Text></View>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>Milestones Reached</Text><Text style={styles.detailValue}>{`${MOCK_REPORT.milestones}/${MOCK_REPORT.totalMilestones}`}</Text></View>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>Status</Text><Text style={styles.detailValue}>{MOCK_REPORT.status}</Text></View>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>Session Notes</Text><Text style={styles.detailValueEdit}>Edit</Text></View>
          <View style={styles.notesBox}><Text style={styles.notesText}>{MOCK_REPORT.notes ? MOCK_REPORT.notes : 'No notes recorded for this session.'}</Text></View>
        </View>
        {/* Congratulatory Message */}
        <View style={styles.congratsCard}>
          <MaterialIcons name="emoji-events" size={32} color="#6C63FF" style={{ alignSelf: 'center' }} />
          <Text style={styles.congratsTitle}>Great effort on your focus session!</Text>
          <Text style={styles.congratsDesc}>Even partial focus sessions help build your concentration skills.</Text>
          <TouchableOpacity
            style={styles.anotherBtn}
            onPress={() => navigation.navigate('Main', { screen: 'Tabs', params: { screen: 'Home' } } as any)}
          >
            <Text style={styles.anotherBtnText}>Start Another Session</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  topNavTitle: { fontWeight: 'bold', fontSize: 18, color: '#1B5E20' },
  iconBtn: { padding: 4 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', margin: 16 },
  cardBox: { flex: 1, backgroundColor: '#F1F8E9', borderRadius: 12, padding: 18, marginHorizontal: 4, alignItems: 'center' },
  cardTitle: { fontWeight: 'bold', fontSize: 15, color: '#1B5E20', marginTop: 6 },
  cardValue: { fontSize: 22, fontWeight: 'bold', color: '#222', marginTop: 2 },
  cardSub: { color: '#888', fontSize: 13, marginTop: 2, textAlign: 'center' },
  progressBarBg: { width: '100%', height: 8, backgroundColor: '#E0E0E0', borderRadius: 4, marginTop: 8 },
  progressBarFill: { height: 8, backgroundColor: '#6C63FF', borderRadius: 4 },
  detailsCard: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 16, borderRadius: 12, padding: 18, borderWidth: 1, borderColor: '#C8E6C9' },
  detailsTitle: { fontWeight: 'bold', fontSize: 15, color: '#1B5E20', marginBottom: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  detailLabel: { color: '#888', fontSize: 14 },
  detailValue: { color: '#222', fontWeight: 'bold', fontSize: 14 },
  detailValueEdit: { color: '#6C63FF', fontWeight: 'bold', fontSize: 14 },
  notesBox: { backgroundColor: '#F1F8E9', borderRadius: 8, padding: 12, marginTop: 4 },
  notesText: { color: '#888', fontSize: 14 },
  congratsCard: { backgroundColor: '#E8F5E9', marginHorizontal: 16, marginBottom: 16, borderRadius: 12, padding: 18, alignItems: 'center' },
  congratsTitle: { fontWeight: 'bold', fontSize: 16, color: '#1B5E20', marginTop: 8, textAlign: 'center' },
  congratsDesc: { color: '#333', fontSize: 14, marginTop: 4, marginBottom: 12, textAlign: 'center' },
  anotherBtn: { backgroundColor: '#6C63FF', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 30, marginTop: 8 },
  anotherBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16, textAlign: 'center' },
});

export default SessionReportScreen; 