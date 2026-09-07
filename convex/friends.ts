import { v } from "convex/values";
import { query, mutation, MutationCtx, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { ageBandOf, isProtectedMinor } from "./age";
import { randomCode } from "./codes";
import {
  getCurrentUser,
  getCurrentUserOrNull,
  areFriends,
  isFieldVisible,
  applyProfileVisibility,
  stripSensitiveFields,
} from "./users";

export const listFriends = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;
    const friendships = await ctx.db
      .query("friends")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    // Also get reverse friendships (where current user is the friendId)
    const reverseFriendships = await ctx.db
      .query("friends")
      .withIndex("by_friendId", (q) => q.eq("friendId", user._id))
      .collect();

    // Collect unique friend user IDs
    const friendIds = new Set<string>();
    for (const f of friendships) friendIds.add(f.friendId);
    for (const f of reverseFriendships) friendIds.add(f.userId);

    // Fetch friend profiles (viewer is a friend, so only "none" fields hide).
    // Visibility redaction alone isn't enough — email/clerkId/subscription
    // fields are never friend-visible, only self-visible, so strip them too.
    const friends = [];
    for (const fId of friendIds) {
      const friend = await ctx.db.get(fId as Id<"users">);
      if (friend) {
        friends.push(
          stripSensitiveFields(applyProfileVisibility(friend, false, true)),
        );
      }
    }
    return friends;
  },
});

export const listRequests = query({
  args: { type: v.optional(v.string()) }, // 'incoming' | 'outgoing'
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;
    const type = args.type ?? "incoming";

    let requests;
    if (type === "incoming") {
      requests = await ctx.db
        .query("friendRequests")
        .withIndex("by_recipientId_status", (q) =>
          q.eq("recipientId", user._id).eq("status", "pending"),
        )
        .collect();
    } else {
      requests = await ctx.db
        .query("friendRequests")
        .withIndex("by_senderId", (q) => q.eq("senderId", user._id))
        .collect();
    }

    // Enrich requests with sender/recipient profile data, respecting each
    // person's fullName visibility relative to the current viewer.
    const nameFor = async (other: {
      _id: any;
      fullName?: string;
      fullNameVisibility?: string;
    }) => {
      const isSelf = other._id === user._id;
      const isFriend = await areFriends(ctx, user._id, other._id);
      return isFieldVisible(other.fullNameVisibility, isSelf, isFriend)
        ? other.fullName
        : undefined;
    };
    const enrichedRequests = await Promise.all(
      requests.map(async (request) => {
        const sender = await ctx.db.get(request.senderId);
        const recipient = await ctx.db.get(request.recipientId);
        return {
          ...request,
          sender: sender
            ? {
                id: sender._id,
                username: sender.username,
                fullName: await nameFor(sender),
                avatarUrl: sender.avatarUrl,
                status: sender.status,
              }
            : null,
          recipient: recipient
            ? {
                id: recipient._id,
                username: recipient.username,
                fullName: await nameFor(recipient),
                avatarUrl: recipient.avatarUrl,
                status: recipient.status,
              }
            : null,
        };
      }),
    );

    return enrichedRequests;
  },
});

export const getRequestStatus = query({
  args: { requestId: v.id("friendRequests") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;
    const request = await ctx.db.get(args.requestId);
    // Only the two people involved may see a request's state.
    if (
      !request ||
      (request.senderId !== user._id && request.recipientId !== user._id)
    ) {
      return null;
    }
    return { status: request.status };
  },
});

const INVITE_CODE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

async function isLiveInviteCode(
  ctx: QueryCtx,
  ownerId: Id<"users">,
  code: string,
): Promise<boolean> {
  const invite = await ctx.db
    .query("friendInviteCodes")
    .withIndex("by_code", (q) => q.eq("code", code))
    .unique();
  return Boolean(
    invite && invite.userId === ownerId && invite.expiresAt > Date.now(),
  );
}

async function uniqueInviteCode(ctx: MutationCtx): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = randomCode(10);
    const clash = await ctx.db
      .query("friendInviteCodes")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();
    if (!clash) return code;
  }
  throw new Error("Could not allocate an invite code, please try again");
}

/** The code behind the caller's QR code and invite link. Reused while live. */
export const createInviteCode = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const now = Date.now();
    const mine = await ctx.db
      .query("friendInviteCodes")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
    for (const invite of mine) {
      if (invite.expiresAt > now) {
        return { code: invite.code, expiresAt: invite.expiresAt };
      }
      await ctx.db.delete(invite._id);
    }
    const expiresAt = now + INVITE_CODE_TTL_MS;
    const code = await uniqueInviteCode(ctx);
    await ctx.db.insert("friendInviteCodes", {
      userId: user._id,
      code,
      expiresAt,
    });
    return { code, expiresAt };
  },
});

