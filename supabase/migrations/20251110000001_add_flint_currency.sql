-- Add flint_currency column to profiles table
-- Flint is the in-game currency earned by completing focus sessions
-- Users earn 1 Flint per completed focus hour

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS flint_currency DECIMAL(10, 1) DEFAULT 0 CHECK (flint_currency >= 0);

-- Add helpful comment
COMMENT ON COLUMN public.profiles.flint_currency IS 'In-game currency (Flint) earned by completing focus sessions. 1 Flint per completed focus hour. Used for shop purchases (Nora customization, housing, locations).';

-- Add column to track if user has received first session bonus
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS first_session_bonus_claimed BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.profiles.first_session_bonus_claimed IS 'Tracks whether user has received their 0.5 Flint bonus for completing their first focus session.';

-- Verify the columns were added
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'flint_currency'
    ) THEN
        RAISE NOTICE '✅ Column profiles.flint_currency exists';
    ELSE
        RAISE WARNING '❌ Column profiles.flint_currency is missing';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'first_session_bonus_claimed'
    ) THEN
        RAISE NOTICE '✅ Column profiles.first_session_bonus_claimed exists';
    ELSE
        RAISE WARNING '❌ Column profiles.first_session_bonus_claimed is missing';
    END IF;
END $$;
