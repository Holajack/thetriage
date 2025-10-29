import { supabase } from './supabase';

export interface FriendRequest {
  id: string;
  sender_id: string;
  recipient_id: string;
  status: 'pending' | 'accepted' | 'declined';
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
    bio?: string;
  };
}

/**
 * Send a friend request to another user
 */
export async function sendFriendRequest(
  recipientId: string, 
  message?: string
): Promise<{ success: boolean; error?: string; data?: FriendRequest }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Check if request already exists
    const { data: existingRequest } = await supabase
      .from('friend_requests')
      .select('id, status')
      .eq('sender_id', session.user.id)
      .eq('recipient_id', recipientId)
      .single();

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        return { success: false, error: 'Friend request already sent' };
      } else if (existingRequest.status === 'accepted') {
        return { success: false, error: 'You are already friends' };
      }
    }

    // Check if they're already friends
    const { data: existingFriendship } = await supabase
      .from('friends')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('friend_id', recipientId)
      .single();

    if (existingFriendship) {
      return { success: false, error: 'You are already friends' };
    }

    // Send friend request
    const baseInsert = {
      sender_id: session.user.id,
      recipient_id: recipientId,
      status: 'pending' as const,
    };

    const attemptInsert = async (payload: Record<string, any>) =>
      supabase.from('friend_requests').insert(payload).select('*').single();

    let result = await attemptInsert({
      ...baseInsert,
      message: message ?? null,
    });

    if (result.error && result.error.message?.includes('message')) {
      result = await attemptInsert(baseInsert);
    }

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    // Fetch sender and recipient profiles separately to avoid foreign key issues
    let enhancedData = result.data as FriendRequest;
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', [session.user.id, recipientId]);
      
      if (profiles) {
        const profileMap = new Map(profiles.map(p => [p.id, p]));
        enhancedData = {
          ...data,
          sender: profileMap.get(session.user.id),
          recipient: profileMap.get(recipientId)
        };
      }
    } catch (profileError) {
      console.warn('Could not fetch profiles, using basic data');
    }

    return { success: true, data: enhancedData };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Respond to a friend request (accept or decline)
 */
export async function respondToFriendRequest(
  requestId: string, 
  response: 'accepted' | 'declined'
): Promise<{ success: boolean; error?: string; data?: FriendRequest }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Try with responded_at column first, fallback without it
    let data, error;
    try {
      const result = await supabase
        .from('friend_requests')
        .update({
          status: response,
          responded_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .eq('recipient_id', session.user.id)
        .select('*')
        .single();
      
      data = result.data;
      error = result.error;
    } catch (columnError: any) {
      if (columnError.message?.includes('responded_at')) {
        // Retry without responded_at column
        const result = await supabase
          .from('friend_requests')
          .update({ status: response })
          .eq('id', requestId)
          .eq('recipient_id', session.user.id)
          .select('*')
          .single();
        
        data = result.data;
        error = result.error;
      } else {
        throw columnError;
      }
    }

    if (error) {
      return { success: false, error: error.message };
    }

    // Fetch sender and recipient profiles separately to avoid foreign key issues
    let enhancedData = data;
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', [data.sender_id, data.recipient_id]);
      
      if (profiles) {
        const profileMap = new Map(profiles.map(p => [p.id, p]));
        enhancedData = {
          ...data,
          sender: profileMap.get(data.sender_id),
          recipient: profileMap.get(data.recipient_id)
        };
      }
    } catch (profileError) {
      console.warn('Could not fetch profiles for friend request response');
    }

    // If request was accepted, create friend relationships
    if (response === 'accepted') {
      try {
        // Create bidirectional friendship
        await supabase.from('friends').insert([
          { user_id: data.sender_id, friend_id: data.recipient_id },
          { user_id: data.recipient_id, friend_id: data.sender_id }
        ]);
      } catch (friendError) {
        console.warn('Could not create friend relationships:', friendError);
      }
    }

    return { success: true, data: enhancedData };
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
  data?: FriendRequest[] 
}> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('recipient_id', session.user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    // Enhance with sender profiles separately
    let enhancedData = data || [];
    if (data && data.length > 0) {
      try {
        const senderIds = [...new Set(data.map(req => req.sender_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .in('id', senderIds);
        
        if (profiles) {
          const profileMap = new Map(profiles.map(p => [p.id, p]));
          enhancedData = data.map(req => ({
            ...req,
            sender: profileMap.get(req.sender_id)
          }));
        }
      } catch (profileError) {
        console.warn('Could not fetch sender profiles for friend requests');
      }
    }

    return { success: true, data: enhancedData };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get sent friend requests by the current user
 */
export async function getSentFriendRequests(): Promise<{ 
  success: boolean; 
  error?: string; 
  data?: FriendRequest[] 
}> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('sender_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    // Enhance with recipient profiles separately
    let enhancedData = data || [];
    if (data && data.length > 0) {
      try {
        const recipientIds = [...new Set(data.map(req => req.recipient_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .in('id', recipientIds);
        
        if (profiles) {
          const profileMap = new Map(profiles.map(p => [p.id, p]));
          enhancedData = data.map(req => ({
            ...req,
            recipient: profileMap.get(req.recipient_id)
          }));
        }
      } catch (profileError) {
        console.warn('Could not fetch recipient profiles for sent friend requests');
      }
    }

    return { success: true, data: enhancedData };
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
  data?: Friend[] 
}> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('friends')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    // Enhance with friend profiles separately
    let enhancedData = data || [];
    if (data && data.length > 0) {
      try {
        const friendIds = [...new Set(data.map(friendship => friendship.friend_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, bio')
          .in('id', friendIds);
        
        if (profiles) {
          const profileMap = new Map(profiles.map(p => [p.id, p]));
          enhancedData = data.map(friendship => ({
            ...friendship,
            friend_profile: profileMap.get(friendship.friend_id)
          }));
        }
      } catch (profileError) {
        console.warn('Could not fetch friend profiles');
      }
    }

    return { success: true, data: enhancedData };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Remove a friend
 */
export async function removeFriend(friendId: string): Promise<{ 
  success: boolean; 
  error?: string 
}> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Remove both directions of the friendship
    const { error: error1 } = await supabase
      .from('friends')
      .delete()
      .eq('user_id', session.user.id)
      .eq('friend_id', friendId);

    const { error: error2 } = await supabase
      .from('friends')
      .delete()
      .eq('user_id', friendId)
      .eq('friend_id', session.user.id);

    if (error1 || error2) {
      return { success: false, error: error1?.message || error2?.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Search for users to send friend requests to
 */
export async function searchUsers(query: string): Promise<{ 
  success: boolean; 
  error?: string; 
  data?: any[] 
}> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, bio')
      .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
      .neq('id', session.user.id) // Exclude current user
      .limit(20);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
