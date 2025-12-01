-- =====================================================
-- FIX STUDY ROOM PARTICIPANTS TABLE
-- =====================================================

-- 1. Create table if it doesn't exist
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

-- 2. Add is_active if table exists but column doesn't
ALTER TABLE public.study_room_participants
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 3. Add other potentially missing columns
ALTER TABLE public.study_room_participants
ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.study_room_participants
ADD COLUMN IF NOT EXISTS left_at TIMESTAMPTZ;

ALTER TABLE public.study_room_participants
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'participant';

-- 4. Add role check constraint
ALTER TABLE public.study_room_participants
DROP CONSTRAINT IF EXISTS study_room_participants_role_check;

ALTER TABLE public.study_room_participants
ADD CONSTRAINT study_room_participants_role_check
CHECK (role IN ('owner', 'moderator', 'participant'));

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_study_room_participants_room ON public.study_room_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_study_room_participants_user ON public.study_room_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_study_room_participants_active ON public.study_room_participants(is_active);

-- 6. Enable RLS
ALTER TABLE public.study_room_participants ENABLE ROW LEVEL SECURITY;

-- 7. Drop existing policies
DROP POLICY IF EXISTS "Users can view room participants" ON public.study_room_participants;
DROP POLICY IF EXISTS "Users can join study rooms" ON public.study_room_participants;
DROP POLICY IF EXISTS "Users can update their participation" ON public.study_room_participants;
DROP POLICY IF EXISTS "Users can leave study rooms" ON public.study_room_participants;

-- 8. Create RLS policies
CREATE POLICY "Users can view room participants" ON public.study_room_participants
  FOR SELECT USING (true);

CREATE POLICY "Users can join study rooms" ON public.study_room_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their participation" ON public.study_room_participants
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can leave study rooms" ON public.study_room_participants
  FOR DELETE USING (auth.uid() = user_id);

-- 9. Grant permissions
GRANT ALL ON public.study_room_participants TO authenticated;
GRANT SELECT ON public.study_room_participants TO anon;

-- 10. Cache reload
DO $$
DECLARE
  i INTEGER;
BEGIN
  FOR i IN 1..10 LOOP
    PERFORM pg_notify('pgrst', 'reload schema');
    PERFORM pg_notify('pgrst', 'reload config');
    PERFORM pg_sleep(0.5);
  END LOOP;
  RAISE NOTICE 'Study room participants table fixed';
END $$;
