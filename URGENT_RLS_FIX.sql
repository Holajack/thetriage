-- URGENT: Fix subtasks RLS policy that's blocking creation
-- Run this in your Supabase SQL editor immediately

-- Step 1: Temporarily disable RLS to clear the blockage
ALTER TABLE subtasks DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop all existing policies
DROP POLICY IF EXISTS "Users can access own subtasks" ON subtasks;
DROP POLICY IF EXISTS "Users can manage own subtasks" ON subtasks;
DROP POLICY IF EXISTS "subtasks_policy" ON subtasks;

-- Step 3: Re-enable RLS
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;

-- Step 4: Create a working policy that allows legitimate operations
CREATE POLICY "allow_subtask_operations" ON subtasks
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM tasks 
        WHERE tasks.id = subtasks.task_id 
        AND tasks.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM tasks 
        WHERE tasks.id = subtasks.task_id 
        AND tasks.user_id = auth.uid()
    )
);

-- Step 5: Ensure proper table permissions
GRANT ALL ON subtasks TO authenticated;
GRANT ALL ON tasks TO authenticated;

-- Step 6: Grant usage on sequences if they exist
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;