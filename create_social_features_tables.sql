-- Create comprehensive social features tables for friend requests, messaging, and study rooms
-- This script creates all necessary tables for the social functionality

-- ==========================================
-- 1. FRIEND REQUESTS AND FRIENDS SYSTEM
-- ==========================================

-- Friend requests table
CREATE TABLE IF NOT EXISTS public.friend_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status TEXT CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    UNIQUE(sender_id, recipient_id)
);

-- Friends table (for accepted friendships)
CREATE TABLE IF NOT EXISTS public.friends (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, friend_id)
);

-- ==========================================
-- 2. MESSAGING SYSTEM
-- ==========================================

-- Messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message notifications table
CREATE TABLE IF NOT EXISTS public.message_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 3. STUDY ROOMS SYSTEM
-- ==========================================

-- Study rooms table
CREATE TABLE IF NOT EXISTS public.study_rooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    is_public BOOLEAN DEFAULT true,
    max_participants INTEGER DEFAULT 10,
    current_participants INTEGER DEFAULT 0,
    room_code TEXT UNIQUE,
    subject TEXT,
    session_duration INTEGER DEFAULT 25, -- in minutes
    break_duration INTEGER DEFAULT 5,    -- in minutes
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Study room participants table
CREATE TABLE IF NOT EXISTS public.study_room_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID REFERENCES public.study_rooms(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    role TEXT DEFAULT 'participant' CHECK (role IN ('owner', 'moderator', 'participant')),
    UNIQUE(room_id, user_id)
);

-- Study room invitations table
CREATE TABLE IF NOT EXISTS public.study_room_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID REFERENCES public.study_rooms(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status TEXT CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    UNIQUE(room_id, recipient_id)
);

-- Study room chat messages table
CREATE TABLE IF NOT EXISTS public.study_room_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID REFERENCES public.study_rooms(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'join', 'leave')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 4. INDEXES FOR PERFORMANCE
-- ==========================================

-- Friend requests indexes
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON public.friend_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_recipient ON public.friend_requests(recipient_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON public.friend_requests(status);

-- Friends indexes
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON public.friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON public.friends(friend_id);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(sender_id, recipient_id, created_at);

-- Message notifications indexes
CREATE INDEX IF NOT EXISTS idx_message_notifications_user ON public.message_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_message_notifications_read ON public.message_notifications(is_read);

-- Study rooms indexes
CREATE INDEX IF NOT EXISTS idx_study_rooms_owner ON public.study_rooms(owner_id);
CREATE INDEX IF NOT EXISTS idx_study_rooms_public ON public.study_rooms(is_public);
CREATE INDEX IF NOT EXISTS idx_study_rooms_active ON public.study_rooms(is_active);
CREATE INDEX IF NOT EXISTS idx_study_rooms_code ON public.study_rooms(room_code);

-- Study room participants indexes
CREATE INDEX IF NOT EXISTS idx_study_room_participants_room ON public.study_room_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_study_room_participants_user ON public.study_room_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_study_room_participants_active ON public.study_room_participants(is_active);

-- Study room invitations indexes
CREATE INDEX IF NOT EXISTS idx_study_room_invitations_room ON public.study_room_invitations(room_id);
CREATE INDEX IF NOT EXISTS idx_study_room_invitations_recipient ON public.study_room_invitations(recipient_id);
CREATE INDEX IF NOT EXISTS idx_study_room_invitations_status ON public.study_room_invitations(status);

-- Study room messages indexes
CREATE INDEX IF NOT EXISTS idx_study_room_messages_room ON public.study_room_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_study_room_messages_created_at ON public.study_room_messages(created_at);

-- ==========================================
-- 5. ROW LEVEL SECURITY POLICIES
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_room_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_room_messages ENABLE ROW LEVEL SECURITY;

-- Friend requests policies
CREATE POLICY "Users can view friend requests they sent or received" ON public.friend_requests
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send friend requests" ON public.friend_requests
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can respond to friend requests they received" ON public.friend_requests
    FOR UPDATE USING (auth.uid() = recipient_id);

-- Friends policies
CREATE POLICY "Users can view their friendships" ON public.friends
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "System can create friendships" ON public.friends
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete their friendships" ON public.friends
    FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Messages policies
CREATE POLICY "Users can view messages they sent or received" ON public.messages
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send messages" ON public.messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update messages they received (mark as read)" ON public.messages
    FOR UPDATE USING (auth.uid() = recipient_id);

-- Message notifications policies
CREATE POLICY "Users can view their notifications" ON public.message_notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON public.message_notifications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their notifications" ON public.message_notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Study rooms policies
CREATE POLICY "Users can view public study rooms and their own rooms" ON public.study_rooms
    FOR SELECT USING (is_public = true OR auth.uid() = owner_id);

CREATE POLICY "Users can create study rooms" ON public.study_rooms
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Room owners can update their rooms" ON public.study_rooms
    FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Room owners can delete their rooms" ON public.study_rooms
    FOR DELETE USING (auth.uid() = owner_id);

-- Study room participants policies
CREATE POLICY "Users can view participants of rooms they're in" ON public.study_room_participants
    FOR SELECT USING (
        auth.uid() = user_id OR 
        EXISTS (SELECT 1 FROM public.study_room_participants srp WHERE srp.room_id = study_room_participants.room_id AND srp.user_id = auth.uid())
    );

CREATE POLICY "Users can join rooms" ON public.study_room_participants
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave rooms they're in" ON public.study_room_participants
    FOR UPDATE USING (auth.uid() = user_id);

-- Study room invitations policies
CREATE POLICY "Users can view invitations they sent or received" ON public.study_room_invitations
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send invitations to rooms they're in" ON public.study_room_invitations
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND 
        EXISTS (SELECT 1 FROM public.study_room_participants srp WHERE srp.room_id = study_room_invitations.room_id AND srp.user_id = auth.uid())
    );

