-- Add notification-related columns to user_settings and profiles tables
-- This migration adds support for daily reminders and session end notifications

-- First, ensure user_settings table exists
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notifications_enabled BOOLEAN DEFAULT true,
    auto_play_sound BOOLEAN DEFAULT false,
    sound_enabled BOOLEAN DEFAULT true,
    music_volume DECIMAL(3,2) DEFAULT 0.5,
    auto_start_focus BOOLEAN DEFAULT false,
    auto_dnd_focus BOOLEAN DEFAULT false,
    tts_enabled BOOLEAN DEFAULT false,
    high_contrast BOOLEAN DEFAULT false,
    reduce_motion BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id)
);

-- Add notification columns to user_settings
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS daily_reminder TEXT DEFAULT '08:00',
ADD COLUMN IF NOT EXISTS session_end_reminder BOOLEAN DEFAULT true;

-- Add notification columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS daily_reminder TEXT DEFAULT '08:00';

-- Enable RLS on user_settings
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can select own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Service role can access all settings" ON public.user_settings;

-- Create RLS policies for user_settings
CREATE POLICY "Users can select own settings" ON public.user_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON public.user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON public.user_settings
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can access all settings" ON public.user_settings
    FOR ALL USING (auth.role() = 'service_role');

-- Grant necessary permissions
GRANT ALL ON public.user_settings TO authenticated;
GRANT ALL ON public.user_settings TO service_role;

-- Add helpful comment
COMMENT ON COLUMN public.user_settings.daily_reminder IS 'Daily study reminder time in HH:MM format (24-hour)';
COMMENT ON COLUMN public.user_settings.session_end_reminder IS 'Whether to show notification 2 minutes before session ends';
COMMENT ON COLUMN public.profiles.daily_reminder IS 'Daily study reminder time in HH:MM format (24-hour) - backup storage';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
