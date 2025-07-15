-- Complete fix for onboarding_preferences table schema and RLS issues
-- This addresses all missing columns and RLS policy violations

-- 1. Add missing columns to onboarding_preferences table
ALTER TABLE public.onboarding_preferences ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.onboarding_preferences ADD COLUMN IF NOT EXISTS allow_direct_messages BOOLEAN DEFAULT true;

-- 2. Add all columns used by PrivacySettingsScreen and other parts of the app
ALTER TABLE public.onboarding_preferences ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.onboarding_preferences ADD COLUMN IF NOT EXISTS focus_method TEXT;
ALTER TABLE public.onboarding_preferences ADD COLUMN IF NOT EXISTS education_level TEXT;
ALTER TABLE public.onboarding_preferences ADD COLUMN IF NOT EXISTS university TEXT;
ALTER TABLE public.onboarding_preferences ADD COLUMN IF NOT EXISTS major TEXT;
ALTER TABLE public.onboarding_preferences ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.onboarding_preferences ADD COLUMN IF NOT EXISTS timezone TEXT;
ALTER TABLE public.onboarding_preferences ADD COLUMN IF NOT EXISTS data_collection_consent BOOLEAN DEFAULT false;
ALTER TABLE public.onboarding_preferences ADD COLUMN IF NOT EXISTS personalized_recommendations BOOLEAN DEFAULT true;
ALTER TABLE public.onboarding_preferences ADD COLUMN IF NOT EXISTS usage_analytics BOOLEAN DEFAULT true;
ALTER TABLE public.onboarding_preferences ADD COLUMN IF NOT EXISTS marketing_communications BOOLEAN DEFAULT false;
ALTER TABLE public.onboarding_preferences ADD COLUMN IF NOT EXISTS profile_visibility TEXT DEFAULT 'friends';
ALTER TABLE public.onboarding_preferences ADD COLUMN IF NOT EXISTS study_data_sharing BOOLEAN DEFAULT false;

-- Privacy settings fields from PrivacySettingsScreen
ALTER TABLE public.onboarding_preferences ADD COLUMN IF NOT EXISTS show_study_progress BOOLEAN DEFAULT true;
ALTER TABLE public.onboarding_preferences ADD COLUMN IF NOT EXISTS appear_on_leaderboards BOOLEAN DEFAULT true;
ALTER TABLE public.onboarding_preferences ADD COLUMN IF NOT EXISTS study_session_visibility TEXT DEFAULT 'hidden';
ALTER TABLE public.onboarding_preferences ADD COLUMN IF NOT EXISTS public_study_rooms BOOLEAN DEFAULT true;
ALTER TABLE public.onboarding_preferences ADD COLUMN IF NOT EXISTS location_sharing_preference TEXT DEFAULT 'disabled';
ALTER TABLE public.onboarding_preferences ADD COLUMN IF NOT EXISTS receive_study_invitations BOOLEAN DEFAULT true;
ALTER TABLE public.onboarding_preferences ADD COLUMN IF NOT EXISTS email_notification_preference BOOLEAN DEFAULT true;
ALTER TABLE public.onboarding_preferences ADD COLUMN IF NOT EXISTS share_anonymous_analytics BOOLEAN DEFAULT true;
ALTER TABLE public.onboarding_preferences ADD COLUMN IF NOT EXISTS personalized_recommendations_preference BOOLEAN DEFAULT true;

-- 3. Ensure the table has proper structure if it doesn't exist
CREATE TABLE IF NOT EXISTS public.onboarding_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    is_onboarding_complete BOOLEAN DEFAULT false,
    weekly_focus_goal INTEGER DEFAULT 5,
    bio TEXT,
    allow_direct_messages BOOLEAN DEFAULT true,
    avatar_url TEXT,
    focus_method TEXT,
    education_level TEXT,
    university TEXT,
    major TEXT,
    location TEXT,
    timezone TEXT,
    data_collection_consent BOOLEAN DEFAULT false,
    personalized_recommendations BOOLEAN DEFAULT true,
    usage_analytics BOOLEAN DEFAULT true,
    marketing_communications BOOLEAN DEFAULT false,
    profile_visibility TEXT DEFAULT 'friends',
    study_data_sharing BOOLEAN DEFAULT false,
    -- Privacy settings fields
    show_study_progress BOOLEAN DEFAULT true,
    appear_on_leaderboards BOOLEAN DEFAULT true,
    study_session_visibility TEXT DEFAULT 'hidden',
    public_study_rooms BOOLEAN DEFAULT true,
    location_sharing_preference TEXT DEFAULT 'disabled',
    receive_study_invitations BOOLEAN DEFAULT true,
    email_notification_preference BOOLEAN DEFAULT true,
    share_anonymous_analytics BOOLEAN DEFAULT true,
    personalized_recommendations_preference BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Row Level Security
