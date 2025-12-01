-- Add accessibility settings columns to user_settings table
-- These columns control accessibility features throughout the app

ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS tts_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS high_contrast BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reduce_motion BOOLEAN DEFAULT false;

-- Add helpful comments
COMMENT ON COLUMN public.user_settings.tts_enabled IS 'Enable text-to-speech for notifications and important messages';
COMMENT ON COLUMN public.user_settings.high_contrast IS 'Enable high contrast mode for better visibility';
COMMENT ON COLUMN public.user_settings.reduce_motion IS 'Minimize animations and transitions for users sensitive to motion';

-- Verify the columns were added
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_settings'
        AND column_name = 'tts_enabled'
    ) THEN
        RAISE NOTICE '✅ Column user_settings.tts_enabled exists';
    ELSE
        RAISE WARNING '❌ Column user_settings.tts_enabled is missing';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_settings'
        AND column_name = 'high_contrast'
    ) THEN
        RAISE NOTICE '✅ Column user_settings.high_contrast exists';
    ELSE
        RAISE WARNING '❌ Column user_settings.high_contrast is missing';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_settings'
        AND column_name = 'reduce_motion'
    ) THEN
        RAISE NOTICE '✅ Column user_settings.reduce_motion exists';
    ELSE
        RAISE WARNING '❌ Column user_settings.reduce_motion is missing';
    END IF;
END $$;
