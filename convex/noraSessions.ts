/**
 * Convex functions for Nora chat session management.
 *
 * Sessions group messages into named conversations (like ChatGPT threads).
 * Titles are auto-generated from the first exchange.
 */
import { v } from "convex/values";
import {
  query,
  mutation,
  internalMutation,
  internalQuery,
  action,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// ────────────────────────────────────────────────────
// Queries
// ────────────────────────────────────────────────────

/** List all sessions for the authenticated user, ordered by most recent */
export const listSessions = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];

    const sessions = await ctx.db
      .query("noraChatSessions")
      .withIndex("by_userId_lastMessageAt", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    return sessions.filter((s) => !s.isArchived);
  },
});

/** Get messages for a specific session */
export const getSessionMessages = query({
  args: { sessionId: v.id("noraChatSessions") },
  handler: async (ctx, { sessionId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const messages = await ctx.db
      .query("noraChat")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
      .collect();

    return messages.map((m) => ({
      _id: m._id,
      role: m.role,
      content: m.content,
      metadata: m.metadata,
      _creationTime: m._creationTime,
    }));
  },
});

// ────────────────────────────────────────────────────
// Mutations
// ────────────────────────────────────────────────────

/** Create a new chat session */
export const createSession = mutation({
  args: {
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const sessionId = await ctx.db.insert("noraChatSessions", {
      userId: user._id,
      title: args.title || "New Chat",
      lastMessageAt: new Date().toISOString(),
      messageCount: 0,
    });

    return sessionId;
  },
});

/** Internal: create session from within an action */
export const _createSession = internalMutation({
  args: {
    userId: v.id("users"),
    title: v.optional(v.string()),
  },
  handler: async (ctx, { userId, title }) => {
    return await ctx.db.insert("noraChatSessions", {
      userId,
      title: title || "New Chat",
      lastMessageAt: new Date().toISOString(),
      messageCount: 0,
    });
  },
});

/** Update session title */
export const updateSessionTitle = mutation({
  args: {
    sessionId: v.id("noraChatSessions"),
    title: v.string(),
  },
  handler: async (ctx, { sessionId, title }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const session = await ctx.db.get(sessionId);
    if (!session) throw new Error("Session not found");

    await ctx.db.patch(sessionId, { title });
  },
});

/** Internal: update session title from action */
export const _updateSessionTitle = internalMutation({
  args: {
    sessionId: v.id("noraChatSessions"),
    title: v.string(),
  },
  handler: async (ctx, { sessionId, title }) => {
    await ctx.db.patch(sessionId, { title });
  },
});

/** Internal: update session metadata after a message */
export const _updateSessionAfterMessage = internalMutation({
  args: {
    sessionId: v.id("noraChatSessions"),
  },
  handler: async (ctx, { sessionId }) => {
    const session = await ctx.db.get(sessionId);
    if (!session) return;

    await ctx.db.patch(sessionId, {
      lastMessageAt: new Date().toISOString(),
      messageCount: (session.messageCount || 0) + 1,
    });
  },
});

/** Delete a session and all its messages */
export const deleteSession = mutation({
  args: { sessionId: v.id("noraChatSessions") },
  handler: async (ctx, { sessionId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const session = await ctx.db.get(sessionId);
    if (!session) return;

    // Delete all messages in this session
    const messages = await ctx.db
      .query("noraChat")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
      .collect();

    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }

    // Delete the response ID for this session
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (user) {
      const responseIdRecord = await ctx.db
        .query("noraResponseIds")
        .withIndex("by_userId_sessionId", (q) =>
          q.eq("userId", user._id).eq("sessionId", sessionId),
        )
        .unique();
      if (responseIdRecord) {
        await ctx.db.delete(responseIdRecord._id);
      }
    }

    // Delete the session itself
    await ctx.db.delete(sessionId);
  },
});

// ────────────────────────────────────────────────────
// Actions
// ────────────────────────────────────────────────────

/** Generate a short title from the first exchange in a session */
export const generateSessionTitle = action({
  args: { sessionId: v.id("noraChatSessions") },
  handler: async (ctx, { sessionId }) => {
    // Get first 2 messages from the session
    const messages = await ctx.runQuery(
      internal.noraSessions._getFirstMessages,
      { sessionId, limit: 2 },
    );

    if (messages.length === 0) return;

    const conversation = messages
      .map((m: any) => `${m.role}: ${m.content.slice(0, 200)}`)
      .join("\n");

    const apiKey =
      process.env.OPENAI_API_KEY_NEW_NORA || process.env.OPENAI_API_KEY || "";

    if (!apiKey) {
      // Fallback: use first 6 words of user's first message
      const firstUserMsg = messages.find((m: any) => m.role === "user");
      if (firstUserMsg) {
        const title = firstUserMsg.content.split(" ").slice(0, 6).join(" ");
        await ctx.runMutation(internal.noraSessions._updateSessionTitle, {
          sessionId,
          title: title.length > 40 ? title.slice(0, 37) + "..." : title,
        });
      }
      return;
    }

    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "Generate a short title (4-6 words max) for this chat conversation. Return ONLY the title, no quotes or punctuation.",
            },
            { role: "user", content: conversation },
          ],
          temperature: 0.5,
          max_tokens: 20,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const title = data.choices?.[0]?.message?.content?.trim() || "New Chat";
        await ctx.runMutation(internal.noraSessions._updateSessionTitle, {
          sessionId,
          title: title.length > 50 ? title.slice(0, 47) + "..." : title,
        });
      }
    } catch {
      // Failed to generate session title
    }
  },
});

// ────────────────────────────────────────────────────
// Internal helpers
// ────────────────────────────────────────────────────

/** Get first N messages from a session (for title generation) */
export const _getFirstMessages = internalQuery({
  args: {
    sessionId: v.id("noraChatSessions"),
    limit: v.number(),
  },
  handler: async (ctx, { sessionId, limit }) => {
    return await ctx.db
      .query("noraChat")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
      .take(limit);
  },
});
