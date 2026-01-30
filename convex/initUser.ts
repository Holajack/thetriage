/**
 * Client-callable user initialization mutation.
 *
 * Called after Clerk signup to ensure all user data records exist.
 * The Clerk webhook (http.ts + webhookHelpers.ts) also creates these records,
 * but this mutation serves as a fallback for race conditions where the
 * webhook hasn't fired yet when the user finishes signup.
 *
 * Idempotent — safe to call multiple times.
 */
import { mutation } from "./_generated/server";
import { getCurrentUserOrNull } from "./users";

export const initializeCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) {
      // User record hasn't been created by Clerk webhook yet — skip silently
      console.log("initializeCurrentUser: user not found in Convex yet, skipping");
      return { success: false, reason: "user_not_found" };
    }
    const userId = user._id;

    // Initialize onboarding preferences
    const existingOnboarding = await ctx.db
      .query("onboardingPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (!existingOnboarding) {
      await ctx.db.insert("onboardingPreferences", {
        userId,
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
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (!existingSettings) {
      await ctx.db.insert("userSettings", {
        userId,
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
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (!existingStats) {
      await ctx.db.insert("leaderboardStats", {
        userId,
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
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (!existingMetrics) {
      await ctx.db.insert("learningMetrics", {
        userId,
        totalStudyTime: 0,
        averageSessionLength: 0,
        focusScore: 0,
        productivityRating: 0,
        subjectsStudied: 0,
        goalsCompleted: 0,
      });
    }

    return { success: true, userId };
  },
});
