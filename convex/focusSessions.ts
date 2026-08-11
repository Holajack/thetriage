import { v } from "convex/values";
import {
  query,
  mutation,
  internalMutation,
  MutationCtx,
} from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { getCurrentUser, getCurrentUserOrNull } from "./users";
import { evaluateAchievements } from "./achievements";
import { localDayKey, weekStartKey } from "./timeWindows";

/**
 * A session longer than this was almost certainly left running (phone locked,
 * app killed). We refuse to credit the excess rather than hand out a day of Flint.
 */
const MAX_CREDITED_SECONDS = 6 * 60 * 60; // 6h

/** Sessions shorter than this are recorded honestly but earn nothing. */
export const MIN_CREDITED_SECONDS = 60;

/** Load a session and prove the caller owns it. */
async function getOwnedSession(
  ctx: MutationCtx,
  sessionId: Id<"focusSessions">,
): Promise<{ user: Doc<"users">; session: Doc<"focusSessions"> }> {
  const user = await getCurrentUser(ctx);
  const session = await ctx.db.get(sessionId);
  // Same error either way: never reveal whether someone else's session exists.
  if (!session || session.userId !== user._id) {
    throw new Error("Session not found");
  }
  return { user, session };
}

/**
 * Seconds actually focused: wall clock minus every paused stretch.
 *
 * `clientPausedSeconds` is the pause total the app measured locally. It is taken
 * only when it is LARGER than what the server recorded, which is safe to trust:
 * over-reporting a pause can only reduce the reporter's own reward, never raise
 * it. It exists because a pause() mutation that fails on a flaky network would
 * otherwise leave the server believing the user focused the whole time.
 */
function creditedSeconds(
  session: Doc<"focusSessions">,
  endedAt: Date,
  clientPausedSeconds?: number,
): { elapsed: number; credited: number } {
  const startMs = Date.parse(session.startTime);
  if (!Number.isFinite(startMs)) return { elapsed: 0, credited: 0 };

  const wallSeconds = Math.floor((endedAt.getTime() - startMs) / 1000);

  let paused = session.totalPausedSeconds ?? 0;
  // Ending while still paused: close out the open pause too.
  if (session.pausedAt) {
    paused += Math.max(
      0,
      Math.floor((endedAt.getTime() - session.pausedAt) / 1000),
    );
  }

  const claimed = clientPausedSeconds ?? 0;
  if (Number.isFinite(claimed) && claimed > paused) {
    paused = Math.min(claimed, wallSeconds);
  }

  const elapsed = Math.max(0, wallSeconds - paused);
  return { elapsed, credited: Math.min(elapsed, MAX_CREDITED_SECONDS) };
}

// ============================================================
// Queries
// ============================================================

export const getActive = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;

    const active = await ctx.db
      .query("focusSessions")
      .withIndex("by_userId_status", (q) =>
        q.eq("userId", user._id).eq("status", "active"),
      )
      .first();
    if (active) return active;

    return await ctx.db
      .query("focusSessions")
      .withIndex("by_userId_status", (q) =>
        q.eq("userId", user._id).eq("status", "paused"),
      )
      .first();
  },
});

export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;

    const q = ctx.db
      .query("focusSessions")
      .withIndex("by_userId", (qq) => qq.eq("userId", user._id))
      .order("desc");

    if (args.limit) return await q.take(args.limit);
    return await q.collect();
  },
});

export const getById = query({
  args: { sessionId: v.id("focusSessions") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== user._id) return null;
    return session;
  },
});

// ============================================================
// Mutations
// ============================================================

