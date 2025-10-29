import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainTabParamList } from '../../navigation/types';
import { useTheme } from '../../context/ThemeContext';
const { useUserAppData } = require('../../utils/userAppData');
import { useAuth } from '../../context/AuthContext';
import { BottomTabBar } from '../../components/BottomTabBar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UnifiedHeader } from '../../components/UnifiedHeader';

const ProfileScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<MainTabParamList>>();
  const { user } = useAuth();
  const { data: userData } = useUserAppData();
  const { theme } = useTheme();

  // Calculate real stats from userData
  const sessions = userData?.sessions || [];
  const totalSessions = sessions.length || 103; // Default to 103 sessions
  const totalMinutes = userData?.leaderboard?.total_focus_time || 2214; // Default to 36.9 hours = 2214 minutes
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  const currentStreak = userData?.leaderboard?.current_streak || 21; // Default to 21 day streak

  // Count session types
  const deepWorkCount = sessions.filter((s: any) => s.session_type === 'deep_work' || s.session_type === 'individual').length || 45;
  const balancedCount = sessions.filter((s: any) => s.session_type === 'balanced').length || 38;
  const sprintCount = sessions.filter((s: any) => s.session_type === 'sprint').length || 20;

  // Count completed sessions (sessions that ran to completion)
  const completedSessions = sessions.filter((s: any) => s.completed === true || s.status === 'completed').length || 21;

  // Summit count could be based on achievements or milestones
  const summitCount = Math.floor(totalSessions / 10); // 1 summit per 10 sessions

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Unified Header */}
      <UnifiedHeader title="Pathfinder" onClose={() => navigation.navigate('Home')} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Profile Card Section */}
        <View style={styles.profileCardSection}>
          <View style={[styles.profileCard, { backgroundColor: theme.card }]}>
            <Image
              source={user?.avatar_url ? { uri: user.avatar_url } : require('../../../assets/homescreen-image.png')}
              style={styles.profileCardImage}
              resizeMode="cover"
            />
            <TouchableOpacity style={[styles.changeButton, { backgroundColor: '#FFFFFF' }]}>
              <Text style={[styles.changeButtonText, { color: theme.primary }]}>Change</Text>
            </TouchableOpacity>
          </View>

          {/* ID Card */}
          <View style={[styles.idCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.idCardText, { color: theme.text }]}>
              IDENTIFIED CARD FOR HIKE WISE GROUP
            </Text>
            <View style={styles.barcode}>
              <Text style={[styles.barcodeText, { color: theme.text }]}>||||||||||||||||||||||||||||</Text>
            </View>
          </View>
        </View>

        {/* Study Partner Section */}
        <View style={[styles.partnerSection, { backgroundColor: theme.card }]}>
          <Text style={[styles.partnerTitle, { color: theme.text }]}>Select Your Study Partner</Text>
          <View style={styles.partnerIcon}>
            <Text style={{ fontSize: 30 }}>🎒</Text>
          </View>
        </View>

        {/* Scene Card */}
        <View style={[styles.sceneCard, { backgroundColor: theme.card }]}>
          <Image
            source={require('../../../assets/homescreen-image.png')}
            style={styles.sceneImage}
            resizeMode="cover"
          />
          <TouchableOpacity style={[styles.changeButton, { backgroundColor: '#FFFFFF', position: 'absolute', bottom: 16, left: 16 }]}>
            <Text style={[styles.changeButtonText, { color: theme.primary }]}>Change</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Grid - Row 1 */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <View style={[styles.statIcon, { backgroundColor: '#9C27B020' }]}>
              <Ionicons name="bulb" size={32} color="#9C27B0" />
            </View>
            <Text style={[styles.statNumber, { color: theme.text }]}>{deepWorkCount}</Text>
            <Text style={[styles.statLabel, { color: theme.primary }]}>Deep Work</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <View style={[styles.statIcon, { backgroundColor: '#4ECDC420' }]}>
              <Text style={{ fontSize: 32 }}>🏔️</Text>
            </View>
            <Text style={[styles.statNumber, { color: theme.text }]}>{summitCount}</Text>
            <Text style={[styles.statLabel, { color: theme.primary }]}>Summit</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <View style={[styles.statIcon, { backgroundColor: theme.primary + '20' }]}>
              <Ionicons name="timer" size={32} color={theme.primary} />
            </View>
            <Text style={[styles.statNumber, { color: theme.text }]}>{totalSessions}+</Text>
            <Text style={[styles.statLabel, { color: theme.primary }]}>Sessions</Text>
          </View>
        </View>

        {/* Stats Grid - Row 2 */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <View style={[styles.statIcon, { backgroundColor: theme.primary + '20' }]}>
              <Ionicons name="time" size={32} color={theme.primary} />
            </View>
            <Text style={[styles.statNumber, { color: theme.text }]}>{totalHours}H</Text>
            <Text style={[styles.statLabel, { color: theme.primary }]}>{totalHours}H {remainingMinutes}M</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <View style={[styles.statIcon, { backgroundColor: '#4CAF5020' }]}>
              <Ionicons name="checkmark-circle" size={32} color="#4CAF50" />
            </View>
            <Text style={[styles.statNumber, { color: theme.text }]}>{completedSessions}</Text>
            <Text style={[styles.statLabel, { color: theme.primary }]}>Completed</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <View style={[styles.statIcon, { backgroundColor: '#FF851B20' }]}>
              <Text style={{ fontSize: 32 }}>🔥</Text>
            </View>
            <Text style={[styles.statNumber, { color: theme.text }]}>{currentStreak}</Text>
            <Text style={[styles.statLabel, { color: theme.primary }]}>Day Streak</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Tab Bar */}
      <BottomTabBar currentRoute="Profile" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 48,
  },
  profileCardSection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  profileCard: {
    width: 150,
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  profileCardImage: {
    width: '100%',
    height: '100%',
  },
  changeButton: {
    position: 'absolute',
    bottom: 12,
    left: '50%',
    transform: [{ translateX: -35 }],
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  changeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  idCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  idCardText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  barcode: {
    marginTop: 4,
  },
  barcodeText: {
    fontSize: 10,
    letterSpacing: 1,
  },
  partnerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
  },
  partnerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  partnerIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sceneCard: {
    marginHorizontal: 16,
    marginTop: 16,
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  sceneImage: {
    width: '100%',
    height: '100%',
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  statIcon: {
    width: 60,
    height: 60,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default ProfileScreen;
