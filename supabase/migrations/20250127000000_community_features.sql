-- =====================================================
-- COMMUNITY FEATURES MIGRATION
-- =====================================================
-- Creates tables for friends, messages, and study rooms functionality

-- 1. CREATE FRIENDS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.friends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id),
  CHECK (user_id != friend_id)
);

CREATE INDEX IF NOT EXISTS idx_friends_user_id ON public.friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON public.friends(friend_id);

-- RLS Policies for friends
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their friendships" ON public.friends
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friendships" ON public.friends
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their friendships" ON public.friends
  FOR DELETE USING (auth.uid() = user_id);

-- 2. CREATE FRIEND REQUESTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.friend_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE(sender_id, recipient_id),
  CHECK (sender_id != recipient_id)
);

CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON public.friend_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_recipient ON public.friend_requests(recipient_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON public.friend_requests(status);

-- RLS Policies for friend_requests
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their friend requests" ON public.friend_requests
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send friend requests" ON public.friend_requests
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update friend requests they received" ON public.friend_requests
  FOR UPDATE USING (auth.uid() = recipient_id);

CREATE POLICY "Users can delete friend requests they sent" ON public.friend_requests
  FOR DELETE USING (auth.uid() = sender_id);

-- 3. CREATE MESSAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (sender_id != recipient_id)
);

CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(sender_id, recipient_id, created_at DESC);

-- RLS Policies for messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their messages" ON public.messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send messages" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update messages they received" ON public.messages
  FOR UPDATE USING (auth.uid() = recipient_id);

CREATE POLICY "Users can delete messages they sent" ON public.messages
  FOR DELETE USING (auth.uid() = sender_id);

-- 4. CREATE STUDY ROOMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.study_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_public BOOLEAN DEFAULT true,
  max_participants INTEGER DEFAULT 10,
  current_participants INTEGER DEFAULT 0,
  room_code TEXT NOT NULL UNIQUE,
  subject TEXT,
  session_duration INTEGER DEFAULT 25,
  break_duration INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_rooms_owner ON public.study_rooms(owner_id);
CREATE INDEX IF NOT EXISTS idx_study_rooms_is_public ON public.study_rooms(is_public);
CREATE INDEX IF NOT EXISTS idx_study_rooms_is_active ON public.study_rooms(is_active);
CREATE INDEX IF NOT EXISTS idx_study_rooms_room_code ON public.study_rooms(room_code);

-- RLS Policies for study_rooms
ALTER TABLE public.study_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public rooms are viewable by everyone" ON public.study_rooms
  FOR SELECT USING (is_public = true OR auth.uid() = owner_id);

CREATE POLICY "Users can create study rooms" ON public.study_rooms
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Room owners can update their rooms" ON public.study_rooms
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Room owners can delete their rooms" ON public.study_rooms
  FOR DELETE USING (auth.uid() = owner_id);

-- 5. CREATE STUDY ROOM PARTICIPANTS TABLE
-- =====================================================
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

CREATE INDEX IF NOT EXISTS idx_study_room_participants_room ON public.study_room_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_study_room_participants_user ON public.study_room_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_study_room_participants_active ON public.study_room_participants(is_active);

-- RLS Policies for study_room_participants
ALTER TABLE public.study_room_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view room participants" ON public.study_room_participants
  FOR SELECT USING (true);

CREATE POLICY "Users can join study rooms" ON public.study_room_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their participation" ON public.study_room_participants
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can leave study rooms" ON public.study_room_participants
  FOR DELETE USING (auth.uid() = user_id);

-- 6. CREATE STUDY ROOM INVITATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.study_room_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES public.study_rooms(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE(room_id, recipient_id),
  CHECK (sender_id != recipient_id)
);

CREATE INDEX IF NOT EXISTS idx_study_room_invitations_room ON public.study_room_invitations(room_id);
CREATE INDEX IF NOT EXISTS idx_study_room_invitations_sender ON public.study_room_invitations(sender_id);
CREATE INDEX IF NOT EXISTS idx_study_room_invitations_recipient ON public.study_room_invitations(recipient_id);
CREATE INDEX IF NOT EXISTS idx_study_room_invitations_status ON public.study_room_invitations(status);

