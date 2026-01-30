import { v } from "convex/values";
import { query, mutation, QueryCtx } from "./_generated/server";

/** Helper: get the current user from Clerk identity */
export async function getCurrentUserOrNull(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  return await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();
}

/** Helper: get the current user, throw if not found */
export async function getCurrentUser(ctx: QueryCtx) {
  const user = await getCurrentUserOrNull(ctx);
  if (!user) throw new Error("Not authenticated or user not found");
  return user;
}

// --- Queries ---

export const getUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const me = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUserOrNull(ctx);
  },
});

export const getByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();
  },
});

export const getByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .unique();
  },
});

// --- Mutations ---

export const createUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    username: v.optional(v.string()),
    fullName: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existing) return existing._id;

    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      username: args.username,
      fullName: args.fullName,
      firstName: args.firstName,
      lastName: args.lastName,
      avatarUrl: args.avatarUrl,
      status: "active",
      subscriptionTier: "trial",
      flintCurrency: 0,
      firstSessionBonusClaimed: false,
    });
  },
});

export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    fullName: v.optional(v.string()),
    username: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    bio: v.optional(v.string()),
    university: v.optional(v.string()),
    major: v.optional(v.string()),
    location: v.optional(v.string()),
    classes: v.optional(v.string()),
    website: v.optional(v.string()),
    timeZone: v.optional(v.string()),
    soundPreference: v.optional(v.string()),
    weeklyFocusGoal: v.optional(v.number()),
    focusDuration: v.optional(v.number()),
    breakDuration: v.optional(v.number()),
    fullNameVisibility: v.optional(v.string()),
    universityVisibility: v.optional(v.string()),
    locationVisibility: v.optional(v.string()),
    classesVisibility: v.optional(v.string()),
    dailyReminder: v.optional(v.string()),
    trailBuddyType: v.optional(v.string()),
    trailBuddyName: v.optional(v.string()),
    flintCurrency: v.optional(v.number()),
    firstSessionBonusClaimed: v.optional(v.boolean()),
    environmentTheme: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, ...updates } = args;
    // Filter out undefined values
    const cleanUpdates: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) cleanUpdates[key] = value;
    }
    if (Object.keys(cleanUpdates).length > 0) {
      await ctx.db.patch(userId, cleanUpdates);
    }
  },
});

export const updateProfile = mutation({
  args: {
    bio: v.optional(v.string()),
    university: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    location: v.optional(v.string()),
    classes: v.optional(v.string()),
    website: v.optional(v.string()),
    soundPreference: v.optional(v.string()),
    environmentTheme: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const cleanUpdates: Record<string, any> = {};
    for (const [key, value] of Object.entries(args)) {
      if (value !== undefined) cleanUpdates[key] = value;
    }
    if (Object.keys(cleanUpdates).length > 0) {
      await ctx.db.patch(user._id, cleanUpdates);
    }
  },
});

export const updateMySubscription = mutation({
  args: {
    subscriptionTier: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await ctx.db.patch(user._id, { subscriptionTier: args.subscriptionTier });
  },
});

export const deleteUser = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (user) {
      await ctx.db.delete(user._id);
    }
  },
});
