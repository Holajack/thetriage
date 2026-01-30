import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
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
    dailyGoalMinutes: v.optional(v.number()),
    preferredSessionLength: v.optional(v.number()),
    breakLength: v.optional(v.number()),
    theme: v.optional(v.string()),
    reminderFrequency: v.optional(v.string()),
    privacyMode: v.optional(v.boolean()),
    autoStartBreaks: v.optional(v.boolean()),
    showMotivationalQuotes: v.optional(v.boolean()),
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

export const init = mutation({
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
