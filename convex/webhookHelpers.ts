import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

/**
 * Internal mutations used by the Clerk webhook handler.
 * These are not exposed to the client — only callable from http.ts.
 */

export const createUser = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    username: v.optional(v.string()),
    fullName: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existing) return existing._id;

    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      username: args.username,
      fullName: args.fullName,
      firstName: args.firstName,
      lastName: args.lastName,
      avatarUrl: args.avatarUrl,
      status: "active",
      subscriptionTier: "trial",
      flintCurrency: 0,
      firstSessionBonusClaimed: false,
    });
  },
});

export const initUserData = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Initialize onboarding preferences
    const existingOnboarding = await ctx.db
      .query("onboardingPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (!existingOnboarding) {
      await ctx.db.insert("onboardingPreferences", {
        userId: args.userId,
        isOnboardingComplete: false,
        allowDirectMessages: true,
        personalizedRecommendations: true,
        usageAnalytics: true,
        profileVisibility: "friends",
        showStudyProgress: true,
        appearOnLeaderboards: true,
        publicStudyRooms: true,
        receiveStudyInvitations: true,
        emailNotificationPreference: true,
        shareAnonymousAnalytics: true,
      });
    }

    // Initialize user settings
    const existingSettings = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (!existingSettings) {
      await ctx.db.insert("userSettings", {
        userId: args.userId,
        notificationsEnabled: true,
        soundEnabled: true,
        musicVolume: 0.5,
        dailyGoalMinutes: 60,
        preferredSessionLength: 25,
        breakLength: 5,
        theme: "light",
        autoStartBreaks: true,
        showMotivationalQuotes: true,
      });
    }

    // Initialize leaderboard stats
    const existingStats = await ctx.db
      .query("leaderboardStats")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (!existingStats) {
      await ctx.db.insert("leaderboardStats", {
        userId: args.userId,
        totalFocusTime: 0,
        weeklyFocusTime: 0,
        monthlyFocusTime: 0,
        level: 1,
        points: 0,
        currentStreak: 0,
        longestStreak: 0,
        sessionsCompleted: 0,
        totalSessions: 0,
        achievementsEarned: 0,
      });
    }

    // Initialize learning metrics
    const existingMetrics = await ctx.db
      .query("learningMetrics")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (!existingMetrics) {
      await ctx.db.insert("learningMetrics", {
        userId: args.userId,
        totalStudyTime: 0,
        averageSessionLength: 0,
        focusScore: 0,
        productivityRating: 0,
        subjectsStudied: 0,
        goalsCompleted: 0,
      });
    }
  },
});

export const updateUserByClerkId = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.optional(v.string()),
    username: v.optional(v.string()),
    fullName: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { clerkId, ...updates } = args;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .unique();

    if (!user) {
      console.error(`[webhookHelpers] User not found for clerkId: ${clerkId}`);
      return;
    }

    const cleanUpdates: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) cleanUpdates[key] = value;
    }

    if (Object.keys(cleanUpdates).length > 0) {
      await ctx.db.patch(user._id, cleanUpdates);
    }
  },
});

export const deleteUserByClerkId = internalMutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) return;

    // Delete related records
    const tables = [
      "onboardingPreferences",
      "userSettings",
      "leaderboardStats",
      "learningMetrics",
    ] as const;

    for (const table of tables) {
      const records = await ctx.db
        .query(table)
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .collect();
      for (const record of records) {
        await ctx.db.delete(record._id);
      }
    }

    // Delete tasks and subtasks
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
    for (const task of tasks) {
      const subtasks = await ctx.db
        .query("subtasks")
        .withIndex("by_taskId", (q) => q.eq("taskId", task._id))
        .collect();
      for (const st of subtasks) await ctx.db.delete(st._id);
      await ctx.db.delete(task._id);
    }

    // Delete achievements
    const achievements = await ctx.db
      .query("achievements")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
    for (const a of achievements) await ctx.db.delete(a._id);

    // Delete focus sessions
    const sessions = await ctx.db
      .query("focusSessions")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
    for (const s of sessions) await ctx.db.delete(s._id);

    // Finally delete the user
    await ctx.db.delete(user._id);
  },
});
