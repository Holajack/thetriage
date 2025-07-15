-- Fix for nora_chat table RLS policy violations
-- This addresses the RLS issues preventing users from accessing their chat history

-- 1. Enable Row Level Security on nora_chat table
ALTER TABLE public.nora_chat ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can access own chat messages" ON public.nora_chat;
DROP POLICY IF EXISTS "Users can insert own chat messages" ON public.nora_chat;
DROP POLICY IF EXISTS "Users can update own chat messages" ON public.nora_chat;
DROP POLICY IF EXISTS "Users can delete own chat messages" ON public.nora_chat;
DROP POLICY IF EXISTS "Service role can access all chat messages" ON public.nora_chat;

-- 3. Create comprehensive RLS policies for nora_chat
-- Allow users to select their own chat messages
CREATE POLICY "Users can select own chat messages" ON public.nora_chat
    FOR SELECT USING (auth.uid() = user_id);

-- Allow users to insert their own chat messages
CREATE POLICY "Users can insert own chat messages" ON public.nora_chat
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own chat messages
CREATE POLICY "Users can update own chat messages" ON public.nora_chat
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own chat messages
CREATE POLICY "Users can delete own chat messages" ON public.nora_chat
    FOR DELETE USING (auth.uid() = user_id);

-- Service role can access all data (for admin operations and edge functions)
CREATE POLICY "Service role can access all chat messages" ON public.nora_chat
    FOR ALL USING (auth.role() = 'service_role');

-- 4. Grant necessary permissions
GRANT ALL ON public.nora_chat TO authenticated;
GRANT ALL ON public.nora_chat TO service_role;

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_nora_chat_user_id ON public.nora_chat(user_id);
CREATE INDEX IF NOT EXISTS idx_nora_chat_timestamp ON public.nora_chat(timestamp);
CREATE INDEX IF NOT EXISTS idx_nora_chat_sender ON public.nora_chat(sender);

-- 6. Ensure the table exists with proper structure
CREATE TABLE IF NOT EXISTS public.nora_chat (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    sender TEXT NOT NULL CHECK (sender IN ('user', 'nora')),
    timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Add updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_nora_chat_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 8. Add updated_at trigger
DROP TRIGGER IF EXISTS update_nora_chat_updated_at ON public.nora_chat;
CREATE TRIGGER update_nora_chat_updated_at 
    BEFORE UPDATE ON public.nora_chat 
    FOR EACH ROW EXECUTE FUNCTION update_nora_chat_updated_at();