export const sendRequest = mutation({
  args: {
    recipientId: v.id("users"),
    message: v.optional(v.string()),
    inviteCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user._id === args.recipientId) {
      throw new Error("Cannot send friend request to yourself");
    }

    const recipient = await ctx.db.get(args.recipientId);
    if (!recipient) throw new Error("That person no longer exists");

    if (await areFriends(ctx, user._id, args.recipientId)) {
      throw new Error("You are already friends");
    }

    // Only another teen may friend a teen directly. Anyone else (an adult, or
    // an account with no age on file) needs a code the teen handed out: their
    // QR code or invite link. Search never surfaces teens.
    if (ageBandOf(user) !== "teen" && isProtectedMinor(recipient)) {
      const code = args.inviteCode?.trim().toUpperCase();
      if (!code || !(await isLiveInviteCode(ctx, recipient._id, code))) {
        throw new Error(
          "This person accepts friend requests through their QR code or invite link only",
        );
      }
    }

    // Don't stack duplicate requests in either direction.
    const mine = await ctx.db
      .query("friendRequests")
      .withIndex("by_senderId", (q) => q.eq("senderId", user._id))
      .collect();
    const outstanding = mine.find(
      (r) => r.recipientId === args.recipientId && r.status === "pending",
    );
    if (outstanding) return outstanding._id;

    // If THEY already asked US, accepting is the sane interpretation.
    const theirs = await ctx.db
      .query("friendRequests")
      .withIndex("by_recipientId_status", (q) =>
        q.eq("recipientId", user._id).eq("status", "pending"),
      )
      .collect();
    const inbound = theirs.find((r) => r.senderId === args.recipientId);
    if (inbound) {
      await acceptRequestInternal(ctx, inbound._id, user._id);
      return inbound._id;
    }

    return await ctx.db.insert("friendRequests", {
      senderId: user._id,
      recipientId: args.recipientId,
      status: "pending",
      message: args.message,
    });
  },
});

/** Shared accept path. `actorId` must be the RECIPIENT of the request. */
async function acceptRequestInternal(
  ctx: MutationCtx,
  requestId: Id<"friendRequests">,
  actorId: Id<"users">,
) {
  const request = await ctx.db.get(requestId);
  // Only the recipient may accept. Previously ANY user could accept ANY request
  // — including their own outgoing one — and force a friendship on a stranger.
  if (!request || request.recipientId !== actorId) {
    throw new Error("Request not found");
  }
  if (request.status !== "pending") {
    throw new Error("This request has already been answered");
  }

  await ctx.db.patch(requestId, {
    status: "accepted",
    respondedAt: new Date().toISOString(),
  });

  // Bidirectional, and only if not already present.
  if (!(await areFriends(ctx, request.senderId, request.recipientId))) {
    await ctx.db.insert("friends", {
      userId: request.senderId,
      friendId: request.recipientId,
    });
    await ctx.db.insert("friends", {
      userId: request.recipientId,
      friendId: request.senderId,
    });
  }
}

export const acceptRequest = mutation({
  args: { requestId: v.id("friendRequests") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await acceptRequestInternal(ctx, args.requestId, user._id);
  },
});

export const declineRequest = mutation({
  args: { requestId: v.id("friendRequests") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const request = await ctx.db.get(args.requestId);
    // The recipient declines; the sender may withdraw. Nobody else touches it.
    if (
      !request ||
      (request.recipientId !== user._id && request.senderId !== user._id)
    ) {
      throw new Error("Request not found");
    }
    await ctx.db.patch(args.requestId, {
      status: "declined",
      respondedAt: new Date().toISOString(),
    });
  },
});

export const removeFriend = mutation({
  args: { friendId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    // Remove both directions
    const friendships = await ctx.db
      .query("friends")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
    for (const f of friendships) {
      if (f.friendId === args.friendId) await ctx.db.delete(f._id);
    }

    const reverseFriendships = await ctx.db
      .query("friends")
      .withIndex("by_friendId", (q) => q.eq("friendId", user._id))
      .collect();
    for (const f of reverseFriendships) {
      if (f.userId === args.friendId) await ctx.db.delete(f._id);
    }
  },
});
