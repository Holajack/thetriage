import { v } from "convex/values";
import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import {
  getCurrentUser,
  getCurrentUserOrNull,
  areFriends,
  isFieldVisible,
} from "./users";
import { getStudyRoomLimit } from "./tiers";
import { evaluateAchievements } from "./achievements";

/**
 * Study rooms are a membership boundary, not a public bulletin board.
 * Every read below proves the caller is a member or is looking at a public
 * room; every write proves membership (or ownership, for moderation).
 */

/**
 * The only user fields another member is allowed to see. fullName still
 * respects the owner's fullNameVisibility (self > friend > everyone), the
 * same relationship logic leaderboard.ts's getGlobal/getFriends use.
 */
async function publicMember(
  ctx: QueryCtx,
  user: Doc<"users"> | null,
  viewerId: Id<"users"> | null,
) {
  if (!user) return null;
  const isSelf = viewerId === user._id;
  const isFriend = viewerId ? await areFriends(ctx, viewerId, user._id) : false;
  return {
    _id: user._id,
    username: user.username,
    fullName: isFieldVisible(user.fullNameVisibility, isSelf, isFriend)
      ? user.fullName
      : undefined,
    avatarUrl: user.avatarUrl,
    // Deliberately NOT clerkId or email.
  };
}

async function getMembership(
  ctx: QueryCtx,
  roomId: Id<"studyRooms">,
  userId: Id<"users">,
) {
  return await ctx.db
    .query("studyRoomParticipants")
    .withIndex("by_roomId_userId", (q) =>
      q.eq("roomId", roomId).eq("userId", userId),
    )
    .first();
}

async function isMember(
  ctx: QueryCtx,
  roomId: Id<"studyRooms">,
  userId: Id<"users">,
) {
  const m = await getMembership(ctx, roomId, userId);
  return Boolean(m?.isActive);
}

/** Count who is actually in the room (never trust the cached counter). */
async function countActiveMembers(ctx: QueryCtx, roomId: Id<"studyRooms">) {
  const participants = await ctx.db
    .query("studyRoomParticipants")
    .withIndex("by_roomId", (q) => q.eq("roomId", roomId))
    .collect();
  return participants.filter((p) => p.isActive).length;
}

/** Recompute the denormalised counter from truth so it can never drift. */
async function syncParticipantCount(
  ctx: MutationCtx,
  roomId: Id<"studyRooms">,
) {
  const count = await countActiveMembers(ctx, roomId);
  await ctx.db.patch(roomId, { currentParticipants: count });
  return count;
}

/** A room the caller may READ: public, theirs, or one they were invited to. */
async function readableRoom(ctx: QueryCtx, roomId: Id<"studyRooms">) {
  const room = await ctx.db.get(roomId);
  if (!room) return null;

  const user = await getCurrentUserOrNull(ctx);
  if (!user) return null;

  if (room.isPublic) return room;
  if (await isMember(ctx, roomId, user._id)) return room;

  const invite = await ctx.db
    .query("studyRoomInvitations")
    .withIndex("by_roomId_recipientId", (q) =>
      q.eq("roomId", roomId).eq("recipientId", user._id),
    )
    .first();
  if (invite && (invite.status ?? "pending") === "pending") return room;

  return null;
}

/** A room the caller may WRITE INTO: they must be an active member. */
async function memberRoom(ctx: MutationCtx, roomId: Id<"studyRooms">) {
  const user = await getCurrentUser(ctx);
  const room = await ctx.db.get(roomId);
  if (!room) throw new Error("Room not found");
  if (!(await isMember(ctx, roomId, user._id))) {
    throw new Error("You are not a member of this room");
  }
  return { user, room };
}

/** A room the caller OWNS (for moderation / deletion). */
async function ownedRoom(ctx: MutationCtx, roomId: Id<"studyRooms">) {
  const user = await getCurrentUser(ctx);
  const room = await ctx.db.get(roomId);
  if (!room) throw new Error("Room not found");
  if (room.ownerId !== user._id) {
    throw new Error("Only the room owner can do that");
  }
  return { user, room };
}

// ============================================================
// Queries
// ============================================================

