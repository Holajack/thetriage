import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useCallback, useMemo, useState } from "react";

// Re-export types for backward compatibility
export interface Task {
  id: string;
  _id: string;
  user_id: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  due_date?: string;
  category?: string;
  estimated_minutes?: number;
  actual_minutes?: number;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

export interface Profile {
  id: string;
  _id: string;
  user_id: string;
  full_name?: string;
  username?: string;
  email?: string;
  avatar_url?: string;
  bio?: string;
  website?: string;
  location?: string;
  university?: string;
  major?: string;
  classes?: string;
  subscription_tier?: string;
  trail_buddy_type?: string;
  trail_buddy_name?: string;
  flint_currency?: number;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

export interface Leaderboard {
  id: string;
  user_id: string;
  display_name?: string;
  avatar_url?: string;
  is_current_user?: boolean;
  total_focus_time?: number;
  weekly_focus_time?: number;
  monthly_focus_time?: number;
  current_streak?: number;
  longest_streak?: number;
  total_sessions?: number;
  level?: number;
  points?: number;
  [key: string]: any;
}

export type LeaderboardEntry = Leaderboard;

// ============================================================
// 1. useConvexTasks
// ============================================================
export const useConvexTasks = () => {
  const tasks = useQuery(api.tasks.list);
  const createTask = useMutation(api.tasks.create);
  const updateTaskMutation = useMutation(api.tasks.update);
  const removeTask = useMutation(api.tasks.remove);

  const loading = tasks === undefined;

  const addTask = async (
    title: string,
    description: string = "",
    priority: string = "Medium",
    subject: string = "General"
  ) => {
    const id = await createTask({
      title,
      description,
      priority,
      category: subject,
    });
    return { _id: id, id: id, title, description, priority, category: subject, status: "pending" };
  };

  const updateTask = async (taskId: string, updates: Record<string, any>) => {
    const convexUpdates: Record<string, any> = {};
    // Map snake_case fields to camelCase Convex fields
    if (updates.title !== undefined) convexUpdates.title = updates.title;
    if (updates.description !== undefined) convexUpdates.description = updates.description;
    if (updates.priority !== undefined) convexUpdates.priority = updates.priority;
    if (updates.status !== undefined) convexUpdates.status = updates.status;
    if (updates.category !== undefined) convexUpdates.category = updates.category;
    if (updates.due_date !== undefined) convexUpdates.dueDate = updates.due_date;
    if (updates.dueDate !== undefined) convexUpdates.dueDate = updates.dueDate;
    if (updates.estimated_minutes !== undefined) convexUpdates.estimatedMinutes = updates.estimated_minutes;
    if (updates.estimatedMinutes !== undefined) convexUpdates.estimatedMinutes = updates.estimatedMinutes;
    if (updates.actual_minutes !== undefined) convexUpdates.actualMinutes = updates.actual_minutes;
    if (updates.actualMinutes !== undefined) convexUpdates.actualMinutes = updates.actualMinutes;
    if (updates.completed_at !== undefined) convexUpdates.completedAt = updates.completed_at;
    if (updates.completedAt !== undefined) convexUpdates.completedAt = updates.completedAt;

    await updateTaskMutation({
      taskId: taskId as Id<"tasks">,
      ...convexUpdates,
    });
  };

  const deleteTask = async (taskId: string) => {
    await removeTask({ taskId: taskId as Id<"tasks"> });
  };

  // Adapt Convex _id to id for backward compat with screens
  const adaptedTasks = (tasks ?? []).map((t) => ({
    ...t,
    id: t._id,
    user_id: t.userId,
    due_date: t.dueDate,
    estimated_minutes: t.estimatedMinutes,
    actual_minutes: t.actualMinutes,
    completed_at: t.completedAt,
    created_at: t._creationTime ? new Date(t._creationTime).toISOString() : "",
    updated_at: t._creationTime ? new Date(t._creationTime).toISOString() : "",
  }));

  return {
    tasks: adaptedTasks,
    loading,
    error: null as string | null,
    addTask,
    updateTask,
    deleteTask,
    refetch: () => {}, // Convex auto-updates via reactive queries
  };
};

// ============================================================
// 2. useConvexInsightsInsights
// ============================================================
export const useConvexInsights = () => {
  const insights = useQuery(api.aiInsights.list, { limit: 3 });
  const loading = insights === undefined;

  const adaptedInsights = (insights ?? []).map((i) => ({
    ...i,
    id: i._id,
    user_id: i.userId,
    insight_type: i.insightType,
    created_at: i._creationTime ? new Date(i._creationTime).toISOString() : "",
  }));

  return {
    insights: adaptedInsights,
    setInsights: () => {}, // No-op: Convex handles state
    loading,
    setLoading: () => {},
    error: null as string | null,
    setError: () => {},
    refetch: () => {},
  };
};

// ============================================================
// 3. useConvexLeaderboardLeaderboard
// ============================================================
export const useConvexLeaderboard = () => {
  const leaderboard = useQuery(api.leaderboard.getMyStats);
  const loading = leaderboard === undefined;

  const adapted = leaderboard
    ? {
        ...leaderboard,
        id: leaderboard._id,
        user_id: leaderboard.userId,
        total_focus_time: leaderboard.totalFocusTime,
        weekly_focus_time: leaderboard.weeklyFocusTime,
        monthly_focus_time: leaderboard.monthlyFocusTime,
        current_streak: leaderboard.currentStreak,
        longest_streak: leaderboard.longestStreak,
        total_sessions: leaderboard.totalSessions,
      }
    : null;

  return {
    leaderboard: adapted,
    loading,
    error: null as string | null,
    refetch: () => {},
  };
};

// ============================================================
// 4. useConvexLeaderboardWithFriendsLeaderboardWithFriends
// ============================================================
export const useConvexLeaderboardWithFriends = () => {
  const globalData = useQuery(api.leaderboard.getGlobal, { limit: 100 });
  const friendsData = useQuery(api.leaderboard.getFriends);
  const currentUser = useQuery(api.users.me);
  const loading = globalData === undefined || friendsData === undefined;

  const formatEntry = useCallback((entry: any, isCurrentUser: boolean) => ({
    ...entry,
    id: entry._id,
    user_id: entry.userId,
    is_current_user: isCurrentUser,
    display_name: isCurrentUser
      ? "You"
      : entry.user?.fullName || entry.user?.username || "Unknown User",
    avatar_url: entry.user?.avatarUrl,
    total_focus_time: entry.totalFocusTime ?? 0,
    weekly_focus_time: entry.weeklyFocusTime ?? 0,
    monthly_focus_time: entry.monthlyFocusTime ?? 0,
    current_streak: entry.currentStreak ?? 0,
    longest_streak: entry.longestStreak ?? 0,
    total_sessions: entry.totalSessions ?? 0,
    points: entry.points ?? 0,
    level: entry.level ?? 1,
  }), []);

  const globalLeaderboard = useMemo(
    () => (globalData ?? []).map((entry) =>
      formatEntry(entry, currentUser ? entry.userId === currentUser._id : false)
    ),
    [globalData, currentUser, formatEntry]
  );

  const friendsLeaderboard = useMemo(
    () => (friendsData ?? []).map((entry) =>
      formatEntry(entry, currentUser ? entry.userId === currentUser._id : false)
    ),
    [friendsData, currentUser, formatEntry]
  );

  const data = useMemo(() => ({
    friendsLeaderboard,
    globalLeaderboard,
  }), [friendsLeaderboard, globalLeaderboard]);

  return {
    data,
    loading,
    error: null as string | null,
    refetch: () => {},
  };
};

// ============================================================
// 5. useConvexAchievementsAchievements
// ============================================================
export const useConvexAchievements = () => {
  const achievements = useQuery(api.achievements.list);
  const loading = achievements === undefined;

  const adapted = (achievements ?? []).map((a) => ({
    ...a,
    id: a._id,
    user_id: a.userId,
    achievement_type: a.achievementType,
    description: a.description ?? "",
    earned_at: a.earnedAt ?? "",
  }));

  return {
    achievements: adapted,
    setAchievements: () => {},
    loading,
    error: null as string | null,
    refetch: () => {},
  };
};

// ============================================================
// 6. useConvexSubtasksSubtasks
// ============================================================
export const useConvexSubtasks = (taskId: string) => {
  const subtasks = useQuery(
    api.subtasks.listByTask,
    taskId ? { taskId: taskId as Id<"tasks"> } : "skip"
  );
  const loading = subtasks === undefined;

  const adapted = (subtasks ?? []).map((s) => ({
    ...s,
    id: s._id,
    task_id: s.taskId,
    user_id: s.userId,
    created_at: s._creationTime ? new Date(s._creationTime).toISOString() : "",
  }));

  return {
    subtasks: adapted,
    loading,
    error: null as string | null,
    refetch: () => {},
  };
};

// ============================================================
// 7. useConvexSubjectsSubjects
// ============================================================
export const useConvexSubjects = () => {
  const subjects = useQuery(api.subjects.list);
  const createSubject = useMutation(api.subjects.create);
  const loading = subjects === undefined;

  const addSubject = async (name: string, color?: string) => {
    await createSubject({ name, color });
  };

  const adapted = (subjects ?? []).map((s) => ({
    ...s,
    id: s._id,
    user_id: s.userId,
    created_at: s._creationTime ? new Date(s._creationTime).toISOString() : "",
  }));

  return {
    subjects: adapted,
    loading,
    error: null as string | null,
    addSubject,
    refetch: () => {},
  };
};

// ============================================================
// 8. useConvexFriendsFriends
// ============================================================
export const useConvexFriends = () => {
  const friends = useQuery(api.friends.listFriends);
  const loading = friends === undefined;

  const adapted = (friends ?? []).map((f) => ({
    ...f,
    id: f._id,
    user_id: f._id,
    friend_id: f._id,
    created_at: f._creationTime ? new Date(f._creationTime).toISOString() : "",
  }));

  return {
    friends: adapted,
    loading,
    error: null as string | null,
    refetch: () => {},
  };
};

// ============================================================
// 9. useConvexStudyRoomsStudyRooms
// ============================================================
export const useConvexStudyRooms = () => {
  const rooms = useQuery(api.studyRooms.list, {});
  const loading = rooms === undefined;

  const adapted = (rooms ?? []).map((r) => ({
    ...r,
    id: r._id,
    creator_id: r.ownerId,
    room_code: r.roomCode,
    is_public: r.isPublic,
    max_participants: r.maxParticipants,
    current_participants: r.currentParticipants,
    is_active: r.isActive,
    session_duration: r.sessionDuration,
    break_duration: r.breakDuration,
    created_at: r._creationTime ? new Date(r._creationTime).toISOString() : "",
  }));

  return {
    rooms: adapted,
    loading,
    error: null as string | null,
    refetch: () => {},
  };
};

// ============================================================
// 10. useConvexFocusSessionFocusSession
// ============================================================
export const useConvexFocusSession = () => {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [sessionDuration, setSessionDuration] = useState(0);

  const startMutation = useMutation(api.focusSessions.start);
  const endMutation = useMutation(api.focusSessions.end);
  const pauseMutation = useMutation(api.focusSessions.pause);
  const resumeMutation = useMutation(api.focusSessions.resume);
  const updateUser = useMutation(api.users.updateUser);

  const startSession = async (
    roomId?: string,
    sessionType: "individual" | "group" = "individual"
  ) => {
    const sessionId = await startMutation({
      sessionType,
      roomId: roomId ? (roomId as Id<"studyRooms">) : undefined,
    });

    const session = {
      id: sessionId,
      _id: sessionId,
      session_type: sessionType,
      status: "active",
      start_time: new Date().toISOString(),
      startTime: new Date().toISOString(),
    };

    setCurrentSession(session);
    setIsSessionActive(true);
    setSessionDuration(0);

    return session;
  };

  const endSession = async () => {
    if (!currentSession) return null;

    const endTime = new Date().toISOString();
    const duration = Math.floor(
      (new Date(endTime).getTime() -
        new Date(currentSession.start_time || currentSession.startTime).getTime()) /
        1000
    );

    // Don't save sessions under 5 minutes
    if (duration < 300) {
      setCurrentSession(null);
      setSessionDuration(0);
      setIsSessionActive(false);
      return {
        id: currentSession.id || currentSession._id,
        duration,
        end_time: endTime,
        status: "too_short",
        message: "Session was less than 5 minutes and was not saved",
      };
    }

    try {
      await endMutation({
        sessionId: (currentSession.id || currentSession._id) as Id<"focusSessions">,
      });

      // Award Flint currency (1 per minute)
      const minutesCompleted = duration / 60;
      const flintEarned = Math.floor(minutesCompleted);
      if (flintEarned > 0) {
        try {
          // We need the user's current data to update flint
          // This is handled via a separate call since we can't query inside a callback
          console.log(
            `Flint to award: ${flintEarned} for ${minutesCompleted.toFixed(0)} minutes`
          );
        } catch (flintError) {
          console.error("Error awarding Flint:", flintError);
        }
      }
    } catch (error) {
      console.error("Error ending session:", error);
    }

    const result = {
      id: currentSession.id || currentSession._id,
      duration,
      duration_seconds: duration,
      end_time: endTime,
      status: "completed",
    };

    setCurrentSession(null);
    setSessionDuration(0);
    setIsSessionActive(false);

    return result;
  };

  const pauseSession = async () => {
    if (!currentSession) return;
    await pauseMutation({
      sessionId: (currentSession.id || currentSession._id) as Id<"focusSessions">,
    });
    setIsSessionActive(false);
    setCurrentSession({ ...currentSession, status: "paused" });
    return currentSession;
  };

  const resumeSession = async () => {
    if (!currentSession) return;
    await resumeMutation({
      sessionId: (currentSession.id || currentSession._id) as Id<"focusSessions">,
    });
    setIsSessionActive(true);
    setCurrentSession({ ...currentSession, status: "active" });
    return currentSession;
  };

  return {
    isSessionActive,
    currentSession,
    sessionDuration,
    startSession,
    endSession,
    pauseSession,
    resumeSession,
  };
};

// ============================================================
// 11. useConvexFocusSessionHistory — replaces useFocusSessionHistory
// ============================================================
export const useConvexFocusSessionHistory = () => {
  const sessions = useQuery(api.focusSessions.list, { limit: 50 });
  const loading = sessions === undefined;

  const adapted = (sessions ?? []).map((s) => ({
    ...s,
    id: s._id,
    user_id: s.userId,
    start_time: s.startTime,
    end_time: s.endTime,
    session_type: s.sessionType,
    duration_seconds: s.durationSeconds,
    duration_minutes: s.durationSeconds
      ? Math.floor(s.durationSeconds / 60)
      : 0,
    created_at: s._creationTime ? new Date(s._creationTime).toISOString() : "",
  }));

  return {
    sessions: adapted,
    loading,
    error: null as string | null,
    refetch: () => {},
  };
};

// ============================================================
// 12. useConvexProfileProfile
// ============================================================
export const useConvexProfile = () => {
  const user = useQuery(api.users.me);
  const updateProfileMutation = useMutation(api.users.updateProfile);
  const updateUserMutation = useMutation(api.users.updateUser);
  const loading = user === undefined;

  const updateProfile = async (updates: Record<string, any>) => {
    if (!user) throw new Error("No authenticated user");

    // Map both snake_case and camelCase fields
    const convexUpdates: Record<string, any> = {};
    const fieldMap: Record<string, string> = {
      full_name: "fullName",
      avatar_url: "avatarUrl",
      weekly_focus_goal: "weeklyFocusGoal",
      focus_duration: "focusDuration",
      break_duration: "breakDuration",
      trail_buddy_type: "trailBuddyType",
      trail_buddy_name: "trailBuddyName",
      sound_preference: "soundPreference",
      daily_reminder: "dailyReminder",
      flint_currency: "flintCurrency",
      first_session_bonus_claimed: "firstSessionBonusClaimed",
      time_zone: "timeZone",
      full_name_visibility: "fullNameVisibility",
      university_visibility: "universityVisibility",
      location_visibility: "locationVisibility",
      classes_visibility: "classesVisibility",
      environment_theme: "environmentTheme",
    };

    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined) continue;
      const mappedKey = fieldMap[key] || key;
      convexUpdates[mappedKey] = value;
    }

