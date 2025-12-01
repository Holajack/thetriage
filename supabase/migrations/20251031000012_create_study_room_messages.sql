-- =====================================================
-- CREATE STUDY ROOM MESSAGES TABLE
-- =====================================================

-- 1. Create the table
CREATE TABLE IF NOT EXISTS public.study_room_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES public.study_rooms(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add message_type check constraint
ALTER TABLE public.study_room_messages
DROP CONSTRAINT IF EXISTS study_room_messages_message_type_check;

ALTER TABLE public.study_room_messages
ADD CONSTRAINT study_room_messages_message_type_check
CHECK (message_type IN ('text', 'system', 'join', 'leave'));

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_study_room_messages_room ON public.study_room_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_study_room_messages_sender ON public.study_room_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_study_room_messages_created_at ON public.study_room_messages(created_at DESC);

-- 4. Enable RLS
ALTER TABLE public.study_room_messages ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies
DROP POLICY IF EXISTS "Room participants can view messages" ON public.study_room_messages;
DROP POLICY IF EXISTS "Room participants can send messages" ON public.study_room_messages;

-- 6. Create RLS policies that reference the correct columns
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

-- 7. Grant permissions
GRANT SELECT, INSERT ON public.study_room_messages TO authenticated;
GRANT SELECT ON public.study_room_messages TO anon;

-- 8. Ensure profiles table has proper grants for joins
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

-- 9. Create view for messages with sender profiles
CREATE OR REPLACE VIEW public.study_room_messages_with_profiles AS
SELECT
  m.id,
  m.room_id,
  m.sender_id,
  m.content,
  m.message_type,
  m.created_at,
  p.username as sender_username,
  p.full_name as sender_full_name,
  p.avatar_url as sender_avatar_url,
  p.email as sender_email
FROM public.study_room_messages m
LEFT JOIN public.profiles p ON m.sender_id = p.id;

-- Grant access to the view
GRANT SELECT ON public.study_room_messages_with_profiles TO authenticated;
GRANT SELECT ON public.study_room_messages_with_profiles TO anon;

-- 10. Aggressive cache reload
DO $$
DECLARE
  i INTEGER;
BEGIN
  FOR i IN 1..15 LOOP
    PERFORM pg_notify('pgrst', 'reload schema');
    PERFORM pg_notify('pgrst', 'reload config');
    PERFORM pg_sleep(0.5);
  END LOOP;
  RAISE NOTICE 'Study room messages table created with proper relationships to profiles';
END $$;
