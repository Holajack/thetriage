-- Add auto_dnd_focus column to user_settings table
-- This enables the auto Do Not Disturb feature when starting focus sessions

-- Add the new column with a default value
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS auto_dnd_focus BOOLEAN DEFAULT false;

-- Create an index if this field will be queried frequently
CREATE INDEX IF NOT EXISTS idx_user_settings_auto_dnd_focus ON public.user_settings(auto_dnd_focus);

-- Update existing users to have the default value (false)
UPDATE public.user_settings SET auto_dnd_focus = false WHERE auto_dnd_focus IS NULL;