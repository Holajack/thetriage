import { v } from "convex/values";
import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { Id, Doc } from "./_generated/dataModel";

/** Defaults applied to every newly created user record. */
const NEW_USER_DEFAULTS = {
  status: "active" as const,
  subscriptionTier: "trial" as const,
  flintCurrency: 0,
  firstSessionBonusClaimed: false,
};

type NewUserArgs = {
  clerkId: string;
  email: string;
  username?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
};

/** Create a user from Clerk data if one doesn't already exist; returns the user id. */
export async function createUserIfMissing(ctx: MutationCtx, args: NewUserArgs) {
  const existing = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
    .unique();

  if (existing) return existing._id;

  return await ctx.db.insert("users", { ...args, ...NEW_USER_DEFAULTS });
}

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

// --- Profile visibility enforcement (server-side) ---
// Per-field visibility ('everyone' | 'friends' | 'none'/'private'); unset = visible.
export function isFieldVisible(
  visibility: string | undefined,
  isSelf: boolean,
  isFriend: boolean,
): boolean {
  if (isSelf) return true;
  const v = visibility ?? "everyone";
  if (v === "everyone") return true;
  if (v === "friends") return isFriend;
  return false; // "none" / "private"
}

/** True if a and b are friends (bidirectional), or the same user. */
export async function areFriends(
  ctx: QueryCtx,
  a: Id<"users">,
  b: Id<"users">,
): Promise<boolean> {
  if (a === b) return true;
  const forward = await ctx.db
    .query("friends")
    .withIndex("by_userId", (q) => q.eq("userId", a))
    .collect();
  if (forward.some((f) => f.friendId === b)) return true;
  const reverse = await ctx.db
    .query("friends")
    .withIndex("by_friendId", (q) => q.eq("friendId", a))
    .collect();
  return reverse.some((f) => f.userId === b);
}

/** Null out visibility-restricted profile fields for a non-permitted viewer. */
export function applyProfileVisibility<
  T extends {
    fullName?: string;
    university?: string;
    location?: string;
    classes?: string;
    fullNameVisibility?: string;
    universityVisibility?: string;
    locationVisibility?: string;
    classesVisibility?: string;
  },
>(target: T, isSelf: boolean, isFriend: boolean): T {
  if (isSelf) return target;
  return {
    ...target,
    fullName: isFieldVisible(target.fullNameVisibility, isSelf, isFriend)
      ? target.fullName
      : undefined,
    university: isFieldVisible(target.universityVisibility, isSelf, isFriend)
      ? target.university
      : undefined,
    location: isFieldVisible(target.locationVisibility, isSelf, isFriend)
      ? target.location
      : undefined,
    classes: isFieldVisible(target.classesVisibility, isSelf, isFriend)
      ? target.classes
      : undefined,
  };
}

/** Resolve the viewer relationship to a target and apply profile visibility. */
async function readUserWithVisibility(
  ctx: QueryCtx,
  target: Doc<"users"> | null,
) {
  if (!target) return null;
  const viewer = await getCurrentUserOrNull(ctx);
  const isSelf = viewer?._id === target._id;
  const isFriend = viewer
    ? await areFriends(ctx, viewer._id, target._id)
    : false;
  return applyProfileVisibility(target, isSelf, isFriend);
}

// --- Queries ---

export const getUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await readUserWithVisibility(ctx, await ctx.db.get(args.userId));
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
    const target = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    return await readUserWithVisibility(ctx, target);
  },
});

export const getByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const target = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .unique();
    return await readUserWithVisibility(ctx, target);
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
    return await createUserIfMissing(ctx, args);
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
    workStyle: v.optional(v.string()),
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

// Avatar upload via Convex file storage (mirrors the ebooks pattern).
// The client PUTs the image bytes to the URL from generateAvatarUploadUrl,
// then calls saveAvatar with the returned storageId; avatarUrl becomes a
// public serving URL that works across devices.
export const generateAvatarUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await getCurrentUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveAvatar = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) {
      throw new Error("Uploaded avatar not found in storage");
    }
    await ctx.db.patch(user._id, { avatarUrl: url });
    return url;
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

    // Don't let RevenueCat downgrade manually overridden tiers (dev/test elite accounts)
    if (user.subscriptionOverride) {
      const tierRank: Record<string, number> = {
        free: 0,
        trial: 1,
        premium: 2,
        pro: 3,
        elite: 4,
      };
      const currentRank = tierRank[user.subscriptionTier || "free"] ?? 0;
      const newRank = tierRank[args.subscriptionTier] ?? 0;
      if (newRank < currentRank) {
        return;
      }
    }

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

// --- Presence Tracking ---

export const updatePresence = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    await ctx.db.patch(user._id, {
      lastSeen: Date.now(),
      isOnline: true,
    });
  },
});

export const setOffline = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (user) {
      await ctx.db.patch(user._id, { isOnline: false });
    }
  },
});

export const getUserPresence = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    // Consider user offline if lastSeen is more than 2 minutes ago
    const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
    const isOnline = user.isOnline && (user.lastSeen ?? 0) > twoMinutesAgo;

    return {
      isOnline,
      lastSeen: user.lastSeen,
    };
  },
});

// --- User Search ---

export const searchUsers = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUserOrNull(ctx);
    const searchTerm = args.query.toLowerCase().trim();

    if (searchTerm.length < 2) {
      return [];
    }

    // Get all users and filter by username or fullName
    const allUsers = await ctx.db.query("users").collect();

    const results = allUsers.filter((user) => {
      // Don't include current user in search results
      if (currentUser && user._id === currentUser._id) return false;

      const username = (user.username ?? "").toLowerCase();
      const fullName = (user.fullName ?? "").toLowerCase();

      return username.includes(searchTerm) || fullName.includes(searchTerm);
    });

    // Limit to 20 results and return safe user data (no sensitive fields)
    return results.slice(0, 20).map((user) => ({
      _id: user._id,
      username: user.username,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      university: user.university,
      status: user.status,
    }));
  },
});