export const start = mutation({
  args: {
    sessionType: v.optional(v.string()),
    roomId: v.optional(v.id("studyRooms")),
    subject: v.optional(v.string()),
    taskId: v.optional(v.id("tasks")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    // Anything still open when a new session starts was abandoned (app killed,
    // phone died). Close it out rather than leave an immortal "active" row.
    for (const status of ["active", "paused"] as const) {
      const stale = await ctx.db
        .query("focusSessions")
        .withIndex("by_userId_status", (q) =>
          q.eq("userId", user._id).eq("status", status),
        )
        .collect();
      for (const s of stale) {
        await ctx.db.patch(s._id, {
          status: "abandoned",
          endTime: new Date().toISOString(),
        });
      }
    }

    return await ctx.db.insert("focusSessions", {
      userId: user._id,
      startTime: new Date().toISOString(),
      sessionType: args.sessionType ?? "individual",
      status: "active",
      roomId: args.roomId,
      subject: args.subject,
      taskId: args.taskId,
      totalPausedSeconds: 0,
    });
  },
});

export const pause = mutation({
  args: { sessionId: v.id("focusSessions") },
  handler: async (ctx, args) => {
    const { session } = await getOwnedSession(ctx, args.sessionId);
    if (session.status !== "active") return; // already paused or ended
    await ctx.db.patch(session._id, {
      status: "paused",
      pausedAt: Date.now(),
    });
  },
});

export const resume = mutation({
  args: { sessionId: v.id("focusSessions") },
  handler: async (ctx, args) => {
    const { session } = await getOwnedSession(ctx, args.sessionId);
    if (session.status !== "paused") return;

    const pausedFor = session.pausedAt
      ? Math.max(0, Math.floor((Date.now() - session.pausedAt) / 1000))
      : 0;

    await ctx.db.patch(session._id, {
      status: "active",
      pausedAt: undefined,
      totalPausedSeconds: (session.totalPausedSeconds ?? 0) + pausedFor,
    });
  },
});

export const cancel = mutation({
  args: { sessionId: v.id("focusSessions") },
  handler: async (ctx, args) => {
    const { session } = await getOwnedSession(ctx, args.sessionId);
    if (session.status === "completed") return; // never un-complete a paid session
    await ctx.db.patch(session._id, {
      status: "cancelled",
      endTime: new Date().toISOString(),
      pausedAt: undefined,
    });
  },
});

/**
 * Complete a session: credit focus time, Flint, streak and level exactly once.
 * Safe to call twice — a completed session reports its existing totals rather
 * than paying out again.
 */
export const end = mutation({
  args: {
    sessionId: v.id("focusSessions"),
    rating: v.optional(v.number()),
    productivityRating: v.optional(v.number()),
    notes: v.optional(v.string()),
    /** Pause total the client measured. Only used if larger than the server's. */
    clientPausedSeconds: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user, session } = await getOwnedSession(ctx, args.sessionId);

    // Only an OPEN session can be completed.
    //
    // Guarding merely on `=== "completed"` was not enough: "cancelled" and
    // "abandoned" rows fell straight through to the payout path — and start()
    // and the reaper MANUFACTURE abandoned rows. That turned the cleanup into a
    // Flint printer (start a hundred sessions, wait, then end each stale id).
    // Anything not currently running is reported back, never re-paid.
    if (session.status !== "active" && session.status !== "paused") {
      const already = session.durationSeconds ?? 0;
      return {
        durationSeconds: already,
        durationMinutes: Math.floor(already / 60),
        flintEarned: 0,
        credited: false,
        alreadyCompleted: session.status === "completed",
        newAchievements: [],
      };
    }

    const endedAt = new Date();
    const { credited } = creditedSeconds(
      session,
      endedAt,
      args.clientPausedSeconds,
    );
    const durationMinutes = Math.floor(credited / 60);

    await ctx.db.patch(session._id, {
      endTime: endedAt.toISOString(),
      durationSeconds: credited,
      status: "completed",
      pausedAt: undefined,
      rating: args.rating,
      productivityRating: args.productivityRating,
      notes: args.notes,
    });

    // Under a minute is honest history, but it earns nothing.
    if (credited < MIN_CREDITED_SECONDS) {
      return {
        durationSeconds: credited,
        durationMinutes: 0,
        flintEarned: 0,
        credited: false,
        alreadyCompleted: false,
        newAchievements: [],
      };
    }

    const flintEarned = durationMinutes; // 1 Flint per focused minute
    if (flintEarned > 0) {
      await ctx.db.patch(user._id, {
        flintCurrency: (user.flintCurrency ?? 0) + flintEarned,
      });
    }

    await applySessionToStats(ctx, user, durationMinutes, endedAt);

    // Award any achievement this session just earned. These are REAL now — the
    // report screen used to invent them and never save anything.
    const newAchievements = await evaluateAchievements(ctx, user._id);

    return {
      durationSeconds: credited,
      durationMinutes,
      flintEarned,
      credited: true,
      alreadyCompleted: false,
      newAchievements,
    };
  },
});

