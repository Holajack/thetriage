import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  RefreshControl,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  useConvexLeaderboardWithFriends,
  Leaderboard,
  useConvexTasks,
  useConvexProfile,
} from "../../hooks/useConvex";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../../context/ThemeContext";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle as SvgCircle } from "react-native-svg";
import { useCounterAnimation } from "../../utils/animationUtils";
import * as Haptics from "expo-haptics";
import { UnifiedHeader } from "../../components/UnifiedHeader";
import { StaggeredItem } from "../../components/premium/StaggeredList";
import { ShimmerLoader } from "../../components/premium/ShimmerLoader";
import { ProductivityScoreRing } from "../../components/premium/ProductivityScoreRing";
import { StatOrb } from "../../components/premium/StatOrb";
import { LiquidGlassCard } from "../../components/premium/LiquidGlass";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

// Import useAuth FIRST, before userAppData
import { useAuth } from "../../context/AuthContext";
import { navigateHomeWithSlide } from "../../navigation/navHelpers";
import { BottomTabBar } from "../../components/BottomTabBar";

// Import userAppData functions using CommonJS require
const {
  useUserAppData,
  getLeaderboardData,
} = require("../../utils/userAppData");

// Helper function to format focus time (minutes to human-readable)
const formatFocusTime = (minutes: number): string => {
  const hours = minutes / 60;
  if (hours < 24) {
    return `${hours.toFixed(1)}h`;
  } else if (hours < 1000) {
    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours % 24);
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  } else {
    return `${Math.round(hours).toLocaleString()}h`;
  }
};

