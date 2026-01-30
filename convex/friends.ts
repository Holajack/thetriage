import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrNull } from "./users";

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

    // Fetch friend profiles
    const friends = [];
    for (const fId of friendIds) {
      const friend = await ctx.db.get(fId as any);
      if (friend) friends.push(friend);
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

    if (type === "incoming") {
      return await ctx.db
        .query("friendRequests")
        .withIndex("by_recipientId_status", (q) =>
          q.eq("recipientId", user._id).eq("status", "pending")
        )
        .collect();
    } else {
      return await ctx.db
        .query("friendRequests")
        .withIndex("by_senderId", (q) => q.eq("senderId", user._id))
        .collect();
    }
  },
});

export const getRequestStatus = query({
  args: { requestId: v.id("friendRequests") },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) return null;
    return { status: request.status };
  },
});

export const sendRequest = mutation({
  args: {
    recipientId: v.id("users"),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user._id === args.recipientId) {
      throw new Error("Cannot send friend request to yourself");
    }

    return await ctx.db.insert("friendRequests", {
      senderId: user._id,
      recipientId: args.recipientId,
      status: "pending",
      message: args.message,
    });
  },
});

export const acceptRequest = mutation({
  args: { requestId: v.id("friendRequests") },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Request not found");

    // Update request status
    await ctx.db.patch(args.requestId, {
      status: "accepted",
      respondedAt: new Date().toISOString(),
    });

    // Create friendship (bidirectional)
    await ctx.db.insert("friends", {
      userId: request.senderId,
      friendId: request.recipientId,
    });
  },
});

export const declineRequest = mutation({
  args: { requestId: v.id("friendRequests") },
  handler: async (ctx, args) => {
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
