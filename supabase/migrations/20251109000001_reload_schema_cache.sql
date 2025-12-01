-- Force PostgREST to reload its schema cache
-- This ensures the new notification columns are immediately available

-- Use NOTIFY to tell PostgREST to reload
NOTIFY pgrst, 'reload schema';

-- Verify the new columns exist
DO $$
BEGIN
    -- Check user_settings columns
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_settings'
        AND column_name = 'daily_reminder'
    ) THEN
        RAISE NOTICE '✅ Column user_settings.daily_reminder exists';
    ELSE
        RAISE WARNING '❌ Column user_settings.daily_reminder is missing';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_settings'
        AND column_name = 'session_end_reminder'
    ) THEN
        RAISE NOTICE '✅ Column user_settings.session_end_reminder exists';
    ELSE
        RAISE WARNING '❌ Column user_settings.session_end_reminder is missing';
    END IF;

    -- Check profiles columns
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'daily_reminder'
    ) THEN
        RAISE NOTICE '✅ Column profiles.daily_reminder exists';
    ELSE
        RAISE WARNING '❌ Column profiles.daily_reminder is missing';
    END IF;
END $$;
