-- Add order column to tasks table for proper task ordering
-- This fixes the "null value in column 'order' violates not-null constraint" error

-- Step 1: Add the order column if it doesn't exist (allowing NULL initially)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS "order" INTEGER;

-- Step 2: Update existing tasks with order values based on created_at
UPDATE tasks 
SET "order" = subquery.row_number 
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) as row_number
  FROM tasks 
  WHERE "order" IS NULL
) AS subquery 
WHERE tasks.id = subquery.id;

-- Step 3: Set NOT NULL constraint after populating existing data
ALTER TABLE tasks ALTER COLUMN "order" SET NOT NULL;

-- Step 4: Add a default value for future inserts
ALTER TABLE tasks ALTER COLUMN "order" SET DEFAULT 1;

-- Step 5: Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_order ON tasks(user_id, "order");

-- Set a default value for existing tasks (ordered by created_at)
UPDATE tasks 
SET "order" = row_number() OVER (PARTITION BY user_id ORDER BY created_at)
WHERE "order" IS NULL;

-- Make the order column NOT NULL after setting defaults
ALTER TABLE tasks ALTER COLUMN "order" SET NOT NULL;

-- Add a default value for future inserts
ALTER TABLE tasks ALTER COLUMN "order" SET DEFAULT 1;

-- Create an index for better performance on ordering
CREATE INDEX IF NOT EXISTS idx_tasks_user_order ON tasks(user_id, "order");

-- Update RLS policies to ensure users can only access their own tasks
-- (This should already be in place, but ensuring it's correct)