const LeaderboardScreen = () => {
  const { user } = useAuth(); // This should now work
  const navigation = useNavigation<any>();
  const [tab, setTab] = useState<"Friends" | "Global">("Friends");
  const [refreshing, setRefreshing] = useState(false);
  const { theme, isDark } = useTheme();

  // Removed focusKey — replaying all animations on every screen focus caused glitchy re-mounts

  // Animated tab indicator - 0 = Friends, 1 = Global
  const tabIndicatorPosition = useSharedValue(0);
  const tabRowRef = useRef<View>(null);
  const [tabWidth, setTabWidth] = React.useState(0);

  // Use demo data when database fails
  const { data: userData, refreshData } = useUserAppData();

  const {
    data: convexLeaderboard,
    loading: leaderboardLoading,
    error: leaderboardError,
    refetch: refetchLeaderboard,
  } = useConvexLeaderboardWithFriends();

  // Extract current user stats from Convex leaderboard data (properly formatted with snake_case)
  // Find the current user's entry in the leaderboard for their stats
  const currentUserEntry =
    convexLeaderboard?.friendsLeaderboard?.find(
      (entry: Leaderboard) => entry.is_current_user,
    ) ||
    convexLeaderboard?.globalLeaderboard?.find(
      (entry: Leaderboard) => entry.is_current_user,
    );
  const currentUserStats =
    currentUserEntry || userData?.leaderboard || userData?.stats;

  // Session type counts for Deep Work / Balance / Sprint cards
  // useQuery returns undefined while the query is in flight and only resolves to
  // an array (possibly empty) once loaded — track that distinction so we don't
  // flash an empty state mid-load.
  const allSessions = useQuery(api.focusSessions.list, {});
  const isSessionsLoading = allSessions === undefined;
  // focusSessions.list returns every status ('active' | 'paused' | 'completed'
  // | 'cancelled') — a session left open (app backgrounded/killed mid-timer)
  // never gets a terminal status and would otherwise be counted here forever.
  // Match the completed-only filter already used for this same data in
  // AnalyticsScreen.tsx and weeklyGoalNotifications.ts.
  const completedSessions = React.useMemo(
    () => (allSessions ?? []).filter((s) => s.status === "completed"),
    [allSessions],
  );
  const sessionTypeCounts = React.useMemo(() => {
    if (!allSessions) return { deep_work: 0, balanced: 0, sprint: 0 };
    return {
      deep_work: completedSessions.filter((s) => s.sessionType === "deep_work")
        .length,
      balanced: completedSessions.filter((s) => s.sessionType === "balanced")
        .length,
      sprint: completedSessions.filter((s) => s.sessionType === "sprint")
        .length,
    };
  }, [allSessions, completedSessions]);

  // Aggregate time by subject for the donut chart. No mock/fallback data —
  // an empty or loading result renders an empty state instead of invented numbers.
  const subjectTimeData = React.useMemo(() => {
    const SUBJECT_COLORS = [
      "#4CAF50",
      "#2196F3",
      "#FF9800",
      "#E91E63",
      "#9C27B0",
      "#00BCD4",
    ];
    if (!allSessions || allSessions.length === 0) {
      return [];
    }
    const bySubject: Record<string, number> = {};
    allSessions.forEach((s) => {
      const subj = s.subject || "General";
      const mins = s.durationSeconds ? Math.round(s.durationSeconds / 60) : 0;
      bySubject[subj] = (bySubject[subj] || 0) + mins;
    });
    return Object.entries(bySubject)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, minutes], i) => ({
        name,
        minutes,
        color: SUBJECT_COLORS[i % SUBJECT_COLORS.length],
      }));
  }, [allSessions]);

  const totalSubjectMinutes = React.useMemo(
    () => subjectTimeData.reduce((sum, d) => sum + d.minutes, 0),
    [subjectTimeData],
  );
  // Guard against a genuinely empty/zero dataset (e.g. sessions exist but all
  // have zero duration) producing a NaN strokeDasharray in the donut chart.
  const hasSubjectData = subjectTimeData.length > 0 && totalSubjectMinutes > 0;

  // Use Convex data directly - Friends tab shows only friends, Global shows everyone
  const currentLeaderboard =
    tab === "Friends"
      ? convexLeaderboard?.friendsLeaderboard || []
      : convexLeaderboard?.globalLeaderboard || [];

  // leaderboard.getFriends always includes the viewer alongside real friends, so
  // friendsLeaderboard.length is never 0 for a signed-in user — a length of
  // exactly 1 means "only me" (no real friends). The Global tab has no such
  // padding, so a plain length check is correct there.
  const hasLeaderboardEntries =
    tab === "Friends"
      ? (convexLeaderboard?.friendsLeaderboard?.length ?? 0) > 1
      : currentLeaderboard.length > 0;

  // General loading and error states
  const loading = leaderboardLoading;
  const error = leaderboardError ? String(leaderboardError) : null;

  // Community Activity changes based on selected tab
  // Friends tab = friends' activity
  // Global tab = everyone's activity
  const currentActivity = React.useMemo(() => {
    return (currentLeaderboard || []).map(
      (entry: Leaderboard, index: number) => ({
        id: entry.user_id || entry.id || `${tab.toLowerCase()}-${index}`,
        user_name: entry.display_name || "Unknown User",
        avatar_url: entry.avatar_url,
        subscription_tier: entry.subscription_tier || "free",
        points: entry.points ?? 0,
        weekly_focus_time: entry.weekly_focus_time ?? 0,
        total_focus_time: entry.total_focus_time ?? 0,
        current_streak: entry.current_streak ?? 0,
        is_current_user: entry.is_current_user ?? false,
      }),
    );
  }, [currentLeaderboard, tab]);

  // Calculate tasks completed this week
  const getTasksCompletedThisWeek = () => {
    if (!userData || !userData.dailyTasksCompleted) return 0;

    // Use our precalculated daily tasks data
    return userData.dailyTasksCompleted.reduce(
      (sum: number, day: any) => sum + (day.count || 0),
      0,
    );
  };

  // Calculate weekly goal percentage using Convex data (weekly_focus_time is already in minutes)
  const getWeeklyGoalPercentage = () => {
    const weeklyGoal =
      userData?.onboarding?.weekly_focus_goal ||
      userData?.onboarding?.weeklyFocusGoal ||
      10; // in hours
    // Use Convex leaderboard data first (snake_case, in minutes), then fall back to userData
    const weeklyFocusMinutes =
      currentUserStats?.weekly_focus_time ??
      currentUserStats?.weeklyFocusTime ??
      userData?.weeklyFocusTime ??
      0;
    const currentHours = weeklyFocusMinutes / 60; // Convert minutes to hours
    const percentage = Math.min(
      100,
      Math.round((currentHours / weeklyGoal) * 100),
    );
    return {
      percentage,
      currentHours: Math.round(currentHours * 10) / 10,
      weeklyGoal,
    };
  };

  // Get progress bar color based on percentage
  const getProgressColor = (percentage: number): string => {
    if (percentage >= 100) return "#F59E0B"; // Gold
    if (percentage >= 75) return "#22C55E"; // Green
    if (percentage >= 50) return "#06B6D4"; // Cyan
    if (percentage >= 25) return "#3B82F6"; // Blue
    return "#9CA3AF"; // Gray
  };

  // Get motivational message based on progress
  const getMotivationalMessage = (percentage: number): string => {
    if (percentage >= 100) return "Goal crushed! You're a focus champion!";
    if (percentage >= 75) return "Almost there! Final push!";
    if (percentage >= 50) return "Halfway! You're crushing it.";
    if (percentage >= 25) return "Quarter way there! Building momentum.";
    return "Every minute counts. Keep going!";
  };

  // Animate indicator when tab changes — withTiming gives a smooth, direction-symmetric
  // motion. The previous `withSpring(bouncy)` overshoots and combined with the layout-driven
  // width caused the back-and-forth flicker users reported.
  useEffect(() => {
    tabIndicatorPosition.value = withTiming(tab === "Friends" ? 0 : 1, {
      duration: 220,
    });
  }, [tab]);

  // Animated style for the sliding indicator — hidden until layout measures the tab row.
  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: tabWidth > 0 ? 1 : 0,
    transform: [
      { translateX: tabIndicatorPosition.value * ((tabWidth - 4) / 2) },
    ],
  }));

  // Handle tab switch with haptic feedback - only slide animation, no repeated effects
  const handleTabSwitch = (newTab: "Friends" | "Global") => {
    if (newTab !== tab) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTab(newTab);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchLeaderboard(), refreshData()]);
    } catch (err) {
      // Error refreshing leaderboard
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddFriends = () => {
    // Navigate to Community screen with focus on "All Users" section
    navigation.navigate("Community", { initialTab: "All Users" });
  };

  const formatRank = (index: number) => {
    const rank = index + 1;
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  // Premium Animated Leaderboard Entry
  const AnimatedLeaderboardEntry = ({
    entry,
    index,
    theme,
  }: {
    entry: Leaderboard;
    index: number;
    theme: any;
  }) => {
    const rank = index + 1;
    const isTopThree = rank <= 3;
    const isElite = entry.subscription_tier === "elite";
    // Count up animation for numbers — short duration to avoid JS-thread congestion
    const pointsCount = useCounterAnimation(entry.points || 0, 400);
    // Convert minutes to hours for display (data stored in minutes)
    const hoursCount = useCounterAnimation(
      (entry.weekly_focus_time || 0) / 60,
      400,
    );
    const streakCount = useCounterAnimation(entry.current_streak || 0, 400);

    // Rank change tracking and animation
    const previousRankRef = useRef(rank);
    const [rankChange, setRankChange] = useState<"up" | "down" | null>(null);
    const rankChangeOpacity = useSharedValue(0);
    const rankChangeTranslateY = useSharedValue(-10);
    const backgroundFlashOpacity = useSharedValue(0);

    useEffect(() => {
      const previousRank = previousRankRef.current;

      if (previousRank !== rank) {
        // Determine if rank improved (lower number = better) or dropped
        if (rank < previousRank) {
          setRankChange("up");
        } else if (rank > previousRank) {
          setRankChange("down");
        }

        // Trigger indicator animation — simple timing, no bouncy spring
        rankChangeOpacity.value = 0;
        rankChangeTranslateY.value = rankChange === "up" ? -6 : 6;

        rankChangeOpacity.value = withSequence(
          withTiming(1, { duration: 200 }),
          withTiming(1, { duration: 1000 }),
          withTiming(0, { duration: 200 }),
        );

        rankChangeTranslateY.value = withTiming(0, { duration: 200 });

        // Background flash animation
        backgroundFlashOpacity.value = withSequence(
          withTiming(0.15, { duration: 100 }),
          withTiming(0, { duration: 300 }),
        );

        // Update ref after animation completes
        setTimeout(() => {
          previousRankRef.current = rank;
          setRankChange(null);
        }, 1400);
      }
    }, [rank]);

    const rankChangeStyle = useAnimatedStyle(() => ({
      opacity: rankChangeOpacity.value,
      transform: [{ translateY: rankChangeTranslateY.value }],
    }));

    const backgroundFlashStyle = useAnimatedStyle(() => ({
      opacity: backgroundFlashOpacity.value,
    }));

    // Subtle glow for top 3 — single fade-in, no sequence
    const glowOpacity = useSharedValue(0);
    useEffect(() => {
      if (isTopThree) {
        glowOpacity.value = withTiming(0.25, { duration: 300 });
      }
    }, [isTopThree]);

    const glowStyle = useAnimatedStyle(() => ({
      opacity: glowOpacity.value,
    }));

    const staggerDelay = index * 50;

    return (
      <Animated.View
        entering={FadeIn.delay(staggerDelay).duration(250)}
        style={[
          styles.leaderboardEntry,
          { backgroundColor: theme.card },
          entry.is_current_user && styles.currentUserEntry,
          entry.is_current_user && {
            backgroundColor: isDark ? "rgba(76, 175, 80, 0.1)" : "#F1F8E9",
          },
          // Elite member styling - subtle purple border and glow
          isElite &&
            !entry.is_current_user && {
              borderWidth: 1.5,
              borderColor: "rgba(139, 92, 246, 0.4)",
              shadowColor: "#8B5CF6",
              shadowOpacity: 0.15,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 2 },
            },
        ]}
      >
        {/* Background flash for rank changes */}
        {rankChange && (
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor:
                  rankChange === "up"
                    ? (theme.success ?? "#22C55E")
                    : (theme.error ?? "#EF4444"),
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
                backgroundColor:
                  rank === 1 ? "#FFD700" : rank === 2 ? "#C0C0C0" : "#CD7F32",
                borderRadius: 12,
              },
              glowStyle,
            ]}
          />
        )}

        <View style={styles.rankContainer}>
          <Text
            style={[
              styles.rankText,
              { color: theme.primary, fontSize: isTopThree ? 18 : 16 },
            ]}
          >
            {formatRank(index)}
          </Text>

          {/* Rank change indicator */}
          {rankChange && (
            <Animated.View
              style={[styles.rankChangeIndicator, rankChangeStyle]}
            >
              <Ionicons
                name={
                  rankChange === "up"
                    ? "arrow-up-outline"
                    : "arrow-down-outline"
                }
                size={14}
                color={
                  rankChange === "up"
                    ? (theme.success ?? "#22C55E")
                    : (theme.error ?? "#EF4444")
                }
              />
            </Animated.View>
          )}
        </View>

        <View style={styles.userInfo}>
          {/* Avatar with Elite ring */}
          <View
            style={[
              styles.avatarContainer,
              isElite && styles.eliteAvatarContainer,
            ]}
          >
            {isElite && <View style={styles.eliteRing} />}
            {entry.avatar_url ? (
              <Image
                source={{ uri: entry.avatar_url }}
                style={[styles.avatar, isElite && styles.eliteAvatar]}
              />
            ) : (
              <View
                style={[
                  styles.avatar,
                  styles.defaultAvatar,
                  {
                    backgroundColor: isDark
                      ? "rgba(76, 175, 80, 0.15)"
                      : "#E8F5E9",
                  },
                  isElite && styles.eliteAvatar,
                  isElite && {
                    backgroundColor: isDark
                      ? "rgba(139, 92, 246, 0.15)"
                      : "rgba(139, 92, 246, 0.1)",
                  },
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={isElite ? 16 : 20}
                  color={isElite ? "#8B5CF6" : "#4CAF50"}
                />
              </View>
            )}
          </View>

          <View style={styles.userDetails}>
            {/* Name with Elite diamond icon */}
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {isElite && (
                <Ionicons
                  name="diamond"
                  size={12}
                  color="#8B5CF6"
                  style={{ marginRight: 4 }}
                />
              )}
              <Text
                style={[
                  styles.userName,
                  { color: isElite ? "#8B5CF6" : theme.primary },
                  entry.is_current_user && styles.currentUserText,
                  entry.is_current_user && { color: theme.accent },
                ]}
              >
                {entry.display_name || "Unknown User"}
              </Text>
            </View>
            <Text
              style={[
                styles.userLevel,
                { color: isElite ? "#8B5CF6" : theme.accent },
              ]}
            >
              Level {entry.level || 1}
            </Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <Animated.Text style={[styles.pointsText, { color: "#FF9800" }]}>
            {Math.round(pointsCount.value)}
          </Animated.Text>
          <Text
            style={[
              styles.statsLabel,
              { color: theme.textSecondary || "#666" },
            ]}
          >
            points
          </Text>
        </View>

        <View style={styles.statsContainer}>
          <Animated.Text style={[styles.hoursText, { color: "#4CAF50" }]}>
            {hoursCount.value.toFixed(1)}h
          </Animated.Text>
          <Text
            style={[
              styles.statsLabel,
              { color: theme.textSecondary || "#666" },
            ]}
          >
            this week
          </Text>
        </View>

        <View style={styles.statsContainer}>
          <Animated.Text style={[styles.streakText, { color: "#F44336" }]}>
            {Math.round(streakCount.value)}
          </Animated.Text>
          <Text
            style={[
              styles.statsLabel,
              { color: theme.textSecondary || "#666" },
            ]}
          >
            streak
          </Text>
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
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.background }}
      edges={["top", "left", "right"]}
    >
      {/* Unified Header */}
      <UnifiedHeader
        title="Leaderboard"
        onClose={() => navigateHomeWithSlide(navigation)}
      />

      <Animated.ScrollView
        entering={FadeIn.duration(200)}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Personal Productivity Summary - Premium Redesign */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <StaggeredItem index={0} delay="fast" direction="fade">
            <View style={styles.cardHeaderRow}>
              <Ionicons name="stats-chart" size={24} color="#4CAF50" />
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.primary, marginLeft: 8 },
                ]}
              >
                Your Progress
              </Text>
            </View>
          </StaggeredItem>

          {/* Productivity Score Ring */}
          <StaggeredItem index={1} delay="fast" direction="up">
            <ProductivityScoreRing
              streak={currentUserStats?.current_streak || 0}
              focusProgress={getWeeklyGoalPercentage().percentage}
              tasksCompleted={getTasksCompletedThisWeek()}
            />
          </StaggeredItem>

          {/* Stat Orbs Row */}
          <View style={styles.statOrbsContainer}>
            <StatOrb
              type="streak"
              value={currentUserStats?.current_streak || 0}
              label="days"
              sublabel={`best: ${currentUserStats?.longest_streak || currentUserStats?.current_streak || 0}`}
              delay={200}
            />
            <StatOrb
              type="focus"
              value={Number(
                ((currentUserStats?.weekly_focus_time || 0) / 60).toFixed(1),
              )}
              label="hours"
              sublabel={`${getWeeklyGoalPercentage().percentage}% of goal`}
              delay={280}
            />
            <StatOrb
              type="tasks"
              value={getTasksCompletedThisWeek()}
              label="tasks"
              sublabel="this week"
              delay={360}
            />
          </View>

          {/* Session Type Cards - Deep Work / Balance / Sprint */}
          <StaggeredItem index={4} delay="normal" direction="up">
            <View style={styles.sessionTypeRow}>
              <View
                style={[
                  styles.sessionTypeCard,
                  {
                    backgroundColor: isDark
                      ? "rgba(233, 30, 99, 0.12)"
                      : "rgba(233, 30, 99, 0.08)",
                  },
                ]}
              >
                <Ionicons name="flame" size={20} color="#E91E63" />
                <Text style={[styles.sessionTypeCount, { color: "#E91E63" }]}>
                  {sessionTypeCounts.deep_work}
                </Text>
                <Text
                  style={[
                    styles.sessionTypeLabel,
                    { color: theme.textSecondary },
                  ]}
                >
                  Deep Work
                </Text>
              </View>
              <View
                style={[
                  styles.sessionTypeCard,
                  {
                    backgroundColor: isDark
                      ? "rgba(76, 175, 80, 0.12)"
                      : "rgba(76, 175, 80, 0.08)",
                  },
                ]}
              >
                <Ionicons name="leaf" size={20} color="#4CAF50" />
                <Text style={[styles.sessionTypeCount, { color: "#4CAF50" }]}>
                  {sessionTypeCounts.balanced}
                </Text>
                <Text
                  style={[
                    styles.sessionTypeLabel,
                    { color: theme.textSecondary },
                  ]}
                >
                  Balance
                </Text>
              </View>
              <View
                style={[
                  styles.sessionTypeCard,
                  {
                    backgroundColor: isDark
                      ? "rgba(255, 152, 0, 0.12)"
                      : "rgba(255, 152, 0, 0.08)",
                  },
                ]}
              >
                <Ionicons name="flash" size={20} color="#FF9800" />
                <Text style={[styles.sessionTypeCount, { color: "#FF9800" }]}>
                  {sessionTypeCounts.sprint}
                </Text>
                <Text
                  style={[
                    styles.sessionTypeLabel,
                    { color: theme.textSecondary },
                  ]}
                >
                  Sprint
                </Text>
              </View>
            </View>
          </StaggeredItem>

          {/* Time by Subject Donut Chart */}
          {hasSubjectData ? (
            <StaggeredItem index={5} delay="normal" direction="up">
              <View
                style={[
                  styles.subjectChartContainer,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <Text style={[styles.subjectChartTitle, { color: theme.text }]}>
                  Time by Subject
                </Text>
                <View style={styles.subjectChartContent}>
                  {/* Donut Chart */}
                  <View style={styles.donutContainer}>
                    <Svg width={120} height={120} viewBox="0 0 120 120">
                      {(() => {
                        const radius = 45;
                        const circumference = 2 * Math.PI * radius;
                        let cumulativeOffset = 0;
                        return subjectTimeData.map((item, i) => {
                          const fraction = item.minutes / totalSubjectMinutes;
                          const dashLength = fraction * circumference;
                          const dashOffset = -cumulativeOffset;
                          cumulativeOffset += dashLength;
                          return (
                            <SvgCircle
                              key={i}
                              cx={60}
                              cy={60}
                              r={radius}
                              fill="none"
                              stroke={item.color}
                              strokeWidth={16}
                              strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                              strokeDashoffset={dashOffset}
                              strokeLinecap="butt"
                              rotation={-90}
                              origin="60,60"
                            />
                          );
                        });
                      })()}
                    </Svg>
                    <View style={styles.donutCenter}>
                      <Text style={[styles.donutTotal, { color: theme.text }]}>
                        {Math.round((totalSubjectMinutes / 60) * 10) / 10}h
                      </Text>
                      <Text
                        style={[
                          styles.donutTotalLabel,
                          { color: theme.textSecondary },
                        ]}
                      >
                        total
                      </Text>
                    </View>
                  </View>

                  {/* Legend */}
                  <View style={styles.subjectLegend}>
                    {subjectTimeData.map((item, i) => (
                      <View key={i} style={styles.legendItem}>
                        <View
                          style={[
                            styles.legendDot,
                            { backgroundColor: item.color },
                          ]}
                        />
                        <Text
                          style={[styles.legendText, { color: theme.text }]}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        <Text
                          style={[
                            styles.legendTime,
                            { color: theme.textSecondary },
                          ]}
                        >
                          {item.minutes}m
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </StaggeredItem>
          ) : !isSessionsLoading ? (
            <StaggeredItem index={5} delay="normal" direction="up">
              <View
                style={[
                  styles.subjectChartContainer,
                  styles.subjectChartEmpty,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <Ionicons
                  name="pie-chart-outline"
                  size={32}
                  color="#BDBDBD"
                  style={{ marginBottom: 8 }}
                />
                <Text
                  style={[
                    styles.emptyLeaderboardText,
                    { color: theme.primary },
                  ]}
                >
                  No sessions yet
                </Text>
                <Text
                  style={[
                    styles.emptyLeaderboardSub,
                    { color: theme.primary, marginBottom: 0 },
                  ]}
                >
                  Complete a focus session to see your subject breakdown
                </Text>
              </View>
            </StaggeredItem>
          ) : null}

          {/* Enhanced Weekly Focus Goal */}
          <StaggeredItem index={6} delay="normal" direction="up">
            <LiquidGlassCard
              intensity="subtle"
              showGlow={getWeeklyGoalPercentage().percentage >= 100}
              style={styles.weeklyGoalCard}
            >
              <View style={styles.weeklyGoalHeader}>
                <View style={styles.weeklyGoalIconText}>
                  <Ionicons name="flag" size={20} color="#8B5CF6" />
                  <Text
                    style={[
                      styles.weeklyGoalTitle,
                      { color: theme.primary, marginLeft: 8 },
                    ]}
                  >
                    Weekly Goal
                  </Text>
                </View>
                <Text
                  style={[styles.weeklyGoalProgress, { color: theme.accent }]}
                >
                  {getWeeklyGoalPercentage().currentHours}/
                  {getWeeklyGoalPercentage().weeklyGoal}h
                </Text>
              </View>

              {/* Progress bar with milestones */}
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.goalProgressBar,
                    {
                      backgroundColor: isDark
                        ? "rgba(139, 92, 246, 0.15)"
                        : "rgba(139, 92, 246, 0.1)",
                    },
                  ]}
                >
                  <Animated.View
                    entering={FadeIn.delay(100).duration(300)}
                    style={[
                      styles.goalProgressFill,
                      {
                        width: `${Math.min(getWeeklyGoalPercentage().percentage, 100)}%`,
                        backgroundColor: getProgressColor(
                          getWeeklyGoalPercentage().percentage,
                        ),
                      },
                    ]}
                  />
                </View>
                {/* Milestone markers */}
                <View style={styles.milestonesRow}>
                  {[25, 50, 75, 100].map((milestone) => (
                    <View
                      key={milestone}
                      style={[
                        styles.milestone,
                        {
                          left: `${milestone}%`,
                          backgroundColor:
                            getWeeklyGoalPercentage().percentage >= milestone
                              ? getProgressColor(milestone)
                              : isDark
                                ? "rgba(255,255,255,0.2)"
                                : "rgba(0,0,0,0.1)",
                        },
                      ]}
                    />
                  ))}
                </View>
              </View>

              {/* Motivational message */}
              <Text
                style={[
                  styles.motivationalText,
                  { color: theme.textSecondary },
                ]}
              >
                {getMotivationalMessage(getWeeklyGoalPercentage().percentage)}
              </Text>
            </LiquidGlassCard>
          </StaggeredItem>
        </View>

        {/* Leaderboard Rankings */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <View style={styles.cardHeaderRow}>
            <Ionicons
              name="trophy-outline"
              size={20}
              color="#4CAF50"
              style={{ marginRight: 8 }}
            />
            <Text style={[styles.cardTitle, { color: theme.primary }]}>
              Rankings
            </Text>
          </View>

          <View
            ref={tabRowRef}
            style={[
              styles.tabRow,
              {
                backgroundColor: isDark ? "rgba(76, 175, 80, 0.1)" : "#E8F5E9",
              },
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
              onPress={() => handleTabSwitch("Friends")}
            >
              <Text
                style={[
                  styles.tabText,
                  tab === "Friends" && styles.tabTextActive,
                  { color: theme.primary },
                ]}
              >
                Friends
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.tabBtn}
              onPress={() => handleTabSwitch("Global")}
            >
              <Text
                style={[
                  styles.tabText,
                  tab === "Global" && styles.tabTextActive,
                  { color: theme.primary },
                ]}
              >
                Global
              </Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ShimmerLoader variant="circle" size={48} />
              <Text style={[styles.loadingText, { color: theme.primary }]}>
                Loading leaderboard...
              </Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text
                style={[styles.errorText, { color: theme.error ?? "#EF4444" }]}
              >
                {error}
              </Text>
              <TouchableOpacity
                style={[styles.retryButton, { backgroundColor: theme.primary }]}
                onPress={onRefresh}
              >
                <Text
                  style={[styles.retryButtonText, { color: theme.background }]}
                >
                  Retry
                </Text>
              </TouchableOpacity>
            </View>
          ) : hasLeaderboardEntries ? (
            <View style={styles.leaderboardContainer}>
              {currentLeaderboard.map((entry: Leaderboard, index: number) =>
                renderLeaderboardEntry(entry, index),
              )}
            </View>
          ) : (
            <View style={styles.emptyLeaderboard}>
              <Ionicons
                name="people-outline"
                size={40}
                color="#BDBDBD"
                style={{ marginBottom: 8 }}
              />
              <Text
                style={[styles.emptyLeaderboardText, { color: theme.primary }]}
              >
                {tab === "Friends"
                  ? "Add friends to see their rankings and compete together!"
                  : "Check back soon to see rankings from all app users!"}
              </Text>
              {tab === "Friends" && (
                <TouchableOpacity
                  style={[
                    styles.addFriendsBtn,
                    { backgroundColor: theme.primary },
                  ]}
                  onPress={handleAddFriends}
                >
                  <Text
                    style={[
                      styles.addFriendsBtnText,
                      { color: theme.background },
                    ]}
                  >
                    Add Friends
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Community Activity - Changes based on tab */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <View style={styles.cardHeaderRow}>
            <Ionicons
              name={tab === "Friends" ? "people-outline" : "globe-outline"}
              size={20}
              color="#4CAF50"
              style={{ marginRight: 8 }}
            />
            <View>
              <Text style={[styles.cardTitle, { color: theme.primary }]}>
                {tab === "Friends" ? "Friends Activity" : "Global Activity"}
              </Text>
              <Text
                style={[
                  styles.cardSubtitle,
                  { color: theme.textSecondary || "#666" },
                ]}
              >
                {tab === "Friends"
                  ? "See what your friends are up to"
                  : "Activity from all app users"}
              </Text>
            </View>
          </View>

          {hasLeaderboardEntries ? (
            <View style={styles.activityContainer}>
              {currentActivity.map((activity: any, index: number) => {
                const isActivityElite = activity.subscription_tier === "elite";
                return (
                  <View
                    key={activity.id || index}
                    style={[
                      styles.activityItem,
                      {
                        backgroundColor: theme.card,
                        borderColor: theme.border ?? "#E0E0E0",
                        borderWidth: isDark ? StyleSheet.hairlineWidth : 0,
                      },
                    ]}
                  >
                    {/* Avatar with Elite ring */}
                    <View
                      style={[
                        styles.activityAvatarContainer,
                        isActivityElite && styles.eliteAvatarContainer,
                      ]}
                    >
                      {isActivityElite && <View style={styles.eliteRing} />}
                      {activity.avatar_url ? (
                        <Image
                          source={{ uri: activity.avatar_url }}
                          style={[
                            styles.activityAvatar,
                            isActivityElite && styles.eliteAvatar,
                          ]}
                        />
                      ) : (
                        <View
                          style={[
                            styles.activityAvatar,
                            styles.activityAvatarFallback,
                            {
                              backgroundColor: isDark
                                ? "rgba(76, 175, 80, 0.18)"
                                : "rgba(76, 175, 80, 0.12)",
                            },
                            isActivityElite && styles.eliteAvatar,
                            isActivityElite && {
                              backgroundColor: isDark
                                ? "rgba(139, 92, 246, 0.18)"
                                : "rgba(139, 92, 246, 0.12)",
                            },
                          ]}
                        >
                          <Ionicons
                            name={
                              activity.is_current_user
                                ? "person-circle"
                                : "people-circle"
                            }
                            size={isActivityElite ? 18 : 26}
                            color={isActivityElite ? "#8B5CF6" : "#4CAF50"}
                          />
                        </View>
                      )}
                    </View>
                    <View style={styles.activityContent}>
                      <View style={styles.activityHeaderRow}>
                        {/* Name with Elite diamond icon */}
                        <View
                          style={{ flexDirection: "row", alignItems: "center" }}
                        >
                          {isActivityElite && (
                            <Ionicons
                              name="diamond"
                              size={11}
                              color="#8B5CF6"
                              style={{ marginRight: 4 }}
                            />
                          )}
                          <Text
                            style={[
                              styles.activityUserName,
                              {
                                color: isActivityElite
                                  ? "#8B5CF6"
                                  : activity.is_current_user
                                    ? theme.accent
                                    : theme.primary,
                              },
                            ]}
                          >
                            {activity.is_current_user
                              ? "You"
                              : activity.user_name}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.activityPoints,
                            { color: theme.accent },
                          ]}
                        >
                          {activity.points?.toLocaleString?.() ||
                            activity.points ||
                            0}{" "}
                          pts
                        </Text>
                      </View>
                      <View style={styles.activityStatsRow}>
                        <View
                          style={[
                            styles.activityTag,
                            {
                              backgroundColor: isDark
                                ? "rgba(76, 175, 80, 0.22)"
                                : "rgba(76, 175, 80, 0.12)",
                            },
                          ]}
                        >
                          <Ionicons
                            name="time-outline"
                            size={14}
                            color="#4CAF50"
                            style={{ marginRight: 4 }}
                          />
                          <Text
                            style={[
                              styles.activityTagText,
                              { color: theme.text },
                            ]}
                          >
                            {((activity.weekly_focus_time || 0) / 60).toFixed(
                              1,
                            )}
                            h this week
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.activityTag,
                            {
                              backgroundColor: isDark
                                ? "rgba(255, 112, 67, 0.22)"
                                : "rgba(255, 112, 67, 0.12)",
                            },
                          ]}
                        >
                          <Ionicons
                            name="flame-outline"
                            size={14}
                            color="#FF7043"
                            style={{ marginRight: 4 }}
                          />
                          <Text
                            style={[
                              styles.activityTagText,
                              { color: theme.text },
                            ]}
                          >
                            {activity.current_streak || 0} day streak
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.activityTag,
                            {
                              backgroundColor: isDark
                                ? "rgba(66, 165, 245, 0.22)"
                                : "rgba(66, 165, 245, 0.12)",
                            },
                          ]}
                        >
                          <Ionicons
                            name="hourglass-outline"
                            size={14}
                            color="#42A5F5"
                            style={{ marginRight: 4 }}
                          />
                          <Text
                            style={[
                              styles.activityTagText,
                              { color: theme.text },
                            ]}
                          >
                            {formatFocusTime(activity.total_focus_time || 0)}{" "}
                            total
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyLeaderboard}>
              <Ionicons
                name={tab === "Friends" ? "people-outline" : "globe-outline"}
                size={40}
                color="#BDBDBD"
                style={{ marginBottom: 8 }}
              />
              <Text
                style={[styles.emptyLeaderboardText, { color: theme.primary }]}
              >
                {tab === "Friends" ? "No Friends Yet" : "No Activity Yet"}
              </Text>
              <Text
                style={[styles.emptyLeaderboardSub, { color: theme.primary }]}
              >
                {tab === "Friends"
                  ? "Add friends to see their study activity, streaks, and progress!"
                  : "Check back soon to see activity from all app users!"}
              </Text>
              {tab === "Friends" && (
                <TouchableOpacity
                  style={[
                    styles.addFriendsBtn,
                    { backgroundColor: theme.primary, marginTop: 12 },
                  ]}
                  onPress={handleAddFriends}
                >
                  <Text
                    style={[
                      styles.addFriendsBtnText,
                      { color: theme.background },
                    ]}
                  >
                    Add Friends
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </Animated.ScrollView>

      <BottomTabBar currentRoute="Leaderboard" />
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
    flexDirection: "row",
    alignItems: "center",
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
    fontWeight: "bold",
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontWeight: "bold",
    fontSize: 16,
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionTitle: {
    fontWeight: "bold",
    fontSize: 16,
  },
  productivityStats: {
    marginBottom: 16,
  },
  productivityStatItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  productivityStatRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  productivityStatLabel: {
    fontSize: 11,
    marginRight: 8,
  },
  productivityStatValue: {
    fontWeight: "bold",
    fontSize: 14,
  },
  weeklyGoalSection: {
    marginBottom: 16,
  },
  weeklyGoalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  weeklyGoalIconText: {
    flexDirection: "row",
    alignItems: "center",
  },
  weeklyGoalTitle: {
    fontWeight: "600",
    fontSize: 14,
  },
  weeklyGoalProgress: {
    fontSize: 14,
    fontWeight: "600",
  },
  goalProgressBar: {
    borderRadius: 8,
    height: 20,
    marginBottom: 8,
  },
  goalProgressFill: {
    backgroundColor: "#4CAF50",
    borderRadius: 8,
    height: "100%",
  },
  goalPercentageText: {
    fontSize: 12,
  },
  // New premium styles for redesigned productivity section
  statOrbsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 16,
    paddingHorizontal: 8,
  },
  weeklyGoalCard: {
    marginTop: 8,
    marginBottom: 8,
  },
  progressBarContainer: {
    position: "relative",
    marginVertical: 12,
  },
  milestonesRow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 20,
  },
  milestone: {
    position: "absolute",
    width: 4,
    height: 4,
    borderRadius: 2,
    top: 8,
    marginLeft: -2,
  },
  motivationalText: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
    fontStyle: "italic",
  },
  tabRow: {
    flexDirection: "row",
    borderRadius: 8,
    marginBottom: 16,
    alignSelf: "center",
    position: "relative",
    padding: 2, // Space for the inset indicator
    overflow: "visible", // Allow shadow to show outside
  },
  tabIndicator: {
    position: "absolute",
    top: 2,
    left: 2,
    bottom: 2,
    borderRadius: 6,
    // Prominent shadow for visible "shadowy rounded box" effect
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: "center",
    borderRadius: 8,
    zIndex: 1,
  },
  tabBtnActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontWeight: "bold",
    fontSize: 13,
  },
  tabTextActive: {},
  loadingContainer: {
    alignItems: "center",
    padding: 32,
  },
  loadingText: {
    marginTop: 8,
  },
  errorContainer: {
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    textAlign: "center",
    marginBottom: 8,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    fontWeight: "bold",
  },
  leaderboardContainer: {
    marginTop: 8,
  },
  leaderboardEntry: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
  },
  currentUserEntry: {
    borderWidth: 2,
    borderColor: "#4CAF50",
  },
  rankContainer: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 40,
  },
  rankText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  rankChangeIndicator: {
    marginLeft: 4,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
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
    justifyContent: "center",
    alignItems: "center",
  },
  avatarContainer: {
    width: 40,
    height: 40,
    marginRight: 12,
    position: "relative",
  },
  eliteAvatarContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  eliteRing: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#8B5CF6",
  },
  eliteAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 0,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: "bold",
  },
  currentUserText: {},
  userLevel: {
    fontSize: 11,
  },
  statsContainer: {
    alignItems: "center",
    minWidth: 50,
  },
  pointsText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  hoursText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  streakText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  statsLabel: {
    fontSize: 9,
  },
  emptyLeaderboard: {
    alignItems: "center",
    padding: 32,
  },
  emptyLeaderboardText: {
    fontSize: 14,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyLeaderboardSub: {
    fontSize: 12,
    marginBottom: 16,
    textAlign: "center",
  },
  addFriendsBtn: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  addFriendsBtnText: {
    fontWeight: "bold",
    fontSize: 14,
  },
  activityContainer: {
    marginTop: 8,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  activityContent: {
    flex: 1,
  },
  activityUserName: {
    fontWeight: "bold",
    fontSize: 15,
  },
  activityAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  activityAvatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  activityAvatarContainer: {
    width: 40,
    height: 40,
    marginRight: 12,
    position: "relative",
  },
  activityHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  activityPoints: {
    fontSize: 13,
    fontWeight: "600",
  },
  activityStatsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 6,
  },
  activityTag: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 6,
  },
  activityTagText: {
    fontSize: 11,
    fontWeight: "500",
  },
  // ─── Session Type Cards ──────────────────────
  sessionTypeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 10,
  },
  sessionTypeCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 14,
  },
  sessionTypeCount: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 6,
  },
  sessionTypeLabel: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
  // ─── Subject Donut Chart ─────────────────────
  subjectChartContainer: {
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
  },
  subjectChartEmpty: {
    alignItems: "center",
    paddingVertical: 24,
  },
  subjectChartTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
  },
  subjectChartContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  donutContainer: {
    width: 120,
    height: 120,
    position: "relative",
  },
  donutCenter: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  donutTotal: {
    fontSize: 18,
    fontWeight: "bold",
  },
  donutTotalLabel: {
    fontSize: 10,
  },
  subjectLegend: {
    flex: 1,
    marginLeft: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendText: {
    fontSize: 13,
    flex: 1,
  },
  legendTime: {
    fontSize: 12,
    fontWeight: "500",
  },
});

export default LeaderboardScreen;
