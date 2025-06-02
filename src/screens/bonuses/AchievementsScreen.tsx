import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Modal, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSupabaseAchievements } from '../../utils/supabaseHooks';
import { supabase } from '../../utils/supabase';
import { useTheme } from '../../context/ThemeContext';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  iconFamily: 'Ionicons' | 'MaterialCommunityIcons';
  category: string;
  requiredValue: number;
  currentValue?: number;
  earned: boolean;
  earnedAt?: string;
  color: string;
  reward?: string;
}

const AchievementsScreen = () => {
  const navigation = useNavigation();
  const { achievements: earnedAchievements, loading, error } = useSupabaseAchievements();
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [userStats, setUserStats] = useState({
    totalFocusTime: 0,
    totalSessions: 0,
    currentStreak: 0,
    longestStreak: 0,
    tasksCompleted: 0,
    level: 1,
    friendsCount: 0,
  });
  const { theme } = useTheme();

  // Define all possible achievements
  const achievementsList: Achievement[] = [
    // Focus Time Achievements
    {
      id: 'first_hour',
      title: 'First Hour',
      description: 'Complete your first hour of focused study',
      icon: 'time-outline',
      iconFamily: 'Ionicons',
      category: 'Focus Time',
      requiredValue: 1,
      color: '#4CAF50',
      earned: false,
      reward: '50 points',
    },
    {
      id: 'focus_master_10',
      title: 'Focus Master',
      description: 'Complete 10 hours of focused study',
      icon: 'timer',
      iconFamily: 'MaterialCommunityIcons',
      category: 'Focus Time',
      requiredValue: 10,
      color: '#2196F3',
      earned: false,
      reward: '200 points',
    },
    {
      id: 'deep_focus_50',
      title: 'Deep Focus',
      description: 'Complete 50 hours of focused study',
      icon: 'brain',
      iconFamily: 'MaterialCommunityIcons',
      category: 'Focus Time',
      requiredValue: 50,
      color: '#9C27B0',
      earned: false,
      reward: '500 points',
    },
    {
      id: 'zen_master_100',
      title: 'Zen Master',
      description: 'Complete 100 hours of focused study',
      icon: 'meditation',
      iconFamily: 'MaterialCommunityIcons',
      category: 'Focus Time',
      requiredValue: 100,
      color: '#FF9800',
      earned: false,
      reward: '1000 points',
    },
    // Streak Achievements
    {
      id: 'getting_started_3',
      title: 'Getting Started',
      description: 'Maintain a 3-day study streak',
      icon: 'fire',
      iconFamily: 'MaterialCommunityIcons',
      category: 'Streaks',
      requiredValue: 3,
      color: '#F44336',
      earned: false,
      reward: '100 points',
    },
    {
      id: 'week_warrior_7',
      title: 'Week Warrior',
      description: 'Maintain a 7-day study streak',
      icon: 'calendar-week',
      iconFamily: 'MaterialCommunityIcons',
      category: 'Streaks',
      requiredValue: 7,
      color: '#E91E63',
      earned: false,
      reward: '250 points',
    },
    {
      id: 'habit_builder_30',
      title: 'Habit Builder',
      description: 'Maintain a 30-day study streak',
      icon: 'trending-up',
      iconFamily: 'Ionicons',
      category: 'Streaks',
      requiredValue: 30,
      color: '#673AB7',
      earned: false,
      reward: '750 points',
    },
    // Task Achievements
    {
      id: 'task_starter_5',
      title: 'Task Starter',
      description: 'Complete 5 tasks',
      icon: 'checkbox-marked-circle',
      iconFamily: 'MaterialCommunityIcons',
      category: 'Tasks',
      requiredValue: 5,
      color: '#00BCD4',
      earned: false,
      reward: '75 points',
    },
    {
      id: 'productive_25',
      title: 'Productive',
      description: 'Complete 25 tasks',
      icon: 'clipboard-check',
      iconFamily: 'MaterialCommunityIcons',
      category: 'Tasks',
      requiredValue: 25,
      color: '#009688',
      earned: false,
      reward: '300 points',
    },
    {
      id: 'task_master_100',
      title: 'Task Master',
      description: 'Complete 100 tasks',
      icon: 'trophy',
      iconFamily: 'Ionicons',
      category: 'Tasks',
      requiredValue: 100,
      color: '#FFD700',
      earned: false,
      reward: '1000 points',
    },
    // Social Achievements
    {
      id: 'social_butterfly_5',
      title: 'Social Butterfly',
      description: 'Add 5 friends',
      icon: 'people',
      iconFamily: 'Ionicons',
      category: 'Social',
      requiredValue: 5,
      color: '#3F51B5',
      earned: false,
      reward: '150 points',
    },
    {
      id: 'community_builder_10',
      title: 'Community Builder',
      description: 'Add 10 friends',
      icon: 'account-group',
      iconFamily: 'MaterialCommunityIcons',
      category: 'Social',
      requiredValue: 10,
      color: '#2196F3',
      earned: false,
      reward: '300 points',
    },
    // Level Achievements
    {
      id: 'level_5',
      title: 'Rising Star',
      description: 'Reach Level 5',
      icon: 'star',
      iconFamily: 'Ionicons',
      category: 'Levels',
      requiredValue: 5,
      color: '#FFC107',
      earned: false,
      reward: 'Special Badge',
    },
    {
      id: 'level_10',
      title: 'Scholar',
      description: 'Reach Level 10',
      icon: 'school',
      iconFamily: 'Ionicons',
      category: 'Levels',
      requiredValue: 10,
      color: '#795548',
      earned: false,
      reward: 'Exclusive Theme',
    },
  ];

  // Fetch user stats to calculate achievement progress
  useEffect(() => {
    fetchUserStats();
  }, []);

  const fetchUserStats = async () => {
    const user = supabase.auth.user();
    if (!user) return;

    try {
      // Fetch focus sessions stats
      const { data: sessions } = await supabase
        .from('focus_sessions')
        .select('duration')
        .eq('user_id', user.id)
        .eq('completed', true);

      const totalFocusTime = sessions?.reduce((sum, s) => sum + (s.duration || 0), 0) || 0;
      
      // Fetch leaderboard stats
      const { data: leaderboardStats } = await supabase
        .from('leaderboard_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Fetch tasks count
      const { count: tasksCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'completed');

      // Fetch friends count
      const { count: friendsCount } = await supabase
        .from('friends')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'accepted');

      setUserStats({
        totalFocusTime: Math.floor(totalFocusTime / 60), // Convert to hours
        totalSessions: sessions?.length || 0,
        currentStreak: leaderboardStats?.current_streak || 0,
        longestStreak: leaderboardStats?.longest_streak || 0,
        tasksCompleted: tasksCount || 0,
        level: leaderboardStats?.level || 1,
        friendsCount: friendsCount || 0,
      });
    } catch (err) {
      console.error('Error fetching user stats:', err);
    }
  };

  // Calculate progress for each achievement
  const getAchievementProgress = (achievement: Achievement): number => {
    let currentValue = 0;
    
    switch (achievement.category) {
      case 'Focus Time':
        currentValue = userStats.totalFocusTime;
        break;
      case 'Streaks':
        currentValue = userStats.currentStreak;
        break;
      case 'Tasks':
        currentValue = userStats.tasksCompleted;
        break;
      case 'Social':
        currentValue = userStats.friendsCount;
        break;
      case 'Levels':
        currentValue = userStats.level;
        break;
    }
    
    return Math.min((currentValue / achievement.requiredValue) * 100, 100);
  };

  // Check if achievement is earned
  const isAchievementEarned = (achievementId: string): boolean => {
    return earnedAchievements.some(a => a.achievement_type === achievementId);
  };

  // Group achievements by category
  const groupedAchievements = achievementsList.reduce((acc, achievement) => {
    if (!acc[achievement.category]) {
      acc[achievement.category] = [];
    }
    const earned = isAchievementEarned(achievement.id);
    acc[achievement.category].push({
      ...achievement,
      earned,
      currentValue: getAchievementProgress(achievement),
    });
    return acc;
  }, {} as Record<string, Achievement[]>);

  const renderIcon = (achievement: Achievement) => {
    const size = 32;
    const color = achievement.earned ? achievement.color : '#BDBDBD';
    
    if (achievement.iconFamily === 'Ionicons') {
      return <Ionicons name={achievement.icon as any} size={size} color={color} />;
    } else {
      return <MaterialCommunityIcons name={achievement.icon as any} size={size} color={color} />;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading achievements...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={[styles.header, { backgroundColor: theme.card }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: theme.background }]}>
          <Ionicons name="arrow-back" size={24} color={theme.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.primary }]}>Achievements</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { backgroundColor: theme.background }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Summary */}
        <View style={styles.statsContainer}>
          <Text style={styles.statsTitle}>Your Progress</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{earnedAchievements.length}</Text>
              <Text style={styles.statLabel}>Unlocked</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{achievementsList.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {Math.round((earnedAchievements.length / achievementsList.length) * 100)}%
              </Text>
              <Text style={styles.statLabel}>Complete</Text>
            </View>
          </View>
        </View>

        {/* Achievement Categories */}
        {Object.entries(groupedAchievements).map(([category, achievements]) => (
          <View key={category} style={styles.categoryContainer}>
            <Text style={styles.categoryTitle}>{category}</Text>
            <View style={styles.achievementsGrid}>
              {achievements.map((achievement) => (
                <TouchableOpacity
                  key={achievement.id}
                  style={[
                    styles.achievementCard,
                    achievement.earned && styles.achievementCardEarned,
                  ]}
                  onPress={() => setSelectedAchievement(achievement)}
                >
                  <View style={styles.achievementIcon}>
                    {renderIcon(achievement)}
                  </View>
                  <Text style={[
                    styles.achievementTitle,
                    achievement.earned && styles.achievementTitleEarned,
                  ]} numberOfLines={1}>
                    {achievement.title}
                  </Text>
                  {!achievement.earned && (
                    <View style={styles.progressBar}>
                      <View 
                        style={[
                          styles.progressFill,
                          { 
                            width: `${achievement.currentValue || 0}%`,
                            backgroundColor: achievement.color,
                          }
                        ]} 
                      />
                    </View>
                  )}
                  {achievement.earned && (
                    <Ionicons 
                      name="checkmark-circle" 
                      size={20} 
                      color={achievement.color}
                      style={styles.earnedIcon}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Achievement Detail Modal */}
      <Modal
        visible={!!selectedAchievement}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedAchievement(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedAchievement && (
              <>
                <View style={[
                  styles.modalIcon,
                  { backgroundColor: selectedAchievement.color + '20' }
                ]}>
                  {renderIcon(selectedAchievement)}
                </View>
                <Text style={styles.modalTitle}>{selectedAchievement.title}</Text>
                <Text style={styles.modalDescription}>
                  {selectedAchievement.description}
                </Text>
                
                {selectedAchievement.earned ? (
                  <View style={styles.earnedBadge}>
                    <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                    <Text style={styles.earnedText}>Earned!</Text>
                  </View>
                ) : (
                  <View>
                    <View style={styles.modalProgressBar}>
                      <View 
                        style={[
                          styles.modalProgressFill,
                          { 
                            width: `${selectedAchievement.currentValue || 0}%`,
                            backgroundColor: selectedAchievement.color,
                          }
                        ]} 
                      />
                    </View>
                    <Text style={styles.progressText}>
                      Progress: {Math.round(selectedAchievement.currentValue || 0)}%
                    </Text>
                  </View>
                )}
                
                {selectedAchievement.reward && (
                  <View style={styles.rewardContainer}>
                    <Ionicons name="gift" size={16} color="#FF9800" />
                    <Text style={styles.rewardText}>
                      Reward: {selectedAchievement.reward}
                    </Text>
                  </View>
                )}
                
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setSelectedAchievement(null)}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  statsContainer: {
    backgroundColor: '#E8F5E9',
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 16,
    padding: 20,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  categoryContainer: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 20,
    marginBottom: 12,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
  },
  achievementCard: {
    width: '31%',
    aspectRatio: 1,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 12,
    margin: '1.16%',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  achievementCardEarned: {
    backgroundColor: '#F1F8E9',
  },
  achievementIcon: {
    marginBottom: 8,
  },
  achievementTitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  achievementTitleEarned: {
    color: '#1B5E20',
    fontWeight: 'bold',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  earnedIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    alignItems: 'center',
  },
  modalIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalProgressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  modalProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  earnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  earnedText: {
    color: '#4CAF50',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  rewardText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#FF9800',
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: '#1B5E20',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  closeButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default AchievementsScreen; 