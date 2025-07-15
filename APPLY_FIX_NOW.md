# 🚨 IMMEDIATE FIX REQUIRED - APPLY THIS NOW!

## The app is currently broken with these errors:
```
❌ Could not find the 'avatar_url' column of 'onboarding_preferences'
❌ Could not find the 'allow_direct_messages' column of 'onboarding_preferences' 
❌ new row violates row-level security policy for table "onboarding_preferences"
```

## QUICKEST SOLUTION - SUPABASE DASHBOARD (DO THIS RIGHT NOW):

### Step 1: Open Supabase Dashboard
1. Go to: https://app.supabase.com/project/ucculvnodabrfwbkzsnx
2. Click on "SQL Editor" in the left sidebar

### Step 2: Paste and Run This SQL
Copy this ENTIRE block and paste it into the SQL Editor:

```sql
-- URGENT FIX for immediate database errors
-- Add the missing columns that are causing immediate errors
ALTER TABLE public.onboarding_preferences ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.onboarding_preferences ADD COLUMN IF NOT EXISTS allow_direct_messages BOOLEAN DEFAULT true;

-- Enable Row Level Security if not already enabled
ALTER TABLE public.onboarding_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them properly (ignore if they don't exist)
DROP POLICY IF EXISTS "Users can access own onboarding data" ON public.onboarding_preferences;
DROP POLICY IF EXISTS "Users can insert own onboarding data" ON public.onboarding_preferences;
DROP POLICY IF EXISTS "Users can update own onboarding data" ON public.onboarding_preferences;
DROP POLICY IF EXISTS "Users can select own onboarding data" ON public.onboarding_preferences;

-- Create minimal RLS policies to fix immediate access issues
CREATE POLICY "Users can select own onboarding data" ON public.onboarding_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding data" ON public.onboarding_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding data" ON public.onboarding_preferences
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Allow service role to bypass RLS for system operations
CREATE POLICY "Service role can access all onboarding data" ON public.onboarding_preferences
    FOR ALL USING (auth.role() = 'service_role');

-- Grant necessary permissions
GRANT ALL ON public.onboarding_preferences TO authenticated;
GRANT ALL ON public.onboarding_preferences TO service_role;
```

### Step 3: Click RUN
- Click the "RUN" button or press Ctrl+Enter
- Wait for the query to complete
- You should see "Success. No rows returned" or similar

### Step 4: Test Immediately
1. Try creating a new user account in your app
2. Go through the onboarding process
3. Check the console - the errors should be gone

## What This Does:
✅ Adds the missing `avatar_url` column
✅ Adds the missing `allow_direct_messages` column  
✅ Fixes RLS policies so users can access their data
✅ Grants proper permissions

## Expected Result:
- ✅ Sign up works without column errors
- ✅ Onboarding completes successfully
- ✅ Privacy settings save correctly
- ✅ No more database errors in console

**THIS IS BLOCKING THE APP - APPLY IMMEDIATELY!** 🚨

---

*After this urgent fix works, we can apply the comprehensive fixes later.*