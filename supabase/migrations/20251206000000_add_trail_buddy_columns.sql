-- Add trail buddy columns to profiles table
-- These store the user's selected trail buddy type and custom name

-- Add trail_buddy_type column (stores the buddy id: fox, bear, deer, nora, wolf)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS trail_buddy_type TEXT;

-- Add trail_buddy_name column (stores the user's custom name for their buddy)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS trail_buddy_name TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.trail_buddy_type IS 'The type of trail buddy selected (fox, bear, deer, nora, wolf)';
COMMENT ON COLUMN public.profiles.trail_buddy_name IS 'Custom name given to the trail buddy by the user';

-- Reload schema cache to ensure new columns are recognized
NOTIFY pgrst, 'reload schema';
