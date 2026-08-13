const React = require("react");
const { api } = require("../../convex/_generated/api");

/**
 * Hooks and utilities for fetching and displaying user data from Convex
 * Uses Convex imperative client pattern.
 */

const { getConvexClient, setConvexClient } = require("./convexClient");

function getClient() {
  return getConvexClient();
}

/**
 * Fetches user data from all important tables for the current authenticated user
 * @returns {Promise<Object>} - Object containing data from all tables
 */
async function fetchUserAppData(userId = null) {
  try {
    const client = getClient();

    // Parallel fetch all user data via Convex queries
    const [
      profile,
      onboarding,
      leaderboard,
      sessions,
      tasks,
      achievements,
      settings,
      insights,
      metrics,
      friends,
    ] = await Promise.all([
      client.query(api.users.me, {}).catch(() => null),
      client.query(api.onboarding.get, {}).catch(() => null),
      client.query(api.leaderboard.getMyStats, {}).catch(() => null),
      client.query(api.focusSessions.list, { limit: 50 }).catch(() => []),
      client.query(api.tasks.list, {}).catch(() => []),
      client.query(api.achievements.list, {}).catch(() => []),
      client.query(api.settings.get, {}).catch(() => null),
      client.query(api.aiInsights.list, { limit: 10 }).catch(() => []),
      client.query(api.learningMetrics.get, {}).catch(() => null),
      client.query(api.friends.listFriends, {}).catch(() => []),
    ]);

    // Fallbacks for missing data
    const safeProfile = profile || { fullName: "Study User", email: "" };
    const safeOnboarding = onboarding || {
      focusMethod: "Balanced",
      soundPreference: "Lo-Fi",
      weeklyFocusGoal: 10,
      isOnboardingComplete: true,
    };
    const safeLeaderboard = leaderboard || {
      totalFocusTime: 0,
      level: 1,
      points: 0,
      currentStreak: 0,
    };
    const safeSessions = sessions || [];
    const safeTasks = tasks || [];
    const safeAchievements = achievements || [];
    const safeSettings = settings || {
      autoPlaySound: true,
      musicVolume: 0.7,
      notificationsEnabled: true,
    };
    const safeInsights = insights || [];
    const safeMetrics = metrics || {};
    const safeFriends = friends || [];

    // Calculate derived data
    const today = new Date();
    const weekStart = new Date(today);
    // Monday-start week, matching the server's weekStartKey() convention in
    // convex/timeWindows.ts (used by convex/focusSessions.ts's applySessionToStats).
    // This uses the device's local timezone rather than the user's stored server-side
    // timeZone (not readily available here), so it's an approximation — only the
    // week-start-day convention is kept in sync with the server, not full tz parity.
    const dayOfWeek = (today.getDay() + 6) % 7; // Monday = 0 ... Sunday = 6
    weekStart.setDate(today.getDate() - dayOfWeek);

    // Sessions shorter than this earn no credit server-side and are excluded from
    // its weekly stat too (see MIN_CREDITED_SECONDS in convex/focusSessions.ts).
    // Keep this value in sync with that constant.
    const MIN_CREDITED_SECONDS = 60;

    // Calculate weekly focus time in minutes (durationSeconds is in seconds, convert to minutes)
    const weeklyFocusTime = safeSessions
      .filter((session) => {
        const sessionDate = new Date(
          session.startTime || session._creationTime,
        );
        return (
          sessionDate >= weekStart &&
          session.status === "completed" &&
          (session.durationSeconds || 0) >= MIN_CREDITED_SECONDS
        );
      })
      .reduce(
        (total, session) => total + (session.durationSeconds || 0) / 60,
        0,
      );

    // Daily focus data for the past 7 days
    const dailyFocusData = [];
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dayName = daysOfWeek[date.getDay()];
      const dateString = date.toISOString().split("T")[0];

      // Calculate daily focus time in minutes (durationSeconds is in seconds, convert to minutes)
      const daySessionsMinutes = safeSessions
        .filter((session) => {
          const sessionDate = (
            session.startTime || new Date(session._creationTime).toISOString()
          ).split("T")[0];
          return sessionDate === dateString && session.status === "completed";
        })
        .reduce(
          (total, session) => total + (session.durationSeconds || 0) / 60,
          0,
        );

      dailyFocusData.push({
        day: dayName,
        hours: Math.round((daySessionsMinutes / 60) * 10) / 10,
        date: dateString,
      });
    }

    // Daily task completion data
    const dailyTasksCompleted = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dayName = daysOfWeek[date.getDay()];
      const dateString = date.toISOString().split("T")[0];

      const completedCount = safeTasks.filter((task) => {
        if (task.status !== "completed") return false;
        const taskDate = new Date(task._creationTime)
          .toISOString()
          .split("T")[0];
        return taskDate === dateString;
      }).length;

      dailyTasksCompleted.push({
        day: dayName,
        count: completedCount,
        date: dateString,
      });
    }

    return {
      profile: safeProfile,
      onboarding: {
        ...safeOnboarding,
        focus_method: safeOnboarding.focusMethod,
      },
      leaderboard: safeLeaderboard,
      sessions: safeSessions,
      tasks: safeTasks,
      achievements: safeAchievements,
      settings: safeSettings,
      insights: safeInsights,
      metrics: safeMetrics,
      friends: safeFriends,

      // Derived data
      weeklyFocusTime,
      dailyFocusData,
      dailyTasksCompleted,

      // Helper data
      activeTasks: safeTasks.filter((task) => task.status !== "completed"),
      completedTasks: safeTasks.filter((task) => task.status === "completed"),
      activeSession:
        safeSessions.find((session) => session.status === "active") || null,
    };
  } catch {
    return getEmptyData();
  }
}

