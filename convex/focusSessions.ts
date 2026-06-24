import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrNull } from "./users";

export const getActive = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;
    return await ctx.db
      .query("focusSessions")
      .withIndex("by_userId_status", (q) =>
        q.eq("userId", user._id).eq("status", "active"),
      )
      .first();
  },
});

export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;
    const query = ctx.db
      .query("focusSessions")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc");

    if (args.limit) {
      return await query.take(args.limit);
    }
    return await query.collect();
  },
});

export const getById = query({
  args: { sessionId: v.id("focusSessions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

export const start = mutation({
  args: {
    sessionType: v.optional(v.string()),
    roomId: v.optional(v.id("studyRooms")),
    subject: v.optional(v.string()),
    taskId: v.optional(v.id("tasks")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    return await ctx.db.insert("focusSessions", {
      userId: user._id,
      startTime: new Date().toISOString(),
      sessionType: args.sessionType ?? "individual",
      status: "active",
      roomId: args.roomId,
      subject: args.subject,
      taskId: args.taskId,
    });
  },
});

export const end = mutation({
  args: { sessionId: v.id("focusSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    const endTime = new Date();
    const startTime = new Date(session.startTime);
    const durationSeconds = Math.floor(
      (endTime.getTime() - startTime.getTime()) / 1000,
    );

    // Calculate flint reward (1 flint per minute)
    const durationMinutes = Math.floor(durationSeconds / 60);
    const flintEarned = durationMinutes;

    // Update the session
    await ctx.db.patch(args.sessionId, {
      endTime: endTime.toISOString(),
      durationSeconds,
      status: "completed",
    });

    // Award flint to user
    if (flintEarned > 0) {
      const user = await ctx.db.get(session.userId);
      if (user) {
        await ctx.db.patch(session.userId, {
          flintCurrency: (user.flintCurrency ?? 0) + flintEarned,
        });
      }
    }

    // Update leaderboard stats with proper daily streak logic
    const existingStats = await ctx.db
      .query("leaderboardStats")
      .withIndex("by_userId", (q) => q.eq("userId", session.userId))
      .unique();

    // Get today's date in YYYY-MM-DD format (UTC)
    const today = endTime.toISOString().split("T")[0];

    // Helper to calculate streak based on last session date
    const calculateStreak = (
      lastSessionDate: string | undefined,
      currentStreak: number,
    ): number => {
      if (!lastSessionDate) {
        // First session ever
        return 1;
      }

      const lastDate = new Date(lastSessionDate + "T00:00:00Z");
      const todayDate = new Date(today + "T00:00:00Z");
      const diffTime = todayDate.getTime() - lastDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        // Same day - maintain current streak (don't increment)
        return currentStreak;
      } else if (diffDays === 1) {
        // Consecutive day - increment streak
        return currentStreak + 1;
      } else {
        // Missed days - reset to 1
        return 1;
      }
    };

    if (existingStats) {
      const newStreak = calculateStreak(
        existingStats.lastSessionDate,
        existingStats.currentStreak ?? 0,
      );

      // Update existing stats
      const newTotalFocusTime =
        (existingStats.totalFocusTime ?? 0) + durationMinutes;
      const newLevel = Math.floor(newTotalFocusTime / 180) + 1;
      await ctx.db.patch(existingStats._id, {
        totalFocusTime: newTotalFocusTime,
        weeklyFocusTime: (existingStats.weeklyFocusTime ?? 0) + durationMinutes,
        monthlyFocusTime:
          (existingStats.monthlyFocusTime ?? 0) + durationMinutes,
        sessionsCompleted: (existingStats.sessionsCompleted ?? 0) + 1,
        totalSessions: (existingStats.totalSessions ?? 0) + 1,
        currentStreak: newStreak,
        longestStreak: Math.max(existingStats.longestStreak ?? 0, newStreak),
        lastSessionDate: today,
        points: (existingStats.points ?? 0) + durationMinutes,
        level: newLevel,
      });
    } else {
      // Create new stats record - every 3 hours (180 min) = 1 level
      const newLevel = Math.floor(durationMinutes / 180) + 1;
      await ctx.db.insert("leaderboardStats", {
        userId: session.userId,
        totalFocusTime: durationMinutes,
        weeklyFocusTime: durationMinutes,
        monthlyFocusTime: durationMinutes,
        sessionsCompleted: 1,
        totalSessions: 1,
        currentStreak: 1,
        longestStreak: 1,
        lastSessionDate: today,
        points: durationMinutes,
        level: newLevel,
        achievementsEarned: 0,
      });
    }

    return { durationSeconds, flintEarned, durationMinutes };
  },
});

export const pause = mutation({
  args: { sessionId: v.id("focusSessions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, { status: "paused" });
  },
});

export const resume = mutation({
  args: { sessionId: v.id("focusSessions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, { status: "active" });
  },
});

export const cancel = mutation({
  args: { sessionId: v.id("focusSessions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      status: "cancelled",
      endTime: new Date().toISOString(),
    });
  },
});

export const deleteSession = mutation({
  args: { sessionId: v.id("focusSessions") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== user._id) {
      throw new Error("Session not found");
    }
    await ctx.db.delete(args.sessionId);
  },
});
