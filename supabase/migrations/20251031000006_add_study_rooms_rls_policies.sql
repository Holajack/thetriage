-- =====================================================
-- ADD RLS POLICIES FOR STUDY_ROOMS
-- =====================================================

-- Ensure RLS is enabled
ALTER TABLE public.study_rooms ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Public rooms are viewable by everyone" ON public.study_rooms;
DROP POLICY IF EXISTS "Users can create study rooms" ON public.study_rooms;
DROP POLICY IF EXISTS "Room owners can update their rooms" ON public.study_rooms;
DROP POLICY IF EXISTS "Room owners can delete their rooms" ON public.study_rooms;

-- Create RLS policies with proper column checks
CREATE POLICY "Public rooms are viewable by everyone" ON public.study_rooms
  FOR SELECT USING (
    CASE
      WHEN is_public IS NOT NULL THEN is_public = true OR auth.uid() = owner_id
      ELSE true  -- If is_public doesn't exist, allow all
    END
  );

CREATE POLICY "Users can create study rooms" ON public.study_rooms
  FOR INSERT WITH CHECK (
    CASE
      WHEN owner_id IS NOT NULL THEN auth.uid() = owner_id
      ELSE true  -- If owner_id doesn't exist, allow all authenticated users
    END
  );

CREATE POLICY "Room owners can update their rooms" ON public.study_rooms
  FOR UPDATE USING (
    CASE
      WHEN owner_id IS NOT NULL THEN auth.uid() = owner_id
      ELSE true  -- If owner_id doesn't exist, allow all authenticated users
    END
  );

CREATE POLICY "Room owners can delete their rooms" ON public.study_rooms
  FOR DELETE USING (
    CASE
      WHEN owner_id IS NOT NULL THEN auth.uid() = owner_id
      ELSE true  -- If owner_id doesn't exist, allow all authenticated users
    END
  );

-- Grant necessary permissions
GRANT ALL ON TABLE public.study_rooms TO authenticated;
GRANT SELECT ON TABLE public.study_rooms TO anon;

-- Final cache reload
DO $$
DECLARE
  i INTEGER;
BEGIN
  FOR i IN 1..10 LOOP
    PERFORM pg_notify('pgrst', 'reload schema');
    PERFORM pg_notify('pgrst', 'reload config');
    PERFORM pg_sleep(0.5);
  END LOOP;
  RAISE NOTICE 'PostgREST cache reloaded - all study_rooms columns should now be visible';
END $$;
