import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrNull } from "./users";

export const getMyStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;
    return await ctx.db
      .query("leaderboardStats")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
  },
});

export const getGlobal = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const allStats = await ctx.db.query("leaderboardStats").collect();

    // Sort by points descending
    allStats.sort((a, b) => (b.points ?? 0) - (a.points ?? 0));

    const limited = args.limit ? allStats.slice(0, args.limit) : allStats;

    // Enrich with user data
    const enriched = [];
    for (const stat of limited) {
      const user = await ctx.db.get(stat.userId);
      enriched.push({ ...stat, user });
    }
    return enriched;
  },
});

export const getFriends = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    // Get friend IDs
    const friendships = await ctx.db
      .query("friends")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
    const reverseFriendships = await ctx.db
      .query("friends")
      .withIndex("by_friendId", (q) => q.eq("friendId", user._id))
      .collect();

    const friendIds = new Set<string>();
    for (const f of friendships) friendIds.add(f.friendId);
    for (const f of reverseFriendships) friendIds.add(f.userId);
    friendIds.add(user._id); // Include self

    // Get stats for all friends
    const allStats = await ctx.db.query("leaderboardStats").collect();
    const friendStats = allStats.filter((s) => friendIds.has(s.userId));
    friendStats.sort((a, b) => (b.points ?? 0) - (a.points ?? 0));

    const enriched = [];
    for (const stat of friendStats) {
      const friendUser = await ctx.db.get(stat.userId);
      enriched.push({ ...stat, user: friendUser });
    }
    return enriched;
  },
});

export const getUserRank = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const allStats = await ctx.db.query("leaderboardStats").collect();
    allStats.sort((a, b) => (b.points ?? 0) - (a.points ?? 0));

    const rank = allStats.findIndex((s) => s.userId === user._id) + 1;
    const myStats = allStats.find((s) => s.userId === user._id);

    return {
      rank: rank || null,
      totalUsers: allStats.length,
      stats: myStats ?? null,
    };
  },
});

export const updateStats = mutation({
  args: {
    totalFocusTime: v.optional(v.number()),
    weeklyFocusTime: v.optional(v.number()),
    monthlyFocusTime: v.optional(v.number()),
    level: v.optional(v.number()),
    points: v.optional(v.number()),
    currentStreak: v.optional(v.number()),
    longestStreak: v.optional(v.number()),
    sessionsCompleted: v.optional(v.number()),
    totalSessions: v.optional(v.number()),
    achievementsEarned: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const existing = await ctx.db
      .query("leaderboardStats")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    const cleanUpdates: Record<string, any> = {};
    for (const [key, value] of Object.entries(args)) {
      if (value !== undefined) cleanUpdates[key] = value;
    }

    if (existing) {
      await ctx.db.patch(existing._id, cleanUpdates);
    } else {
      await ctx.db.insert("leaderboardStats", {
        userId: user._id,
        ...cleanUpdates,
      });
    }
  },
});

export const initStats = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("leaderboardStats")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (!existing) {
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
  },
});
