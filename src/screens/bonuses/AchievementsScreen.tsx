import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useConvexAchievements } from '../../hooks/useConvex';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { HolographicBadge } from '../../components/premium/HolographicBadge';
import { AnimatedButton } from '../../components/premium/AnimatedButton';
import { StaggeredItem } from '../../components/premium/StaggeredList';
import { ShimmerLoader } from '../../components/premium/ShimmerLoader';
import { Typography, Spacing, PremiumColors } from '../../theme/premiumTheme';
import { glassStyles } from '../../components/premium/LiquidGlass';
import { useCounterAnimation, useFocusAnimationKey } from '../../utils/animationUtils';

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

const TOTAL_ACHIEVEMENTS = 14;

const AchievementsScreen = () => {
  const navigation = useNavigation();
  const { achievements: earnedAchievements, loading } = useConvexAchievements();
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const { theme, isDark } = useTheme();
  const { leaderboard } = useAuth();
  const focusKey = useFocusAnimationKey();

  // Real user stats from Convex leaderboard
  const userStats = {
    totalFocusTime: Math.round((leaderboard?.total_focus_time ?? 0) / 60), // hours
    totalSessions: leaderboard?.total_sessions ?? 0,
    currentStreak: leaderboard?.current_streak ?? 0,
    longestStreak: leaderboard?.longest_streak ?? 0,
    tasksCompleted: leaderboard?.sessions_completed ?? 0,
    level: leaderboard?.level ?? 1,
    friendsCount: 0,
  };

  // Animated counters
  const earnedCount = earnedAchievements.length;
  const completionPercent = Math.round((earnedCount / TOTAL_ACHIEVEMENTS) * 100);
  const earnedCounter = useCounterAnimation(earnedCount, 800);
  const percentCounter = useCounterAnimation(completionPercent, 1000);

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

  // Calculate progress for each achievement
  const getAchievementProgress = (achievement: Achievement): number => {
    let currentValue = 0;

    switch (achievement.category) {
      case 'Focus Time':
        currentValue = userStats.totalFocusTime;
        break;
      case 'Streaks':
        currentValue = Math.max(userStats.currentStreak, userStats.longestStreak);
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
    const color = achievement.earned ? achievement.color : theme.textSecondary;
    return <Ionicons name={achievement.icon as any} size={size} color={color} />;
  };

  // Category icons for section headers
  const categoryIcons: Record<string, { icon: string; color: string }> = {
    'Focus Time': { icon: 'time', color: '#4CAF50' },
    'Streaks': { icon: 'flame', color: '#F44336' },
    'Tasks': { icon: 'checkmark-circle', color: '#00BCD4' },
    'Social': { icon: 'people', color: '#3F51B5' },
    'Levels': { icon: 'star', color: '#FFC107' },
  };

  // Progress ring component
  const ProgressRing = () => {
    const size = 90;
    const strokeWidth = 7;

    return (
      <View style={[styles.progressRingOuter, { width: size, height: size }]}>
        <View
          style={[
            styles.progressRingBg,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: strokeWidth,
              borderColor: theme.text + '12',
            },
          ]}
        />
        <View
          style={[
            styles.progressRingFg,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: strokeWidth,
              borderColor: theme.primary,
              borderTopColor: completionPercent > 0 ? theme.primary : 'transparent',
              borderRightColor: completionPercent > 25 ? theme.primary : 'transparent',
              borderBottomColor: completionPercent > 50 ? theme.primary : 'transparent',
              borderLeftColor: completionPercent > 75 ? theme.primary : 'transparent',
            },
          ]}
        />
        <View style={styles.progressRingCenter}>
          <Ionicons name="trophy" size={18} color={theme.primary} />
          <Animated.Text style={[styles.progressRingPercent, { color: theme.text }]}>
            {Math.round(percentCounter.value)}%
          </Animated.Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { backgroundColor: theme.background }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate('Bonuses' as never)}
          >
            <View style={[styles.backButtonCircle, { backgroundColor: theme.text + '20' }]}>
              <Ionicons name="arrow-back" size={22} color={theme.text} />
            </View>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Achievements</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContent}>
          <ShimmerLoader variant="card" height={140} style={{ marginBottom: 24, marginHorizontal: 16 }} />
          <ShimmerLoader variant="text" width={120} height={16} style={{ marginBottom: 16, marginHorizontal: 20 }} />
          <View style={styles.loadingGrid}>
            <ShimmerLoader variant="card" width={80} height={100} style={{ borderRadius: 12 }} />
            <ShimmerLoader variant="card" width={80} height={100} style={{ borderRadius: 12 }} />
            <ShimmerLoader variant="card" width={80} height={100} style={{ borderRadius: 12 }} />
            <ShimmerLoader variant="card" width={80} height={100} style={{ borderRadius: 12 }} />
          </View>
          <ShimmerLoader variant="text" width={100} height={16} style={{ marginTop: 24, marginBottom: 16, marginHorizontal: 20 }} />
          <View style={styles.loadingGrid}>
            <ShimmerLoader variant="card" width={80} height={100} style={{ borderRadius: 12 }} />
            <ShimmerLoader variant="card" width={80} height={100} style={{ borderRadius: 12 }} />
            <ShimmerLoader variant="card" width={80} height={100} style={{ borderRadius: 12 }} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* ===== HEADER ===== */}
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate('Bonuses' as never);
          }}
        >
          <View style={[styles.backButtonCircle, { backgroundColor: theme.text + '20' }]}>
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </View>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Achievements</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        key={focusKey}
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ===== PROGRESS SUMMARY CARD ===== */}
        <Animated.View entering={FadeIn.duration(400)}>
          <View style={[styles.progressCard, glassStyles.mediumCard(isDark), { backgroundColor: theme.card }]}>
            <Text style={[styles.progressSectionLabel, { color: theme.textSecondary }]}>
              YOUR PROGRESS
            </Text>
            <View style={styles.progressContent}>
              <ProgressRing />
              <View style={styles.progressStats}>
                <View style={styles.progressStatRow}>
                  <Animated.Text style={[styles.progressStatNumber, { color: theme.text }]}>
                    {Math.round(earnedCounter.value)}
                  </Animated.Text>
                  <Text style={[styles.progressStatLabel, { color: theme.textSecondary }]}>
                    {' '}/ {TOTAL_ACHIEVEMENTS} Unlocked
                  </Text>
                </View>
                <Text style={[styles.progressSubtext, { color: theme.textSecondary }]}>
                  {earnedCount === 0
                    ? 'Start earning achievements!'
                    : earnedCount < 5
                    ? 'Great start! Keep going.'
                    : earnedCount < 10
                    ? 'Nice progress! Over halfway.'
                    : 'Almost there! So close.'}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ===== ACHIEVEMENT CATEGORIES ===== */}
        {Object.entries(groupedAchievements).map(([category, achievements], categoryIndex) => {
          const catMeta = categoryIcons[category] || { icon: 'help-circle', color: theme.primary };

          return (
            <StaggeredItem
              key={category}
              index={categoryIndex}
              delay="normal"
              direction="up"
              style={styles.categoryContainer}
            >
              {/* Category header with accent dot */}
              <View style={styles.categoryHeader}>
                <View style={[styles.categoryDot, { backgroundColor: catMeta.color }]} />
                <Ionicons
                  name={catMeta.icon as any}
                  size={16}
                  color={catMeta.color}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.categoryTitle, { color: theme.textSecondary }]}>
                  {category.toUpperCase()}
                </Text>
              </View>

              {/* Achievement badges */}
              <View style={styles.achievementsGrid}>
                {achievements.map((achievement) => (
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
          );
        })}
      </ScrollView>

      {/* ===== ACHIEVEMENT DETAIL MODAL ===== */}
      <Modal
        visible={!!selectedAchievement}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedAchievement(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            {selectedAchievement && (
              <>
                <View
                  style={[
                    styles.modalIcon,
                    { backgroundColor: selectedAchievement.color + '20' },
                  ]}
                >
                  {renderIcon(selectedAchievement)}
                </View>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  {selectedAchievement.title}
                </Text>
                <Text style={[styles.modalDescription, { color: theme.textSecondary }]}>
                  {selectedAchievement.description}
                </Text>

                {selectedAchievement.earned ? (
                  <View style={[styles.earnedBadge, { backgroundColor: theme.primary + '15' }]}>
                    <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
                    <Text style={[styles.earnedText, { color: theme.primary }]}>Earned!</Text>
                  </View>
                ) : (
                  <View style={{ width: '100%' }}>
                    <View style={[styles.modalProgressBar, { backgroundColor: theme.text + '15' }]}>
                      <View
                        style={[
                          styles.modalProgressFill,
                          {
                            width: `${selectedAchievement.currentValue || 0}%`,
                            backgroundColor: selectedAchievement.color,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.progressText, { color: theme.textSecondary }]}>
                      Progress: {Math.round(selectedAchievement.currentValue || 0)}%
                    </Text>
                  </View>
                )}

                {selectedAchievement.reward && (
                  <View style={styles.rewardContainer}>
                    <Ionicons name="gift" size={16} color="#FF9800" />
                    <Text style={[styles.rewardText, { color: theme.text }]}>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ===== HEADER =====
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  backButton: {
    padding: 4,
  },
  backButtonCircle: {
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

  // ===== LOADING =====
  loadingContent: {
    paddingTop: 20,
  },
  loadingGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },

  // ===== SCROLL =====
  scrollContent: {
    paddingBottom: 24,
  },

  // ===== PROGRESS CARD =====
  progressCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    padding: 20,
    borderRadius: 16,
  },
  progressSectionLabel: {
    ...Typography.label,
    marginBottom: 16,
  },
  progressContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressStats: {
    flex: 1,
    marginLeft: 20,
  },
  progressStatRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  progressStatNumber: {
    fontSize: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  progressStatLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressSubtext: {
    fontSize: 13,
    marginTop: 4,
  },

  // ===== PROGRESS RING =====
  progressRingOuter: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRingBg: {
    position: 'absolute',
  },
  progressRingFg: {
    position: 'absolute',
    transform: [{ rotate: '-45deg' }],
  },
  progressRingCenter: {
    alignItems: 'center',
    gap: 2,
  },
  progressRingPercent: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  // ===== CATEGORIES =====
  categoryContainer: {
    marginTop: 28,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  categoryDot: {
    width: 4,
    height: 16,
    borderRadius: 2,
    marginRight: 8,
  },
  categoryTitle: {
    ...Typography.label,
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

  // ===== MODAL =====
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
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
    fontWeight: '700',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  modalProgressBar: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  modalProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  earnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
    gap: 8,
  },
  earnedText: {
    fontWeight: '700',
    fontSize: 14,
  },
  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  rewardText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default AchievementsScreen;
