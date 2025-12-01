-- Add environment_theme column to profiles table
-- This column stores the user's preferred environment color palette

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS environment_theme TEXT DEFAULT 'home' CHECK (environment_theme IN ('home', 'office', 'library', 'coffee', 'park'));

-- Add helpful comment
COMMENT ON COLUMN public.profiles.environment_theme IS 'User preferred environment color palette: home, office, library, coffee, or park';

-- Verify the column was added
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'environment_theme'
    ) THEN
        RAISE NOTICE '✅ Column profiles.environment_theme exists';
    ELSE
        RAISE WARNING '❌ Column profiles.environment_theme is missing';
    END IF;
END $$;
