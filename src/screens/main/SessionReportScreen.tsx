import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
const { useUserAppData } = require('../../utils/userAppData');
import { useBackgroundMusic } from '../../hooks/useBackgroundMusic';
import { useTheme } from '../../context/ThemeContext';

export const SessionReportScreen = () => {
  const { data: userData } = useUserAppData();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const { theme } = useTheme();
  
  const params = route.params as {
    sessionDuration: number;
    breakDuration: number;
    taskCompleted: boolean;
    focusRating: number;
    notes?: string;
    sessionType: 'auto' | 'manual';
    subject: string;
    plannedDuration: number;
    productivity: number;
    focusMode?: 'basecamp' | 'summit';
    completedTasksData?: any[];
  } | undefined;

  const [newAchievements, setNewAchievements] = useState<any[]>([]);
  const [sessionScore, setSessionScore] = useState(0);

  // Music hook
  const { 
    currentTrack, 
    isPlaying,
    stopPlayback,
    audioSupported,
    isPreviewMode
  } = useBackgroundMusic();

  // Calculate comprehensive session score
  const calculateSessionScore = useMemo(() => {
    if (!params) return 0;
    
    let score = 0;
    const maxScore = 100;
    
    // Completion bonus (40 points max)
    if (params.taskCompleted) {
      score += 40;
    } else {
      // Partial credit for incomplete sessions
      const completionRatio = params.sessionDuration / params.plannedDuration;
      score += Math.floor(40 * completionRatio);
    }
    
    // Focus rating (25 points max)
    score += (params.focusRating / 5) * 25;
    
    // Productivity rating (25 points max)
    score += (params.productivity / 5) * 25;
    
    // Notes bonus (10 points max)
    if (params.notes && params.notes.trim().length > 0) {
      score += 10;
    }
    
    return Math.min(Math.floor(score), maxScore);
  }, [params]);

  // Check for new achievements
  useEffect(() => {
    const checkAchievements = async () => {
      if (!params) return;
      
      const achievements = [];
      
      // Focus Master achievement
      if (params.focusRating >= 5) {
        achievements.push({
          id: 'focus_master',
          title: 'Focus Master',
          description: 'Achieved perfect focus rating',
          icon: 'psychology',
          color: '#4CAF50'
        });
      }
      
      // Productivity Pro achievement
      if (params.productivity >= 5) {
        achievements.push({
          id: 'productivity_pro',
          title: 'Productivity Pro',
          description: 'Achieved maximum productivity',
          icon: 'trending-up',
          color: '#2196F3'
        });
      }
      
      // Session Completion achievement
      if (params.taskCompleted) {
        achievements.push({
          id: 'session_complete',
          title: 'Session Complete',
          description: 'Completed full focus session',
          icon: 'emoji-events',
          color: '#FF9800'
        });
      }
      
      // Note Taker achievement
      if (params.notes && params.notes.trim().length > 20) {
        achievements.push({
          id: 'note_taker',
          title: 'Thoughtful Learner',
          description: 'Added detailed session notes',
          icon: 'edit-note',
          color: '#9C27B0'
        });
      }
      
      // High Score achievement
      if (calculateSessionScore >= 90) {
        achievements.push({
          id: 'high_score',
          title: 'Excellence Achieved',
          description: 'Scored 90+ on session quality',
          icon: 'star',
          color: '#FFD700'
        });
      }
      
      setNewAchievements(achievements);
      
      // TODO: Save achievements to Convex
      // Achievement saving will use Convex mutations in a future update
      if (achievements.length > 0) {
        console.log('Achievements earned (not saved yet):', achievements.map(a => a.title));
      }
    };
    
    checkAchievements();
    setSessionScore(calculateSessionScore);
  }, [params, calculateSessionScore]);

  // Stop music on screen entry
  useEffect(() => {
    stopPlayback().catch(error => {
      console.warn('🎵 Failed to stop music on session report entry:', error);
    });
  }, [stopPlayback]);


  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Ionicons
        key={i}
        name={i < rating ? 'star' : 'star-outline'}
        size={20}
        color={i < rating ? '#FFD700' : '#DDD'}
      />
    ));
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return '#4CAF50';
    if (score >= 70) return '#FF9800';
    if (score >= 50) return '#FFC107';
    return '#F44336';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Needs Improvement';
  };

  if (!params) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <Text style={styles.errorText}>No session data available</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={["top", "left", "right"]}>
      {/* Top Navigation */}
      <View style={[styles.topNavBar, { backgroundColor: theme.background }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Main', { screen: 'Home' })}>
          <Ionicons name="close" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.topNavTitleRow}>
          <Text style={[styles.topNavTitle, { color: theme.text }]}>Session Report</Text>
        </View>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Session Score Card */}
        <View style={[styles.scoreCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <MaterialIcons name="assessment" size={32} color={theme.primary} />
          <Text style={[styles.scoreTitle, { color: theme.text }]}>Session Quality Score</Text>

          <View style={[styles.scoreCircle, { backgroundColor: theme.background }]}>
            <Text style={[styles.scoreNumber, { color: getScoreColor(sessionScore) }]}>
              {sessionScore}
            </Text>
            <Text style={[styles.scoreOutOf, { color: theme.textSecondary }]}>/ 100</Text>
          </View>

          <Text style={[styles.scoreLabel, { color: getScoreColor(sessionScore) }]}>
            {getScoreLabel(sessionScore)}
          </Text>

          {/* Score Breakdown */}
          <View style={[styles.scoreBreakdown, { backgroundColor: 'rgba(255, 255, 255, 0.05)' }]}>
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, { color: theme.textSecondary }]}>Completion:</Text>
              <Text style={[styles.breakdownValue, { color: theme.text }]}>
                {params.taskCompleted ? '40/40' : `${Math.floor(40 * (params.sessionDuration / params.plannedDuration))}/40`}
              </Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, { color: theme.textSecondary }]}>Focus Rating:</Text>
              <Text style={[styles.breakdownValue, { color: theme.text }]}>{Math.floor((params.focusRating / 5) * 25)}/25</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, { color: theme.textSecondary }]}>Productivity:</Text>
              <Text style={[styles.breakdownValue, { color: theme.text }]}>{Math.floor((params.productivity / 5) * 25)}/25</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, { color: theme.textSecondary }]}>Notes Bonus:</Text>
              <Text style={[styles.breakdownValue, { color: theme.text }]}>{params.notes && params.notes.trim().length > 0 ? '10' : '0'}/10</Text>
            </View>
          </View>
        </View>

        {/* Session Details Card */}
        <View style={[styles.detailsCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <Text style={[styles.detailsTitle, { color: theme.text }]}>Session Details</Text>

          <View style={styles.detailRow}>
            <MaterialIcons name="schedule" size={20} color={theme.primary} />
            <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Duration:</Text>
            <Text style={[styles.detailValue, { color: theme.text }]}>
              {params.sessionDuration} of {params.plannedDuration} minutes
              {params.taskCompleted && <Text style={{ color: theme.primary }}> ✓</Text>}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <MaterialIcons name="subject" size={20} color={theme.primary} />
            <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Subject:</Text>
            <Text style={[styles.detailValue, { color: theme.text }]}>{params.subject}</Text>
          </View>

          <View style={styles.detailRow}>
            <MaterialIcons name="settings" size={20} color={theme.primary} />
            <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Session Type:</Text>
            <Text style={[styles.detailValue, { color: theme.text }]}>{params.sessionType === 'manual' ? 'Custom Setup' : 'Quick Start'}</Text>
          </View>

          <View style={styles.detailRow}>
            <MaterialIcons name="free-breakfast" size={20} color={theme.primary} />
            <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Break Duration:</Text>
            <Text style={[styles.detailValue, { color: theme.text }]}>{params.breakDuration} minutes</Text>
          </View>
        </View>

        {/* Summit Mode: Individual Tasks Breakdown */}
        {params?.focusMode === 'summit' && params?.completedTasksData && params.completedTasksData.length > 0 && (
          <View style={[styles.detailsCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <Text style={[styles.detailsTitle, { color: theme.text }]}>📋 Tasks Completed ({params.completedTasksData.length})</Text>

            {params.completedTasksData.map((taskData, index) => (
              <View key={index} style={[styles.taskBreakdownItem, { backgroundColor: 'rgba(255, 255, 255, 0.03)', borderColor: theme.border }]}>
                <View style={styles.taskBreakdownHeader}>
                  <Text style={[styles.taskBreakdownNumber, { color: theme.primary }]}>Task {index + 1}</Text>
                  <Text style={[styles.taskBreakdownTitle, { color: theme.text }]}>{taskData.task}</Text>
                </View>

                <View style={styles.taskBreakdownDetails}>
                  <View style={styles.taskBreakdownRow}>
                    <MaterialIcons name="subject" size={16} color={theme.textSecondary} />
                    <Text style={[styles.taskBreakdownLabel, { color: theme.textSecondary }]}>Subject:</Text>
                    <Text style={[styles.taskBreakdownValue, { color: theme.text }]}>{taskData.subject}</Text>
                  </View>

                  <View style={styles.taskBreakdownRow}>
                    <MaterialIcons name="schedule" size={16} color={theme.textSecondary} />
                    <Text style={[styles.taskBreakdownLabel, { color: theme.textSecondary }]}>Duration:</Text>
                    <Text style={[styles.taskBreakdownValue, { color: theme.text }]}>{taskData.duration} min</Text>
                  </View>

                  <View style={styles.taskBreakdownRow}>
                    <MaterialIcons name="psychology" size={16} color={theme.textSecondary} />
                    <Text style={[styles.taskBreakdownLabel, { color: theme.textSecondary }]}>Focus:</Text>
                    <View style={styles.starsContainer}>
                      {renderStars(taskData.focusRating)}
                    </View>
                  </View>

                  <View style={styles.taskBreakdownRow}>
                    <MaterialIcons name="trending-up" size={16} color={theme.textSecondary} />
                    <Text style={[styles.taskBreakdownLabel, { color: theme.textSecondary }]}>Productivity:</Text>
                    <View style={styles.starsContainer}>
                      {renderStars(taskData.productivityRating)}
                    </View>
                  </View>

                  {taskData.notes && (
                    <View style={styles.taskBreakdownNotes}>
                      <Text style={[styles.taskBreakdownNotesText, { color: theme.textSecondary }]}>"{taskData.notes}"</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Ratings Card */}
        <View style={[styles.ratingsCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <Text style={[styles.ratingsTitle, { color: theme.text }]}>Your Ratings</Text>

          <View style={styles.ratingRow}>
            <Text style={[styles.ratingLabel, { color: theme.textSecondary }]}>Focus Quality:</Text>
            <View style={styles.starsContainer}>
              {renderStars(params.focusRating)}
            </View>
            <Text style={[styles.ratingNumber, { color: theme.textSecondary }]}>({params.focusRating}/5)</Text>
          </View>

          <View style={styles.ratingRow}>
            <Text style={[styles.ratingLabel, { color: theme.textSecondary }]}>Productivity:</Text>
            <View style={styles.starsContainer}>
              {renderStars(params.productivity)}
            </View>
            <Text style={[styles.ratingNumber, { color: theme.textSecondary }]}>({params.productivity}/5)</Text>
          </View>

          {params.notes && (
            <View style={[styles.notesSection, { backgroundColor: 'rgba(255, 255, 255, 0.05)' }]}>
              <Text style={[styles.notesTitle, { color: theme.text }]}>Your Notes:</Text>
              <Text style={[styles.notesText, { color: theme.textSecondary }]}>"{params.notes}"</Text>
            </View>
          )}
        </View>

        {/* Achievements Card */}
        {newAchievements.length > 0 && (
          <View style={[styles.achievementsCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <Text style={[styles.achievementsTitle, { color: theme.text }]}>New Achievements! 🎉</Text>

            {newAchievements.map((achievement, index) => (
              <View key={index} style={[styles.achievementItem, { borderColor: achievement.color, backgroundColor: 'rgba(255, 255, 255, 0.03)' }]}>
                <View style={[styles.achievementIcon, { backgroundColor: achievement.color }]}>
                  <MaterialIcons name={achievement.icon} size={24} color="#fff" />
                </View>
                <View style={styles.achievementContent}>
                  <Text style={[styles.achievementTitle, { color: theme.text }]}>{achievement.title}</Text>
                  <Text style={[styles.achievementDesc, { color: theme.textSecondary }]}>{achievement.description}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Music Status Section */}
        {currentTrack && isPlaying && !isPreviewMode && (
          <View style={[styles.musicContinuing, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <MaterialIcons name="music-note" size={20} color={theme.primary} />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={[styles.musicContinuingTitle, { color: theme.text }]}>
                Music Continuing
              </Text>
              <Text style={[styles.musicContinuingText, { color: theme.textSecondary }]}>
                ♪ {currentTrack.displayName}
              </Text>
            </View>
            <TouchableOpacity onPress={stopPlayback} style={styles.musicStopBtn}>
              <Ionicons name="stop-circle-outline" size={20} color="#E57373" />
            </TouchableOpacity>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
            onPress={() => navigation.navigate('StudySessionScreen', { manualSelection: true })}
          >
            <MaterialIcons name="refresh" size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>Start Another Session</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: theme.border }]}
            onPress={() => navigation.navigate('Main', { screen: 'Analytics' })}
          >
            <MaterialIcons name="analytics" size={20} color={theme.primary} />
            <Text style={[styles.secondaryBtnText, { color: theme.text }]}>View Analytics</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tertiaryBtn}
            onPress={() => navigation.navigate('Main', { screen: 'Home' })}
          >
            <Text style={[styles.tertiaryBtnText, { color: theme.textSecondary }]}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  scoreCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginVertical: 16,
    borderWidth: 1,
  },
  scoreTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 20,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreNumber: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  scoreOutOf: {
    fontSize: 14,
    color: '#666',
  },
  scoreLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  scoreBreakdown: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 8,
    padding: 16,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#666',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'right',
  },
  ratingsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  ratingsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingLabel: {
    fontSize: 14,
    color: '#666',
    width: 80,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
    flex: 1,
    marginLeft: 8,
  },
  ratingNumber: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  notesSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  achievementsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  achievementsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    backgroundColor: '#FAFAFA',
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  achievementContent: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  achievementDesc: {
    fontSize: 14,
    color: '#666',
  },
  musicContinuing: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  musicContinuingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  musicContinuingText: {
    fontSize: 14,
    marginTop: 4,
  },
  musicStopBtn: {
    marginLeft: 16,
  },
  actionsContainer: {
    marginBottom: 32,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#4CAF50',
    marginBottom: 12,
    gap: 8,
  },
  secondaryBtnText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  tertiaryBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  tertiaryBtnText: {
    color: '#666',
    fontSize: 14,
  },
  errorText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 50,
  },
  taskBreakdownItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  taskBreakdownHeader: {
    marginBottom: 12,
  },
  taskBreakdownNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  taskBreakdownTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  taskBreakdownDetails: {
    gap: 8,
  },
  taskBreakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskBreakdownLabel: {
    fontSize: 14,
    marginLeft: 8,
    width: 100,
  },
  taskBreakdownValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  taskBreakdownNotes: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  taskBreakdownNotesText: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
  },
});

export default SessionReportScreen;