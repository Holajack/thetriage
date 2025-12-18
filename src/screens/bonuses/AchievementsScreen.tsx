import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSupabaseAchievements } from '../../utils/supabaseHooks';
import { supabase } from '../../utils/supabase';
import { useTheme } from '../../context/ThemeContext';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { HolographicBadge, BadgeGrid } from '../../components/premium/HolographicBadge';
import { AnimatedButton } from '../../components/premium/AnimatedButton';
import { StaggeredItem } from '../../components/premium/StaggeredList';
import { Typography, Spacing, BorderRadius, Shadows, PremiumColors } from '../../theme/premiumTheme';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  iconFamily: 'Ionicons';
  category: string;
  requiredValue: number;
  currentValue?: number;
  earned: boolean;
  earnedAt?: string;
  color: string;
  reward?: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
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
      rarity: 'common',
    },
    {
      id: 'focus_master_10',
      title: 'Focus Master',
      description: 'Complete 10 hours of focused study',
      icon: 'timer-outline',
      iconFamily: 'Ionicons',
      category: 'Focus Time',
      requiredValue: 10,
      color: '#2196F3',
      earned: false,
      reward: '200 points',
      rarity: 'rare',
    },
    {
      id: 'deep_focus_50',
      title: 'Deep Focus',
      description: 'Complete 50 hours of focused study',
      icon: 'bulb-outline',
      iconFamily: 'Ionicons',
      category: 'Focus Time',
      requiredValue: 50,
      color: '#9C27B0',
      earned: false,
      reward: '500 points',
      rarity: 'epic',
    },
    {
      id: 'zen_master_100',
      title: 'Zen Master',
      description: 'Complete 100 hours of focused study',
      icon: 'flower-outline',
      iconFamily: 'Ionicons',
      category: 'Focus Time',
      requiredValue: 100,
      color: '#FF9800',
      earned: false,
      reward: '1000 points',
      rarity: 'legendary',
    },
    // Streak Achievements
    {
      id: 'getting_started_3',
      title: 'Getting Started',
      description: 'Maintain a 3-day study streak',
      icon: 'flame-outline',
      iconFamily: 'Ionicons',
      category: 'Streaks',
      requiredValue: 3,
      color: '#F44336',
      earned: false,
      reward: '100 points',
      rarity: 'common',
    },
    {
      id: 'week_warrior_7',
      title: 'Week Warrior',
      description: 'Maintain a 7-day study streak',
      icon: 'calendar-outline',
      iconFamily: 'Ionicons',
      category: 'Streaks',
      requiredValue: 7,
      color: '#E91E63',
      earned: false,
      reward: '250 points',
      rarity: 'rare',
    },
    {
      id: 'habit_builder_30',
      title: 'Habit Builder',
      description: 'Maintain a 30-day study streak',
      icon: 'trending-up-outline',
      iconFamily: 'Ionicons',
      category: 'Streaks',
      requiredValue: 30,
      color: '#673AB7',
      earned: false,
      reward: '750 points',
      rarity: 'epic',
    },
    // Task Achievements
    {
      id: 'task_starter_5',
      title: 'Task Starter',
      description: 'Complete 5 tasks',
      icon: 'checkmark-circle-outline',
      iconFamily: 'Ionicons',
      category: 'Tasks',
      requiredValue: 5,
      color: '#00BCD4',
      earned: false,
      reward: '75 points',
      rarity: 'common',
    },
    {
      id: 'productive_25',
      title: 'Productive',
      description: 'Complete 25 tasks',
      icon: 'clipboard-outline',
      iconFamily: 'Ionicons',
      category: 'Tasks',
      requiredValue: 25,
      color: '#009688',
      earned: false,
      reward: '300 points',
      rarity: 'rare',
    },
    {
      id: 'task_master_100',
      title: 'Task Master',
      description: 'Complete 100 tasks',
      icon: 'trophy-outline',
      iconFamily: 'Ionicons',
      category: 'Tasks',
      requiredValue: 100,
      color: '#FFD700',
      earned: false,
      reward: '1000 points',
      rarity: 'legendary',
    },
    // Social Achievements
    {
      id: 'social_butterfly_5',
      title: 'Social Butterfly',
      description: 'Add 5 friends',
      icon: 'people-outline',
      iconFamily: 'Ionicons',
      category: 'Social',
      requiredValue: 5,
      color: '#3F51B5',
      earned: false,
      reward: '150 points',
      rarity: 'common',
    },
    {
      id: 'community_builder_10',
      title: 'Community Builder',
      description: 'Add 10 friends',
      icon: 'person-outline',
      iconFamily: 'Ionicons',
      category: 'Social',
      requiredValue: 10,
      color: '#2196F3',
      earned: false,
      reward: '300 points',
      rarity: 'rare',
    },
    // Level Achievements
    {
      id: 'level_5',
      title: 'Rising Star',
      description: 'Reach Level 5',
      icon: 'star-outline',
      iconFamily: 'Ionicons',
      category: 'Levels',
      requiredValue: 5,
      color: '#FFC107',
      earned: false,
      reward: 'Special Badge',
      rarity: 'rare',
    },
    {
      id: 'level_10',
      title: 'Scholar',
      description: 'Reach Level 10',
      icon: 'school-outline',
      iconFamily: 'Ionicons',
      category: 'Levels',
      requiredValue: 10,
      color: '#795548',
      earned: false,
      reward: 'Exclusive Theme',
      rarity: 'epic',
    },
  ];

  // Configure header
  useEffect(() => {
    navigation.setOptions({
      title: 'Achievements',
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('Bonuses' as never)}
          style={{ marginLeft: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.primary} />
        </TouchableOpacity>
      ),
      headerRight: () => null, // Remove hamburger menu
    });
  }, [navigation, theme]);

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

    return <Ionicons name={achievement.icon as any} size={size} color={color} />;
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
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { backgroundColor: theme.background }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Summary */}
        <Animated.View
          entering={FadeInUp.delay(100).springify()}
          style={[styles.statsContainer, { backgroundColor: theme.primary + '15' }]}
        >
          <LinearGradient
            colors={[theme.primary + '10', theme.primary + '05']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statsGradient}
          >
            <Text style={[styles.statsTitle, { color: theme.text }]}>Your Progress</Text>
            <View style={styles.statsRow}>
              <Animated.View entering={FadeIn.delay(200)} style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.primary }]}>{earnedAchievements.length}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Unlocked</Text>
              </Animated.View>
              <Animated.View entering={FadeIn.delay(250)} style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.primary }]}>{achievementsList.length}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total</Text>
              </Animated.View>
              <Animated.View entering={FadeIn.delay(300)} style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.primary }]}>
                  {Math.round((earnedAchievements.length / achievementsList.length) * 100)}%
                </Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Complete</Text>
              </Animated.View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Achievement Categories */}
        {Object.entries(groupedAchievements).map(([category, achievements], categoryIndex) => (
          <StaggeredItem
            key={category}
            index={categoryIndex}
            delay="normal"
            direction="up"
            style={styles.categoryContainer}
          >
            <Text style={[styles.categoryTitle, { color: theme.text }]}>{category}</Text>
            <View style={styles.achievementsGrid}>
              {achievements.map((achievement, index) => (
                <HolographicBadge
                  key={achievement.id}
                  title={achievement.title}
                  description={achievement.description}
                  icon={renderIcon(achievement)}
                  unlocked={achievement.earned}
                  rarity={achievement.rarity}
                  progress={achievement.earned ? 1 : (achievement.currentValue || 0) / 100}
                  size="small"
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedAchievement(achievement);
                  }}
                  showCelebration={false}
                  style={styles.achievementBadge}
                />
              ))}
            </View>
          </StaggeredItem>
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
                
                <AnimatedButton
                  title="Close"
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedAchievement(null);
                  }}
                  variant="primary"
                  size="large"
                  gradient
                  gradientColors={PremiumColors.gradients.primary as [string, string, ...string[]]}
                  style={{ marginTop: Spacing.md }}
                />
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
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.md,
  },
  statsGradient: {
    padding: Spacing.lg,
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
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  achievementBadge: {
    marginBottom: Spacing.xs,
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