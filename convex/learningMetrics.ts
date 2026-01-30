import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrNull } from "./users";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;
    return await ctx.db
      .query("learningMetrics")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
  },
});

export const update = mutation({
  args: {
    totalStudyTime: v.optional(v.number()),
    averageSessionLength: v.optional(v.number()),
    focusScore: v.optional(v.number()),
    productivityRating: v.optional(v.number()),
    subjectsStudied: v.optional(v.number()),
    goalsCompleted: v.optional(v.number()),
    weekStart: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const existing = await ctx.db
      .query("learningMetrics")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    const cleanUpdates: Record<string, any> = {};
    for (const [key, value] of Object.entries(args)) {
      if (value !== undefined) cleanUpdates[key] = value;
    }

    if (existing) {
      await ctx.db.patch(existing._id, cleanUpdates);
    } else {
      await ctx.db.insert("learningMetrics", {
        userId: user._id,
        totalStudyTime: 0,
        averageSessionLength: 0,
        focusScore: 0,
        productivityRating: 0,
        subjectsStudied: 0,
        goalsCompleted: 0,
        ...cleanUpdates,
      });
    }
  },
});

export const init = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("learningMetrics")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (!existing) {
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
