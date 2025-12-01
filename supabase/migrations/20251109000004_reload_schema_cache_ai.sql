-- Force PostgREST to reload its schema cache
-- This ensures the new AI settings columns are immediately available

-- Use NOTIFY to tell PostgREST to reload
NOTIFY pgrst, 'reload schema';

-- Verify the new AI columns exist
DO $$
BEGIN
    -- Check user_settings AI columns
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_settings'
        AND column_name = 'nora_enabled'
    ) THEN
        RAISE NOTICE '✅ Column user_settings.nora_enabled exists';
    ELSE
        RAISE WARNING '❌ Column user_settings.nora_enabled is missing';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_settings'
        AND column_name = 'patrick_enabled'
    ) THEN
        RAISE NOTICE '✅ Column user_settings.patrick_enabled exists';
    ELSE
        RAISE WARNING '❌ Column user_settings.patrick_enabled is missing';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_settings'
        AND column_name = 'insights_enabled'
    ) THEN
        RAISE NOTICE '✅ Column user_settings.insights_enabled exists';
    ELSE
        RAISE WARNING '❌ Column user_settings.insights_enabled is missing';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_settings'
        AND column_name = 'personalized_responses'
    ) THEN
        RAISE NOTICE '✅ Column user_settings.personalized_responses exists';
    ELSE
        RAISE WARNING '❌ Column user_settings.personalized_responses is missing';
    END IF;

    -- Check profiles subscription_tier column
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'subscription_tier'
    ) THEN
        RAISE NOTICE '✅ Column profiles.subscription_tier exists';
    ELSE
        RAISE WARNING '❌ Column profiles.subscription_tier is missing';
    END IF;
END $$;