/** Browse list: public, active rooms only. Private rooms are never enumerated. */
export const list = query({
  args: { onlyActive: v.optional(v.boolean()) },
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return [];

    const rooms = await ctx.db
      .query("studyRooms")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();

    const visible: Doc<"studyRooms">[] = [];
    for (const room of rooms) {
      if (room.isPublic || (await isMember(ctx, room._id, user._id))) {
        visible.push(room);
      }
    }
    // The join code is a credential — never hand it out in a browse list.
    return visible.map(({ roomCode: _code, ...room }) => room);
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
    const room = await readableRoom(ctx, args.roomId);
    if (!room) return null;

    const user = await getCurrentUserOrNull(ctx);
    const member = user ? await isMember(ctx, args.roomId, user._id) : false;
    // Only members get the join code — it is how they re-invite people.
    return member ? room : { ...room, roomCode: undefined };
  },
});

/** Look a room up by code — this is how you join a private room. */
export const getByCode = query({
  args: { roomCode: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;

    const room = await ctx.db
      .query("studyRooms")
      .withIndex("by_roomCode", (q) =>
        q.eq("roomCode", args.roomCode.trim().toUpperCase()),
      )
      .unique();
    if (!room || !room.isActive) return null;
    return room;
  },
});

export const getParticipants = query({
  args: { roomId: v.id("studyRooms") },
  handler: async (ctx, args) => {
    const room = await readableRoom(ctx, args.roomId);
    if (!room) return [];

    const viewer = await getCurrentUserOrNull(ctx);
    const participants = await ctx.db
      .query("studyRoomParticipants")
      .withIndex("by_roomId", (q) => q.eq("roomId", args.roomId))
      .collect();

    const enriched = [];
    for (const p of participants) {
      enriched.push({
        ...p,
        user: await publicMember(
          ctx,
          await ctx.db.get(p.userId),
          viewer?._id ?? null,
        ),
      });
    }
    return enriched;
  },
});

/** Room chat is members-only, full stop. */
export const getMessages = query({
  args: { roomId: v.id("studyRooms") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return [];
    if (!(await isMember(ctx, args.roomId, user._id))) return [];

    const messages = await ctx.db
      .query("studyRoomMessages")
      .withIndex("by_roomId", (q) => q.eq("roomId", args.roomId))
      .collect();

    const enriched = [];
    for (const m of messages) {
      enriched.push({
        ...m,
        sender: await publicMember(ctx, await ctx.db.get(m.senderId), user._id),
      });
    }
    return enriched;
  },
});

export const getPendingInvitations = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return [];

    const invites = await ctx.db
      .query("studyRoomInvitations")
      .withIndex("by_recipientId", (q) => q.eq("recipientId", user._id))
      .collect();

    const pending = invites.filter(
      (i) => (i.status ?? "pending") === "pending",
    );

    const enriched = [];
    for (const inv of pending) {
      const room = await ctx.db.get(inv.roomId);
      if (!room || !room.isActive) continue; // invite to a room that has closed
      enriched.push({
        ...inv,
        room: { _id: room._id, name: room.name, subject: room.subject },
        sender: await publicMember(
          ctx,
          await ctx.db.get(inv.senderId),
          user._id,
        ),
      });
    }
    return enriched;
  },
});

// ============================================================
// Mutations
// ============================================================

function generateRoomCode(): string {
  // Ambiguous glyphs (0/O, 1/I) removed — codes get read aloud and typed in.
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

async function uniqueRoomCode(ctx: MutationCtx): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateRoomCode();
    const clash = await ctx.db
      .query("studyRooms")
      .withIndex("by_roomCode", (q) => q.eq("roomCode", code))
      .unique();
    if (!clash) return code;
  }
  throw new Error("Could not allocate a room code, please try again");
}

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

    // Enforce the paywall on the server. The client only hides the button.
    const limit = getStudyRoomLimit(user.subscriptionTier);
    if (limit <= 0) {
      throw new Error(
        "Study rooms are available on Pro and Elite. Upgrade to create one.",
      );
    }
    const owned = await ctx.db
      .query("studyRooms")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", user._id))
      .collect();
    const openRooms = owned.filter((r) => r.isActive).length;
    if (openRooms >= limit) {
      throw new Error(
        `Your plan allows ${limit} study room${limit === 1 ? "" : "s"}. Close one first.`,
      );
    }

    const name = args.name.trim();
    if (!name) throw new Error("Give your room a name");

    const maxParticipants = Math.min(
      Math.max(args.maxParticipants ?? 10, 2),
      50,
    );

    const roomId = await ctx.db.insert("studyRooms", {
      name,
      description: args.description,
      ownerId: user._id,
      isPublic: args.isPublic ?? true,
      maxParticipants,
      currentParticipants: 1,
      roomCode: await uniqueRoomCode(ctx),
      subject: args.subject,
      sessionDuration: args.sessionDuration ?? 25,
      breakDuration: args.breakDuration ?? 5,
      isActive: true,
    });

    await ctx.db.insert("studyRoomParticipants", {
      roomId,
      userId: user._id,
      joinedAt: new Date().toISOString(),
      isActive: true,
      role: "owner",
    });

    // Creating a room is a real membership event — it can unlock room_1/10/25.
    await evaluateAchievements(ctx, user._id);

    return roomId;
  },
});

