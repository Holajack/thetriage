import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { track } from "../analytics/analytics";
import { AnalyticsEvent } from "../analytics/events";
import { Id } from "../../convex/_generated/dataModel";
import { useCallback, useMemo, useRef, useState } from "react";

/**
 * Ending a session with no active session in memory (e.g. the app relaunched
 * mid-session, or the server already closed it). This is a state problem, not
 * a connectivity problem — callers must not describe it as a network failure.
 */
export class NoActiveSessionError extends Error {
  constructor() {
    super("No active session to end");
    this.name = "NoActiveSessionError";
  }
}

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
  subscription_tier?: string;
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
    subject: string = "General",
  ) => {
    track(AnalyticsEvent.TASK_CREATED, {
      priority,
      hasSubject: subject !== "General",
    });
    const id = await createTask({
      title,
      description,
      priority,
      category: subject,
    });
    return {
      _id: id,
      id: id,
      title,
      description,
      priority,
      category: subject,
      status: "pending",
    };
  };

  const updateTask = async (taskId: string, updates: Record<string, any>) => {
    const convexUpdates: Record<string, any> = {};
    // Map snake_case fields to camelCase Convex fields
    if (updates.title !== undefined) convexUpdates.title = updates.title;
    if (updates.description !== undefined)
      convexUpdates.description = updates.description;
    if (updates.priority !== undefined)
      convexUpdates.priority = updates.priority;
    if (updates.status !== undefined) convexUpdates.status = updates.status;
    if (updates.category !== undefined)
      convexUpdates.category = updates.category;
    if (updates.due_date !== undefined)
      convexUpdates.dueDate = updates.due_date;
    if (updates.dueDate !== undefined) convexUpdates.dueDate = updates.dueDate;
    if (updates.estimated_minutes !== undefined)
      convexUpdates.estimatedMinutes = updates.estimated_minutes;
    if (updates.estimatedMinutes !== undefined)
      convexUpdates.estimatedMinutes = updates.estimatedMinutes;
    if (updates.actual_minutes !== undefined)
      convexUpdates.actualMinutes = updates.actual_minutes;
    if (updates.actualMinutes !== undefined)
      convexUpdates.actualMinutes = updates.actualMinutes;
    if (updates.completed_at !== undefined)
      convexUpdates.completedAt = updates.completed_at;
    if (updates.completedAt !== undefined)
      convexUpdates.completedAt = updates.completedAt;

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
const useConvexInsights = () => {
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

  const formatEntry = useCallback(
    (entry: any, isCurrentUser: boolean) => ({
      ...entry,
      id: entry._id,
      user_id: entry.userId,
      is_current_user: isCurrentUser,
      display_name: isCurrentUser
        ? "You"
        : entry.user?.fullName || entry.user?.username || "Unknown User",
      avatar_url: entry.user?.avatarUrl,
      subscription_tier: entry.user?.subscriptionTier || "free",
      total_focus_time: entry.totalFocusTime ?? 0,
      weekly_focus_time: entry.weeklyFocusTime ?? 0,
      monthly_focus_time: entry.monthlyFocusTime ?? 0,
      current_streak: entry.currentStreak ?? 0,
      longest_streak: entry.longestStreak ?? 0,
      total_sessions: entry.totalSessions ?? 0,
      points: entry.points ?? 0,
      level: entry.level ?? 1,
    }),
    [],
  );

  const globalLeaderboard = useMemo(
    () =>
      (globalData ?? []).map((entry) =>
        formatEntry(
          entry,
          currentUser ? entry.userId === currentUser._id : false,
        ),
      ),
    [globalData, currentUser, formatEntry],
  );

  const friendsLeaderboard = useMemo(
    () =>
      (friendsData ?? []).map((entry) =>
        formatEntry(
          entry,
          currentUser ? entry.userId === currentUser._id : false,
        ),
      ),
    [friendsData, currentUser, formatEntry],
  );

  const data = useMemo(
    () => ({
      friendsLeaderboard,
      globalLeaderboard,
    }),
    [friendsLeaderboard, globalLeaderboard],
  );

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
const useConvexSubtasks = (taskId: string) => {
  const subtasks = useQuery(
    api.subtasks.listByTask,
    taskId ? { taskId: taskId as Id<"tasks"> } : "skip",
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
const useConvexSubjects = () => {
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
const useConvexFriends = () => {
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

  // Memoize adapted array to prevent infinite loop from new array reference on every render
  const adapted = useMemo(
    () =>
      (rooms ?? []).map((r) => ({
        ...r,
        id: r._id,
        creator_id: r.ownerId,
        // The browse list deliberately carries no join code — it is a credential.
        // Members read it from studyRooms.getById.
        room_code: "",
        is_public: r.isPublic,
        max_participants: r.maxParticipants,
        current_participants: r.currentParticipants,
        is_active: r.isActive,
        session_duration: r.sessionDuration,
        break_duration: r.breakDuration,
        created_at: r._creationTime
          ? new Date(r._creationTime).toISOString()
          : "",
      })),
    [rooms],
  );

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

  // Locally-measured pause total — a safety net for a failed pause() mutation.
  const pausedAtRef = useRef<number | null>(null);
  const pausedTotalRef = useRef(0);

  const startMutation = useMutation(api.focusSessions.start);
  const endMutation = useMutation(api.focusSessions.end);
  const pauseMutation = useMutation(api.focusSessions.pause);
  const resumeMutation = useMutation(api.focusSessions.resume);
  const updateUser = useMutation(api.users.updateUser);

  const startSession = async (
    roomId?: string,
    sessionType:
      | "individual"
      | "group"
      | "deep_work"
      | "balanced"
      | "sprint" = "individual",
    subject?: string,
    taskId?: string,
  ) => {
    const sessionId = await startMutation({
      sessionType,
      roomId: roomId ? (roomId as Id<"studyRooms">) : undefined,
      subject,
      taskId: taskId ? (taskId as Id<"tasks">) : undefined,
    });

    const session = {
      id: sessionId,
      _id: sessionId,
      session_type: sessionType,
      status: "active",
      start_time: new Date().toISOString(),
      startTime: new Date().toISOString(),
      subject,
      taskId,
    };

    pausedAtRef.current = null;
    pausedTotalRef.current = 0;

    track(AnalyticsEvent.SESSION_STARTED, {
      sessionType,
      hasSubject: Boolean(subject),
      inRoom: Boolean(roomId),
    });

    setCurrentSession(session);
    setIsSessionActive(true);
    setSessionDuration(0);

    return session;
  };

  /**
   * Finish the session. Always tells the backend — dropping short sessions
   * client-side left an "active" row alive forever while the UI cheerfully
   * announced "Session Complete!". The server is the source of truth for
   * duration (paused time excluded), Flint, and achievements.
   */
  const endSession = async (reflection?: {
    rating?: number;
    productivityRating?: number;
    notes?: string;
  }) => {
    // Throw rather than return null. Returning null let StudySessionScreen render
    // the success modal against an empty result — "Session Complete! 0m focused"
    // — which is the same fabricated success this rewrite exists to remove.
    if (!currentSession) {
      throw new NoActiveSessionError();
    }

    const sessionId = (currentSession.id ||
      currentSession._id) as Id<"focusSessions">;

    try {
      // Close out an open pause before reporting the total.
      let clientPaused = pausedTotalRef.current;
      if (pausedAtRef.current) {
        clientPaused += Math.max(
          0,
          Math.floor((Date.now() - pausedAtRef.current) / 1000),
        );
      }

      const result = await endMutation({
        sessionId,
        rating: reflection?.rating,
        productivityRating: reflection?.productivityRating,
        notes: reflection?.notes,
        clientPausedSeconds: clientPaused,
      });

      pausedAtRef.current = null;
      pausedTotalRef.current = 0;

      setCurrentSession(null);
      setSessionDuration(0);
      setIsSessionActive(false);

      return {
        id: sessionId,
        duration: result.durationSeconds,
        duration_seconds: result.durationSeconds,
        duration_minutes: result.durationMinutes,
        flint_earned: result.flintEarned,
        new_achievements: result.newAchievements ?? [],
        // `credited: false` means it was too short to earn anything — the UI
        // must say so rather than claim a completed session.
        credited: result.credited,
        end_time: new Date().toISOString(),
        status: result.credited ? "completed" : "too_short",
      };
    } catch (error) {
      // Surface the failure. Fabricating a success payload here is what made
      // the app award phantom Flint for sessions the backend never recorded.
      setIsSessionActive(false);
      throw error;
    }
  };

  const pauseSession = async () => {
    if (!currentSession) return;

    // Measure the pause locally as well as on the server. If the pause mutation
    // fails (flaky network), the server would otherwise believe the user was
    // focusing the whole time and pay them for it. endSession sends this total
    // as a floor; over-reporting can only cost the user, never earn them more.
    pausedAtRef.current = Date.now();

    setIsSessionActive(false);
    setCurrentSession({ ...currentSession, status: "paused" });

    await pauseMutation({
      sessionId: (currentSession.id ||
        currentSession._id) as Id<"focusSessions">,
    });
    return currentSession;
  };

  const resumeSession = async () => {
    if (!currentSession) return;

    if (pausedAtRef.current) {
      pausedTotalRef.current += Math.max(
        0,
        Math.floor((Date.now() - pausedAtRef.current) / 1000),
      );
      pausedAtRef.current = null;
    }

    setIsSessionActive(true);
    setCurrentSession({ ...currentSession, status: "active" });

    await resumeMutation({
      sessionId: (currentSession.id ||
        currentSession._id) as Id<"focusSessions">,
    });
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
const useConvexFocusSessionHistory = () => {
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
  const generateAvatarUploadUrlMutation = useMutation(
    api.users.generateAvatarUploadUrl,
  );
  const saveAvatarMutation = useMutation(api.users.saveAvatar);
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
      time_zone: "timeZone",
      full_name_visibility: "fullNameVisibility",
      university_visibility: "universityVisibility",
      location_visibility: "locationVisibility",
      classes_visibility: "classesVisibility",
      environment_theme: "environmentTheme",
    };

    // Currency is server-authoritative (earned by focusSessions.end, spent by
    // inventory.purchaseItem). The server no longer accepts it here, so drop it
    // rather than send a field that would fail validation.
    const SERVER_OWNED = new Set([
      "flint_currency",
      "flintCurrency",
      "first_session_bonus_claimed",
      "firstSessionBonusClaimed",
    ]);

    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined) continue;
      if (SERVER_OWNED.has(key)) continue;
      const mappedKey = fieldMap[key] || key;
      convexUpdates[mappedKey] = value;
    }

    if (Object.keys(convexUpdates).length === 0) return user;

    await updateUserMutation({
      userId: user._id,
      ...convexUpdates,
    });

    return { ...user, ...convexUpdates };
  };

  const uploadProfileImage = async (imageUri: string) => {
    // Upload the picked image bytes to Convex file storage and persist the
    // resulting public serving URL on the user (works across devices/launches).
    const uploadUrl = await generateAvatarUploadUrlMutation({});
    const response = await fetch(imageUri);
    const blob = await response.blob();
    const uploadResult = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": blob.type || "image/jpeg" },
      body: blob,
    });
    if (!uploadResult.ok) {
      throw new Error("Failed to upload profile image");
    }
    const { storageId } = await uploadResult.json();
    const publicUrl = await saveAvatarMutation({ storageId });
    return { publicUrl };
  };

  const updateStatus = async (status: string) => {
    return await updateProfile({ status });
  };

  // Adapt to match profile shape (memoized to prevent infinite re-render loops)
  const profile = useMemo(
    () =>
      user
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
            created_at: user._creationTime
              ? new Date(user._creationTime).toISOString()
              : "",
            updated_at: user._creationTime
              ? new Date(user._creationTime).toISOString()
              : "",
          }
        : null,
    [user],
  );

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
const useConvexUserAppData = () => {
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
        tts_enabled: settings.ttsEnabled,
        high_contrast: settings.highContrast,
        reduce_motion: settings.reduceMotion,
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