CREATE POLICY "Users can respond to invitations they received" ON public.study_room_invitations
    FOR UPDATE USING (auth.uid() = recipient_id);

-- Study room messages policies
CREATE POLICY "Users can view messages in rooms they're in" ON public.study_room_messages
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.study_room_participants srp WHERE srp.room_id = study_room_messages.room_id AND srp.user_id = auth.uid())
    );

CREATE POLICY "Users can send messages to rooms they're in" ON public.study_room_messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND 
        EXISTS (SELECT 1 FROM public.study_room_participants srp WHERE srp.room_id = study_room_messages.room_id AND srp.user_id = auth.uid())
    );

-- ==========================================
-- 6. FUNCTIONS AND TRIGGERS
-- ==========================================

-- Function to create mutual friendship when friend request is accepted
CREATE OR REPLACE FUNCTION handle_friend_request_accepted()
RETURNS TRIGGER AS $$
BEGIN
    -- Only proceed if status changed to 'accepted'
    IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
        -- Create mutual friendship entries
        INSERT INTO public.friends (user_id, friend_id) 
        VALUES (NEW.sender_id, NEW.recipient_id)
        ON CONFLICT DO NOTHING;
        
        INSERT INTO public.friends (user_id, friend_id) 
        VALUES (NEW.recipient_id, NEW.sender_id)
        ON CONFLICT DO NOTHING;
        
        -- Update responded_at timestamp
        NEW.responded_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for friend request acceptance
DROP TRIGGER IF EXISTS friend_request_accepted_trigger ON public.friend_requests;
CREATE TRIGGER friend_request_accepted_trigger
    BEFORE UPDATE ON public.friend_requests
    FOR EACH ROW EXECUTE FUNCTION handle_friend_request_accepted();

-- Function to create message notifications
CREATE OR REPLACE FUNCTION create_message_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- Create notification for recipient
    INSERT INTO public.message_notifications (user_id, message_id)
    VALUES (NEW.recipient_id, NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for message notifications
DROP TRIGGER IF EXISTS message_notification_trigger ON public.messages;
CREATE TRIGGER message_notification_trigger
    AFTER INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION create_message_notification();

-- Function to update study room participant count
CREATE OR REPLACE FUNCTION update_room_participant_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update current_participants count
    UPDATE public.study_rooms 
    SET current_participants = (
        SELECT COUNT(*) 
        FROM public.study_room_participants 
        WHERE room_id = COALESCE(NEW.room_id, OLD.room_id) AND is_active = true
    )
    WHERE id = COALESCE(NEW.room_id, OLD.room_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for study room participant count
DROP TRIGGER IF EXISTS study_room_participant_count_trigger ON public.study_room_participants;
CREATE TRIGGER study_room_participant_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.study_room_participants
    FOR EACH ROW EXECUTE FUNCTION update_room_participant_count();

-- Function to generate unique room codes
CREATE OR REPLACE FUNCTION generate_room_code()
RETURNS TRIGGER AS $$
DECLARE
    code TEXT;
    exists BOOLEAN;
BEGIN
    -- Generate a unique 6-character room code
    LOOP
        code := upper(substring(md5(random()::text) from 1 for 6));
        SELECT EXISTS(SELECT 1 FROM public.study_rooms WHERE room_code = code) INTO exists;
        EXIT WHEN NOT exists;
    END LOOP;
    
    NEW.room_code = code;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for room code generation
DROP TRIGGER IF EXISTS generate_room_code_trigger ON public.study_rooms;
CREATE TRIGGER generate_room_code_trigger
    BEFORE INSERT ON public.study_rooms
    FOR EACH ROW EXECUTE FUNCTION generate_room_code();

-- ==========================================
-- 7. GRANT PERMISSIONS
-- ==========================================

-- Grant necessary permissions
GRANT ALL ON public.friend_requests TO authenticated;
GRANT ALL ON public.friends TO authenticated;
GRANT ALL ON public.messages TO authenticated;
GRANT ALL ON public.message_notifications TO authenticated;
GRANT ALL ON public.study_rooms TO authenticated;
GRANT ALL ON public.study_room_participants TO authenticated;
GRANT ALL ON public.study_room_invitations TO authenticated;
GRANT ALL ON public.study_room_messages TO authenticated;

GRANT ALL ON public.friend_requests TO service_role;
GRANT ALL ON public.friends TO service_role;
GRANT ALL ON public.messages TO service_role;
GRANT ALL ON public.message_notifications TO service_role;
GRANT ALL ON public.study_rooms TO service_role;
GRANT ALL ON public.study_room_participants TO service_role;
GRANT ALL ON public.study_room_invitations TO service_role;
GRANT ALL ON public.study_room_messages TO service_role;