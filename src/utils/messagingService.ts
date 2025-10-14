import { supabase } from './supabase';

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file';
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
  messageType: 'text' | 'image' | 'file' = 'text'
): Promise<{ success: boolean; error?: string; data?: Message }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: session.user.id,
        recipient_id: recipientId,
        content,
        message_type: messageType
      })
      .select('*')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Enhance with sender profile separately
    let enhancedData = data;
    try {
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .eq('id', session.user.id)
        .single();
      
      if (senderProfile) {
        enhancedData = {
          ...data,
          sender: senderProfile
        };
      }
    } catch (profileError) {
      console.warn('Could not fetch sender profile for message');
    }

    return { success: true, data: enhancedData };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get messages between current user and another user
 */
export async function getConversation(
  otherUserId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ success: boolean; error?: string; data?: Message[] }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${session.user.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${session.user.id})`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return { success: false, error: error.message };
    }

    // Enhance with sender profiles separately
    let enhancedData = data || [];
    if (data && data.length > 0) {
      try {
        const senderIds = [...new Set(data.map(msg => msg.sender_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .in('id', senderIds);
        
        if (profiles) {
          const profileMap = new Map(profiles.map(p => [p.id, p]));
          enhancedData = data.map(msg => ({
            ...msg,
            sender: profileMap.get(msg.sender_id)
          }));
        }
      } catch (profileError) {
        console.warn('Could not fetch sender profiles for conversation');
      }
    }

    // Reverse to show oldest first
    return { success: true, data: enhancedData.reverse() };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get all conversations for the current user
 */
export async function getConversations(): Promise<{ 
  success: boolean; 
  error?: string; 
  data?: Conversation[] 
}> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get all unique conversation participants
    const { data: conversationData, error } = await supabase
      .rpc('get_user_conversations', { user_id: session.user.id });

    if (error) {
      // Fallback method if RPC doesn't exist
      return await getConversationsFallback(session.user.id);
    }

    return { success: true, data: conversationData || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Fallback method to get conversations without RPC
 */
async function getConversationsFallback(userId: string): Promise<{ 
  success: boolean; 
  error?: string; 
  data?: Conversation[] 
}> {
  try {
    // Get all messages involving the user
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    // Enhance with sender and recipient profiles separately
    let enhancedMessages = messages || [];
    if (messages && messages.length > 0) {
      try {
        const allUserIds = [...new Set([
          ...messages.map(msg => msg.sender_id),
          ...messages.map(msg => msg.recipient_id)
        ])];
        
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .in('id', allUserIds);
        
        if (profiles) {
          const profileMap = new Map(profiles.map(p => [p.id, p]));
          enhancedMessages = messages.map(msg => ({
            ...msg,
            sender: profileMap.get(msg.sender_id),
            recipient: profileMap.get(msg.recipient_id)
          }));
        }
      } catch (profileError) {
        console.warn('Could not fetch profiles for conversations fallback');
        enhancedMessages = messages;
      }
    }

    if (!enhancedMessages || enhancedMessages.length === 0) {
      return { success: true, data: [] };
    }

    // Group messages by conversation partner
    const conversationsMap = new Map<string, Conversation>();

    for (const message of enhancedMessages) {
      const partnerId = message.sender_id === userId ? message.recipient_id : message.sender_id;
      const partnerProfile = message.sender_id === userId ? message.recipient : message.sender;

      if (!conversationsMap.has(partnerId)) {
        // Count unread messages from this partner
        const unreadCount = enhancedMessages.filter(m => 
          m.sender_id === partnerId && 
          m.recipient_id === userId && 
          !m.is_read
        ).length;

        conversationsMap.set(partnerId, {
          participant: partnerProfile,
          last_message: message,
          unread_count: unreadCount
        });
      }
    }

    return { success: true, data: Array.from(conversationsMap.values()) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(
  senderId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('sender_id', senderId)
      .eq('recipient_id', session.user.id)
      .eq('is_read', false);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get unread message count for current user
 */
export async function getUnreadMessageCount(): Promise<{ 
  success: boolean; 
  error?: string; 
  count?: number 
}> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', session.user.id)
      .eq('is_read', false);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, count: count || 0 };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Subscribe to real-time messages for a conversation
 */
export function subscribeToConversation(
  otherUserId: string,
  callback: (message: Message) => void
): () => void {
  const channel = supabase
    .channel(`conversation_${otherUserId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `or(and(sender_id.eq.${otherUserId}),and(recipient_id.eq.${otherUserId}))`
      },
      async (payload) => {
        // Fetch the complete message with sender info
        const { data: messageData } = await supabase
          .from('messages')
          .select('*')
          .eq('id', payload.new.id)
          .single();

        if (messageData) {
          // Enhance with sender profile separately
          try {
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('id, username, full_name, avatar_url')
              .eq('id', messageData.sender_id)
              .single();
            
            callback({
              ...messageData,
              sender: senderProfile
            });
          } catch (profileError) {
            // Fallback to message without sender profile
            callback(messageData);
          }
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to real-time message notifications
 */
export function subscribeToMessageNotifications(
  userId: string,
  callback: (notification: any) => void
): () => void {
  const channel = supabase
    .channel(`message_notifications_${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'message_notifications',
        filter: `user_id.eq.${userId}`
      },
      callback
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}