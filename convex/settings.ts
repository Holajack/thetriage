import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrNull } from "./users";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;
    return await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
  },
});

export const update = mutation({
  args: {
    notificationsEnabled: v.optional(v.boolean()),
    autoPlaySound: v.optional(v.boolean()),
    soundEnabled: v.optional(v.boolean()),
    musicVolume: v.optional(v.number()),
    autoStartFocus: v.optional(v.boolean()),
    autoDndFocus: v.optional(v.boolean()),
    ttsEnabled: v.optional(v.boolean()),
    highContrast: v.optional(v.boolean()),
    reduceMotion: v.optional(v.boolean()),
    dailyReminder: v.optional(v.string()),
    sessionEndReminder: v.optional(v.boolean()),
    // Per-category notification toggles
    notifFriendRequests: v.optional(v.boolean()),
    notifFriendMessages: v.optional(v.boolean()),
    notifStudyRoomInvites: v.optional(v.boolean()),
    notifQrScans: v.optional(v.boolean()),
    studyRemindersEnabled: v.optional(v.boolean()),
    weeklyGoalRemindersEnabled: v.optional(v.boolean()),
    weeklyGoalReminderDays: v.optional(v.array(v.string())),
    focusSessionWarningsEnabled: v.optional(v.boolean()),
    appUpdatesEnabled: v.optional(v.boolean()),
    // AI feature toggles (legacy — superseded by the two Nora toggles below)
    noraEnabled: v.optional(v.boolean()),
    patrickEnabled: v.optional(v.boolean()),
    insightsEnabled: v.optional(v.boolean()),
    personalizedResponses: v.optional(v.boolean()),
    // Nora privacy toggles (Elite)
    noraAppAccess: v.optional(v.boolean()),
    noraTrainingConsent: v.optional(v.boolean()),
    dailyGoalMinutes: v.optional(v.number()),
    preferredSessionLength: v.optional(v.number()),
    breakLength: v.optional(v.number()),
    theme: v.optional(v.string()),
    reminderFrequency: v.optional(v.string()),
    privacyMode: v.optional(v.boolean()),
    autoStartBreaks: v.optional(v.boolean()),
    showMotivationalQuotes: v.optional(v.boolean()),
    // Ambient sound layer toggles
    ambientEnvironmentEnabled: v.optional(v.boolean()),
    ambientWhiteNoiseEnabled: v.optional(v.boolean()),
    ambientCrittersEnabled: v.optional(v.boolean()),
    ambientVolume: v.optional(v.number()),
    // Music service preferences
    preferredMusicService: v.optional(v.string()),
    spotifyConnected: v.optional(v.boolean()),
    appleMusicConnected: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    const cleanUpdates: Record<string, any> = {};
    for (const [key, value] of Object.entries(args)) {
      if (value !== undefined) cleanUpdates[key] = value;
    }

    if (existing) {
      await ctx.db.patch(existing._id, cleanUpdates);
    } else {
      await ctx.db.insert("userSettings", {
        userId: user._id,
        notificationsEnabled: true,
        soundEnabled: true,
        musicVolume: 0.5,
        dailyGoalMinutes: 60,
        preferredSessionLength: 25,
        breakLength: 5,
        theme: "light",
        autoStartBreaks: true,
        showMotivationalQuotes: true,
        ...cleanUpdates,
      });
    }
  },
});

// Internal only: this took an arbitrary userId with no auth check, so any
// caller could create rows for any user. New accounts are provisioned by the
// Clerk webhook (webhookHelpers.initUserData) and initUser.initializeCurrentUser.
export const init = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (!existing) {
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
  },
});
