import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSupabaseLeaderboardWithFriends, Leaderboard, useSupabaseTasks, useSupabaseProfile } from '../../utils/supabaseHooks';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';

// Import useAuth FIRST, before userAppData
import { useAuth } from '../../context/AuthContext';

// Import userAppData functions using CommonJS require
const { useUserAppData, getLeaderboardData } = require('../../utils/userAppData');

const LeaderboardScreen = () => {
  const { user } = useAuth(); // This should now work
  const navigation = useNavigation<any>();
  const [tab, setTab] = useState<'Friends' | 'Global'>('Friends');
  const [refreshing, setRefreshing] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<any>({
    friendsLeaderboard: [],
    globalLeaderboard: [],
  });

  // Use demo data when database fails
  const { data: userData, refreshData } = useUserAppData();
  const { theme } = useTheme();

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

  const renderLeaderboardEntry = (entry: Leaderboard, index: number) => (
    <View
      key={entry.id}
      style={[
        styles.leaderboardEntry,
        { backgroundColor: theme.card },
        entry.is_current_user && styles.currentUserEntry,
        entry.is_current_user && { backgroundColor: theme.mode === 'dark' ? 'rgba(76, 175, 80, 0.1)' : '#F1F8E9' }
      ]}
    >
      <Text style={[styles.rankText, { color: theme.primary }]}>{formatRank(index)}</Text>

      <View style={styles.userInfo}>
        {entry.avatar_url ? (
          <Image source={{ uri: entry.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[
            styles.avatar,
            styles.defaultAvatar,
            { backgroundColor: theme.mode === 'dark' ? 'rgba(76, 175, 80, 0.15)' : '#E8F5E9' }
          ]}>
            <MaterialCommunityIcons name="account" size={20} color="#4CAF50" />
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
        <Text style={[styles.pointsText, { color: '#FF9800' }]}>{entry.points || 0}</Text>
        <Text style={[styles.statsLabel, { color: theme.textSecondary || '#666' }]}>points</Text>
      </View>

      <View style={styles.statsContainer}>
        <Text style={[styles.hoursText, { color: '#4CAF50' }]}>{entry.weekly_focus_time || 0}h</Text>
        <Text style={[styles.statsLabel, { color: theme.textSecondary || '#666' }]}>this week</Text>
      </View>

      <View style={styles.statsContainer}>
        <Text style={[styles.streakText, { color: '#F44336' }]}>{entry.current_streak || 0}</Text>
        <Text style={[styles.statsLabel, { color: theme.textSecondary || '#666' }]}>streak</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.primary }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('Home')}
          accessibilityRole="button"
          accessibilityLabel="Go back to Home"
        >
          <Ionicons name="arrow-back" size={22} color={theme.primary} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.title, { color: theme.primary }]}>Leaderboard</Text>
          <Text style={[styles.subtitle, { color: theme.accent }]}>
            Friends rankings • Global leaderboard • Activity feed
          </Text>
        </View>
      </View>

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Personal Productivity Summary */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
        <View style={styles.cardHeaderRow}>
          <MaterialCommunityIcons name="account-circle" size={24} color="#4CAF50" />
          <Text style={[styles.sectionTitle, { color: theme.primary }]}>Personal Productivity</Text>
        </View>
        
        {/* Main Stats */}
        <View style={styles.productivityStats}>
          <TouchableOpacity style={styles.productivityStatItem}>
            <View style={styles.productivityStatRow}>
              <MaterialCommunityIcons name="fire" size={20} color="#4CAF50" />
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
              <MaterialCommunityIcons name="checkbox-marked-circle-outline" size={20} color="#4CAF50" />
              <Text style={[styles.productivityStatLabel, { color: theme.primary }]}>Tasks Completed</Text>
            </View>
            <Text style={[styles.productivityStatValue, { color: theme.primary }]}>{getTasksCompletedThisWeek()} this week</Text>
          </TouchableOpacity>
        </View>

        {/* Weekly Focus Goal */}
        <View style={styles.weeklyGoalSection}>
          <View style={styles.weeklyGoalHeader}>
            <View style={styles.weeklyGoalIconText}>
              <MaterialCommunityIcons name="target" size={24} color="#7B61FF" />
              <Text style={[styles.weeklyGoalTitle, { color: theme.primary }]}>Weekly Focus Goal</Text>
            </View>
            <Text style={[styles.weeklyGoalProgress, { color: theme.primary }]}>
              {Math.round((userData?.weeklyFocusTime || 0) / 60)}/{userData?.onboarding?.weekly_focus_goal || 10} hours
            </Text>
          </View>
          
          <View style={[
            styles.goalProgressBar,
            { backgroundColor: theme.mode === 'dark' ? 'rgba(76, 175, 80, 0.15)' : '#E8F5E9' }
          ]}>
            <View
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
        
        <View style={[
          styles.tabRow,
          { backgroundColor: theme.mode === 'dark' ? 'rgba(76, 175, 80, 0.1)' : '#E8F5E9' }
        ]}>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              tab === 'Friends' && styles.tabBtnActive,
              tab === 'Friends' && { backgroundColor: theme.card }
            ]}
            onPress={() => setTab('Friends')}
          >
            <Text style={[styles.tabText, tab === 'Friends' && styles.tabTextActive, { color: theme.primary }]}>
              Friends
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              tab === 'Global' && styles.tabBtnActive,
              tab === 'Global' && { backgroundColor: theme.card }
            ]}
            onPress={() => setTab('Global')}
          >
            <Text style={[styles.tabText, tab === 'Global' && styles.tabTextActive, { color: theme.primary }]}>
              Global
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
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
                    borderWidth: theme.isDark ? StyleSheet.hairlineWidth : 0,
                  },
                ]}
              >
                {activity.avatar_url ? (
                  <Image source={{ uri: activity.avatar_url }} style={styles.activityAvatar} />
                ) : (
                  <View style={[
                    styles.activityAvatar,
                    styles.activityAvatarFallback,
                    { backgroundColor: theme.mode === 'dark' ? 'rgba(76, 175, 80, 0.18)' : 'rgba(76, 175, 80, 0.12)' }
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
                        { backgroundColor: theme.isDark ? 'rgba(76, 175, 80, 0.22)' : 'rgba(76, 175, 80, 0.12)' },
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
                        { backgroundColor: theme.isDark ? 'rgba(255, 112, 67, 0.22)' : 'rgba(255, 112, 67, 0.12)' },
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
                        { backgroundColor: theme.isDark ? 'rgba(66, 165, 245, 0.22)' : 'rgba(66, 165, 245, 0.12)' },
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
    </ScrollView>
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
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderRadius: 8,
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
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
    minWidth: 40,
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
