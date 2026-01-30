import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrNull } from "./users";

export const getActive = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;
    return await ctx.db
      .query("focusSessions")
      .withIndex("by_userId_status", (q) =>
        q.eq("userId", user._id).eq("status", "active")
      )
      .first();
  },
});

export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;
    const query = ctx.db
      .query("focusSessions")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc");

    if (args.limit) {
      return await query.take(args.limit);
    }
    return await query.collect();
  },
});

export const getById = query({
  args: { sessionId: v.id("focusSessions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

export const start = mutation({
  args: {
    sessionType: v.optional(v.string()),
    roomId: v.optional(v.id("studyRooms")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    return await ctx.db.insert("focusSessions", {
      userId: user._id,
      startTime: new Date().toISOString(),
      sessionType: args.sessionType ?? "individual",
      status: "active",
      roomId: args.roomId,
    });
  },
});

export const end = mutation({
  args: { sessionId: v.id("focusSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    const endTime = new Date();
    const startTime = new Date(session.startTime);
    const durationSeconds = Math.floor(
      (endTime.getTime() - startTime.getTime()) / 1000
    );

    await ctx.db.patch(args.sessionId, {
      endTime: endTime.toISOString(),
      durationSeconds,
      status: "completed",
    });
  },
});

export const pause = mutation({
  args: { sessionId: v.id("focusSessions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, { status: "paused" });
  },
});

export const resume = mutation({
  args: { sessionId: v.id("focusSessions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, { status: "active" });
  },
});

export const cancel = mutation({
  args: { sessionId: v.id("focusSessions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      status: "cancelled",
      endTime: new Date().toISOString(),
    });
  },
});
