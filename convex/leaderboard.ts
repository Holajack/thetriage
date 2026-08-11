import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { localDayKey, weekStartKey } from "./timeWindows";
import {
  getCurrentUser,
  getCurrentUserOrNull,
  areFriends,
  isFieldVisible,
} from "./users";

/**
 * Zero the rolling windows at READ time.
 *
 * weeklyFocusTime / monthlyFocusTime only roll over when a session completes, so
 * a user who stops studying keeps seeing last week's number under a "This Week"
 * label forever. Comparing the stored anchor to today tells the truth without
 * needing a cron.
 */
function withFreshWindows<
  T extends {
    weeklyFocusTime?: number;
    monthlyFocusTime?: number;
    weekStartDate?: string;
    monthStartDate?: string;
  },
>(stats: T, timeZone: string | undefined): T {
  const today = localDayKey(new Date(), timeZone);
  const thisWeek = weekStartKey(today);
  const thisMonth = today.slice(0, 7);

  return {
    ...stats,
    weeklyFocusTime:
      stats.weekStartDate === thisWeek ? (stats.weeklyFocusTime ?? 0) : 0,
    monthlyFocusTime:
      stats.monthStartDate === thisMonth ? (stats.monthlyFocusTime ?? 0) : 0,
  };
}

export const getMyStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;
    const stats = await ctx.db
      .query("leaderboardStats")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
    if (!stats) return null;
    return withFreshWindows(stats, user.timeZone);
  },
});

export const getGlobal = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const allStats = await ctx.db.query("leaderboardStats").collect();

    allStats.sort((a, b) => (b.points ?? 0) - (a.points ?? 0));

    const limited = args.limit ? allStats.slice(0, args.limit) : allStats;

    const viewer = await getCurrentUserOrNull(ctx);
    const enriched = [];
    for (const stat of limited) {
      const user = await ctx.db.get(stat.userId);
      let showName = false;
      if (user) {
        const isSelf = viewer?._id === user._id;
        const isFriend = viewer
          ? await areFriends(ctx, viewer._id, user._id)
          : false;
        showName = isFieldVisible(user.fullNameVisibility, isSelf, isFriend);
      }
      enriched.push({
        ...stat,
        user: user
          ? {
              _id: user._id,
              username: user.username,
              fullName: showName ? user.fullName : undefined,
              avatarUrl: user.avatarUrl,
            }
          : null,
      });
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
      // Everyone here is the viewer or a friend, so only "none" hides the name.
      const showName = friendUser
        ? isFieldVisible(
            friendUser.fullNameVisibility,
            friendUser._id === user._id,
            true,
          )
        : false;
      enriched.push({
        ...stat,
        user: friendUser
          ? {
              _id: friendUser._id,
              username: friendUser.username,
              fullName: showName ? friendUser.fullName : undefined,
              avatarUrl: friendUser.avatarUrl,
            }
          : null,
      });
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

// NOTE: there is deliberately no public `updateStats` mutation. It let any
// client write its own points, level and streak straight onto the leaderboard.
// Stats are derived server-side from completed sessions
// (see focusSessions.end -> applySessionToStats).

// Internal only: this took an arbitrary userId with no auth check, so any
// caller could create rows for any user. New accounts are provisioned by the
// Clerk webhook (webhookHelpers.initUserData) and initUser.initializeCurrentUser.
export const initStats = internalMutation({
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
