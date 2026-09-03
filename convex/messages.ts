import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrNull, areFriends } from "./users";
import { hasFullMessaging } from "./tiers";
import { isProtectedMinor } from "./age";

export const listConversations = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;

    // Get all messages where user is sender or recipient
    const sent = await ctx.db
      .query("messages")
      .withIndex("by_senderId", (q) => q.eq("senderId", user._id))
      .collect();
    const received = await ctx.db
      .query("messages")
      .withIndex("by_recipientId", (q) => q.eq("recipientId", user._id))
      .collect();

    // Build conversation map (grouped by other user)
    // First pass: count unread messages per conversation
    const unreadCounts = new Map<string, number>();
    for (const msg of received) {
      if (!msg.isRead) {
        const senderId = msg.senderId as string;
        unreadCounts.set(senderId, (unreadCounts.get(senderId) ?? 0) + 1);
      }
    }

    // Second pass: find last message per conversation
    const conversationMap = new Map<
      string,
      { otherUserId: string; lastMessage: any; unreadCount: number }
    >();

    const allMessages = [...sent, ...received].sort(
      (a, b) => b._creationTime - a._creationTime,
    );

    for (const msg of allMessages) {
      const otherUserId =
        msg.senderId === user._id ? msg.recipientId : msg.senderId;

      // Only set if we haven't seen this conversation yet (first = most recent)
      if (!conversationMap.has(otherUserId as string)) {
        conversationMap.set(otherUserId as string, {
          otherUserId: otherUserId as string,
          lastMessage: msg,
          unreadCount: unreadCounts.get(otherUserId as string) ?? 0,
        });
      }
    }

    return Array.from(conversationMap.values());
  },
});

export const getConversation = query({
  args: { otherUserId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;

    const sent = await ctx.db
      .query("messages")
      .withIndex("by_senderId", (q) => q.eq("senderId", user._id))
      .collect();
    const received = await ctx.db
      .query("messages")
      .withIndex("by_recipientId", (q) => q.eq("recipientId", user._id))
      .collect();

    // Filter to only messages with the other user
    const conversation = [...sent, ...received]
      .filter(
        (msg) =>
          (msg.senderId === user._id && msg.recipientId === args.otherUserId) ||
          (msg.senderId === args.otherUserId && msg.recipientId === user._id),
      )
      .sort((a, b) => a._creationTime - b._creationTime);

    return conversation;
  },
});

export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return 0;
    const received = await ctx.db
      .query("messages")
      .withIndex("by_recipientId", (q) => q.eq("recipientId", user._id))
      .collect();
    return received.filter((m) => !m.isRead).length;
  },
});

export const send = mutation({
  args: {
    recipientId: v.id("users"),
    content: v.string(),
    messageType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    if (args.recipientId === user._id) {
      throw new Error("You cannot message yourself");
    }
    const recipient = await ctx.db.get(args.recipientId);
    if (!recipient) throw new Error("That person no longer exists");

    // Who may you DM? Basic = friends only; Pro/Elite = anyone who allows it.
    // This was enforced nowhere — any user could DM any other user by id.
    // Teen accounts (and accounts with no confirmed age) message friends only,
    // in both directions, whatever plan either side is on.
    const friends = await areFriends(ctx, user._id, args.recipientId);
    if (!friends) {
      if (isProtectedMinor(user) || isProtectedMinor(recipient)) {
        throw new Error(
          "Teen accounts can only message friends. Add them as a friend first.",
        );
      }
      if (!hasFullMessaging(user.subscriptionTier)) {
        throw new Error(
          "On your plan you can message friends. Add them as a friend, or upgrade to message anyone.",
        );
      }
      // The recipient's own privacy setting still wins over the sender's tier.
      const prefs = await ctx.db
        .query("onboardingPreferences")
        .withIndex("by_userId", (q) => q.eq("userId", args.recipientId))
        .unique();
      if (prefs?.allowDirectMessages === false) {
        throw new Error("This person only accepts messages from friends");
      }
    }

    const content = args.content.trim();
    if (!content) throw new Error("Message is empty");
    if (content.length > 2000) throw new Error("Message is too long");

    return await ctx.db.insert("messages", {
      senderId: user._id,
      recipientId: args.recipientId,
      content,
      messageType: args.messageType ?? "text",
      isRead: false,
    });
  },
});

export const markRead = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const message = await ctx.db.get(args.messageId);
    // Only the recipient may mark a message read.
    if (!message || message.recipientId !== user._id) {
      throw new Error("Message not found");
    }
    if (message.isRead) return;
    await ctx.db.patch(args.messageId, { isRead: true });
  },
});

export const markConversationRead = mutation({
  args: { otherUserId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_recipientId", (q) => q.eq("recipientId", user._id))
      .collect();

    for (const msg of messages) {
      if (msg.senderId === args.otherUserId && !msg.isRead) {
        await ctx.db.patch(msg._id, { isRead: true });
      }
    }
  },
});
