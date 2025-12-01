-- =====================================================
-- ADD ALL MISSING COLUMNS TO STUDY_ROOMS TABLE
-- =====================================================
-- This migration ensures ALL required columns exist

-- Add all potentially missing columns
ALTER TABLE public.study_rooms
ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'Untitled Room';

ALTER TABLE public.study_rooms
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE public.study_rooms
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.study_rooms
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

ALTER TABLE public.study_rooms
ADD COLUMN IF NOT EXISTS max_participants INTEGER DEFAULT 10;

ALTER TABLE public.study_rooms
ADD COLUMN IF NOT EXISTS current_participants INTEGER DEFAULT 0;

ALTER TABLE public.study_rooms
ADD COLUMN IF NOT EXISTS room_code TEXT;

ALTER TABLE public.study_rooms
ADD COLUMN IF NOT EXISTS subject TEXT;

ALTER TABLE public.study_rooms
ADD COLUMN IF NOT EXISTS session_duration INTEGER DEFAULT 25;

ALTER TABLE public.study_rooms
ADD COLUMN IF NOT EXISTS break_duration INTEGER DEFAULT 5;

ALTER TABLE public.study_rooms
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE public.study_rooms
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.study_rooms
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Ensure room_code is unique if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'study_rooms' AND column_name = 'room_code'
  ) THEN
    -- Drop existing constraint if any
    ALTER TABLE public.study_rooms DROP CONSTRAINT IF EXISTS study_rooms_room_code_key;
    -- Add unique constraint
    ALTER TABLE public.study_rooms ADD CONSTRAINT study_rooms_room_code_key UNIQUE (room_code);
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_study_rooms_owner ON public.study_rooms(owner_id);
CREATE INDEX IF NOT EXISTS idx_study_rooms_is_public ON public.study_rooms(is_public);
CREATE INDEX IF NOT EXISTS idx_study_rooms_is_active ON public.study_rooms(is_active);
CREATE INDEX IF NOT EXISTS idx_study_rooms_room_code ON public.study_rooms(room_code);

-- Ensure RLS is enabled
ALTER TABLE public.study_rooms ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON TABLE public.study_rooms TO authenticated;
GRANT SELECT ON TABLE public.study_rooms TO anon;

-- Aggressive cache reload
DO $$
DECLARE
  i INTEGER;
BEGIN
  FOR i IN 1..10 LOOP
    PERFORM pg_notify('pgrst', 'reload schema');
    PERFORM pg_notify('pgrst', 'reload config');
    PERFORM pg_sleep(0.3);
  END LOOP;
  RAISE NOTICE 'PostgREST cache reload signals sent';
END $$;
