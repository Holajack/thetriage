-- Fix subtasks table schema
-- This handles both cases: if the table has 'text' instead of 'title', or if 'title' is missing

-- First, check if we need to rename 'text' column to 'title'
DO $$
BEGIN
    -- Check if 'text' column exists and 'title' doesn't
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subtasks' AND column_name = 'text'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subtasks' AND column_name = 'title'
    ) THEN
        -- Rename 'text' column to 'title'
        ALTER TABLE subtasks RENAME COLUMN text TO title;
        RAISE NOTICE 'Renamed subtasks.text column to subtasks.title';
    END IF;
END $$;

-- Ensure 'title' column exists (in case it's completely missing)
ALTER TABLE subtasks ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '';

-- If we just added title column and there's still a text column, copy data over
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subtasks' AND column_name = 'text'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subtasks' AND column_name = 'title'
    ) THEN
        -- Copy data from text to title if title is empty
        UPDATE subtasks SET title = text WHERE title = '' OR title IS NULL;
        -- Drop the old text column
        ALTER TABLE subtasks DROP COLUMN text;
        RAISE NOTICE 'Copied data from text to title and dropped text column';
    END IF;
END $$;

-- Ensure other required columns exist
ALTER TABLE subtasks ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE;
ALTER TABLE subtasks ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE subtasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Make sure title is NOT NULL
ALTER TABLE subtasks ALTER COLUMN title SET NOT NULL;