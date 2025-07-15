-- URGENT FIX for immediate database errors
-- This addresses the critical missing columns and RLS issues

-- 1. Add the missing columns that are causing immediate errors
ALTER TABLE public.onboarding_preferences ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.onboarding_preferences ADD COLUMN IF NOT EXISTS allow_direct_messages BOOLEAN DEFAULT true;

-- 2. Enable Row Level Security if not already enabled
ALTER TABLE public.onboarding_preferences ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies to recreate them properly (ignore if they don't exist)
DROP POLICY IF EXISTS "Users can access own onboarding data" ON public.onboarding_preferences;
DROP POLICY IF EXISTS "Users can insert own onboarding data" ON public.onboarding_preferences;
DROP POLICY IF EXISTS "Users can update own onboarding data" ON public.onboarding_preferences;
DROP POLICY IF EXISTS "Users can select own onboarding data" ON public.onboarding_preferences;

-- 4. Create minimal RLS policies to fix immediate access issues
CREATE POLICY "Users can select own onboarding data" ON public.onboarding_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding data" ON public.onboarding_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding data" ON public.onboarding_preferences
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. Allow service role to bypass RLS for system operations
CREATE POLICY "Service role can access all onboarding data" ON public.onboarding_preferences
    FOR ALL USING (auth.role() = 'service_role');

-- 6. Grant necessary permissions
GRANT ALL ON public.onboarding_preferences TO authenticated;
GRANT ALL ON public.onboarding_preferences TO service_role;