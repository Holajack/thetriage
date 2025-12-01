-- =====================================================
-- FIX FOREIGN KEY NAMES FOR POSTGREST RELATIONSHIPS
-- =====================================================
-- PostgREST uses foreign key names to establish relationships
-- The code expects specific foreign key names

-- 1. Fix study_room_messages.sender_id foreign key name
ALTER TABLE public.study_room_messages
DROP CONSTRAINT IF EXISTS study_room_messages_sender_id_fkey CASCADE;

ALTER TABLE public.study_room_messages
ADD CONSTRAINT study_room_messages_sender_id_fkey
FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Ensure profiles table has the right structure
-- Make sure profiles.id references auth.users.id with correct constraint name
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_id_fkey CASCADE;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_id_fkey
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Recreate the index on sender_id
CREATE INDEX IF NOT EXISTS idx_study_room_messages_sender ON public.study_room_messages(sender_id);

-- 4. Grant permissions again
GRANT SELECT ON auth.users TO authenticated;
GRANT SELECT ON auth.users TO anon;
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT ON public.study_room_messages TO authenticated;

-- 5. Drop and recreate the view with explicit join
DROP VIEW IF EXISTS public.study_room_messages_with_profiles CASCADE;

CREATE OR REPLACE VIEW public.study_room_messages_with_profiles AS
SELECT
  m.id,
  m.room_id,
  m.sender_id,
  m.content,
  m.message_type,
  m.created_at,
  jsonb_build_object(
    'id', p.id,
    'username', p.username,
    'full_name', p.full_name,
    'avatar_url', p.avatar_url,
    'email', p.email
  ) as sender
FROM public.study_room_messages m
LEFT JOIN public.profiles p ON m.sender_id = p.id;

GRANT SELECT ON public.study_room_messages_with_profiles TO authenticated;
GRANT SELECT ON public.study_room_messages_with_profiles TO anon;

-- 6. Create a function to help PostgREST recognize relationships
CREATE OR REPLACE FUNCTION get_study_room_messages_with_sender(p_room_id UUID, p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID,
  room_id UUID,
  sender_id UUID,
  content TEXT,
  message_type TEXT,
  created_at TIMESTAMPTZ,
  sender JSON
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.room_id,
    m.sender_id,
    m.content,
    m.message_type,
    m.created_at,
    row_to_json(p.*)::json as sender
  FROM public.study_room_messages m
  LEFT JOIN public.profiles p ON m.sender_id = p.id
  WHERE m.room_id = p_room_id
  ORDER BY m.created_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_study_room_messages_with_sender TO authenticated;

-- 7. Super aggressive cache reload with multiple methods
DO $$
DECLARE
  i INTEGER;
BEGIN
  -- Method 1: Multiple NOTIFY signals
  FOR i IN 1..20 LOOP
    PERFORM pg_notify('pgrst', 'reload schema');
    PERFORM pg_notify('pgrst', 'reload config');
    PERFORM pg_sleep(0.3);
  END LOOP;

  -- Method 2: Force a schema change to trigger cache invalidation
  COMMENT ON TABLE public.study_room_messages IS 'Study room chat messages with proper FK relationships';

  RAISE NOTICE 'Foreign key relationships fixed and cache aggressively reloaded';
END $$;

-- Final notifications
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
