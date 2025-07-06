import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { supabase } from '../../utils/supabase';
const { useUserAppData } = require('../../utils/userAppData');
import { useBackgroundMusic } from '../../hooks/useBackgroundMusic';

export const SessionReportScreen = () => {
  const { data: userData } = useUserAppData();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  
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
      
      // Save achievements to database
      if (achievements.length > 0) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const achievementInserts = achievements.map(achievement => ({
              user_id: session.user.id,
              achievement_type: achievement.id,
              title: achievement.title,
              description: achievement.description,
              earned_at: new Date().toISOString()
            }));
            
            await supabase.from('achievements').insert(achievementInserts);
          }
        } catch (error) {
          console.error('Error saving achievements:', error);
        }
      }
    };
    
    checkAchievements();
    setSessionScore(calculateSessionScore);
  }, [params, calculateSessionScore]);

  // Get environment colors
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
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <Text style={styles.errorText}>No session data available</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={["top", "left", "right"]}>
      {/* Top Navigation */}
      <View style={[styles.topNavBar, { backgroundColor: colors.background }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Main', { screen: 'Home' })}>
          <Ionicons name="close" size={24} color="#222" />
        </TouchableOpacity>
        <View style={styles.topNavTitleRow}>
          <Text style={styles.topNavTitle}>Session Report</Text>
        </View>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Session Score Card */}
        <View style={[styles.scoreCard, { backgroundColor: colors.secondary }]}>
          <MaterialIcons name="assessment" size={32} color={colors.primary} />
          <Text style={[styles.scoreTitle, { color: colors.accent }]}>Session Quality Score</Text>
          
          <View style={styles.scoreCircle}>
            <Text style={[styles.scoreNumber, { color: getScoreColor(sessionScore) }]}>
              {sessionScore}
            </Text>
            <Text style={styles.scoreOutOf}>/ 100</Text>
          </View>
          
          <Text style={[styles.scoreLabel, { color: getScoreColor(sessionScore) }]}>
            {getScoreLabel(sessionScore)}
          </Text>
          
          {/* Score Breakdown */}
          <View style={styles.scoreBreakdown}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Completion:</Text>
              <Text style={styles.breakdownValue}>
                {params.taskCompleted ? '40/40' : `${Math.floor(40 * (params.sessionDuration / params.plannedDuration))}/40`}
              </Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Focus Rating:</Text>
              <Text style={styles.breakdownValue}>{Math.floor((params.focusRating / 5) * 25)}/25</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Productivity:</Text>
              <Text style={styles.breakdownValue}>{Math.floor((params.productivity / 5) * 25)}/25</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Notes Bonus:</Text>
              <Text style={styles.breakdownValue}>{params.notes && params.notes.trim().length > 0 ? '10' : '0'}/10</Text>
            </View>
          </View>
        </View>

        {/* Session Details Card */}
        <View style={styles.detailsCard}>
          <Text style={[styles.detailsTitle, { color: colors.accent }]}>Session Details</Text>
          
          <View style={styles.detailRow}>
            <MaterialIcons name="schedule" size={20} color={colors.primary} />
            <Text style={styles.detailLabel}>Duration:</Text>
            <Text style={styles.detailValue}>
              {params.sessionDuration} of {params.plannedDuration} minutes
              {params.taskCompleted && <Text style={{ color: colors.primary }}> ✓</Text>}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <MaterialIcons name="subject" size={20} color={colors.primary} />
            <Text style={styles.detailLabel}>Subject:</Text>
            <Text style={styles.detailValue}>{params.subject}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <MaterialIcons name="settings" size={20} color={colors.primary} />
            <Text style={styles.detailLabel}>Session Type:</Text>
            <Text style={styles.detailValue}>{params.sessionType === 'manual' ? 'Custom Setup' : 'Quick Start'}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <MaterialIcons name="free-breakfast" size={20} color={colors.primary} />
            <Text style={styles.detailLabel}>Break Duration:</Text>
            <Text style={styles.detailValue}>{params.breakDuration} minutes</Text>
          </View>
        </View>

        {/* Ratings Card */}
        <View style={styles.ratingsCard}>
          <Text style={[styles.ratingsTitle, { color: colors.accent }]}>Your Ratings</Text>
          
          <View style={styles.ratingRow}>
            <Text style={styles.ratingLabel}>Focus Quality:</Text>
            <View style={styles.starsContainer}>
              {renderStars(params.focusRating)}
            </View>
            <Text style={styles.ratingNumber}>({params.focusRating}/5)</Text>
          </View>
          
          <View style={styles.ratingRow}>
            <Text style={styles.ratingLabel}>Productivity:</Text>
            <View style={styles.starsContainer}>
              {renderStars(params.productivity)}
            </View>
            <Text style={styles.ratingNumber}>({params.productivity}/5)</Text>
          </View>
          
          {params.notes && (
            <View style={styles.notesSection}>
              <Text style={[styles.notesTitle, { color: colors.accent }]}>Your Notes:</Text>
              <Text style={styles.notesText}>"{params.notes}"</Text>
            </View>
          )}
        </View>

        {/* Achievements Card */}
        {newAchievements.length > 0 && (
          <View style={styles.achievementsCard}>
            <Text style={[styles.achievementsTitle, { color: colors.accent }]}>New Achievements! 🎉</Text>
            
            {newAchievements.map((achievement, index) => (
              <View key={index} style={[styles.achievementItem, { borderColor: achievement.color }]}>
                <View style={[styles.achievementIcon, { backgroundColor: achievement.color }]}>
                  <MaterialIcons name={achievement.icon} size={24} color="#fff" />
                </View>
                <View style={styles.achievementContent}>
                  <Text style={styles.achievementTitle}>{achievement.title}</Text>
                  <Text style={styles.achievementDesc}>{achievement.description}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Music Status Section */}
        {currentTrack && isPlaying && !isPreviewMode && (
          <View style={[styles.musicContinuing, { backgroundColor: colors.secondary }]}>
            <MaterialIcons name="music-note" size={20} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={[styles.musicContinuingTitle, { color: colors.accent }]}>
                Music Continuing
              </Text>
              <Text style={[styles.musicContinuingText, { color: colors.primary }]}>
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
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('StudySessionScreen', { manualSelection: true })}
          >
            <MaterialIcons name="refresh" size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>Start Another Session</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate('Main', { screen: 'Analytics' })}
          >
            <MaterialIcons name="analytics" size={20} color={colors.primary} />
            <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>View Analytics</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.tertiaryBtn}
            onPress={() => navigation.navigate('Main', { screen: 'Home' })}
          >
            <Text style={styles.tertiaryBtnText}>Back to Home</Text>
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
});

export default SessionReportScreen;