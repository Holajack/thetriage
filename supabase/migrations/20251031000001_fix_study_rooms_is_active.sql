-- =====================================================
-- FIX STUDY_ROOMS IS_ACTIVE COLUMN
-- =====================================================
-- Ensures the is_active column exists in study_rooms table
-- This fixes the schema cache issue where PostgREST can't find the column

-- Add is_active column to study_rooms if it doesn't exist
ALTER TABLE public.study_rooms
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Ensure all existing study rooms have is_active set
UPDATE public.study_rooms
SET is_active = true
WHERE is_active IS NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_study_rooms_is_active ON public.study_rooms(is_active);

-- Refresh PostgREST schema cache by sending a NOTIFY signal
NOTIFY pgrst, 'reload schema';
