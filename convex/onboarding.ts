import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrNull } from "./users";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;
    return await ctx.db
      .query("onboardingPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
  },
});

export const update = mutation({
  args: {
    isOnboardingComplete: v.optional(v.boolean()),
    weeklyFocusGoal: v.optional(v.number()),
    welcomeCompleted: v.optional(v.boolean()),
    goalsSet: v.optional(v.boolean()),
    firstSessionCompleted: v.optional(v.boolean()),
    profileCustomized: v.optional(v.boolean()),
    bio: v.optional(v.string()),
    allowDirectMessages: v.optional(v.boolean()),
    avatarUrl: v.optional(v.string()),
    focusMethod: v.optional(v.string()),
    educationLevel: v.optional(v.string()),
    university: v.optional(v.string()),
    major: v.optional(v.string()),
    location: v.optional(v.string()),
    timezone: v.optional(v.string()),
    dataCollectionConsent: v.optional(v.boolean()),
    personalizedRecommendations: v.optional(v.boolean()),
    usageAnalytics: v.optional(v.boolean()),
    marketingCommunications: v.optional(v.boolean()),
    profileVisibility: v.optional(v.string()),
    studyDataSharing: v.optional(v.boolean()),
    showStudyProgress: v.optional(v.boolean()),
    appearOnLeaderboards: v.optional(v.boolean()),
    studySessionVisibility: v.optional(v.string()),
    publicStudyRooms: v.optional(v.boolean()),
    locationSharingPreference: v.optional(v.string()),
    receiveStudyInvitations: v.optional(v.boolean()),
    emailNotificationPreference: v.optional(v.boolean()),
    shareAnonymousAnalytics: v.optional(v.boolean()),
    personalizedRecommendationsPreference: v.optional(v.boolean()),
    completedAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const existing = await ctx.db
      .query("onboardingPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    const cleanUpdates: Record<string, any> = {};
    for (const [key, value] of Object.entries(args)) {
      if (value !== undefined) cleanUpdates[key] = value;
    }

    if (existing) {
      await ctx.db.patch(existing._id, cleanUpdates);
    } else {
      await ctx.db.insert("onboardingPreferences", {
        userId: user._id,
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
        ...cleanUpdates,
      });
    }
  },
});

export const complete = mutation({
  args: {
    focusMethod: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const existing = await ctx.db
      .query("onboardingPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    const completionData = {
      isOnboardingComplete: true,
      welcomeCompleted: true,
      goalsSet: true,
      profileCustomized: true,
      completedAt: new Date().toISOString(),
      focusMethod: args.focusMethod,
    };

    if (existing) {
      await ctx.db.patch(existing._id, completionData);
    } else {
      await ctx.db.insert("onboardingPreferences", {
        userId: user._id,
        ...completionData,
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
  },
});

export const init = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("onboardingPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (!existing) {
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
  },
});
