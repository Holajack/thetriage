import { v } from "convex/values";
import {
  query,
  mutation,
  internalMutation,
  QueryCtx,
  MutationCtx,
} from "./_generated/server";
import { Id, Doc } from "./_generated/dataModel";
import { normalizeTier, tierRank } from "./tiers";
import {
  ageBandFromBirth,
  clampVisibilityForMinors,
  isAvatarVisible,
  isProtectedMinor,
  isValidBirthMonthYear,
} from "./age";

/** Defaults applied to every newly created user record.
 * New accounts are "free" until a subscription is active — the 7-day free
 * trial is a store intro offer, so trialing users already hold a paid-tier
 * entitlement (basic/pro/elite) via RevenueCat. */
const NEW_USER_DEFAULTS = {
  status: "active" as const,
  subscriptionTier: "free" as const,
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

/**
 * Project a user document down to the fields safe to show a NON-SELF viewer.
 * This is an ALLOWLIST, not a blocklist — it used to only strip clerkId/email,
 * so subscriptionTier, stripeCustomerId, flintCurrency, lastSeen, isOnline,
 * trailBuddyType, dailyReminder, and every other field passed straight through
 * to ANY caller, including a fully unauthenticated one. Add a field here only
 * if it's genuinely meant to appear on someone else's profile card. Client
 * consumers of getUser/getByClerkId/getByUsername only ever read username,
 * fullName, avatarUrl, university, major (verified against every call site).
 */
export function stripSensitiveFields(user: Doc<"users">) {
  return {
    _id: user._id,
    _creationTime: user._creationTime,
    username: user.username,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    university: user.university,
    major: user.major,
    status: user.status,
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
  const visible = applyProfileVisibility(
    clampVisibilityForMinors(target),
    isSelf,
    isFriend,
  );
  if (isSelf) return visible;
  const stripped = stripSensitiveFields(visible);
  return isAvatarVisible(target, isSelf, isFriend)
    ? stripped
    : { ...stripped, avatarUrl: undefined };
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

// NOTE: there is deliberately no public `createUser` / `deleteUser` mutation.
// Account lifecycle is owned by the Clerk webhook (http.ts ->
// internal.webhookHelpers.*). Exposing them publicly let any caller forge a
// user row from an arbitrary clerkId, or delete any account by clerkId.

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
    environmentTheme: v.optional(v.string()),
    // flintCurrency is deliberately NOT accepted here. Currency is awarded by
    // focusSessions.end and spent by inventory.purchaseItem, both server-side.
    // Letting the client patch its own balance made the shop free.
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const { userId, ...updates } = args;

    // The userId argument is legacy; a caller may only ever update itself.
    if (userId !== user._id) {
      throw new Error("Not authorized to update another user");
    }

    // Filter out undefined values
    const cleanUpdates: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) cleanUpdates[key] = value;
    }
    dropLocationForMinors(user, cleanUpdates);
    if (Object.keys(cleanUpdates).length > 0) {
      await ctx.db.patch(user._id, cleanUpdates);
    }
  },
});

/** Teen accounts have no location field; a stale client sending one is ignored. */
function dropLocationForMinors(
  user: Doc<"users">,
  updates: Record<string, unknown>,
) {
  if ("location" in updates && isProtectedMinor(user)) {
    delete updates.location;
  }
}

/**
 * Birth month and year, written exactly once. Under the minimum age nothing is
 * stored: the client removes the account instead (COPPA: keep no data we know
 * belongs to a child).
 */
export const setBirthMonthYear = mutation({
  args: { birthYear: v.number(), birthMonth: v.number() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user.birthYear !== undefined) {
      throw new Error(
        "Your birth date is already on file. Contact support to change it.",
      );
    }
    if (!isValidBirthMonthYear(args.birthYear, args.birthMonth)) {
      throw new Error("Enter a real month and year");
    }
    const band = ageBandFromBirth(args.birthYear, args.birthMonth);
    if (band === "under14") return { band };
    await ctx.db.patch(user._id, {
      birthYear: args.birthYear,
      birthMonth: args.birthMonth,
      ageConfirmedAt: new Date().toISOString(),
    });
    return { band };
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
    dropLocationForMinors(user, cleanUpdates);
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
    const newTier = normalizeTier(args.subscriptionTier);
    const currentTier = normalizeTier(user.subscriptionTier);

    // Don't let RevenueCat downgrade manually overridden tiers (dev/test/promo accounts)
    if (
      user.subscriptionOverride &&
      tierRank(newTier) < tierRank(currentTier)
    ) {
      return;
    }

    // Upgrades are NEVER trusted from the client — only the RevenueCat server
    // webhook (_setSubscriptionTierFromWebhook below) may grant a paid tier.
    // This used to be conditional on REVENUECAT_WEBHOOK_TOKEN being configured,
    // which meant an unset or misnamed env var silently let any signed-in user
    // grant themselves Elite through this mutation. Fail closed unconditionally.
    // Client sync is still allowed to downgrade (subscription lapsed) or
    // re-assert the same tier.
    if (tierRank(newTier) > tierRank(currentTier)) {
      return;
    }

    await ctx.db.patch(user._id, { subscriptionTier: newTier });
  },
});

/** Webhook-driven tier update (see http.ts /revenuecat-webhook). */
export const _setSubscriptionTierFromWebhook = internalMutation({
  args: {
    userIdString: v.string(),
    subscriptionTier: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = ctx.db.normalizeId("users", args.userIdString);
    if (!userId) return; // anonymous RevenueCat id or stale alias — ignore
    const user = await ctx.db.get(userId);
    if (!user) return;

    const newTier = normalizeTier(args.subscriptionTier);
    // Manual overrides (dev/promo accounts) still win over webhook downgrades.
    if (
      user.subscriptionOverride &&
      tierRank(newTier) < tierRank(normalizeTier(user.subscriptionTier))
    ) {
      return;
    }
    await ctx.db.patch(userId, { subscriptionTier: newTier });
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
    // Presence (isOnline/lastSeen) is not meaningful to expose to a fully
    // anonymous caller — this used to have zero auth check at all.
    await getCurrentUser(ctx);

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
    // Teens are never listed, and a teen account does not search at all:
    // friends are added in person, by QR code or invite link.
    if (currentUser && isProtectedMinor(currentUser)) return [];

    // Get all users and filter by username or fullName
    const allUsers = await ctx.db.query("users").collect();

    const results = allUsers.filter((user) => {
      // Don't include current user in search results
      if (currentUser && user._id === currentUser._id) return false;
      if (isProtectedMinor(user)) return false;

      const username = (user.username ?? "").toLowerCase();
      const fullName = (user.fullName ?? "").toLowerCase();

      return username.includes(searchTerm) || fullName.includes(searchTerm);
    });

    // Limit to 20 results and apply per-field visibility — search is an
    // "everyone" read, so a friends-only/private name must not leak here even
    // though it was used to MATCH the search term.
    const limited = results.slice(0, 20);
    return await Promise.all(
      limited.map(async (user) => {
        const isFriend = currentUser
          ? await areFriends(ctx, currentUser._id, user._id)
          : false;
        return {
          _id: user._id,
          username: user.username,
          fullName: isFieldVisible(user.fullNameVisibility, false, isFriend)
            ? user.fullName
            : undefined,
          avatarUrl: user.avatarUrl,
          university: isFieldVisible(user.universityVisibility, false, isFriend)
            ? user.university
            : undefined,
          status: user.status,
        };
      }),
    );
  },
});
