import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { getCurrentUser } from "./users";
import { tierRank } from "./tiers";

/**
 * Redeem a promo code. Grants tier upgrade, Flint, and trails based on code config.
 */
export const redeem = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const normalizedCode = args.code.trim().toUpperCase();

    // Promo code definitions (hard-coded to avoid table read issues)
    const CODES: Record<
      string,
      {
        description: string;
        tier: string;
        flintAmount: number;
        grantAllTrails: boolean;
      }
    > = {
      TRAILBLAZER: {
        description: "Elite access with all trails and 5000 Flint",
        tier: "elite",
        flintAmount: 5000,
        grantAllTrails: true,
      },
      BETATESTER: {
        description: "Elite tester access with trails and 3000 Flint",
        tier: "elite",
        flintAmount: 3000,
        grantAllTrails: true,
      },
      PROTRAIL: {
        description: "Pro access with all trails and 2000 Flint",
        tier: "pro",
        flintAmount: 2000,
        grantAllTrails: true,
      },
      FLINT500: {
        description: "500 bonus Flint currency",
        tier: "free",
        flintAmount: 500,
        grantAllTrails: false,
      },
      // Team / partner testing codes — each grants full Elite + trails + Flint
      PARTNER2026: {
        description: "Partner Elite access with all trails and 5000 Flint",
        tier: "elite",
        flintAmount: 5000,
        grantAllTrails: true,
      },
      TEAMTEST: {
        description: "Team Elite access with all trails and 5000 Flint",
        tier: "elite",
        flintAmount: 5000,
        grantAllTrails: true,
      },
      FOUNDER: {
        description: "Founder Elite access with all trails and 10000 Flint",
        tier: "elite",
        flintAmount: 10000,
        grantAllTrails: true,
      },
      EARLYBIRD: {
        description: "Early bird Elite access with all trails and 5000 Flint",
        tier: "elite",
        flintAmount: 5000,
        grantAllTrails: true,
      },
      HIKEWISE: {
        description: "HikeWise insider access with all trails and 7500 Flint",
        tier: "elite",
        flintAmount: 7500,
        grantAllTrails: true,
      },
    };

    const codeConfig = CODES[normalizedCode];
    if (!codeConfig) {
      return { success: false, error: "Invalid promo code" };
    }

    // Check if user already redeemed this code (stored in promoRedemptions table)
    const existingRedemption = await ctx.db
      .query("promoRedemptions")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
    if (existingRedemption.some((r) => r.code === normalizedCode)) {
      return { success: false, error: "You've already redeemed this code" };
    }

    // Apply rewards (tier ranks come from the canonical table in tiers.ts)
    const rewards: string[] = [];
    const currentRank = tierRank(user.subscriptionTier);
    const newRank = tierRank(codeConfig.tier);

    const patch: Record<string, any> = {};

    // Upgrade tier if higher
    if (newRank > currentRank) {
      patch.subscriptionTier = codeConfig.tier;
      patch.subscriptionOverride = true;
      rewards.push(
        `Upgraded to ${codeConfig.tier.charAt(0).toUpperCase() + codeConfig.tier.slice(1)}`,
      );
    } else if (newRank === currentRank) {
      patch.subscriptionOverride = true;
      rewards.push(
        `${codeConfig.tier.charAt(0).toUpperCase() + codeConfig.tier.slice(1)} status confirmed`,
      );
    }

    // Grant Flint
    if (codeConfig.flintAmount > 0) {
      patch.flintCurrency = (user.flintCurrency ?? 0) + codeConfig.flintAmount;
      rewards.push(`+${codeConfig.flintAmount} Flint`);
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(user._id, patch);
    }

    // Grant all trails
    if (codeConfig.grantAllTrails) {
      const trails = [
        { id: "forest", name: "Forest Trail" },
        { id: "beach", name: "Beach Trail" },
        { id: "jungle", name: "Jungle Trail" },
        { id: "volcano", name: "Volcano Trail" },
        { id: "desert", name: "Desert Trail" },
      ];
      for (const trail of trails) {
        const existing = await ctx.db
          .query("userInventory")
          .withIndex("by_userId_itemId", (q) =>
            q.eq("userId", user._id).eq("itemId", trail.id),
          )
          .first();
        if (!existing) {
          await ctx.db.insert("userInventory", {
            userId: user._id,
            itemId: trail.id,
            itemName: trail.name,
            itemCategory: "trail",
            itemIcon: trail.id,
            purchasedAt: new Date().toISOString(),
          });
        }
      }
      rewards.push("All trails unlocked");
    }

    // Record redemption
    await ctx.db.insert("promoRedemptions", {
      userId: user._id,
      promoCodeId: undefined,
      code: normalizedCode,
      redeemedAt: new Date().toISOString(),
    });

    return { success: true, rewards, description: codeConfig.description };
  },
});

