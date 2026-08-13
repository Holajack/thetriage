/**
 * Shared helpers for the AI assistants (Nora + Patrick).
 *
 * Both chat actions authenticate, rate-limit, log usage, and gather user
 * context the same way — this module is the single implementation.
 * Tier rules live in tiers.ts.
 */
import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { getAiLimit, aiDeniedReason, normalizeTier } from "./tiers";

// ────────────────────────────────────────────────────
// Internal queries / mutations
// ────────────────────────────────────────────────────

/** Look up the current user by Clerk identity. */
export const _getCurrentUser = internalQuery({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
  },
});

/**
 * Gather the user's app data for AI context.
 *
 * scope "basic" (Patrick): profile, onboarding prefs, stats, recent sessions.
 * scope "full" (Nora): everything above plus uploaded PDFs, open tasks,
 * study settings/goals — Nora is supposed to see the whole app.
 * Always returns the userSettings row so callers can check AI toggles.
 */
export const _getAppContext = internalQuery({
  args: {
    userId: v.id("users"),
    scope: v.union(v.literal("basic"), v.literal("full")),
  },
  handler: async (ctx, { userId, scope }) => {
    const user = await ctx.db.get(userId);
    const onboarding = await ctx.db
      .query("onboardingPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    const leaderboard = await ctx.db
      .query("leaderboardStats")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    const sessions = await ctx.db
      .query("focusSessions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(scope === "full" ? 10 : 5);

    if (scope === "basic") {
      return { user, onboarding, leaderboard, settings, sessions };
    }

    const ebooks = await ctx.db
      .query("ebooks")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(10);
    const recentTasks = await ctx.db
      .query("tasks")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(20);
    const openTasks = recentTasks
      .filter((t) => t.status !== "completed" && t.status !== "cancelled")
      .slice(0, 8);

    return {
      user,
      onboarding,
      leaderboard,
      settings,
      sessions,
      ebooks,
      openTasks,
    };
  },
});

/**
 * Atomically check the daily rate limit for an AI AND reserve a slot in the
 * same transaction. This MUST be an internalMutation (not a query) and MUST
 * be called before the OpenAI request goes out: a read-only check followed
 * by a separate "log usage" mutation after the network call lets N
 * concurrent requests all read the same "under limit" count before any of
 * them commits their increment, letting the real cap be exceeded. Reading
 * and incrementing here, inside one Convex mutation execution, closes that
 * race — Convex serializes/conflict-checks a mutation's reads and writes as
 * a single transaction.
 *
 * If the caller's OpenAI request subsequently fails, the reservation is
 * intentionally NOT rolled back (see _logUsage) — a fixed small quota of
 * "wasted" attempts is a safer and simpler tradeoff than reopening the race.
 */
export const _reserveUsage = internalMutation({
  args: {
    userId: v.id("users"),
    aiType: v.union(v.literal("nora"), v.literal("patrick")),
  },
  handler: async (ctx, { userId, aiType }) => {
    const user = await ctx.db.get(userId);
    const tier = normalizeTier(user?.subscriptionTier);
    const limit = getAiLimit(aiType, tier);

    if (!limit.enabled) {
      return {
        allowed: false,
        tier,
        reason: aiDeniedReason(aiType, tier),
        remaining: 0,
        maxLen: limit.maxLen,
      };
    }

    const today = new Date().toISOString().slice(0, 10);
    const existing = await ctx.db
      .query("aiUsageTracking")
      .withIndex("by_userId_aiType_date", (q) =>
        q.eq("userId", userId).eq("aiType", aiType).eq("date", today),
      )
      .unique();

    const sent = existing?.messagesSent ?? 0;
    if (sent >= limit.perDay) {
      const name = aiType === "nora" ? "Nora" : "Patrick";
      const upsell =
        aiType === "patrick" && tier === "basic"
          ? " Upgrade to Pro for a higher daily limit."
          : " Come back tomorrow!";
      return {
        allowed: false,
        tier,
        reason: `You've reached your daily ${name} message limit (${limit.perDay}).${upsell}`,
        remaining: 0,
        maxLen: limit.maxLen,
      };
    }

    // Reserve the slot now, in the same transaction as the read above —
    // this is the increment that actually enforces the cap.
    if (existing) {
      await ctx.db.patch(existing._id, {
        messagesSent: sent + 1,
        lastMessageAt: new Date().toISOString(),
      });
    } else {
      await ctx.db.insert("aiUsageTracking", {
        userId,
        aiType,
        date: today,
        messagesSent: 1,
        tokensUsed: 0,
        costEstimate: 0,
        lastMessageAt: new Date().toISOString(),
      });
    }

    return {
      allowed: true,
      tier,
      reason: "",
      remaining: limit.perDay - sent,
      maxLen: limit.maxLen,
    };
  },
});

/**
 * Record actual token usage + cost against today's bucket, once the OpenAI
 * call has completed. The message-count increment itself already happened
 * atomically in _reserveUsage (or the equivalent reserve step in
 * transcribe.ts) before the call was made — this only adds the token/cost
 * totals that are known after the fact, so it does NOT touch messagesSent
 * on the existing-row path. The insert fallback is defensive only (it
 * should not be reachable in the normal reserve → call → log flow).
 */
export const _logUsage = internalMutation({
  args: {
    userId: v.id("users"),
    aiType: v.string(),
    tokensUsed: v.number(),
    costEstimate: v.number(),
  },
  handler: async (ctx, { userId, aiType, tokensUsed, costEstimate }) => {
    const today = new Date().toISOString().slice(0, 10);
    const existing = await ctx.db
      .query("aiUsageTracking")
      .withIndex("by_userId_aiType_date", (q) =>
        q.eq("userId", userId).eq("aiType", aiType).eq("date", today),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        tokensUsed: (existing.tokensUsed ?? 0) + tokensUsed,
        costEstimate: (existing.costEstimate ?? 0) + costEstimate,
        lastMessageAt: new Date().toISOString(),
      });
    } else {
      await ctx.db.insert("aiUsageTracking", {
        userId,
        aiType,
        date: today,
        messagesSent: 1,
        tokensUsed,
        costEstimate,
        lastMessageAt: new Date().toISOString(),
      });
    }
  },
});

// ────────────────────────────────────────────────────
// Pure helpers (imported directly, not Convex functions)
// ────────────────────────────────────────────────────

/**
 * Light input hygiene for chat messages. Deliberately does NOT strip `<`/`>`
 * — students type things like "x < 5" and `List<int>`. Length limits are
 * enforced separately per tier.
 */
export function sanitizeChatInput(input: string): string {
  return (
    input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
      .trim()
  );
}

/** Rough per-1k-token pricing used for cost tracking (USD). */
const MODEL_RATES: Record<string, { input: number; output: number }> = {
  "gpt-4o": { input: 0.0025, output: 0.01 },
  "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
};

export function estimateCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const rate = MODEL_RATES[model] ?? MODEL_RATES["gpt-4o"];
  return (
    (inputTokens / 1000) * rate.input + (outputTokens / 1000) * rate.output
  );
}
