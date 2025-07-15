-- Fix sign up trigger to match existing profiles table structure
-- This creates profiles records with all default values matching your existing schema

-- Create or replace function to handle new user sign up
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
    
    -- Create onboarding preferences record (if table exists)
    INSERT INTO public.onboarding_preferences (user_id, is_onboarding_complete, weekly_focus_goal)
    VALUES (NEW.id, false, 5)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_onboarding ON auth.users;

-- Create new trigger for user sign up
CREATE TRIGGER on_auth_user_created_profiles
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_signup();

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.handle_new_user_signup() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user_signup() TO authenticated;