/** Admin: clear a user's redemption record by Clerk ID (lets them retry a code) */
export const clearRedemptions = internalMutation({
  args: {
    clerkId: v.string(),
    code: v.optional(v.string()),
  },
  handler: async (ctx, { clerkId, code }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .unique();
    if (!user) throw new Error(`User not found with Clerk ID: ${clerkId}`);

    const redemptions = await ctx.db
      .query("promoRedemptions")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    const toDelete = code
      ? redemptions.filter((r) => r.code === code.toUpperCase())
      : redemptions;

    for (const r of toDelete) {
      await ctx.db.delete(r._id);
    }

    return {
      email: user.email,
      cleared: toDelete.map((r) => r.code),
      count: toDelete.length,
    };
  },
});

/**
 * Get user's redemption history.
 */
export const myRedemptions = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    return await ctx.db
      .query("promoRedemptions")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
  },
});

/**
 * Seed promo codes. Run from CLI:
 * npx convex run promoCodes:seedCodes '{}'
 */
export const seedCodes = internalMutation({
  args: {},
  handler: async (ctx) => {
    const codes = [
      {
        code: "TRAILBLAZER",
        description: "Elite access with all trails and 5000 Flint",
        tier: "elite",
        flintAmount: 5000,
        grantAllTrails: true,
        maxRedemptions: undefined,
        currentRedemptions: 0,
        isActive: true,
        expiresAt: undefined,
      },
      {
        code: "BETATESTER",
        description: "Elite tester access with trails and 3000 Flint",
        tier: "elite",
        flintAmount: 3000,
        grantAllTrails: true,
        maxRedemptions: 20,
        currentRedemptions: 0,
        isActive: true,
        expiresAt: "2026-12-31T23:59:59.000Z",
      },
      {
        code: "PROTRAIL",
        description: "Pro access with all trails and 2000 Flint",
        tier: "pro",
        flintAmount: 2000,
        grantAllTrails: true,
        maxRedemptions: 50,
        currentRedemptions: 0,
        isActive: true,
        expiresAt: "2026-12-31T23:59:59.000Z",
      },
      {
        code: "FLINT500",
        description: "500 bonus Flint currency",
        tier: "free",
        flintAmount: 500,
        grantAllTrails: false,
        maxRedemptions: 100,
        currentRedemptions: 0,
        isActive: true,
        expiresAt: "2026-12-31T23:59:59.000Z",
      },
    ];

    const results = [];
    for (const code of codes) {
      // Check if code already exists
      const existing = await ctx.db
        .query("promoCodes")
        .withIndex("by_code", (q) => q.eq("code", code.code))
        .first();

      if (!existing) {
        const id = await ctx.db.insert("promoCodes", code);
        results.push({ code: code.code, status: "created", id });
      } else {
        results.push({ code: code.code, status: "already exists" });
      }
    }

    return results;
  },
});

/**
 * Admin: create a custom promo code.
 * npx convex run promoCodes:createCode '{"code":"MYCODE","tier":"elite","flintAmount":5000,"grantAllTrails":true}'
 */
export const createCode = internalMutation({
  args: {
    code: v.string(),
    description: v.optional(v.string()),
    tier: v.string(),
    flintAmount: v.number(),
    grantAllTrails: v.boolean(),
    maxRedemptions: v.optional(v.number()),
    expiresAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const normalizedCode = args.code.trim().toUpperCase();

    const existing = await ctx.db
      .query("promoCodes")
      .withIndex("by_code", (q) => q.eq("code", normalizedCode))
      .first();

    if (existing) {
      throw new Error(`Code "${normalizedCode}" already exists`);
    }

    return await ctx.db.insert("promoCodes", {
      code: normalizedCode,
      description: args.description ?? `${args.tier} access code`,
      tier: args.tier,
      flintAmount: args.flintAmount,
      grantAllTrails: args.grantAllTrails,
      maxRedemptions: args.maxRedemptions,
      currentRedemptions: 0,
      isActive: true,
      expiresAt: args.expiresAt,
    });
  },
});
