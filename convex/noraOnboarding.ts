/**
 * Convex functions for Nora onboarding status.
 *
 * Policy acceptance is a HARD GATE -- users cannot interact with Nora
 * until they complete the onboarding flow and accept usage policies.
 * This is enforced both on the frontend (blocking overlay) and
 * backend (server-side check in noraChat.sendMessage).
 */
import { v } from "convex/values";
import { query, mutation, internalQuery } from "./_generated/server";

const CURRENT_ONBOARDING_VERSION = 1;

// ────────────────────────────────────────────────────
// Queries
// ────────────────────────────────────────────────────

/** Get onboarding status for the current user */
export const getStatus = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return null;

    const status = await ctx.db
      .query("noraOnboardingStatus")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    return {
      isComplete: !!status?.completedAt,
      hasAcceptedPolicies: !!status?.acceptedPoliciesAt,
      version: status?.version ?? 0,
      needsUpdate: (status?.version ?? 0) < CURRENT_ONBOARDING_VERSION,
    };
  },
});

/** Internal: check if user has accepted policies (used by noraChat.sendMessage) */
export const _checkPolicyAccepted = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const status = await ctx.db
      .query("noraOnboardingStatus")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    return !!status?.acceptedPoliciesAt;
  },
});

// ────────────────────────────────────────────────────
// Mutations
// ────────────────────────────────────────────────────

/** Mark onboarding as complete with policy acceptance */
export const complete = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const existing = await ctx.db
      .query("noraOnboardingStatus")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    const now = new Date().toISOString();

    if (existing) {
      await ctx.db.patch(existing._id, {
        completedAt: now,
        acceptedPoliciesAt: now,
        version: CURRENT_ONBOARDING_VERSION,
      });
    } else {
      await ctx.db.insert("noraOnboardingStatus", {
        userId: user._id,
        completedAt: now,
        acceptedPoliciesAt: now,
        version: CURRENT_ONBOARDING_VERSION,
      });
    }
  },
});

/** DEV ONLY: Reset onboarding so the flow can be re-tested */
export const resetOnboarding = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const existing = await ctx.db
      .query("noraOnboardingStatus")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});
