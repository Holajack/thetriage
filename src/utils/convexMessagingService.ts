/**
 * Convex-based messaging service
 *
 * Key difference: real-time subscriptions are handled automatically by
 * Convex useQuery in the components. The subscribe* functions are no-ops
 * that return empty cleanup functions for backward compatibility.
 */
import { ConvexReactClient } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

// We need a reference to the Convex client for imperative calls.
// Components should prefer useMutation hooks, but service functions
// called outside of React need the client directly.
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
  messageType: "text" | "image" | "file" = "text"
): Promise<{ success: boolean; error?: string; data?: Message }> {
  try {
    const client = getClient();
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
  senderId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getClient();
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
export function subscribeToConversation(
  _otherUserId: string,
  _callback: (message: Message) => void
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
  _callback: (notification: any) => void
): () => void {
  // No-op: Convex useQuery is reactive
  return () => {};
}
