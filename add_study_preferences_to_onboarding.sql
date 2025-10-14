-- Add sound and environment preference columns to onboarding_preferences table
-- This script adds the new columns for the StudyPreferencesScreen

-- Add the new columns
ALTER TABLE public.onboarding_preferences ADD COLUMN IF NOT EXISTS sound_preference TEXT DEFAULT 'ambient';
ALTER TABLE public.onboarding_preferences ADD COLUMN IF NOT EXISTS environment_preference TEXT DEFAULT 'library';

-- Update the user signup trigger to include default values for the new columns
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
    
    -- Create onboarding preferences record with all required columns including new study preferences
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
        personalized_recommendations_preference,
        sound_preference,
        environment_preference
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
        true,
        'ambient',
        'library'
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- The trigger is already created, so it will use the updated function

-- Create indexes for the new columns if they're going to be queried frequently
CREATE INDEX IF NOT EXISTS idx_onboarding_sound_preference ON public.onboarding_preferences(sound_preference);
CREATE INDEX IF NOT EXISTS idx_onboarding_environment_preference ON public.onboarding_preferences(environment_preference);