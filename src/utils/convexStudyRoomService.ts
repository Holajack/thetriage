/**
 * Convex-based study room service — replaces studyRoomService.ts
 *
 * Real-time subscriptions are automatic with Convex useQuery.
 * The subscribeToStudyRoomMessages function is a no-op.
 */
import { ConvexReactClient } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

let _convexClient: ConvexReactClient | null = null;

export function setConvexClient(client: ConvexReactClient) {
  _convexClient = client;
}

function getClient(): ConvexReactClient {
  if (!_convexClient) {
    throw new Error("Convex client not initialized. Call setConvexClient first.");
  }
  return _convexClient;
}

// Re-export interfaces for backward compat
export interface StudyRoom {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  is_public: boolean;
  max_participants: number;
  current_participants: number;
  room_code: string;
  subject?: string;
  session_duration: number;
  break_duration: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  owner?: { id: string; username?: string; full_name?: string; avatar_url?: string };
  participants?: StudyRoomParticipant[];
}

export interface StudyRoomParticipant {
  id: string;
  room_id: string;
  user_id: string;
  joined_at: string;
  left_at?: string;
  is_active: boolean;
  role: "owner" | "moderator" | "participant";
  user?: { id: string; username?: string; full_name?: string; avatar_url?: string };
}

export interface StudyRoomInvitation {
  id: string;
  room_id: string;
  sender_id: string;
  recipient_id: string;
  status: "pending" | "accepted" | "declined";
  message?: string;
  created_at: string;
  responded_at?: string;
  room?: StudyRoom;
  sender?: { id: string; username?: string; full_name?: string; avatar_url?: string };
}

export interface StudyRoomMessage {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  message_type: "text" | "system" | "join" | "leave";
  created_at: string;
  sender?: { id: string; username?: string; full_name?: string; avatar_url?: string };
}

/**
 * Create a new study room
 */
export async function createStudyRoom(roomData: {
  name: string;
  description?: string;
  is_public?: boolean;
  max_participants?: number;
  subject?: string;
  session_duration?: number;
  break_duration?: number;
}): Promise<{ success: boolean; error?: string; data?: StudyRoom }> {
  try {
    const client = getClient();
    const roomId = await client.mutation(api.studyRooms.create, {
      name: roomData.name,
      description: roomData.description,
      isPublic: roomData.is_public,
      maxParticipants: roomData.max_participants,
      subject: roomData.subject,
      sessionDuration: roomData.session_duration,
      breakDuration: roomData.break_duration,
    });
    return {
      success: true,
      data: {
        id: roomId,
        name: roomData.name,
        description: roomData.description,
        owner_id: "",
        is_public: roomData.is_public ?? true,
        max_participants: roomData.max_participants ?? 10,
        current_participants: 1,
        room_code: "",
        subject: roomData.subject,
        session_duration: roomData.session_duration ?? 25,
        break_duration: roomData.break_duration ?? 5,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Join a study room
 */
export async function joinStudyRoom(
  roomIdOrCode: string
): Promise<{ success: boolean; error?: string; data?: StudyRoom }> {
  try {
    const client = getClient();
    // Try as room code first
    const room = await client.query(api.studyRooms.getByCode, {
      roomCode: roomIdOrCode,
    });
    const targetId = room?._id ?? (roomIdOrCode as Id<"studyRooms">);
    await client.mutation(api.studyRooms.join, { roomId: targetId });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Leave a study room
 */
export async function leaveStudyRoom(
  roomId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getClient();
    await client.mutation(api.studyRooms.leave, {
      roomId: roomId as Id<"studyRooms">,
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Send message to study room chat
 */
export async function sendStudyRoomMessage(
  roomId: string,
  content: string
): Promise<{ success: boolean; error?: string; data?: StudyRoomMessage }> {
  try {
    const client = getClient();
    const msgId = await client.mutation(api.studyRooms.sendMessage, {
      roomId: roomId as Id<"studyRooms">,
      content,
      messageType: "text",
    });
    return {
      success: true,
      data: {
        id: msgId,
        room_id: roomId,
        sender_id: "",
        content,
        message_type: "text",
        created_at: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Subscribe to real-time study room messages.
 * No-op with Convex — useQuery(api.studyRooms.getMessages) is reactive.
 */
export function subscribeToStudyRoomMessages(
  _roomId: string,
  _callback: (message: StudyRoomMessage) => void
): () => void {
  return () => {};
}

/**
 * Get public study rooms
 */
export async function getPublicStudyRooms(): Promise<{
  success: boolean;
  error?: string;
  data?: StudyRoom[];
}> {
  try {
    const client = getClient();
    const rooms = await client.query(api.studyRooms.list, { onlyActive: true });
    const adapted = (rooms ?? []).map((r) => ({
      id: r._id,
      name: r.name,
      description: r.description,
      owner_id: r.ownerId,
      is_public: r.isPublic ?? true,
      max_participants: r.maxParticipants ?? 10,
      current_participants: r.currentParticipants ?? 0,
      room_code: r.roomCode ?? "",
      subject: r.subject,
      session_duration: r.sessionDuration ?? 25,
      break_duration: r.breakDuration ?? 5,
      is_active: r.isActive ?? false,
      created_at: r._creationTime ? new Date(r._creationTime).toISOString() : "",
      updated_at: "",
    }));
    return { success: true, data: adapted as StudyRoom[] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get study room members
 */
export async function getStudyRoomMembers(
  roomId: string
): Promise<{ success: boolean; error?: string; data?: StudyRoomParticipant[] }> {
  try {
    const client = getClient();
    const participants = await client.query(api.studyRooms.getParticipants, {
      roomId: roomId as Id<"studyRooms">,
    });
    const adapted = (participants ?? []).map((p) => ({
      id: p._id,
      room_id: p.roomId,
      user_id: p.userId,
      joined_at: p.joinedAt ?? "",
      left_at: p.leftAt,
      is_active: p.isActive ?? false,
      role: (p.role ?? "participant") as "owner" | "moderator" | "participant",
      user: p.user
        ? {
            id: p.user._id,
            username: p.user.username,
            full_name: p.user.fullName,
            avatar_url: p.user.avatarUrl,
          }
        : undefined,
    }));
    return { success: true, data: adapted };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get study room messages
 */
export async function getStudyRoomMessages(
  roomId: string,
  _limit: number = 50
): Promise<{ success: boolean; error?: string; data?: StudyRoomMessage[] }> {
  try {
    const client = getClient();
    const messages = await client.query(api.studyRooms.getMessages, {
      roomId: roomId as Id<"studyRooms">,
    });
    const adapted = (messages ?? []).map((m) => ({
      id: m._id,
      room_id: m.roomId,
      sender_id: m.senderId,
      content: m.content,
      message_type: (m.messageType ?? "text") as "text" | "system" | "join" | "leave",
      created_at: m._creationTime ? new Date(m._creationTime).toISOString() : "",
    }));
    return { success: true, data: adapted };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
