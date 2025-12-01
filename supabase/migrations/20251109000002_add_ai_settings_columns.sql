-- Add AI settings columns to user_settings table
-- These columns control AI features based on subscription tier

ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS nora_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS patrick_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS insights_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS personalized_responses BOOLEAN DEFAULT false;

-- Add helpful comment
COMMENT ON COLUMN public.user_settings.nora_enabled IS 'Enable Nora AI with full contextual access (Pro only)';
COMMENT ON COLUMN public.user_settings.patrick_enabled IS 'Enable Patrick AI for general Q&A (Premium & Pro)';
COMMENT ON COLUMN public.user_settings.insights_enabled IS 'Enable AI insights (full for Pro, basic for Premium)';
COMMENT ON COLUMN public.user_settings.personalized_responses IS 'Enable personalized AI responses based on study habits (Pro only)';

-- Set appropriate defaults based on existing subscription tiers
-- This is a one-time update for existing users
DO $$
BEGIN
    -- Pro users: Enable Nora and Insights by default
    UPDATE public.user_settings us
    SET
        nora_enabled = true,
        insights_enabled = true,
        personalized_responses = true
    FROM public.profiles p
    WHERE us.user_id = p.id
    AND p.subscription_tier = 'pro'
    AND us.nora_enabled IS NULL; -- Only update if not already set

    -- Premium users: Enable Patrick and Insights by default
    UPDATE public.user_settings us
    SET
        patrick_enabled = true,
        insights_enabled = true
    FROM public.profiles p
    WHERE us.user_id = p.id
    AND p.subscription_tier = 'premium'
    AND us.patrick_enabled IS NULL; -- Only update if not already set

    RAISE NOTICE '✅ AI settings columns added and defaults configured';
END $$;
