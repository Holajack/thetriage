import { v } from "convex/values";
import { query, mutation, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getCurrentUser, getCurrentUserOrNull } from "./users";
import { ACHIEVEMENT_RULES, AchievementMetrics } from "./achievementRules";

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

// NOTE: there is deliberately NO public `award` mutation. It accepted a
// client-chosen achievementType AND pointsAwarded, and wrote those points
// straight into leaderboardStats — which re-opened the exact leaderboard-
// inflation hole that removing `leaderboard.updateStats` was meant to close.
// Every award now flows through evaluateAchievements(), which derives the title,
// points and category from ACHIEVEMENT_RULES on the server.

// ============================================================
// Server-side evaluation
// ============================================================
//
// Achievements are awarded by the server from stored metrics, never claimed by
// the client. Call this after anything that could move a metric (a completed
// session, a finished break, joining a room).

/** Gather the metrics every rule is tested against. */
async function collectMetrics(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<AchievementMetrics> {
  const stats = await ctx.db
    .query("leaderboardStats")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();

  const sessions = await ctx.db
    .query("focusSessions")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect();

  const completed = sessions.filter((s) => s.status === "completed");
  const subjects = new Set(
    completed
      .map((s) => (s.subject ?? "").trim())
      .filter((s) => s.length > 0 && s.toLowerCase() !== "general study"),
  );

  const memberships = await ctx.db
    .query("studyRoomParticipants")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect();

  return {
    totalFocusMinutes: stats?.totalFocusTime ?? 0,
    // Fall back only to sessions that actually EARNED credit — the raw
    // `completed` list includes sub-60s rows that were never paid.
    sessionsCompleted:
      stats?.sessionsCompleted ??
      completed.filter((cs) => (cs.durationSeconds ?? 0) >= 60).length,
    currentStreak: stats?.currentStreak ?? 0,
    distinctSubjects: subjects.size,
    roomsJoined: new Set(memberships.map((m) => m.roomId)).size,
    breaksTaken: stats?.breaksTaken ?? 0,
  };
}

export interface AwardedAchievement {
  achievementType: string;
  title: string;
  description: string;
  icon: string;
  pointsAwarded: number;
  category: string;
}

/**
 * Award every achievement the user has newly earned. Idempotent: an achievement
 * already held is skipped. Returns only what was awarded THIS call, so the
 * client can celebrate it.
 */
export async function evaluateAchievements(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<AwardedAchievement[]> {
  const existing = await ctx.db
    .query("achievements")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect();
  const held = new Set(existing.map((a) => a.achievementType));

  const metrics = await collectMetrics(ctx, userId);

  const newlyEarned: AwardedAchievement[] = [];
  for (const rule of ACHIEVEMENT_RULES) {
    if (held.has(rule.type)) continue;
    if (!rule.isEarned(metrics)) continue;

    await ctx.db.insert("achievements", {
      userId,
      achievementType: rule.type,
      title: rule.title,
      description: rule.description,
      icon: rule.icon,
      pointsAwarded: rule.points,
      category: rule.category,
      earnedAt: new Date().toISOString(),
    });

    newlyEarned.push({
      achievementType: rule.type,
      title: rule.title,
      description: rule.description,
      icon: rule.icon,
      pointsAwarded: rule.points,
      category: rule.category,
    });
  }

  if (newlyEarned.length > 0) {
    const bonus = newlyEarned.reduce((sum, a) => sum + a.pointsAwarded, 0);

    const stats = await ctx.db
      .query("leaderboardStats")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (stats) {
      await ctx.db.patch(stats._id, {
        achievementsEarned:
          (stats.achievementsEarned ?? 0) + newlyEarned.length,
        points: (stats.points ?? 0) + bonus,
      });
    } else {
      // Upsert. Dropping the points when the row did not exist yet made them
      // unrecoverable: the achievement is held forever, so it can never be
      // re-awarded later to grant them.
      await ctx.db.insert("leaderboardStats", {
        userId,
        achievementsEarned: newlyEarned.length,
        points: bonus,
      });
    }
  }

  return newlyEarned;
}

/** Re-check achievements on demand (e.g. when the Achievements screen opens). */
export const sync = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    return await evaluateAchievements(ctx, user._id);
  },
});

/**
 * A completed break, tied to the focus session it followed.
 *
 * This drives the "breaks" achievements, which award leaderboard points — so it
 * cannot be a no-argument mutation any client can spam in a loop. The caller
 * must name a COMPLETED session they own, and each session can only bank one
 * break.
 */
export const recordBreak = mutation({
  args: { sessionId: v.id("focusSessions") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== user._id) {
      throw new Error("Session not found");
    }
    if (session.status !== "completed") {
      throw new Error("That session isn't finished");
    }
    // One break per session — otherwise the same id could be replayed forever.
    if (session.breakRecorded) return [];

    await ctx.db.patch(session._id, { breakRecorded: true });

    const stats = await ctx.db
      .query("leaderboardStats")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (stats) {
      await ctx.db.patch(stats._id, {
        breaksTaken: (stats.breaksTaken ?? 0) + 1,
      });
    } else {
      await ctx.db.insert("leaderboardStats", {
        userId: user._id,
        breaksTaken: 1,
      });
    }

    return await evaluateAchievements(ctx, user._id);
  },
});
