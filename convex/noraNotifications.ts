/**
 * Convex functions for Nora proactive notifications.
 *
 * Notifications are generated for ALL users (including free tier)
 * to maintain engagement and entice upgrades.
 */
import { v } from "convex/values";
import { query, mutation, internalMutation, internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// ────────────────────────────────────────────────────
// Queries
// ────────────────────────────────────────────────────

/** Get unread notifications for the current user */
export const getNotifications = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];

    const notifications = await ctx.db
      .query("noraNotifications")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(20);

    return notifications;
  },
});

/** Get unread count for badge display */
export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return 0;

    const notifications = await ctx.db
      .query("noraNotifications")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    return notifications.filter((n) => !n.readAt).length;
  },
});

// ────────────────────────────────────────────────────
// Mutations
// ────────────────────────────────────────────────────

/** Mark a notification as read */
export const markRead = mutation({
  args: { notificationId: v.id("noraNotifications") },
  handler: async (ctx, { notificationId }) => {
    await ctx.db.patch(notificationId, {
      readAt: new Date().toISOString(),
    });
  },
});

/** Mark all notifications as read */
export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return;

    const unread = await ctx.db
      .query("noraNotifications")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    const now = new Date().toISOString();
    for (const n of unread.filter((x) => !x.readAt)) {
      await ctx.db.patch(n._id, { readAt: now });
    }
  },
});

/** Internal: insert a notification */
export const _scheduleNotification = internalMutation({
  args: {
    userId: v.id("users"),
    type: v.string(),
    title: v.string(),
    body: v.string(),
    scheduledFor: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("noraNotifications", {
      ...args,
    });
  },
});

// ────────────────────────────────────────────────────
// Actions
// ────────────────────────────────────────────────────

/**
 * Generate daily notifications for all active users.
 * Called by cron job. Evaluates triggers per user and schedules notifications.
 */
export const generateNotifications = internalAction({
  args: {},
  handler: async (ctx) => {
    const users: any[] = await ctx.runQuery(
      internal.noraNotifications._getActiveUsers
    );

    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const dayOfWeek = now.getUTCDay(); // 0=Sunday

    for (const user of users) {
      try {
        // Check what notifications were already sent today
        const todayNotifs: any[] = await ctx.runQuery(
          internal.noraNotifications._getTodayNotifications,
          { userId: user._id, date: today }
        );

        const sentTypes = new Set(todayNotifs.map((n: any) => n.type));

        // Get user's recent activity
        const recentSessions: any[] = await ctx.runQuery(
          internal.noraNotifications._getRecentSessions,
          { userId: user._id }
        );

        const leaderboard: any = await ctx.runQuery(
          internal.noraNotifications._getLeaderboard,
          { userId: user._id }
        );

        const tier = user.subscriptionTier || "free";

        // Trigger 1: Study reminder (no session in 2+ days)
        if (!sentTypes.has("study_reminder") && recentSessions.length === 0) {
          await ctx.runMutation(
            internal.noraNotifications._scheduleNotification,
            {
              userId: user._id,
              type: "study_reminder",
              title: "Nora misses you!",
              body: "It's been a while since your last study session. Ready to get back on track? I can help you plan your next session.",
              scheduledFor: now.toISOString(),
            }
          );
        }

        // Trigger 2: Streak encouragement (streak > 0 and about to break)
        const streak = leaderboard?.currentStreak || 0;
        if (
          !sentTypes.has("streak_encouragement") &&
          streak > 2 &&
          recentSessions.length === 0
        ) {
          await ctx.runMutation(
            internal.noraNotifications._scheduleNotification,
            {
              userId: user._id,
              type: "streak_encouragement",
              title: `${streak}-day streak at risk!`,
              body: `You've been studying for ${streak} days straight. Don't break your streak -- even a short session counts!`,
              scheduledFor: now.toISOString(),
            }
          );
        }

        // Trigger 3: Weekly summary (Sunday)
        if (!sentTypes.has("weekly_summary") && dayOfWeek === 0) {
          const weeklyHours = leaderboard
            ? Math.round((leaderboard.totalFocusTime || 0) / 3600)
            : 0;
          await ctx.runMutation(
            internal.noraNotifications._scheduleNotification,
            {
              userId: user._id,
              type: "weekly_summary",
              title: "Your Weekly Study Summary",
              body: `You've logged ${weeklyHours}h of focus time${streak > 0 ? ` with a ${streak}-day streak` : ""}. ${tier === "elite" ? "Check your progress with Nora!" : "Upgrade to Elite to get AI-powered study insights!"}`,
              scheduledFor: now.toISOString(),
            }
          );
        }

        // Trigger 4: Upgrade nudge (non-Elite, max once per week)
        if (
          !sentTypes.has("upgrade_nudge") &&
          tier !== "elite" &&
          dayOfWeek === 3 // Wednesdays
        ) {
          await ctx.runMutation(
            internal.noraNotifications._scheduleNotification,
            {
              userId: user._id,
              type: "upgrade_nudge",
              title: "Unlock AI Study Support",
              body: "Nora can help you with study plans, web research, document analysis, and more. Upgrade to Elite to unlock full AI assistance!",
              scheduledFor: now.toISOString(),
            }
          );
        }
      } catch (e) {
        console.error(
          `Failed to generate notifications for user ${user._id}:`,
          e
        );
      }
    }
  },
});

// ────────────────────────────────────────────────────
// Internal queries for the action
// ────────────────────────────────────────────────────

export const _getActiveUsers = internalQuery({
  args: {},
  handler: async (ctx) => {
    // Get users who have been active in the last 30 days
    const allUsers = await ctx.db.query("users").collect();
    return allUsers.filter((u) => u.status !== "inactive").slice(0, 500);
  },
});

export const _getTodayNotifications = internalQuery({
  args: { userId: v.id("users"), date: v.string() },
  handler: async (ctx, { userId, date }) => {
    const notifs = await ctx.db
      .query("noraNotifications")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    return notifs.filter((n) => n.scheduledFor.startsWith(date));
  },
});

export const _getRecentSessions = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const twoDaysAgo = new Date(
      Date.now() - 2 * 24 * 60 * 60 * 1000
    ).toISOString();

    const sessions = await ctx.db
      .query("focusSessions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(5);

    return sessions.filter(
      (s) => s.startTime && s.startTime > twoDaysAgo
    );
  },
});

export const _getLeaderboard = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("leaderboardStats")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
  },
});
