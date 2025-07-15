-- Quick RLS fix for subtasks - ensure users can manage their own subtasks

-- Temporarily disable RLS to fix the issue
ALTER TABLE subtasks DISABLE ROW LEVEL SECURITY;

-- Re-enable with proper policy
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;

-- Drop existing policy
DROP POLICY IF EXISTS "Users can access own subtasks" ON subtasks;
DROP POLICY IF EXISTS "Users can manage own subtasks" ON subtasks;

-- Create simple but effective policy
CREATE POLICY "subtasks_policy" ON subtasks FOR ALL TO authenticated USING (
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

-- Ensure proper permissions
GRANT ALL ON subtasks TO authenticated;
GRANT ALL ON tasks TO authenticated;