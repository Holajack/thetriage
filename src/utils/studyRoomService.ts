import { supabase } from './supabase';

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
  owner?: {
    id: string;
    username?: string;
    full_name?: string;
    avatar_url?: string;
  };
  participants?: StudyRoomParticipant[];
}

export interface StudyRoomParticipant {
  id: string;
  room_id: string;
  user_id: string;
  joined_at: string;
  left_at?: string;
  is_active: boolean;
  role: 'owner' | 'moderator' | 'participant';
  user?: {
    id: string;
    username?: string;
    full_name?: string;
    avatar_url?: string;
  };
}

export interface StudyRoomInvitation {
  id: string;
  room_id: string;
  sender_id: string;
  recipient_id: string;
  status: 'pending' | 'accepted' | 'declined';
  message?: string;
  created_at: string;
  responded_at?: string;
  room?: StudyRoom;
  sender?: {
    id: string;
    username?: string;
    full_name?: string;
    avatar_url?: string;
  };
}

export interface StudyRoomMessage {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'system' | 'join' | 'leave';
  created_at: string;
  sender?: {
    id: string;
    username?: string;
    full_name?: string;
    avatar_url?: string;
  };
}

/**
 * Create a new study room
 */
export async function createStudyRoom(
  roomData: {
    name: string;
    description?: string;
    is_public?: boolean;
    max_participants?: number;
    subject?: string;
    session_duration?: number;
    break_duration?: number;
  }
): Promise<{ success: boolean; error?: string; data?: StudyRoom }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Generate a unique room code
    const roomCode = Math.random().toString(36).substr(2, 8).toUpperCase();

    // Build the insert data with only essential fields to avoid column errors
    const baseInsertData: any = {
      name: roomData.name,
      room_code: roomCode
    };

    // Add optional fields only if provided and if they exist in the schema
    if (roomData.description) baseInsertData.description = roomData.description;
    if (roomData.is_public !== undefined) baseInsertData.is_public = roomData.is_public;
    if (roomData.max_participants) baseInsertData.max_participants = roomData.max_participants;
    if (roomData.subject) baseInsertData.subject = roomData.subject;

    // Try different database schemas and column combinations
    let data, error;
    
    // First try with owner_id and full schema
    try {
      const result = await supabase
        .from('study_rooms')
        .insert({
          ...baseInsertData,
          owner_id: session.user.id,
          session_duration: roomData.session_duration ?? 25,
          break_duration: roomData.break_duration ?? 5,
          current_participants: 0,
          is_active: false
        })
        .select('*')
        .single();
      
      data = result.data;
      error = result.error;
    } catch (fullSchemaError: any) {
      // Try with creator_id instead of owner_id
      try {
        const result = await supabase
          .from('study_rooms')
          .insert({
            ...baseInsertData,
            creator_id: session.user.id,
            session_duration: roomData.session_duration ?? 25,
            break_duration: roomData.break_duration ?? 5,
            current_participants: 0,
            is_active: false
          })
          .select('*')
          .single();
        
        data = result.data;
        error = result.error;
      } catch (creatorIdError: any) {
        // Final fallback with minimal fields and owner_id
        try {
          const result = await supabase
            .from('study_rooms')
            .insert({
              ...baseInsertData,
              owner_id: session.user.id
            })
            .select('*')
            .single();
          
          data = result.data;
          error = result.error;
        } catch (minimalError: any) {
          // Last resort with creator_id
          const result = await supabase
            .from('study_rooms')
            .insert({
              ...baseInsertData,
              creator_id: session.user.id
            })
            .select('*')
            .single();
          
          data = result.data;
          error = result.error;
        }
      }
    }

    if (error) {
      return { success: false, error: error.message };
    }

    // Enhance with owner profile separately
    let enhancedData = data;
    try {
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .eq('id', session.user.id)
        .single();
      
      if (ownerProfile) {
        enhancedData = {
          ...data,
          owner: ownerProfile
        };
      }
    } catch (profileError) {
      console.warn('Could not fetch owner profile for study room');
    }

    // Add creator as owner participant
    const { error: participantError } = await supabase
      .from('study_room_participants')
      .insert({
        room_id: data.id,
        user_id: session.user.id,
        role: 'owner',
        is_active: true
      });

    if (participantError) {
      console.warn('Failed to add creator as participant:', participantError);
    }

    return { success: true, data: enhancedData };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Join a study room by ID or room code
 */
