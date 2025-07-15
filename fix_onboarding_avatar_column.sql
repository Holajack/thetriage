-- Fix onboarding_preferences table avatar_url column error
-- Add missing avatar_url column to onboarding_preferences table

-- Add avatar_url column if it doesn't exist
ALTER TABLE public.onboarding_preferences ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add bio column if it doesn't exist
ALTER TABLE public.onboarding_preferences ADD COLUMN IF NOT EXISTS bio TEXT;

-- Update the handle_new_user_signup function to not include avatar_url in onboarding_preferences
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
    
    -- Create leaderboard stats record (if table exists)
    INSERT INTO public.leaderboard_stats (user_id, total_focus_time, level, points, current_streak)
    VALUES (NEW.id, 0, 1, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Create onboarding preferences record (without avatar_url to avoid column errors)
    INSERT INTO public.onboarding_preferences (user_id, is_onboarding_complete, weekly_focus_goal)
    VALUES (NEW.id, false, 5)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;