-- RLS Policies for study_room_invitations
ALTER TABLE public.study_room_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their study room invitations" ON public.study_room_invitations
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send study room invitations" ON public.study_room_invitations
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update invitations they received" ON public.study_room_invitations
  FOR UPDATE USING (auth.uid() = recipient_id);

CREATE POLICY "Users can delete invitations they sent" ON public.study_room_invitations
  FOR DELETE USING (auth.uid() = sender_id);

-- 7. CREATE STUDY ROOM MESSAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.study_room_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES public.study_rooms(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'join', 'leave')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_room_messages_room ON public.study_room_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_study_room_messages_sender ON public.study_room_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_study_room_messages_created_at ON public.study_room_messages(created_at DESC);

-- RLS Policies for study_room_messages
ALTER TABLE public.study_room_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Room participants can view messages" ON public.study_room_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.study_room_participants
      WHERE room_id = study_room_messages.room_id
      AND user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Room participants can send messages" ON public.study_room_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.study_room_participants
      WHERE room_id = study_room_messages.room_id
      AND user_id = auth.uid()
      AND is_active = true
    )
  );

-- 8. CREATE FUNCTIONS FOR AUTOMATIC PARTICIPANT COUNTING
-- =====================================================
CREATE OR REPLACE FUNCTION update_study_room_participant_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.study_rooms
    SET current_participants = current_participants + 1
    WHERE id = NEW.room_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.study_rooms
    SET current_participants = GREATEST(current_participants - 1, 0)
    WHERE id = OLD.room_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_active = true AND NEW.is_active = false THEN
      UPDATE public.study_rooms
      SET current_participants = GREATEST(current_participants - 1, 0)
      WHERE id = NEW.room_id;
    ELSIF OLD.is_active = false AND NEW.is_active = true THEN
      UPDATE public.study_rooms
      SET current_participants = current_participants + 1
      WHERE id = NEW.room_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_study_room_count_on_participant_change
  AFTER INSERT OR UPDATE OR DELETE ON public.study_room_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_study_room_participant_count();

-- 9. CREATE FUNCTION TO AUTO-ACCEPT FRIEND REQUEST AND CREATE FRIENDSHIP
-- =====================================================
CREATE OR REPLACE FUNCTION accept_friend_request_and_create_friendship()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Create bidirectional friendship
    INSERT INTO public.friends (user_id, friend_id)
    VALUES (NEW.sender_id, NEW.recipient_id)
    ON CONFLICT (user_id, friend_id) DO NOTHING;

    INSERT INTO public.friends (user_id, friend_id)
    VALUES (NEW.recipient_id, NEW.sender_id)
    ON CONFLICT (user_id, friend_id) DO NOTHING;

    -- Set responded_at timestamp
    NEW.responded_at := NOW();
  ELSIF NEW.status = 'declined' AND OLD.status = 'pending' THEN
    NEW.responded_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_friend_request_accepted
  BEFORE UPDATE ON public.friend_requests
  FOR EACH ROW
  WHEN (NEW.status != OLD.status)
  EXECUTE FUNCTION accept_friend_request_and_create_friendship();

-- 10. GRANT PERMISSIONS
-- =====================================================
GRANT ALL ON public.friends TO authenticated;
GRANT ALL ON public.friend_requests TO authenticated;
GRANT ALL ON public.messages TO authenticated;
GRANT ALL ON public.study_rooms TO authenticated;
GRANT ALL ON public.study_room_participants TO authenticated;
GRANT ALL ON public.study_room_invitations TO authenticated;
GRANT ALL ON public.study_room_messages TO authenticated;

-- Add profiles table status column if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'offline' CHECK (status IN ('available', 'busy', 'offline'));

-- Add profiles table columns for community features if they don't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS university TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS major TEXT;