/** Roll a completed session into leaderboardStats (streak, level, windows). */
async function applySessionToStats(
  ctx: MutationCtx,
  user: Doc<"users">,
  durationMinutes: number,
  endedAt: Date,
) {
  const today = localDayKey(endedAt, user.timeZone);
  const thisWeek = weekStartKey(today);
  const thisMonth = today.slice(0, 7); // YYYY-MM

  const stats = await ctx.db
    .query("leaderboardStats")
    .withIndex("by_userId", (q) => q.eq("userId", user._id))
    .unique();

  if (!stats) {
    await ctx.db.insert("leaderboardStats", {
      userId: user._id,
      totalFocusTime: durationMinutes,
      weeklyFocusTime: durationMinutes,
      monthlyFocusTime: durationMinutes,
      sessionsCompleted: 1,
      totalSessions: 1,
      currentStreak: 1,
      longestStreak: 1,
      lastSessionDate: today,
      weekStartDate: thisWeek,
      monthStartDate: thisMonth,
      points: durationMinutes,
      level: Math.floor(durationMinutes / 180) + 1,
      achievementsEarned: 0,
    });
    return;
  }

  // Streak: same local day keeps it, next local day extends it, a gap resets it.
  const last = stats.lastSessionDate;
  const current = stats.currentStreak ?? 0;
  let streak: number;
  if (!last) {
    streak = 1;
  } else {
    const diffDays = Math.round(
      (Date.parse(today + "T00:00:00Z") - Date.parse(last + "T00:00:00Z")) /
        86400000,
    );
    if (diffDays <= 0) streak = Math.max(current, 1);
    else if (diffDays === 1) streak = current + 1;
    else streak = 1;
  }

  // Roll the windows over instead of accumulating forever — that is what made
  // "This Week" silently mean "all time".
  const weekBase =
    stats.weekStartDate === thisWeek ? (stats.weeklyFocusTime ?? 0) : 0;
  const monthBase =
    stats.monthStartDate === thisMonth ? (stats.monthlyFocusTime ?? 0) : 0;

  const newTotal = (stats.totalFocusTime ?? 0) + durationMinutes;

  await ctx.db.patch(stats._id, {
    totalFocusTime: newTotal,
    weeklyFocusTime: weekBase + durationMinutes,
    monthlyFocusTime: monthBase + durationMinutes,
    weekStartDate: thisWeek,
    monthStartDate: thisMonth,
    sessionsCompleted: (stats.sessionsCompleted ?? 0) + 1,
    totalSessions: (stats.totalSessions ?? 0) + 1,
    currentStreak: streak,
    longestStreak: Math.max(stats.longestStreak ?? 0, streak),
    lastSessionDate: today,
    points: (stats.points ?? 0) + durationMinutes,
    level: Math.floor(newTotal / 180) + 1, // 3h focused = 1 level
  });
}

/** Attach the post-session reflection after the fact (from the report screen). */
export const saveReflection = mutation({
  args: {
    sessionId: v.id("focusSessions"),
    rating: v.optional(v.number()),
    productivityRating: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { session } = await getOwnedSession(ctx, args.sessionId);
    await ctx.db.patch(session._id, {
      rating: args.rating,
      productivityRating: args.productivityRating,
      notes: args.notes,
    });
  },
});

export const deleteSession = mutation({
  args: { sessionId: v.id("focusSessions") },
  handler: async (ctx, args) => {
    const { session } = await getOwnedSession(ctx, args.sessionId);
    await ctx.db.delete(session._id);
  },
});

/**
 * Reap sessions that were left open. A user who force-quits mid-session leaves a
 * row at status "active" forever; those rows polluted history (0m entries) and
 * were the reason "abandoned" sessions were invisible in the data.
 *
 * Anything still open well past the longest credible session is closed out. We
 * mark it "abandoned" rather than "completed" so it earns nothing and stays
 * honest in analytics.
 */
export const reapAbandonedSessions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - MAX_CREDITED_SECONDS * 1000;
    let reaped = 0;

    for (const status of ["active", "paused"] as const) {
      const open = await ctx.db
        .query("focusSessions")
        .withIndex("by_status", (q) => q.eq("status", status))
        .collect();

      for (const session of open) {
        const startMs = Date.parse(session.startTime);
        if (Number.isFinite(startMs) && startMs > cutoff) continue; // still plausible

        await ctx.db.patch(session._id, {
          status: "abandoned",
          endTime: new Date().toISOString(),
        });
        reaped++;
      }
    }

    return { reaped };
  },
});
