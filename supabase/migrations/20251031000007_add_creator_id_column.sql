-- =====================================================
-- ADD CREATOR_ID COLUMN TO STUDY_ROOMS
-- =====================================================
-- The app code uses both owner_id and creator_id as fallbacks
-- We need to support both column names

-- Add creator_id column if it doesn't exist
ALTER TABLE public.study_rooms
ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- If owner_id exists and creator_id is null, copy owner_id to creator_id
UPDATE public.study_rooms
SET creator_id = owner_id
WHERE creator_id IS NULL AND owner_id IS NOT NULL;

-- If creator_id exists and owner_id is null, copy creator_id to owner_id
UPDATE public.study_rooms
SET owner_id = creator_id
WHERE owner_id IS NULL AND creator_id IS NOT NULL;

-- Create a trigger to keep both columns in sync
CREATE OR REPLACE FUNCTION sync_study_room_owner()
RETURNS TRIGGER AS $$
BEGIN
  -- On insert or update, sync owner_id and creator_id
  IF NEW.owner_id IS NOT NULL AND NEW.creator_id IS NULL THEN
    NEW.creator_id := NEW.owner_id;
  ELSIF NEW.creator_id IS NOT NULL AND NEW.owner_id IS NULL THEN
    NEW.owner_id := NEW.creator_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS sync_study_room_owner_trigger ON public.study_rooms;

-- Create trigger
CREATE TRIGGER sync_study_room_owner_trigger
  BEFORE INSERT OR UPDATE ON public.study_rooms
  FOR EACH ROW
  EXECUTE FUNCTION sync_study_room_owner();

-- Create index for creator_id
CREATE INDEX IF NOT EXISTS idx_study_rooms_creator ON public.study_rooms(creator_id);

-- Update RLS policies to check both columns
DROP POLICY IF EXISTS "Public rooms are viewable by everyone" ON public.study_rooms;
DROP POLICY IF EXISTS "Users can create study rooms" ON public.study_rooms;
DROP POLICY IF EXISTS "Room owners can update their rooms" ON public.study_rooms;
DROP POLICY IF EXISTS "Room owners can delete their rooms" ON public.study_rooms;

CREATE POLICY "Public rooms are viewable by everyone" ON public.study_rooms
  FOR SELECT USING (
    is_public = true OR
    auth.uid() = owner_id OR
    auth.uid() = creator_id
  );

CREATE POLICY "Users can create study rooms" ON public.study_rooms
  FOR INSERT WITH CHECK (
    auth.uid() = owner_id OR
    auth.uid() = creator_id
  );

CREATE POLICY "Room owners can update their rooms" ON public.study_rooms
  FOR UPDATE USING (
    auth.uid() = owner_id OR
    auth.uid() = creator_id
  );

CREATE POLICY "Room owners can delete their rooms" ON public.study_rooms
  FOR DELETE USING (
    auth.uid() = owner_id OR
    auth.uid() = creator_id
  );

-- Force cache reload
DO $$
DECLARE
  i INTEGER;
BEGIN
  FOR i IN 1..10 LOOP
    PERFORM pg_notify('pgrst', 'reload schema');
    PERFORM pg_notify('pgrst', 'reload config');
    PERFORM pg_sleep(0.5);
  END LOOP;
  RAISE NOTICE 'Added creator_id column and synced with owner_id';
END $$;