ALTER TABLE public.onboarding_preferences ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can access own onboarding data" ON public.onboarding_preferences;
DROP POLICY IF EXISTS "Service role can access all onboarding data" ON public.onboarding_preferences;
DROP POLICY IF EXISTS "Users can insert own onboarding data" ON public.onboarding_preferences;
DROP POLICY IF EXISTS "Users can update own onboarding data" ON public.onboarding_preferences;
DROP POLICY IF EXISTS "Users can delete own onboarding data" ON public.onboarding_preferences;

-- 6. Create comprehensive RLS policies
-- Allow users to select their own onboarding data
CREATE POLICY "Users can select own onboarding data" ON public.onboarding_preferences
    FOR SELECT USING (auth.uid() = user_id);

-- Allow users to insert their own onboarding data
CREATE POLICY "Users can insert own onboarding data" ON public.onboarding_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own onboarding data
CREATE POLICY "Users can update own onboarding data" ON public.onboarding_preferences
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own onboarding data
CREATE POLICY "Users can delete own onboarding data" ON public.onboarding_preferences
    FOR DELETE USING (auth.uid() = user_id);

-- Service role can access all data (for admin operations and triggers)
CREATE POLICY "Service role can access all onboarding data" ON public.onboarding_preferences
    FOR ALL USING (auth.role() = 'service_role');

-- 7. Grant necessary permissions
GRANT ALL ON public.onboarding_preferences TO authenticated;
GRANT ALL ON public.onboarding_preferences TO service_role;

-- 8. Create index on user_id for better performance
CREATE INDEX IF NOT EXISTS idx_onboarding_user_id ON public.onboarding_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_complete ON public.onboarding_preferences(is_onboarding_complete);

-- 9. Add updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 10. Add updated_at trigger
DROP TRIGGER IF EXISTS update_onboarding_preferences_updated_at ON public.onboarding_preferences;
CREATE TRIGGER update_onboarding_preferences_updated_at 
    BEFORE UPDATE ON public.onboarding_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. Update the user signup trigger to use the correct column structure
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER AS $$
BEGIN
    -- Create profile record with all the expected columns and default values
    INSERT INTO public.profiles (
        id,
        username,
        email,
        avatar_url,
        created_at,
        updated_at,
        university,
        major,
        business,
        profession,
        state,
        classes,
        show_university,
        show_business,
        show_state,
        show_classes,
        password_hash,
        preferences,
        privacy_settings,
        full_name,
        display_name_preference,
        last_selected_environment,
        status,
        last_seen,
        weeklyfocusgoal,
        soundpreference,
        focusduration,
        breakduration,
        maingoal,
        workstyle,
        environment,
        location,
        timezone,
        fullnamevisibility,
        universityvisibility,
        locationvisibility,
        classesvisibility,
        theme_environment,
        subscription_tier,
        subscription_expires_at,
        subscription_started_at,
        is_trial
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        NEW.email,
        null,
        NOW(),
        NOW(),
        null,
        null,
        null,
        null,
        null,
        null,
        'true',
        'true',
        'true',
        'true',
        null,
        '{}',
        '{}',
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        'username',
        'office',
        'available',
        NOW(),
        '10',
        'Lo-Fi',
        '25',
        '5',
        'Deep Work',
        'Deep Work',
        'Home',
        null,
        null,
        'none',
        'none',
        'none',
        'none',
        'park',
        'pro',
        NOW() + INTERVAL '14 days',
        NOW(),
        'true'
    )
    ON CONFLICT (id) DO NOTHING;
    
    -- Create leaderboard stats record
    INSERT INTO public.leaderboard_stats (user_id, total_focus_time, level, points, current_streak)
    VALUES (NEW.id, 0, 1, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Create onboarding preferences record with all required columns
    INSERT INTO public.onboarding_preferences (
        user_id, 
        is_onboarding_complete, 
        weekly_focus_goal,
        allow_direct_messages,
        data_collection_consent,
        personalized_recommendations,
        usage_analytics,
        marketing_communications,
        profile_visibility,
        study_data_sharing,
        show_study_progress,
        appear_on_leaderboards,
        study_session_visibility,
        public_study_rooms,
        location_sharing_preference,
        receive_study_invitations,
        email_notification_preference,
        share_anonymous_analytics,
        personalized_recommendations_preference
    )
    VALUES (
        NEW.id, 
        false, 
        5,
        true,
        false,
        true,
        true,
        false,
        'friends',
        false,
        true,
        true,
        'hidden',
        true,
        'disabled',
        true,
        true,
        true,
        true
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created_profiles ON auth.users;
CREATE TRIGGER on_auth_user_created_profiles
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_signup();