/**
 * React hook for fetching user data
 */
function useUserAppData() {
  const [data, setData] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  const refreshData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const userData = await fetchUserAppData();
      setData(userData);
    } catch (err) {
      setError(err.message);
      setData(getEmptyData());
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refreshData();
  }, [refreshData]);

  return { data, isLoading, error, refreshData };
}

/**
 * Get daily inspiration quote
 * @returns {Promise<string>} - A motivational quote
 */
async function getDailyInspiration() {
  const quotes = [
    "The secret of getting ahead is getting started.",
    "Your focus determines your reality.",
    "The best way to predict your future is to create it.",
    "Learning is not attained by chance, it must be sought with ardor and attended to with diligence.",
    "The more that you read, the more things you will know. The more that you learn, the more places you'll go.",
    "It always seems impossible until it's done.",
    "The expert in anything was once a beginner.",
    "Knowledge is power.",
    "All our dreams can come true, if we have the courage to pursue them.",
    "Success is not final, failure is not fatal: it is the courage to continue that counts.",
  ];

  const today = new Date();
  const dayOfYear = Math.floor(
    (today - new Date(today.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24,
  );
  const quoteIndex = dayOfYear % quotes.length;

  return quotes[quoteIndex];
}

/**
 * Get leaderboard data including friends and global rankings
 */
async function getLeaderboardData() {
  try {
    const client = getClient();

    const [myStats, globalStats, friendsStats] = await Promise.all([
      client.query(api.leaderboard.getMyStats, {}).catch(() => null),
      client.query(api.leaderboard.getGlobal, { limit: 10 }).catch(() => []),
      client.query(api.leaderboard.getFriends, {}).catch(() => []),
    ]);

    // Format global leaderboard
    const globalLeaderboard = (globalStats || []).map((entry) => ({
      ...entry,
      is_current_user: myStats ? entry.userId === myStats.userId : false,
      display_name:
        entry.user?.fullName || entry.user?.username || "Unknown User",
      avatar_url: entry.user?.avatarUrl || null,
      points: entry.points || 0,
    }));

    // Format friends leaderboard
    const friendsLeaderboard = (friendsStats || []).map((entry) => ({
      ...entry,
      is_current_user: myStats ? entry.userId === myStats.userId : false,
      display_name:
        entry.user?.fullName || entry.user?.username || "Unknown User",
      avatar_url: entry.user?.avatarUrl || null,
      points: entry.points || 0,
    }));

    // Add current user to friends if not already present
    if (
      myStats &&
      !friendsLeaderboard.some((e) => e.userId === myStats.userId)
    ) {
      friendsLeaderboard.push({
        ...myStats,
        is_current_user: true,
        display_name: "You",
        avatar_url: null,
      });
    }

    friendsLeaderboard.sort((a, b) => (b.points || 0) - (a.points || 0));

    return {
      userEntry: myStats || null,
      friendsLeaderboard,
      globalLeaderboard,
    };
  } catch {
    return {
      userEntry: null,
      friendsLeaderboard: [],
      globalLeaderboard: [],
    };
  }
}

/**
 * Returns empty data structure when no data is available
 */
function getEmptyData() {
  return {
    profile: { fullName: "Study User", email: "" },
    onboarding: {
      focusMethod: "Balanced",
      focus_method: "Balanced",
      soundPreference: "Lo-Fi",
      weeklyFocusGoal: 10,
      isOnboardingComplete: true,
    },
    leaderboard: { totalFocusTime: 0, level: 1, points: 0, currentStreak: 0 },
    sessions: [],
    tasks: [],
    achievements: [],
    settings: {
      autoPlaySound: true,
      musicVolume: 0.7,
      notificationsEnabled: true,
    },
    insights: [],
    metrics: {},
    friends: [],
    weeklyFocusTime: 0,
    dailyFocusData: [],
    dailyTasksCompleted: [],
    activeTasks: [],
    completedTasks: [],
    activeSession: null,
  };
}

// Explicit exports for CommonJS compatibility
module.exports = {
  useUserAppData,
  fetchUserAppData,
  getLeaderboardData,
  setConvexClient,
};