    await updateUserMutation({
      userId: user._id,
      ...convexUpdates,
    });

    return { ...user, ...convexUpdates };
  };

  const uploadProfileImage = async (imageUri: string) => {
    // Placeholder — image upload will need Convex file storage in a later phase
    return { publicUrl: imageUri };
  };

  const updateStatus = async (status: string) => {
    return await updateProfile({ status });
  };

  // Adapt to match profile shape
  const profile = user
    ? {
        ...user,
        id: user._id,
        user_id: user._id,
        full_name: user.fullName,
        avatar_url: user.avatarUrl,
        subscription_tier: user.subscriptionTier,
        trail_buddy_type: user.trailBuddyType,
        trail_buddy_name: user.trailBuddyName,
        flint_currency: user.flintCurrency,
        first_session_bonus_claimed: user.firstSessionBonusClaimed,
        environment_theme: user.environmentTheme,
        created_at: user._creationTime ? new Date(user._creationTime).toISOString() : "",
        updated_at: user._creationTime ? new Date(user._creationTime).toISOString() : "",
      }
    : null;

  return {
    profile,
    updateProfile,
    uploadProfileImage,
    updateStatus,
    loading,
    error: null as string | null,
    refetch: () => {},
  };
};

// ============================================================
// 13. useConvexUserAppData — replaces useUserAppData
// ============================================================
export const useConvexUserAppData = () => {
  const profile = useQuery(api.users.me);
  const onboarding = useQuery(api.onboarding.get);
  const settings = useQuery(api.settings.get);
  const tasks = useQuery(api.tasks.list);
  const achievements = useQuery(api.achievements.list);
  const insights = useQuery(api.aiInsights.list, { limit: 5 });
  const metrics = useQuery(api.learningMetrics.get);

  const loading =
    profile === undefined ||
    onboarding === undefined ||
    settings === undefined ||
    tasks === undefined;

  // Adapt profile to snake_case for backward compat
  const adaptedProfile = profile
    ? {
        ...profile,
        id: profile._id,
        user_id: profile._id,
        full_name: profile.fullName,
        avatar_url: profile.avatarUrl,
        subscription_tier: profile.subscriptionTier,
        flint_currency: profile.flintCurrency,
      }
    : null;

  // Adapt tasks
  const adaptedTasks = (tasks ?? []).map((t) => ({
    ...t,
    id: t._id,
    user_id: t.userId,
    due_date: t.dueDate,
    estimated_minutes: t.estimatedMinutes,
    actual_minutes: t.actualMinutes,
    completed_at: t.completedAt,
    created_at: t._creationTime ? new Date(t._creationTime).toISOString() : "",
  }));

  // Adapt onboarding
  const adaptedOnboarding = onboarding
    ? {
        ...onboarding,
        id: onboarding._id,
        user_id: onboarding.userId,
        is_onboarding_complete: onboarding.isOnboardingComplete,
        weekly_focus_goal: onboarding.weeklyFocusGoal,
        welcome_completed: onboarding.welcomeCompleted,
        goals_set: onboarding.goalsSet,
        first_session_completed: onboarding.firstSessionCompleted,
        profile_customized: onboarding.profileCustomized,
        focus_method: onboarding.focusMethod,
        education_level: onboarding.educationLevel,
        completed_at: onboarding.completedAt,
      }
    : null;

  // Adapt settings
  const adaptedSettings = settings
    ? {
        ...settings,
        id: settings._id,
        user_id: settings.userId,
        notifications_enabled: settings.notificationsEnabled,
        sound_enabled: settings.soundEnabled,
        music_volume: settings.musicVolume,
        daily_goal_minutes: settings.dailyGoalMinutes,
        preferred_session_length: settings.preferredSessionLength,
        break_length: settings.breakLength,
        auto_start_breaks: settings.autoStartBreaks,
        show_motivational_quotes: settings.showMotivationalQuotes,
      }
    : null;

  const adaptedAchievements = (achievements ?? []).map((a) => ({
    ...a,
    id: a._id,
    user_id: a.userId,
    achievement_type: a.achievementType,
    earned_at: a.earnedAt,
  }));

  const adaptedInsights = (insights ?? []).map((i) => ({
    ...i,
    id: i._id,
    user_id: i.userId,
    insight_type: i.insightType,
    created_at: i._creationTime ? new Date(i._creationTime).toISOString() : "",
  }));

  const adaptedMetrics = metrics
    ? {
        ...metrics,
        id: metrics._id,
        user_id: metrics.userId,
        total_study_time: metrics.totalStudyTime,
        average_session_length: metrics.averageSessionLength,
        focus_score: metrics.focusScore,
        productivity_rating: metrics.productivityRating,
        subjects_studied: metrics.subjectsStudied,
        goals_completed: metrics.goalsCompleted,
      }
    : null;

  const userData = loading
    ? null
    : {
        profile: adaptedProfile,
        onboarding: adaptedOnboarding,
        settings: adaptedSettings,
        tasks: adaptedTasks,
        achievements: adaptedAchievements,
        insights: adaptedInsights,
        metrics: adaptedMetrics,
      };

  return {
    data: userData,
    loading,
    error: null as string | null,
    refetch: () => {},
  };
};