export const join = mutation({
  args: { roomId: v.id("studyRooms") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const room = await ctx.db.get(args.roomId);
    if (!room || !room.isActive) throw new Error("Room not found");

    const existing = await getMembership(ctx, args.roomId, user._id);
    if (existing?.isActive) return; // idempotent

    // A private room needs an invitation (or its code, via joinByCode).
    if (!room.isPublic) {
      const invite = await ctx.db
        .query("studyRoomInvitations")
        .withIndex("by_roomId_recipientId", (q) =>
          q.eq("roomId", args.roomId).eq("recipientId", user._id),
        )
        .first();
      const invited = invite && (invite.status ?? "pending") !== "declined";
      if (!invited) throw new Error("This room is private");
    }

    // Capacity is enforced here, not merely displayed.
    const active = await countActiveMembers(ctx, args.roomId);
    if (active >= (room.maxParticipants ?? 10)) {
      throw new Error("This room is full");
    }

    if (existing) {
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

    await syncParticipantCount(ctx, args.roomId);

    // Joining is a real membership event — it can unlock room_1/10/25.
    await evaluateAchievements(ctx, user._id);
  },
});

/** Join a private room with its code — what an invite link or QR carries. */
export const joinByCode = mutation({
  args: { roomCode: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const room = await ctx.db
      .query("studyRooms")
      .withIndex("by_roomCode", (q) =>
        q.eq("roomCode", args.roomCode.trim().toUpperCase()),
      )
      .unique();
    if (!room || !room.isActive) throw new Error("No room with that code");

    const existing = await getMembership(ctx, room._id, user._id);
    if (existing?.isActive) return room._id;

    const active = await countActiveMembers(ctx, room._id);
    if (active >= (room.maxParticipants ?? 10)) {
      throw new Error("This room is full");
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        isActive: true,
        joinedAt: new Date().toISOString(),
        leftAt: undefined,
      });
    } else {
      await ctx.db.insert("studyRoomParticipants", {
        roomId: room._id,
        userId: user._id,
        joinedAt: new Date().toISOString(),
        isActive: true,
        role: "participant",
      });
    }

    await syncParticipantCount(ctx, room._id);

    // Joining is a real membership event — it can unlock room_1/10/25.
    await evaluateAchievements(ctx, user._id);

    return room._id;
  },
});

export const leave = mutation({
  args: { roomId: v.id("studyRooms") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const room = await ctx.db.get(args.roomId);
    if (!room) return;

    const participant = await getMembership(ctx, args.roomId, user._id);
    // Only an actual member can decrement anything. This is what previously let
    // any user drive someone else's room counter to zero.
    if (!participant?.isActive) return;

    await ctx.db.patch(participant._id, {
      isActive: false,
      leftAt: new Date().toISOString(),
    });

    const remaining = await syncParticipantCount(ctx, args.roomId);

    if (room.ownerId === user._id) {
      // Hand the room to the longest-standing member, or close it if empty.
      const others = (
        await ctx.db
          .query("studyRoomParticipants")
          .withIndex("by_roomId", (q) => q.eq("roomId", args.roomId))
          .collect()
      ).filter((p) => p.isActive && p.userId !== user._id);

      if (others.length === 0 || remaining === 0) {
        await ctx.db.patch(args.roomId, { isActive: false });
      } else {
        const heir = others.sort((a, b) =>
          a.joinedAt.localeCompare(b.joinedAt),
        )[0];
        await ctx.db.patch(args.roomId, { ownerId: heir.userId });
        await ctx.db.patch(heir._id, { role: "owner" });
      }
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
    // Membership required. Previously anyone could post into any room.
    const { user } = await memberRoom(ctx, args.roomId);

    const content = args.content.trim();
    if (!content) throw new Error("Message is empty");
    if (content.length > 2000) throw new Error("Message is too long");

    return await ctx.db.insert("studyRoomMessages", {
      roomId: args.roomId,
      senderId: user._id,
      content,
      messageType: args.messageType ?? "text",
    });
  },
});

export const updateRoom = mutation({
  args: {
    roomId: v.id("studyRooms"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
    subject: v.optional(v.string()),
    sessionDuration: v.optional(v.number()),
    breakDuration: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { room } = await ownedRoom(ctx, args.roomId);
    const { roomId: _roomId, ...updates } = args;

    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) clean[key] = value;
    }
    if (Object.keys(clean).length > 0) await ctx.db.patch(room._id, clean);
  },
});

