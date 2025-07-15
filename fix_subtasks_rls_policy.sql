-- Fix subtasks RLS policy to ensure users can insert/update subtasks for their own tasks

-- First, drop the existing policy if it exists
DROP POLICY IF EXISTS "Users can access own subtasks" ON subtasks;

-- Create a comprehensive policy that allows all operations for subtasks
-- belonging to tasks owned by the authenticated user
CREATE POLICY "Users can manage own subtasks" ON subtasks FOR ALL USING (
    EXISTS (
        SELECT 1 FROM tasks 
        WHERE tasks.id = subtasks.task_id 
        AND tasks.user_id = auth.uid()
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM tasks 
        WHERE tasks.id = subtasks.task_id 
        AND tasks.user_id = auth.uid()
    )
);

-- Ensure RLS is enabled on subtasks table
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON subtasks TO authenticated;
GRANT ALL ON subtasks TO service_role;

-- Also ensure the tasks table has proper permissions
GRANT ALL ON tasks TO authenticated;
GRANT ALL ON tasks TO service_role;

-- Check if tasks RLS policy exists, if not create it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'tasks' 
        AND policyname = 'Users can access own tasks'
    ) THEN
        CREATE POLICY "Users can access own tasks" ON tasks FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;