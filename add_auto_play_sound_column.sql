-- Add auto_play_sound column to onboarding_preferences table if it doesn't exist
ALTER TABLE onboarding_preferences ADD COLUMN IF NOT EXISTS auto_play_sound BOOLEAN DEFAULT false;

-- Update existing records to have auto_play_sound set to true if sound_preference is not 'Silence'
UPDATE onboarding_preferences 
SET auto_play_sound = (sound_preference IS NOT NULL AND sound_preference != 'Silence')
WHERE auto_play_sound IS NULL;