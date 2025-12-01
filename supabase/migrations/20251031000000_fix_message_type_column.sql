-- =====================================================
-- FIX MESSAGE_TYPE COLUMN
-- =====================================================
-- Ensures the message_type column exists in the messages table
-- This fixes the schema cache issue where PostgREST can't find the column

-- Add message_type column if it doesn't exist
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text';

-- Drop existing constraint if it exists
ALTER TABLE public.messages
DROP CONSTRAINT IF EXISTS messages_message_type_check;

-- Add constraint to ensure valid message types
ALTER TABLE public.messages
ADD CONSTRAINT messages_message_type_check
CHECK (message_type IN ('text', 'image', 'file'));

-- Ensure all existing messages have a message_type
UPDATE public.messages
SET message_type = 'text'
WHERE message_type IS NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_message_type ON public.messages(message_type);

-- Refresh PostgREST schema cache by sending a NOTIFY signal
NOTIFY pgrst, 'reload schema';
