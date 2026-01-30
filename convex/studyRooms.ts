import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrNull } from "./users";

export const list = query({
  args: { onlyActive: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    if (args.onlyActive) {
      return await ctx.db
        .query("studyRooms")
        .withIndex("by_isActive", (q) => q.eq("isActive", true))
        .collect();
    }
    return await ctx.db.query("studyRooms").collect();
  },
});

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;
    return await ctx.db
      .query("studyRooms")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", user._id))
      .collect();
  },
});

export const getById = query({
  args: { roomId: v.id("studyRooms") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.roomId);
  },
});

export const getByCode = query({
  args: { roomCode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("studyRooms")
      .withIndex("by_roomCode", (q) => q.eq("roomCode", args.roomCode))
      .unique();
  },
});

export const getParticipants = query({
  args: { roomId: v.id("studyRooms") },
  handler: async (ctx, args) => {
    const participants = await ctx.db
      .query("studyRoomParticipants")
      .withIndex("by_roomId", (q) => q.eq("roomId", args.roomId))
      .collect();

    // Enrich with user data
    const enriched = [];
    for (const p of participants) {
      const user = await ctx.db.get(p.userId);
      enriched.push({ ...p, user });
    }
    return enriched;
  },
});

export const getMessages = query({
  args: { roomId: v.id("studyRooms") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("studyRoomMessages")
      .withIndex("by_roomId", (q) => q.eq("roomId", args.roomId))
      .collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
    maxParticipants: v.optional(v.number()),
    subject: v.optional(v.string()),
    sessionDuration: v.optional(v.number()),
    breakDuration: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const roomId = await ctx.db.insert("studyRooms", {
      name: args.name,
      description: args.description,
      ownerId: user._id,
      isPublic: args.isPublic ?? true,
      maxParticipants: args.maxParticipants ?? 10,
      currentParticipants: 1,
      roomCode,
      subject: args.subject,
      sessionDuration: args.sessionDuration ?? 25,
      breakDuration: args.breakDuration ?? 5,
      isActive: true,
    });

    // Add owner as participant
    await ctx.db.insert("studyRoomParticipants", {
      roomId,
      userId: user._id,
      joinedAt: new Date().toISOString(),
      isActive: true,
      role: "owner",
    });

    return roomId;
  },
});

export const join = mutation({
  args: { roomId: v.id("studyRooms") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");

    // Check if already a participant
    const existing = await ctx.db
      .query("studyRoomParticipants")
      .withIndex("by_roomId_userId", (q) =>
        q.eq("roomId", args.roomId).eq("userId", user._id)
      )
      .first();

    if (existing?.isActive) throw new Error("Already in room");

    if (existing) {
      // Rejoin
      await ctx.db.patch(existing._id, {
        isActive: true,
        joinedAt: new Date().toISOString(),
        leftAt: undefined,
      });
    } else {
      await ctx.db.insert("studyRoomParticipants", {
        roomId: args.roomId,
        userId: user._id,
        joinedAt: new Date().toISOString(),
        isActive: true,
        role: "participant",
      });
    }

    await ctx.db.patch(args.roomId, {
      currentParticipants: (room.currentParticipants ?? 0) + 1,
    });
  },
});

export const leave = mutation({
  args: { roomId: v.id("studyRooms") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const room = await ctx.db.get(args.roomId);

    const participant = await ctx.db
      .query("studyRoomParticipants")
      .withIndex("by_roomId_userId", (q) =>
        q.eq("roomId", args.roomId).eq("userId", user._id)
      )
      .first();

    if (participant) {
      await ctx.db.patch(participant._id, {
        isActive: false,
        leftAt: new Date().toISOString(),
      });
    }

    if (room) {
      await ctx.db.patch(args.roomId, {
        currentParticipants: Math.max(0, (room.currentParticipants ?? 1) - 1),
      });
    }
  },
});

export const sendMessage = mutation({
  args: {
    roomId: v.id("studyRooms"),
    content: v.string(),
    messageType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    return await ctx.db.insert("studyRoomMessages", {
      roomId: args.roomId,
      senderId: user._id,
      content: args.content,
      messageType: args.messageType ?? "text",
    });
  },
});
