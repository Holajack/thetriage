/**
 * Convex-based friend request service — replaces friendRequestService.ts
 */
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { getConvexClient } from "./convexClient";

// Re-export interfaces
export interface FriendRequest {
  id: string;
  sender_id: string;
  recipient_id: string;
  status: "pending" | "accepted" | "declined";
  message?: string;
  created_at: string;
  responded_at?: string;
  sender?: {
    id: string;
    username?: string;
    full_name?: string;
    avatar_url?: string;
  };
  recipient?: {
    id: string;
    username?: string;
    full_name?: string;
    avatar_url?: string;
  };
}

export interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  created_at: string;
  friend_profile?: {
    id: string;
    username?: string;
    full_name?: string;
    avatar_url?: string;
  };
}

/**
 * Send a friend request
 */
export async function sendFriendRequest(
  recipientId: string,
  message?: string,
  inviteCode?: string,
): Promise<{ success: boolean; error?: string; data?: FriendRequest }> {
  try {
    const client = getConvexClient();
    const requestId = await client.mutation(api.friends.sendRequest, {
      recipientId: recipientId as Id<"users">,
      message,
      inviteCode,
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
  response: "accepted" | "declined",
): Promise<{ success: boolean; error?: string; data?: FriendRequest }> {
  try {
    const client = getConvexClient();
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
    const client = getConvexClient();
    const requests = await client.query(api.friends.listRequests, {
      type: "incoming",
    });
    const adapted = (requests ?? []).map((r: any) => ({
      id: r._id,
      sender_id: r.senderId,
      recipient_id: r.recipientId,
      status: r.status as "pending" | "accepted" | "declined",
      message: r.message,
      created_at: r._creationTime
        ? new Date(r._creationTime).toISOString()
        : "",
      responded_at: r.respondedAt,
      sender: r.sender
        ? {
            id: r.sender.id,
            username: r.sender.username,
            full_name: r.sender.fullName,
            avatar_url: r.sender.avatarUrl,
            email: r.sender.email,
            status: r.sender.status,
          }
        : undefined,
      recipient: r.recipient
        ? {
            id: r.recipient.id,
            username: r.recipient.username,
            full_name: r.recipient.fullName,
            avatar_url: r.recipient.avatarUrl,
            email: r.recipient.email,
            status: r.recipient.status,
          }
        : undefined,
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
    const client = getConvexClient();
    const requests = await client.query(api.friends.listRequests, {
      type: "outgoing",
    });
    const adapted = (requests ?? []).map((r: any) => ({
      id: r._id,
      sender_id: r.senderId,
      recipient_id: r.recipientId,
      status: r.status as "pending" | "accepted" | "declined",
      message: r.message,
      created_at: r._creationTime
        ? new Date(r._creationTime).toISOString()
        : "",
      responded_at: r.respondedAt,
      sender: r.sender
        ? {
            id: r.sender.id,
            username: r.sender.username,
            full_name: r.sender.fullName,
            avatar_url: r.sender.avatarUrl,
            email: r.sender.email,
            status: r.sender.status,
          }
        : undefined,
      recipient: r.recipient
        ? {
            id: r.recipient.id,
            username: r.recipient.username,
            full_name: r.recipient.fullName,
            avatar_url: r.recipient.avatarUrl,
            email: r.recipient.email,
            status: r.recipient.status,
          }
        : undefined,
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
    const client = getConvexClient();
    const friends = await client.query(api.friends.listFriends);
    const adapted = (friends ?? []).map((f: any) => ({
      id: f._id,
      user_id: f._id,
      friend_id: f._id,
      created_at: f._creationTime
        ? new Date(f._creationTime).toISOString()
        : "",
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
async function removeFriend(
  friendId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getConvexClient();
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
export async function getUserProfile(userId: string): Promise<{
  success: boolean;
  error?: string;
  profile?: {
    id: string;
    username?: string;
    full_name?: string;
    avatar_url?: string;
  };
}> {
  try {
    const client = getConvexClient();
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
 * Searches by username or full name.
 */
export async function searchUsers(
  query: string,
): Promise<{ success: boolean; error?: string; data?: any[] }> {
  if (!query || query.trim().length < 2) {
    return { success: true, data: [] };
  }

  try {
    const client = getConvexClient();
    const results = await client.query(api.users.searchUsers, {
      query: query.trim(),
    });

    // Adapt to expected format
    const adapted = (results ?? []).map((u: any) => ({
      id: u._id,
      username: u.username,
      full_name: u.fullName,
      avatar_url: u.avatarUrl,
      university: u.university,
      status: u.status,
    }));

    return { success: true, data: adapted };
  } catch (error: any) {
    // User search error
    return { success: false, error: error.message };
  }
}
