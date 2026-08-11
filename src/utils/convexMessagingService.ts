/**
 * Convex-based messaging service
 *
 * Key difference: real-time subscriptions are handled automatically by
 * Convex useQuery in the components. The subscribe* functions are no-ops
 * that return empty cleanup functions for backward compatibility.
 */
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { getConvexClient } from "./convexClient";

// Re-export interfaces for backward compatibility
export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  message_type: "text" | "image" | "file";
  is_read: boolean;
  created_at: string;
  updated_at: string;
  sender?: {
    id: string;
    username?: string;
    full_name?: string;
    avatar_url?: string;
  };
}

export interface Conversation {
  participant: {
    id: string;
    username?: string;
    full_name?: string;
    avatar_url?: string;
  };
  last_message?: Message;
  unread_count: number;
}

/**
 * Send a message to another user
 */
export async function sendMessage(
  recipientId: string,
  content: string,
  messageType: "text" | "image" | "file" = "text",
): Promise<{ success: boolean; error?: string; data?: Message }> {
  try {
    const client = getConvexClient();
    const msgId = await client.mutation(api.messages.send, {
      recipientId: recipientId as Id<"users">,
      content,
      messageType,
    });
    return {
      success: true,
      data: {
        id: msgId,
        sender_id: "", // Convex handles sender automatically
        recipient_id: recipientId,
        content,
        message_type: messageType,
        is_read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Mark messages as read from a specific sender
 */
export async function markMessagesAsRead(
  senderId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getConvexClient();
    await client.mutation(api.messages.markConversationRead, {
      otherUserId: senderId as Id<"users">,
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Subscribe to real-time messages for a conversation.
 * With Convex, this is a no-op — useQuery(api.messages.getConversation)
 * in the component handles real-time updates automatically.
 */
function subscribeToConversation(
  _otherUserId: string,
  _callback: (message: Message) => void,
): () => void {
  // No-op: Convex useQuery is reactive
  return () => {};
}

/**
 * Subscribe to real-time message notifications.
 * With Convex, this is a no-op — use useQuery in the component.
 */
export function subscribeToMessageNotifications(
  _userId: string,
  _callback: (notification: any) => void,
): () => void {
  // No-op: Convex useQuery is reactive
  return () => {};
}

/**
 * Get all conversations for the current user.
 * Returns conversations with partner info and last message.
 */
/**
 * Get messages for a specific conversation
 */
async function getConversation(
  otherUserId: string,
): Promise<{ success: boolean; error?: string; data?: Message[] }> {
  try {
    const client = getConvexClient();
    const messages = await client.query(api.messages.getConversation, {
      otherUserId: otherUserId as Id<"users">,
    });
    if (!messages) return { success: true, data: [] };
    const adapted = messages.map((m: any) => ({
      id: m._id,
      sender_id: m.senderId,
      recipient_id: m.recipientId,
      content: m.content,
      message_type: (m.messageType || "text") as "text" | "image" | "file",
      is_read: m.isRead ?? false,
      created_at: new Date(m._creationTime).toISOString(),
      updated_at: new Date(m._creationTime).toISOString(),
    }));
    return { success: true, data: adapted };
  } catch (error: any) {
    // Error fetching conversation
    return { success: false, error: error.message };
  }
}

export async function getConversations(): Promise<{
  success: boolean;
  error?: string;
  data?: Conversation[];
}> {
  try {
    const client = getConvexClient();
    const conversations = await client.query(
      api.messages.listConversations,
      {},
    );

    if (!conversations) {
      return { success: true, data: [] };
    }

    // Fetch partner user details for each conversation
    const enrichedConversations: Conversation[] = [];
    for (const conv of conversations) {
      const partnerUser = await client.query(api.users.getUser, {
        userId: conv.otherUserId as Id<"users">,
      });

      enrichedConversations.push({
        participant: {
          id: conv.otherUserId,
          username: partnerUser?.username,
          full_name: partnerUser?.fullName,
          avatar_url: partnerUser?.avatarUrl,
        },
        last_message: conv.lastMessage
          ? {
              id: conv.lastMessage._id,
              sender_id: conv.lastMessage.senderId,
              recipient_id: conv.lastMessage.recipientId,
              content: conv.lastMessage.content,
              message_type: (conv.lastMessage.messageType ?? "text") as
                | "text"
                | "image"
                | "file",
              is_read: conv.lastMessage.isRead ?? false,
              created_at: new Date(
                conv.lastMessage._creationTime,
              ).toISOString(),
              updated_at: new Date(
                conv.lastMessage._creationTime,
              ).toISOString(),
            }
          : undefined,
        unread_count: conv.unreadCount,
      });
    }

    return { success: true, data: enrichedConversations };
  } catch (error: any) {
    // Error fetching conversations
    return { success: false, error: error.message };
  }
}

export async function getUnreadMessageCount(): Promise<number> {
  try {
    const client = getConvexClient();
    const count = await client.query(api.messages.getUnreadCount, {});
    return count ?? 0;
  } catch {
    return 0;
  }
}
