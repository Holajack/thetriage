import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSupabaseLeaderboardWithFriends, useSupabaseCommunityActivity, Leaderboard, useSupabaseTasks, useSupabaseProfile } from '../../utils/supabaseHooks';
import { useAuth } from '../../context/AuthContext'; // Add this import
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
const { useUserAppData, getLeaderboardData } = require('../../utils/userAppData');

const LeaderboardScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [tab, setTab] = useState<'Friends' | 'Global'>('Friends');
  const [refreshing, setRefreshing] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<any>({
    friendsLeaderboard: [],
    globalLeaderboard: [],
  });

  // Use demo data when database fails
  const { data: userData } = useUserAppData();
  const { theme } = useTheme();

  const {
    data: supabaseLeaderboard,
    loading: leaderboardLoading,
    error: leaderboardError,
    refetch: refetchLeaderboard
  } = useSupabaseLeaderboardWithFriends();

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
    if (!userData) return 0;
    
    // Use our precalculated daily tasks data
    return userData.dailyTasksCompleted.reduce((sum, day) => sum + day.count, 0);
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
        loadLeaderboardData(),
        refetchActivity(),
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

  const renderActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'focus_session':
        return <MaterialCommunityIcons name="clock-outline" size={24} color="#4CAF50" />;
      case 'achievement':
        return <MaterialCommunityIcons name="trophy" size={24} color="#FFD700" />;
      case 'friend_request':
        return <MaterialCommunityIcons name="account-plus" size={24} color="#2196F3" />;
      default:
        return <MaterialCommunityIcons name="account-circle" size={24} color="#4CAF50" />;
    }
  };

  const renderLeaderboardEntry = (entry: Leaderboard, index: number) => (
    <View 
      key={entry.id} 
      style={[
        styles.leaderboardEntry,
        entry.is_current_user && styles.currentUserEntry
      ]}
    >
      <Text style={styles.rankText}>{formatRank(index)}</Text>
      
      <View style={styles.userInfo}>
        {entry.avatar_url ? (
          <Image source={{ uri: entry.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.defaultAvatar]}>
            <MaterialCommunityIcons name="account" size={20} color="#4CAF50" />
          </View>
        )}
        
        <View style={styles.userDetails}>
          <Text style={[styles.userName, entry.is_current_user && styles.currentUserText]}>
            {entry.display_name || 'Unknown User'}
          </Text>
          <Text style={styles.userLevel}>Level {entry.level || 1}</Text>
        </View>
      </View>
      
      <View style={styles.statsContainer}>
        <Text style={styles.pointsText}>{entry.points || 0}</Text>
        <Text style={styles.statsLabel}>points</Text>
      </View>
      
      <View style={styles.statsContainer}>
        <Text style={styles.hoursText}>{entry.weekly_focus_time || 0}h</Text>
        <Text style={styles.statsLabel}>this week</Text>
      </View>
      
      <View style={styles.statsContainer}>
        <Text style={styles.streakText}>{entry.current_streak || 0}</Text>
        <Text style={styles.statsLabel}>streak</Text>
      </View>
    </View>
  );

  return (
    <ScrollView 
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.primary }]}>
        <Text style={[styles.title, { color: theme.primary }]}>Leaderboard</Text>
        <Text style={[styles.subtitle, { color: theme.accent }]}>{'Compete with friends and track your progress'}</Text>
      </View>

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
          
          <View style={styles.goalProgressBar}>
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
        
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'Friends' && styles.tabBtnActive]}
            onPress={() => setTab('Friends')}
          >
            <Text style={[styles.tabText, tab === 'Friends' && styles.tabTextActive, { color: theme.primary }]}>
              Friends
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'Global' && styles.tabBtnActive]}
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
            <Text style={[styles.errorText, { color: theme.primary }]}>{error}</Text>
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
              {tab === 'Friends' ? 
                'Add friends to see them on your leaderboard!' : 
                'No global rankings available yet'
              }
            </Text>
            {tab === 'Friends' && (
              <TouchableOpacity style={[styles.addFriendsBtn, { backgroundColor: theme.primary }]} onPress={handleAddFriends}>
                <Text style={[styles.addFriendsBtnText, { color: theme.background }]}>Add Friends</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Community Activity */}
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <View style={styles.cardHeaderRow}>
          <Ionicons name="chatbubble-ellipses-outline" size={20} color="#4CAF50" style={{ marginRight: 8 }} />
          <Text style={[styles.cardTitle, { color: theme.primary }]}>Community Activity</Text>
        </View>
        
        {activityLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#4CAF50" />
            <Text style={[styles.loadingText, { color: theme.primary }]}>Loading activity...</Text>
          </View>
        ) : activityError ? (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: theme.primary }]}>Error loading activity</Text>
          </View>
        ) : communityActivity.length > 0 ? (
          <View style={styles.activityContainer}>
            {communityActivity.map((activity: any) => (
              <View key={activity.id} style={styles.activityItem}>
                <View style={styles.activityIcon}>
                  {activity.avatar_url ? (
                    <Image source={{ uri: activity.avatar_url }} style={styles.activityAvatar} />
                  ) : (
                    renderActivityIcon(activity.activity_type)
                  )}
                </View>
                <View style={styles.activityContent}>
                  <Text style={[styles.activityText, { color: theme.primary }]}>
                    <Text style={[styles.activityUserName, { color: theme.primary }]}>{activity.user_name}</Text>
                    {' '}{activity.action}
                  </Text>
                  <Text style={[styles.activityTime, { color: theme.primary }]}>{activity.time}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyLeaderboard}>
            <Ionicons name="chatbubble-outline" size={40} color="#BDBDBD" style={{ marginBottom: 8 }} />
            <Text style={[styles.emptyLeaderboardText, { color: theme.primary }]}>No Activity Yet</Text>
            <Text style={[styles.emptyLeaderboardSub, { color: theme.primary }]}>
              Complete focus sessions or add friends to see their activity here.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F5E9',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#C8E6C9',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  subtitle: {
    fontSize: 14,
    color: '#388E3C',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#F8FCF8',
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
    color: '#1B5E20',
    fontSize: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#1B5E20',
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
    backgroundColor: '#FFF',
    borderRadius: 8,
    marginBottom: 8,
  },
  productivityStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productivityStatLabel: {
    color: '#388E3C',
    fontSize: 11,
    marginRight: 8,
  },
  productivityStatValue: {
    color: '#1B5E20',
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
    color: '#1B5E20',
    fontSize: 16,
  },
  weeklyGoalProgress: {
    color: '#388E3C',
    fontSize: 12,
  },
  goalProgressBar: {
    backgroundColor: '#E8F5E9',
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
    color: '#388E3C',
    fontSize: 12,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
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
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    color: '#388E3C',
    fontWeight: 'bold',
    fontSize: 13,
  },
  tabTextActive: {
    color: '#1B5E20',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    color: '#4CAF50',
    marginTop: 8,
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#F44336',
    textAlign: 'center',
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  leaderboardContainer: {
    marginTop: 8,
  },
  leaderboardEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
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
    backgroundColor: '#F1F8E9',
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B5E20',
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
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  currentUserText: {
    color: '#2E7D32',
  },
  userLevel: {
    fontSize: 11,
    color: '#388E3C',
  },
  statsContainer: {
    alignItems: 'center',
    minWidth: 50,
  },
  pointsText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  hoursText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  streakText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#F44336',
  },
  statsLabel: {
    fontSize: 9,
    color: '#666',
  },
  emptyLeaderboard: {
    alignItems: 'center',
    padding: 32,
  },
  emptyLeaderboardText: {
    color: '#BDBDBD',
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyLeaderboardSub: {
    color: '#BDBDBD',
    fontSize: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
  addFriendsBtn: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  addFriendsBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  activityContainer: {
    marginTop: 8,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
  },
  activityIcon: {
    marginRight: 12,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: '#1B5E20',
    lineHeight: 18,
  },
  activityUserName: {
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  activityTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  activityAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
});

export default LeaderboardScreen;