import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSupabaseLeaderboardWithFriends, Leaderboard, useSupabaseTasks, useSupabaseProfile } from '../../utils/supabaseHooks';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import Animated, { FadeInUp, FadeIn, useAnimatedStyle, withSpring, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { AnimatedButton } from '../../components/premium/AnimatedButton';
import { HolographicBadge } from '../../components/premium/HolographicBadge';
import { useCounterAnimation, usePulseAnimation, useButtonPressAnimation, useFocusAnimationKey } from '../../utils/animationUtils';
import * as Haptics from 'expo-haptics';
import { AnimationConfig, Spacing, BorderRadius, Shadows } from '../../theme/premiumTheme';
import { UnifiedHeader } from '../../components/UnifiedHeader';
import { StaggeredItem } from '../../components/premium/StaggeredList';
import { ShimmerLoader } from '../../components/premium/ShimmerLoader';

// Import useAuth FIRST, before userAppData
import { useAuth } from '../../context/AuthContext';

// Import userAppData functions using CommonJS require
const { useUserAppData, getLeaderboardData } = require('../../utils/userAppData');

const LeaderboardScreen = () => {
  const { user } = useAuth(); // This should now work
  const navigation = useNavigation<any>();
  const [tab, setTab] = useState<'Friends' | 'Global'>('Friends');
  const [refreshing, setRefreshing] = useState(false);
  const { theme, isDark } = useTheme();

  // Force animations to replay on every screen focus
  const focusKey = useFocusAnimationKey();

  // Animated tab indicator - 0 = Friends, 1 = Global
  const tabIndicatorPosition = useSharedValue(0);
  const tabRowRef = useRef<View>(null);
  const [tabWidth, setTabWidth] = React.useState(0);

  const [leaderboardData, setLeaderboardData] = useState<any>({
    friendsLeaderboard: [],
    globalLeaderboard: [],
  });

  // Use demo data when database fails
  const { data: userData, refreshData } = useUserAppData();

  const {
    data: supabaseLeaderboard,
    loading: leaderboardLoading,
    error: leaderboardError,
    refetch: refetchLeaderboard
  } = useSupabaseLeaderboardWithFriends();

  // Extract current user stats and leaderboard data
  const currentUserStats = userData?.leaderboard || userData?.stats;
  const currentLeaderboard = tab === 'Friends'
    ? (leaderboardData.friendsLeaderboard || supabaseLeaderboard?.friendsLeaderboard || [])
    : (leaderboardData.globalLeaderboard || supabaseLeaderboard?.globalLeaderboard || []);

  // General loading and error states
  const loading = leaderboardLoading;
  const error = leaderboardError ? String(leaderboardError) : null;

  // Community Activity changes based on selected tab
  // Friends tab = friends' activity from Supabase
  // Global tab = everyone's activity
  const currentActivity = React.useMemo(() => {
    return (currentLeaderboard || []).map((entry: Leaderboard, index: number) => ({
      id: entry.user_id || entry.id || `${tab.toLowerCase()}-${index}`,
      user_name: entry.display_name || 'Unknown User',
      avatar_url: entry.avatar_url,
      points: entry.points ?? 0,
      weekly_focus_time: entry.weekly_focus_time ?? 0,
      total_focus_time: entry.total_focus_time ?? 0,
      current_streak: entry.current_streak ?? 0,
      is_current_user: entry.is_current_user ?? false,
    }));
  }, [currentLeaderboard, tab]);

  useEffect(() => {
    if (leaderboardError) {
      console.log('Using demo leaderboard data due to database error');
      // Use demo data from your comprehensive system
      const demoData = getLeaderboardData(userData);
      setLeaderboardData(demoData);
    } else if (supabaseLeaderboard) {
      setLeaderboardData(supabaseLeaderboard);
    }
  }, [supabaseLeaderboard, leaderboardError, userData]);

  // Calculate tasks completed this week
  const getTasksCompletedThisWeek = () => {
    if (!userData || !userData.dailyTasksCompleted) return 0;
    
    // Use our precalculated daily tasks data
    return userData.dailyTasksCompleted.reduce((sum: number, day: any) => sum + (day.count || 0), 0);
  };

  // Calculate weekly goal percentage
  const getWeeklyGoalPercentage = () => {
    const weeklyGoal = userData?.leaderboard?.weekly_focus_goal || currentUserStats?.weekly_focus_goal || 10;
    const currentHours = userData ? (userData.weeklyFocusTime / 60) : (currentUserStats?.weekly_focus_time || 0) / 60; // Convert minutes to hours
    const percentage = Math.min(100, Math.round((currentHours / weeklyGoal) * 100));
    return { percentage, currentHours, weeklyGoal };
  };

  // Animate indicator when tab changes
  useEffect(() => {
    tabIndicatorPosition.value = withSpring(
      tab === 'Friends' ? 0 : 1,
      AnimationConfig.bouncy
    );
  }, [tab]);

  // Animated style for the sliding indicator - just the slide animation
  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tabIndicatorPosition.value * ((tabWidth - 4) / 2) } // Slide by tab width
    ],
  }));

  // Handle tab switch with haptic feedback - only slide animation, no repeated effects
  const handleTabSwitch = (newTab: 'Friends' | 'Global') => {
    if (newTab !== tab) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTab(newTab);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchLeaderboard(),
        refreshData()
      ]);
    } catch (err) {
      console.error('Error refreshing leaderboard:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddFriends = () => {
    // Navigate to Community screen with focus on "All Users" section
    navigation.navigate('Community', { initialTab: 'All Users' });
  };

  const formatRank = (index: number) => {
    const rank = index + 1;
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  // Premium Animated Leaderboard Entry
  const AnimatedLeaderboardEntry = ({ entry, index, theme }: { entry: Leaderboard; index: number; theme: any }) => {
    const rank = index + 1;
    const isTopThree = rank <= 3;
    const { animatedStyle: pressStyle, onPressIn, onPressOut } = useButtonPressAnimation();
    const pulseStyle = usePulseAnimation(entry.is_current_user);

    // Count up animation for numbers
    const pointsCount = useCounterAnimation(entry.points || 0, 800);
    const hoursCount = useCounterAnimation(entry.weekly_focus_time || 0, 800);
    const streakCount = useCounterAnimation(entry.current_streak || 0, 800);

    // Rank change tracking and animation
    const previousRankRef = useRef(rank);
    const [rankChange, setRankChange] = useState<'up' | 'down' | null>(null);
    const rankChangeOpacity = useSharedValue(0);
    const rankChangeTranslateY = useSharedValue(-10);
    const backgroundFlashOpacity = useSharedValue(0);

    useEffect(() => {
      const previousRank = previousRankRef.current;

      if (previousRank !== rank) {
        // Determine if rank improved (lower number = better) or dropped
        if (rank < previousRank) {
          setRankChange('up');
        } else if (rank > previousRank) {
          setRankChange('down');
        }

        // Trigger indicator animation
        rankChangeOpacity.value = 0;
        rankChangeTranslateY.value = rankChange === 'up' ? -10 : 10;

        rankChangeOpacity.value = withSequence(
          withTiming(1, { duration: 300 }),
          withTiming(1, { duration: 1700 }), // Hold for 1.7s
          withTiming(0, { duration: 300 })
        );

        rankChangeTranslateY.value = withSpring(0, { damping: 15, stiffness: 150 });

        // Background flash animation
        backgroundFlashOpacity.value = withSequence(
          withTiming(0.2, { duration: 150 }),
          withTiming(0, { duration: 500 })
        );

        // Update ref after animation starts
        setTimeout(() => {
          previousRankRef.current = rank;
          setRankChange(null);
        }, 2300);
      }
    }, [rank]);

    const rankChangeStyle = useAnimatedStyle(() => ({
      opacity: rankChangeOpacity.value,
      transform: [{ translateY: rankChangeTranslateY.value }],
    }));

    const backgroundFlashStyle = useAnimatedStyle(() => ({
      opacity: backgroundFlashOpacity.value,
    }));

    // Special glow for top 3
    const glowOpacity = useSharedValue(0);
    useEffect(() => {
      if (isTopThree) {
        glowOpacity.value = withSequence(
          withTiming(0.6, { duration: 500 }),
          withTiming(0.3, { duration: 500 })
        );
      }
    }, [isTopThree]);

    const glowStyle = useAnimatedStyle(() => ({
      opacity: glowOpacity.value,
    }));

    const staggerDelay = index * 80;

    return (
      <Animated.View
        entering={FadeIn.delay(staggerDelay).duration(400)}
        style={[
          styles.leaderboardEntry,
          { backgroundColor: theme.card },
          entry.is_current_user && styles.currentUserEntry,
          entry.is_current_user && { backgroundColor: isDark ? 'rgba(76, 175, 80, 0.1)' : '#F1F8E9' },
          entry.is_current_user && pulseStyle,
        ]}
      >
        {/* Background flash for rank changes */}
        {rankChange && (
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: rankChange === 'up' ? '#4CAF50' : '#F44336',
                borderRadius: 12,
              },
              backgroundFlashStyle,
            ]}
          />
        )}

        {isTopThree && (
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : '#CD7F32',
                borderRadius: 12,
              },
              glowStyle,
            ]}
          />
        )}

        <View style={styles.rankContainer}>
          <Text style={[styles.rankText, { color: theme.primary, fontSize: isTopThree ? 18 : 16 }]}>
            {formatRank(index)}
          </Text>

          {/* Rank change indicator */}
          {rankChange && (
            <Animated.View style={[styles.rankChangeIndicator, rankChangeStyle]}>
              <Ionicons
                name={rankChange === 'up' ? 'arrow-up-outline' : 'arrow-down-outline'}
                size={14}
                color={rankChange === 'up' ? '#4CAF50' : '#F44336'}
              />
            </Animated.View>
          )}
        </View>

      <View style={styles.userInfo}>
        {entry.avatar_url ? (
          <Image source={{ uri: entry.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[
            styles.avatar,
            styles.defaultAvatar,
            { backgroundColor: isDark ? 'rgba(76, 175, 80, 0.15)' : '#E8F5E9' }
          ]}>
            <Ionicons name="person-outline" size={20} color="#4CAF50" />
          </View>
        )}

        <View style={styles.userDetails}>
          <Text style={[
            styles.userName,
            { color: theme.primary },
            entry.is_current_user && styles.currentUserText,
            entry.is_current_user && { color: theme.accent }
          ]}>
            {entry.display_name || 'Unknown User'}
          </Text>
          <Text style={[styles.userLevel, { color: theme.accent }]}>Level {entry.level || 1}</Text>
        </View>
      </View>

        <View style={styles.statsContainer}>
          <Animated.Text style={[styles.pointsText, { color: '#FF9800' }]}>
            {Math.round(pointsCount.value)}
          </Animated.Text>
          <Text style={[styles.statsLabel, { color: theme.textSecondary || '#666' }]}>points</Text>
        </View>

        <View style={styles.statsContainer}>
          <Animated.Text style={[styles.hoursText, { color: '#4CAF50' }]}>
            {Math.round(hoursCount.value)}h
          </Animated.Text>
          <Text style={[styles.statsLabel, { color: theme.textSecondary || '#666' }]}>this week</Text>
        </View>

        <View style={styles.statsContainer}>
          <Animated.Text style={[styles.streakText, { color: '#F44336' }]}>
            {Math.round(streakCount.value)}
          </Animated.Text>
          <Text style={[styles.statsLabel, { color: theme.textSecondary || '#666' }]}>streak</Text>
        </View>
      </Animated.View>
    );
  };

  const renderLeaderboardEntry = (entry: Leaderboard, index: number) => (
    <AnimatedLeaderboardEntry
      key={entry.user_id || entry.id || `leaderboard-${index}`}
      entry={entry}
      index={index}
      theme={theme}
    />
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top', 'left', 'right']}>
      {/* Unified Header */}
      <UnifiedHeader title="Leaderboard" onClose={() => navigation.navigate('Home')} />

      <Animated.ScrollView
        key={focusKey}
        entering={FadeInUp.delay(100).duration(300)}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Personal Productivity Summary */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
        <View style={styles.cardHeaderRow}>
          <Ionicons name="person-circle-outline" size={24} color="#4CAF50" />
          <Text style={[styles.sectionTitle, { color: theme.primary }]}>Personal Productivity</Text>
        </View>
        
        {/* Main Stats */}
        <View style={styles.productivityStats}>
          <TouchableOpacity style={styles.productivityStatItem}>
            <View style={styles.productivityStatRow}>
              <Ionicons name="flame-outline" size={20} color="#4CAF50" />
              <Text style={[styles.productivityStatLabel, { color: theme.primary }]}>Current Streak</Text>
            </View>
            <Text style={[styles.productivityStatValue, { color: theme.primary }]}>{currentUserStats?.current_streak || 0} days</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.productivityStatItem}>
            <View style={styles.productivityStatRow}>
              <Ionicons name="time-outline" size={20} color="#4CAF50" />
              <Text style={[styles.productivityStatLabel, { color: theme.primary }]}>Focus Time</Text>
            </View>
            <Text style={[styles.productivityStatValue, { color: theme.primary }]}>
              {((currentUserStats?.weekly_focus_time || 0) / 60).toFixed(1)} hours
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.productivityStatItem}>
            <View style={styles.productivityStatRow}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#4CAF50" />
              <Text style={[styles.productivityStatLabel, { color: theme.primary }]}>Tasks Completed</Text>
            </View>
            <Text style={[styles.productivityStatValue, { color: theme.primary }]}>{getTasksCompletedThisWeek()} this week</Text>
          </TouchableOpacity>
        </View>

        {/* Weekly Focus Goal */}
        <View style={styles.weeklyGoalSection}>
          <View style={styles.weeklyGoalHeader}>
            <View style={styles.weeklyGoalIconText}>
              <Ionicons name="locate-outline" size={24} color="#7B61FF" />
              <Text style={[styles.weeklyGoalTitle, { color: theme.primary }]}>Weekly Focus Goal</Text>
            </View>
            <Text style={[styles.weeklyGoalProgress, { color: theme.primary }]}>
              {Math.round((userData?.weeklyFocusTime || 0) / 60)}/{userData?.onboarding?.weekly_focus_goal || 10} hours
            </Text>
          </View>
          
          <View style={[
            styles.goalProgressBar,
            { backgroundColor: isDark ? 'rgba(76, 175, 80, 0.15)' : '#E8F5E9' }
          ]}>
            <Animated.View
              entering={FadeIn.delay(400).duration(600)}
              style={[
                styles.goalProgressFill,
                { width: `${getWeeklyGoalPercentage().percentage}%` }
              ]}
            />
          </View>
          
          <Text style={[styles.goalPercentageText, { color: theme.primary }]}>
            You're {getWeeklyGoalPercentage().percentage}% of the way to your 10-hour weekly focus goal
          </Text>
        </View>
      </View>

      {/* Leaderboard Rankings */}
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <View style={styles.cardHeaderRow}>
          <Ionicons name="trophy-outline" size={20} color="#4CAF50" style={{ marginRight: 8 }} />
          <Text style={[styles.cardTitle, { color: theme.primary }]}>Rankings</Text>
        </View>
        
        <View
          ref={tabRowRef}
          style={[
            styles.tabRow,
            { backgroundColor: isDark ? 'rgba(76, 175, 80, 0.1)' : '#E8F5E9' }
          ]}
          onLayout={(e) => {
            setTabWidth(e.nativeEvent.layout.width);
          }}
        >
          {/* Animated sliding indicator - shadowy rounded box */}
          <Animated.View
            style={[
              styles.tabIndicator,
              {
                backgroundColor: theme.card,
                width: (tabWidth - 4) / 2, // Half width minus padding (2px each side)
              },
              indicatorStyle,
            ]}
          />

          {/* Tab buttons */}
          <TouchableOpacity
            style={styles.tabBtn}
            onPress={() => handleTabSwitch('Friends')}
          >
            <Text style={[
              styles.tabText,
              tab === 'Friends' && styles.tabTextActive,
              { color: theme.primary }
            ]}>
              Friends
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tabBtn}
            onPress={() => handleTabSwitch('Global')}
          >
            <Text style={[
              styles.tabText,
              tab === 'Global' && styles.tabTextActive,
              { color: theme.primary }
            ]}>
              Global
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ShimmerLoader variant="circular" size={48} />
            <Text style={[styles.loadingText, { color: theme.primary }]}>Loading leaderboard...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: '#F44336' }]}>{error}</Text>
            <TouchableOpacity style={[styles.retryButton, { backgroundColor: theme.primary }]} onPress={onRefresh}>
              <Text style={[styles.retryButtonText, { color: theme.background }]}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : currentLeaderboard && currentLeaderboard.length > 0 ? (
          <View style={styles.leaderboardContainer}>
            {currentLeaderboard.map((entry: Leaderboard, index: number) => renderLeaderboardEntry(entry, index))}
          </View>
        ) : (
          <View style={styles.emptyLeaderboard}>
            <Ionicons name="people-outline" size={40} color="#BDBDBD" style={{ marginBottom: 8 }} />
            <Text style={[styles.emptyLeaderboardText, { color: theme.primary }]}>
              {tab === 'Friends'
                ? 'Add friends to see their rankings and compete together!'
                : 'Check back soon to see rankings from all app users!'}
            </Text>
            {tab === 'Friends' && (
              <TouchableOpacity style={[styles.addFriendsBtn, { backgroundColor: theme.primary }]} onPress={handleAddFriends}>
                <Text style={[styles.addFriendsBtnText, { color: theme.background }]}>Add Friends</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Community Activity - Changes based on tab */}
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <View style={styles.cardHeaderRow}>
          <Ionicons
            name={tab === 'Friends' ? 'people-outline' : 'globe-outline'}
            size={20}
            color="#4CAF50"
            style={{ marginRight: 8 }}
          />
          <View>
            <Text style={[styles.cardTitle, { color: theme.primary }]}>
              {tab === 'Friends' ? 'Friends Activity' : 'Global Activity'}
            </Text>
            <Text style={[styles.cardSubtitle, { color: theme.textSecondary || '#666' }]}>
              {tab === 'Friends'
                ? 'See what your friends are up to'
                : 'Activity from all app users'}
            </Text>
          </View>
        </View>

        {currentActivity.length > 0 ? (
          <View style={styles.activityContainer}>
            {currentActivity.map((activity: any, index: number) => (
              <View
                key={activity.id || index}
                style={[
                  styles.activityItem,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border ?? '#E0E0E0',
                    borderWidth: isDark ? StyleSheet.hairlineWidth : 0,
                  },
                ]}
              >
                {activity.avatar_url ? (
                  <Image source={{ uri: activity.avatar_url }} style={styles.activityAvatar} />
                ) : (
                  <View style={[
                    styles.activityAvatar,
                    styles.activityAvatarFallback,
                    { backgroundColor: isDark ? 'rgba(76, 175, 80, 0.18)' : 'rgba(76, 175, 80, 0.12)' }
                  ]}>
                    <Ionicons
                      name={activity.is_current_user ? 'person-circle' : 'people-circle'}
                      size={26}
                      color="#4CAF50"
                    />
                  </View>
                )}
                <View style={styles.activityContent}>
                  <View style={styles.activityHeaderRow}>
                    <Text
                      style={[
                        styles.activityUserName,
                        { color: activity.is_current_user ? theme.accent : theme.primary },
                      ]}
                    >
                      {activity.is_current_user ? 'You' : activity.user_name}
                    </Text>
                    <Text style={[styles.activityPoints, { color: theme.accent }]}>
                      {activity.points?.toLocaleString?.() || activity.points || 0} pts
                    </Text>
                  </View>
                  <View style={styles.activityStatsRow}>
                    <View
                      style={[
                        styles.activityTag,
                        { backgroundColor: isDark ? 'rgba(76, 175, 80, 0.22)' : 'rgba(76, 175, 80, 0.12)' },
                      ]}
                    >
                      <Ionicons name="time-outline" size={14} color="#4CAF50" style={{ marginRight: 4 }} />
                      <Text style={[styles.activityTagText, { color: theme.text }]}>
                        {activity.weekly_focus_time || 0}h this week
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.activityTag,
                        { backgroundColor: isDark ? 'rgba(255, 112, 67, 0.22)' : 'rgba(255, 112, 67, 0.12)' },
                      ]}
                    >
                      <Ionicons name="flame-outline" size={14} color="#FF7043" style={{ marginRight: 4 }} />
                      <Text style={[styles.activityTagText, { color: theme.text }]}>
                        {activity.current_streak || 0} day streak
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.activityTag,
                        { backgroundColor: isDark ? 'rgba(66, 165, 245, 0.22)' : 'rgba(66, 165, 245, 0.12)' },
                      ]}
                    >
                      <Ionicons name="hourglass-outline" size={14} color="#42A5F5" style={{ marginRight: 4 }} />
                      <Text style={[styles.activityTagText, { color: theme.text }]}>
                        {activity.total_focus_time || 0}h total
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyLeaderboard}>
            <Ionicons
              name={tab === 'Friends' ? 'people-outline' : 'globe-outline'}
              size={40}
              color="#BDBDBD"
              style={{ marginBottom: 8 }}
            />
            <Text style={[styles.emptyLeaderboardText, { color: theme.primary }]}>
              {tab === 'Friends' ? 'No Friends Yet' : 'No Activity Yet'}
            </Text>
            <Text style={[styles.emptyLeaderboardSub, { color: theme.primary }]}>
              {tab === 'Friends'
                ? 'Add friends to see their study activity, streaks, and progress!'
                : 'Check back soon to see activity from all app users!'}
            </Text>
            {tab === 'Friends' && (
              <TouchableOpacity
                style={[styles.addFriendsBtn, { backgroundColor: theme.primary, marginTop: 12 }]}
                onPress={handleAddFriends}
              >
                <Text style={[styles.addFriendsBtnText, { color: theme.background }]}>Add Friends</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </Animated.ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
    padding: 6,
    borderRadius: 20,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  card: {
    borderRadius: 16,
    margin: 12,
    marginBottom: 0,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionTitle: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  productivityStats: {
    marginBottom: 16,
  },
  productivityStatItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  productivityStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productivityStatLabel: {
    fontSize: 11,
    marginRight: 8,
  },
  productivityStatValue: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  weeklyGoalSection: {
    marginBottom: 16,
  },
  weeklyGoalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  weeklyGoalIconText: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weeklyGoalTitle: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  weeklyGoalProgress: {
    fontSize: 12,
  },
  goalProgressBar: {
    borderRadius: 8,
    height: 20,
    marginBottom: 8,
  },
  goalProgressFill: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    height: '100%',
  },
  goalPercentageText: {
    fontSize: 12,
  },
  tabRow: {
    flexDirection: 'row',
    borderRadius: 8,
    marginBottom: 16,
    alignSelf: 'center',
    position: 'relative',
    padding: 2, // Space for the inset indicator
    overflow: 'visible', // Allow shadow to show outside
  },
  tabIndicator: {
    position: 'absolute',
    top: 2,
    left: 2,
    bottom: 2,
    borderRadius: 6,
    // Prominent shadow for visible "shadowy rounded box" effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderRadius: 8,
    zIndex: 1,
  },
  tabBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontWeight: 'bold',
    fontSize: 13,
  },
  tabTextActive: {
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 8,
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    textAlign: 'center',
    marginBottom: 8,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    fontWeight: 'bold',
  },
  leaderboardContainer: {
    marginTop: 8,
  },
  leaderboardEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
  },
  currentUserEntry: {
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  rankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 40,
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  rankChangeIndicator: {
    marginLeft: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  defaultAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  currentUserText: {
  },
  userLevel: {
    fontSize: 11,
  },
  statsContainer: {
    alignItems: 'center',
    minWidth: 50,
  },
  pointsText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  hoursText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  streakText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  statsLabel: {
    fontSize: 9,
  },
  emptyLeaderboard: {
    alignItems: 'center',
    padding: 32,
  },
  emptyLeaderboardText: {
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyLeaderboardSub: {
    fontSize: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
  addFriendsBtn: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  addFriendsBtnText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  activityContainer: {
    marginTop: 8,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  activityContent: {
    flex: 1,
  },
  activityUserName: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  activityAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  activityAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activityPoints: {
    fontSize: 13,
    fontWeight: '600',
  },
  activityStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  activityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 6,
  },
  activityTagText: {
    fontSize: 11,
    fontWeight: '500',
  },
});

export default LeaderboardScreen;
