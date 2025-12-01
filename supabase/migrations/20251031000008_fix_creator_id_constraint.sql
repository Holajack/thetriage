-- =====================================================
-- FIX CREATOR_ID NOT NULL CONSTRAINT
-- =====================================================
-- Remove NOT NULL constraint from creator_id since it's synced with owner_id

-- Drop NOT NULL constraint from creator_id if it exists
ALTER TABLE public.study_rooms
  ALTER COLUMN creator_id DROP NOT NULL;

-- Drop NOT NULL constraint from owner_id if it exists
ALTER TABLE public.study_rooms
  ALTER COLUMN owner_id DROP NOT NULL;

-- Update any existing NULL values by syncing
UPDATE public.study_rooms
SET creator_id = owner_id
WHERE creator_id IS NULL AND owner_id IS NOT NULL;

UPDATE public.study_rooms
SET owner_id = creator_id
WHERE owner_id IS NULL AND creator_id IS NOT NULL;

-- Ensure the trigger function exists and is correct
CREATE OR REPLACE FUNCTION sync_study_room_owner()
RETURNS TRIGGER AS $$
BEGIN
  -- On insert or update, ensure at least one of owner_id or creator_id is set
  IF NEW.owner_id IS NULL AND NEW.creator_id IS NULL THEN
    -- If both are null, this should fail
    RAISE EXCEPTION 'Either owner_id or creator_id must be provided';
  END IF;

  -- Sync the values
  IF NEW.owner_id IS NOT NULL AND NEW.creator_id IS NULL THEN
    NEW.creator_id := NEW.owner_id;
  ELSIF NEW.creator_id IS NOT NULL AND NEW.owner_id IS NULL THEN
    NEW.owner_id := NEW.creator_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
DROP TRIGGER IF EXISTS sync_study_room_owner_trigger ON public.study_rooms;

CREATE TRIGGER sync_study_room_owner_trigger
  BEFORE INSERT OR UPDATE ON public.study_rooms
  FOR EACH ROW
  EXECUTE FUNCTION sync_study_room_owner();

-- Add a check constraint to ensure at least one is not null
ALTER TABLE public.study_rooms
  DROP CONSTRAINT IF EXISTS study_rooms_owner_check;

ALTER TABLE public.study_rooms
  ADD CONSTRAINT study_rooms_owner_check
  CHECK (owner_id IS NOT NULL OR creator_id IS NOT NULL);

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
  RAISE NOTICE 'Fixed creator_id/owner_id constraints and sync';
END $$;