export async function joinStudyRoom(
  roomIdOrCode: string
): Promise<{ success: boolean; error?: string; data?: StudyRoom }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Find room by ID or code
    const { data: room, error: roomError } = await supabase
      .from('study_rooms')
      .select('*')
      .or(`id.eq.${roomIdOrCode},room_code.eq.${roomIdOrCode}`)
      .single();

    if (!room) {
      return { success: false, error: 'Study room not found' };
    }

    // Enhance with owner profile separately
    let enhancedRoom = room;
    try {
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .eq('id', room.owner_id)
        .single();
      
      if (ownerProfile) {
        enhancedRoom = {
          ...room,
          owner: ownerProfile
        };
      }
    } catch (profileError) {
      console.warn('Could not fetch room owner profile');
    }

    if (roomError) {
      return { success: false, error: roomError.message };
    }

    // Check if room is full
    if (enhancedRoom.current_participants >= enhancedRoom.max_participants) {
      return { success: false, error: 'Study room is full' };
    }

    // Check if user is already a participant
    const { data: existingParticipant } = await supabase
      .from('study_room_participants')
      .select('id, is_active')
      .eq('room_id', enhancedRoom.id)
      .eq('user_id', session.user.id)
      .single();

    if (existingParticipant) {
      if (existingParticipant.is_active) {
        return { success: false, error: 'You are already in this study room' };
      } else {
        // Reactivate participant
        const { error: updateError } = await supabase
          .from('study_room_participants')
          .update({ is_active: true, left_at: null })
          .eq('id', existingParticipant.id);

        if (updateError) {
          return { success: false, error: updateError.message };
        }
      }
    } else {
      // Add as new participant
      const { error: participantError } = await supabase
        .from('study_room_participants')
        .insert({
          room_id: enhancedRoom.id,
          user_id: session.user.id,
          role: 'participant',
          is_active: true
        });

      if (participantError) {
        return { success: false, error: participantError.message };
      }
    }

    // Add join message to room chat
    await supabase
      .from('study_room_messages')
      .insert({
        room_id: enhancedRoom.id,
        sender_id: session.user.id,
        content: 'joined the study room',
        message_type: 'join'
      });

    return { success: true, data: enhancedRoom };
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
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('study_room_participants')
      .update({
        is_active: false,
        left_at: new Date().toISOString()
      })
      .eq('room_id', roomId)
      .eq('user_id', session.user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    // Add leave message to room chat
    await supabase
      .from('study_room_messages')
      .insert({
        room_id: roomId,
        sender_id: session.user.id,
        content: 'left the study room',
        message_type: 'leave'
      });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
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
    const { data, error } = await supabase
      .from('study_rooms')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    // Enhance with owner profiles separately
    let enhancedData = data || [];
    if (data && data.length > 0) {
      try {
        const ownerIds = [...new Set(data.map(room => room.owner_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .in('id', ownerIds);
        
        if (profiles) {
          const profileMap = new Map(profiles.map(p => [p.id, p]));
          enhancedData = data.map(room => ({
            ...room,
            owner: profileMap.get(room.owner_id)
          }));
        }
      } catch (profileError) {
        console.warn('Could not fetch owner profiles for public study rooms');
      }
    }

    return { success: true, data: enhancedData };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get user's study rooms (owned and joined)
 */
export async function getUserStudyRooms(): Promise<{
  success: boolean;
  error?: string;
  data?: StudyRoom[];
}> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('study_room_participants')
      .select(`
        room:study_rooms(*)
      `)
      .eq('user_id', session.user.id)
      .eq('is_active', true);

    if (error) {
      return { success: false, error: error.message };
    }

    const rooms = data?.map(item => item.room).filter(Boolean) || [];

    // Enhance with owner profiles separately
    let enhancedRooms = rooms;
    if (rooms.length > 0) {
      try {
        const ownerIds = [...new Set(rooms.map(room => room.owner_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .in('id', ownerIds);
        
        if (profiles) {
          const profileMap = new Map(profiles.map(p => [p.id, p]));
          enhancedRooms = rooms.map(room => ({
            ...room,
            owner: profileMap.get(room.owner_id)
          }));
        }
      } catch (profileError) {
        console.warn('Could not fetch owner profiles for user study rooms');
      }
    }

    return { success: true, data: enhancedRooms };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Send study room invitation
 */
export async function sendStudyRoomInvitation(
  roomId: string,
  recipientId: string,
  message?: string
): Promise<{ success: boolean; error?: string; data?: StudyRoomInvitation }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Check if user is in the room
    const { data: participant } = await supabase
      .from('study_room_participants')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single();

    if (!participant) {
      return { success: false, error: 'You must be in the study room to send invitations' };
    }

    // Check if invitation already exists
    const { data: existingInvitation } = await supabase
      .from('study_room_invitations')
      .select('id, status')
      .eq('room_id', roomId)
      .eq('recipient_id', recipientId)
      .single();

    if (existingInvitation && existingInvitation.status === 'pending') {
      return { success: false, error: 'Invitation already sent' };
    }

    const { data, error } = await supabase
      .from('study_room_invitations')
      .insert({
        room_id: roomId,
        sender_id: session.user.id,
        recipient_id: recipientId,
        message: message || null,
        status: 'pending'
      })
      .select(`
        *,
        room:study_rooms(*),
        sender:profiles!study_room_invitations_sender_id_fkey(id, username, full_name, avatar_url)
      `)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Respond to study room invitation
 */
export async function respondToStudyRoomInvitation(
  invitationId: string,
  response: 'accepted' | 'declined'
): Promise<{ success: boolean; error?: string; data?: StudyRoomInvitation }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('study_room_invitations')
      .update({
        status: response,
        responded_at: new Date().toISOString()
      })
      .eq('id', invitationId)
      .eq('recipient_id', session.user.id)
      .select(`
        *,
        room:study_rooms(*),
        sender:profiles!study_room_invitations_sender_id_fkey(id, username, full_name, avatar_url)
      `)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // If accepted, join the room
    if (response === 'accepted' && data?.room) {
      await joinStudyRoom(data.room.id);
    }

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get pending study room invitations
 */
export async function getPendingStudyRoomInvitations(): Promise<{
  success: boolean;
  error?: string;
  data?: StudyRoomInvitation[];
}> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('study_room_invitations')
      .select(`
        *,
        room:study_rooms(*),
        sender:profiles!study_room_invitations_sender_id_fkey(id, username, full_name, avatar_url)
      `)
      .eq('recipient_id', session.user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
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
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Insert the message
    const { data: message, error } = await supabase
      .from('study_room_messages')
      .insert({
        room_id: roomId,
        sender_id: session.user.id,
        content,
        message_type: 'text'
      })
      .select('*')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Fetch sender profile separately
    const { data: sender } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .eq('id', session.user.id)
      .single();

    // Combine message with sender profile
    const enrichedMessage = {
      ...message,
      sender: sender || undefined
    };

    return { success: true, data: enrichedMessage };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get study room messages
 */
export async function getStudyRoomMessages(
  roomId: string,
  limit: number = 50
): Promise<{ success: boolean; error?: string; data?: StudyRoomMessage[] }> {
  try {
    // Fetch messages first
    const { data: messages, error: messagesError } = await supabase
      .from('study_room_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (messagesError) {
      return { success: false, error: messagesError.message };
    }

    if (!messages || messages.length === 0) {
      return { success: true, data: [] };
    }

    // Get unique sender IDs
    const senderIds = [...new Set(messages.map(m => m.sender_id))];

    // Fetch sender profiles separately
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', senderIds);

    if (profilesError) {
      console.warn('Failed to fetch sender profiles:', profilesError);
      // Return messages without sender info rather than failing
      return { success: true, data: messages.reverse() };
    }

    // Map profiles to messages
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    const enrichedMessages = messages.map(msg => ({
      ...msg,
      sender: profileMap.get(msg.sender_id)
    }));

    return { success: true, data: enrichedMessages.reverse() };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Subscribe to real-time study room messages
 */
export function subscribeToStudyRoomMessages(
  roomId: string,
  callback: (message: StudyRoomMessage) => void
): () => void {
  const channel = supabase
    .channel(`study_room_${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'study_room_messages',
        filter: `room_id.eq.${roomId}`
      },
      async (payload) => {
        // Fetch the complete message
        const { data: message } = await supabase
          .from('study_room_messages')
          .select('*')
          .eq('id', payload.new.id)
          .single();

        if (message) {
          // Fetch sender profile separately
          const { data: sender } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url')
            .eq('id', message.sender_id)
            .single();

          callback({
            ...message,
            sender: sender || undefined
          });
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Delete a study room (owner only)
 */
export async function deleteStudyRoom(
  roomId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'Not authenticated' };
    }

    // First, verify the user is the owner of the room
    const { data: room, error: fetchError } = await supabase
      .from('study_rooms')
      .select('owner_id, creator_id')
      .eq('id', roomId)
      .single();

    if (fetchError) {
      return { success: false, error: fetchError.message };
    }

    if (!room) {
      return { success: false, error: 'Study room not found' };
    }

    // Check if user is owner (check both owner_id and creator_id for compatibility)
    const isOwner = room.owner_id === session.user.id || room.creator_id === session.user.id;
    if (!isOwner) {
      return { success: false, error: 'Only the room creator can delete this study room' };
    }

    // Delete the room (cascade will handle related records)
    const { error: deleteError } = await supabase
      .from('study_rooms')
      .delete()
      .eq('id', roomId);

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}