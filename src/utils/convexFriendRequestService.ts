/**
 * Convex-based friend request service — replaces friendRequestService.ts
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

// Re-export interfaces
export interface FriendRequest {
  id: string;
  sender_id: string;
  recipient_id: string;
  status: "pending" | "accepted" | "declined";
  message?: string;
  created_at: string;
  responded_at?: string;
  sender?: { id: string; username?: string; full_name?: string; avatar_url?: string };
  recipient?: { id: string; username?: string; full_name?: string; avatar_url?: string };
}

export interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  created_at: string;
  friend_profile?: { id: string; username?: string; full_name?: string; avatar_url?: string };
}

/**
 * Send a friend request
 */
export async function sendFriendRequest(
  recipientId: string,
  message?: string
): Promise<{ success: boolean; error?: string; data?: FriendRequest }> {
  try {
    const client = getClient();
    const requestId = await client.mutation(api.friends.sendRequest, {
      recipientId: recipientId as Id<"users">,
      message,
    });
    return {
      success: true,
      data: {
        id: requestId,
        sender_id: "",
        recipient_id: recipientId,
        status: "pending",
        message,
        created_at: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Respond to a friend request (accept or decline)
 */
export async function respondToFriendRequest(
  requestId: string,
  response: "accepted" | "declined"
): Promise<{ success: boolean; error?: string; data?: FriendRequest }> {
  try {
    const client = getClient();
    if (response === "accepted") {
      await client.mutation(api.friends.acceptRequest, {
        requestId: requestId as Id<"friendRequests">,
      });
    } else {
      await client.mutation(api.friends.declineRequest, {
        requestId: requestId as Id<"friendRequests">,
      });
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get pending friend requests received by the current user
 */
export async function getPendingFriendRequests(): Promise<{
  success: boolean;
  error?: string;
  data?: FriendRequest[];
}> {
  try {
    const client = getClient();
    const requests = await client.query(api.friends.listRequests, {
      type: "incoming",
    });
    const adapted = (requests ?? []).map((r) => ({
      id: r._id,
      sender_id: r.senderId,
      recipient_id: r.recipientId,
      status: r.status as "pending" | "accepted" | "declined",
      message: r.message,
      created_at: r._creationTime ? new Date(r._creationTime).toISOString() : "",
      responded_at: r.respondedAt,
    }));
    return { success: true, data: adapted };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get sent friend requests
 */
export async function getSentFriendRequests(): Promise<{
  success: boolean;
  error?: string;
  data?: FriendRequest[];
}> {
  try {
    const client = getClient();
    const requests = await client.query(api.friends.listRequests, {
      type: "outgoing",
    });
    const adapted = (requests ?? []).map((r) => ({
      id: r._id,
      sender_id: r.senderId,
      recipient_id: r.recipientId,
      status: r.status as "pending" | "accepted" | "declined",
      message: r.message,
      created_at: r._creationTime ? new Date(r._creationTime).toISOString() : "",
      responded_at: r.respondedAt,
    }));
    return { success: true, data: adapted };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get user's friends list
 */
export async function getFriendsList(): Promise<{
  success: boolean;
  error?: string;
  data?: Friend[];
}> {
  try {
    const client = getClient();
    const friends = await client.query(api.friends.listFriends);
    const adapted = (friends ?? []).map((f) => ({
      id: f._id,
      user_id: f._id,
      friend_id: f._id,
      created_at: f._creationTime ? new Date(f._creationTime).toISOString() : "",
      friend_profile: {
        id: f._id,
        username: f.username,
        full_name: f.fullName,
        avatar_url: f.avatarUrl,
      },
    }));
    return { success: true, data: adapted };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Remove a friend
 */
export async function removeFriend(
  friendId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getClient();
    await client.mutation(api.friends.removeFriend, {
      friendId: friendId as Id<"users">,
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get a user profile by ID
 */
export async function getUserProfile(
  userId: string
): Promise<{ success: boolean; error?: string; profile?: { id: string; username?: string; full_name?: string; avatar_url?: string } }> {
  try {
    const client = getClient();
    const user = await client.query(api.users.getUser, {
      userId: userId as Id<"users">,
    });
    if (!user) {
      return { success: false, error: "User not found" };
    }
    return {
      success: true,
      profile: {
        id: user._id,
        username: user.username,
        full_name: user.fullName,
        avatar_url: user.avatarUrl,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Search for users to send friend requests to.
 * Note: This requires a search query on the users table.
 * For now we return empty — a Convex search index would be needed for full-text search.
 */
export async function searchUsers(
  _query: string
): Promise<{ success: boolean; error?: string; data?: any[] }> {
  // TODO: Add a Convex search query/index for user search
  return { success: true, data: [] };
}
