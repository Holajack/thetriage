import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrNull } from "./users";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;
    return await ctx.db
      .query("achievements")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const getByType = query({
  args: { achievementType: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;
    const all = await ctx.db
      .query("achievements")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
    return all.filter((a) => a.achievementType === args.achievementType);
  },
});

export const award = mutation({
  args: {
    achievementType: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    pointsAwarded: v.optional(v.number()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    // Check if already earned
    const existing = await ctx.db
      .query("achievements")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    const alreadyEarned = existing.find(
      (a) => a.achievementType === args.achievementType
    );
    if (alreadyEarned) return alreadyEarned._id;

    const id = await ctx.db.insert("achievements", {
      userId: user._id,
      achievementType: args.achievementType,
      title: args.title,
      description: args.description,
      icon: args.icon,
      pointsAwarded: args.pointsAwarded ?? 0,
      category: args.category,
      earnedAt: new Date().toISOString(),
    });

    // Update leaderboard stats
    const stats = await ctx.db
      .query("leaderboardStats")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (stats) {
      await ctx.db.patch(stats._id, {
        achievementsEarned: (stats.achievementsEarned ?? 0) + 1,
        points: (stats.points ?? 0) + (args.pointsAwarded ?? 0),
      });
    }

    return id;
  },
});
