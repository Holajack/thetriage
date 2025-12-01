-- Add subscription_tier column to profiles table
-- This column determines which AI features users have access to

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'pro'));

-- Add helpful comment
COMMENT ON COLUMN public.profiles.subscription_tier IS 'User subscription level: free, premium, or pro';

-- Create an index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON public.profiles(subscription_tier);

-- Verify the column was added
DO $$
BEGIN
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