/** Owner-only: remove someone from the room. */
export const removeMember = mutation({
  args: { roomId: v.id("studyRooms"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const { user, room } = await ownedRoom(ctx, args.roomId);
    if (args.userId === user._id) {
      throw new Error("Use Leave Room to remove yourself");
    }

    const participant = await getMembership(ctx, room._id, args.userId);
    if (!participant?.isActive) return;

    await ctx.db.patch(participant._id, {
      isActive: false,
      leftAt: new Date().toISOString(),
    });
    await syncParticipantCount(ctx, room._id);
  },
});

/** Owner-only: close the room and clean up everything hanging off it. */
export const deleteRoom = mutation({
  args: { roomId: v.id("studyRooms") },
  handler: async (ctx, args) => {
    const { room } = await ownedRoom(ctx, args.roomId);

    const participants = await ctx.db
      .query("studyRoomParticipants")
      .withIndex("by_roomId", (q) => q.eq("roomId", room._id))
      .collect();
    for (const p of participants) await ctx.db.delete(p._id);

    const messages = await ctx.db
      .query("studyRoomMessages")
      .withIndex("by_roomId", (q) => q.eq("roomId", room._id))
      .collect();
    for (const m of messages) await ctx.db.delete(m._id);

    const invites = await ctx.db
      .query("studyRoomInvitations")
      .withIndex("by_roomId", (q) => q.eq("roomId", room._id))
      .collect();
    for (const i of invites) await ctx.db.delete(i._id);

    await ctx.db.delete(room._id);
  },
});

export const sendInvitation = mutation({
  args: {
    roomId: v.id("studyRooms"),
    recipientId: v.id("users"),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Any member may invite; you cannot invite into a room you're not in.
    const { user, room } = await memberRoom(ctx, args.roomId);

    if (args.recipientId === user._id) {
      throw new Error("You are already in this room");
    }
    const recipient = await ctx.db.get(args.recipientId);
    if (!recipient) throw new Error("That person no longer exists");

    if (await isMember(ctx, room._id, args.recipientId)) {
      throw new Error("They are already in this room");
    }

    const existing = await ctx.db
      .query("studyRoomInvitations")
      .withIndex("by_roomId_recipientId", (q) =>
        q.eq("roomId", room._id).eq("recipientId", args.recipientId),
      )
      .first();

    if (existing) {
      // Re-inviting re-opens the existing invite rather than stacking duplicates.
      await ctx.db.patch(existing._id, {
        status: "pending",
        senderId: user._id,
        message: args.message,
        respondedAt: undefined,
      });
      return existing._id;
    }

    return await ctx.db.insert("studyRoomInvitations", {
      roomId: room._id,
      senderId: user._id,
      recipientId: args.recipientId,
      status: "pending",
      message: args.message,
    });
  },
});

export const respondToInvitation = mutation({
  args: {
    invitationId: v.id("studyRoomInvitations"),
    response: v.union(v.literal("accepted"), v.literal("declined")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const invite = await ctx.db.get(args.invitationId);
    // Only the recipient may answer — not the sender, not a bystander.
    if (!invite || invite.recipientId !== user._id) {
      throw new Error("Invitation not found");
    }
    if ((invite.status ?? "pending") !== "pending") {
      throw new Error("You already answered this invitation");
    }

    await ctx.db.patch(invite._id, {
      status: args.response,
      respondedAt: new Date().toISOString(),
    });

    if (args.response === "declined") return null;

    const room = await ctx.db.get(invite.roomId);
    if (!room || !room.isActive) throw new Error("That room has closed");

    const active = await countActiveMembers(ctx, room._id);
    if (active >= (room.maxParticipants ?? 10)) {
      throw new Error("This room is full");
    }

    const existing = await getMembership(ctx, room._id, user._id);
    if (existing) {
      await ctx.db.patch(existing._id, {
        isActive: true,
        joinedAt: new Date().toISOString(),
        leftAt: undefined,
      });
    } else {
      await ctx.db.insert("studyRoomParticipants", {
        roomId: room._id,
        userId: user._id,
        joinedAt: new Date().toISOString(),
        isActive: true,
        role: "participant",
      });
    }

    await syncParticipantCount(ctx, room._id);
    return room._id;
  },
});
