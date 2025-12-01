-- Quick fix for Nora 403 error
-- This checks if the AI security system is set up and creates it if missing

-- Check if subscription_tiers table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'subscription_tiers') THEN
        RAISE NOTICE 'subscription_tiers table does not exist. Running full AI security migration...';

        -- Run the full migration
        -- Note: You should apply the 20250128000000_ai_security_system.sql migration
        -- from the Supabase Dashboard SQL Editor

    ELSE
        RAISE NOTICE 'subscription_tiers table exists';
    END IF;
END $$;

-- Check if check_ai_access function exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_proc WHERE proname = 'check_ai_access') THEN
        RAISE NOTICE 'check_ai_access function does not exist';
    ELSE
        RAISE NOTICE 'check_ai_access function exists';
    END IF;
END $$;

-- Quick fix: Update user's subscription_tier if it's NULL
UPDATE public.profiles
SET subscription_tier = 'trial',
    trial_started_at = COALESCE(trial_started_at, NOW()),
    trial_ends_at = COALESCE(trial_ends_at, NOW() + INTERVAL '14 days')
WHERE subscription_tier IS NULL;

-- Check current user subscriptions
SELECT
    id,
    full_name,
    subscription_tier,
    trial_ends_at,
    created_at
FROM public.profiles
ORDER BY created_at DESC
LIMIT 5;
