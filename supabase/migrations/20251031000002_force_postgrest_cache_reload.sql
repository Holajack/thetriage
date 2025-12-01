-- =====================================================
-- FORCE POSTGREST CACHE RELOAD FOR STUDY_ROOMS
-- =====================================================
-- Comprehensive fix to ensure PostgREST recognizes all columns

-- 1. Ensure is_active column exists in study_rooms
ALTER TABLE public.study_rooms
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Update any NULL values
UPDATE public.study_rooms
SET is_active = true
WHERE is_active IS NULL;

-- 3. Recreate the index to ensure it's registered
DROP INDEX IF EXISTS idx_study_rooms_is_active;
CREATE INDEX idx_study_rooms_is_active ON public.study_rooms(is_active);

-- 4. Create a function to force PostgREST cache reload
CREATE OR REPLACE FUNCTION refresh_postgrest_cache()
RETURNS void AS $$
BEGIN
  -- Force PostgREST to reload its schema cache
  PERFORM pg_notify('pgrst', 'reload schema');
  PERFORM pg_notify('pgrst', 'reload config');
END;
$$ LANGUAGE plpgsql;

-- 5. Execute the cache reload
SELECT refresh_postgrest_cache();

-- 6. Also send direct NOTIFY signals
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
