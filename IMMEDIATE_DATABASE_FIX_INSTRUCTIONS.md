# 🚨 IMMEDIATE DATABASE FIX REQUIRED

## Critical Errors Currently Occurring:
```
❌ Could not find the 'avatar_url' column of 'onboarding_preferences'
❌ Could not find the 'allow_direct_messages' column of 'onboarding_preferences' 
❌ new row violates row-level security policy for table "onboarding_preferences"
```

## URGENT ACTION REQUIRED

### Option 1: Supabase Dashboard (FASTEST - DO THIS NOW)

1. **Go to Supabase Dashboard**: https://app.supabase.com
2. **Navigate to your project**: `ucculvnodabrfwbkzsnx` (The Full Triage System)
3. **Go to SQL Editor**
4. **Copy and paste this URGENT fix** (from `URGENT_DATABASE_FIX.sql`):

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

5. **Click RUN** and verify it executes without errors

### Option 2: Supabase CLI (If you have access)

```bash
# Connect to your remote database
supabase link --project-ref ucculvnodabrfwbkzsnx

# Apply the urgent fix
supabase db reset --migrations-path URGENT_DATABASE_FIX.sql
```

## What This Fix Does:

✅ **Adds missing `avatar_url` column** - Stops the schema cache error
✅ **Adds missing `allow_direct_messages` column** - Stops the schema cache error  
✅ **Fixes RLS policies** - Allows users to access their own data
✅ **Grants proper permissions** - Ensures authenticated users can read/write

## Immediate Benefits After Fix:

- ✅ Sign up process will work without column errors
- ✅ Onboarding flow will complete successfully  
- ✅ Privacy settings will save correctly
- ✅ Users can access their onboarding preferences

## Timeline: APPLY IMMEDIATELY

This fix should be applied **RIGHT NOW** to stop the blocking errors. It's a minimal, safe fix that only adds missing columns and fixes permissions.

## After This Urgent Fix:

Once the immediate errors are resolved, apply the comprehensive fixes:
1. `fix_onboarding_schema_complete.sql` - Full schema update
2. `fix_nora_chat_rls.sql` - Nora chat fixes

## Verification:

After applying the urgent fix, test:
1. Create a new user account
2. Complete onboarding
3. Check console for errors - should be resolved

**STATUS: 🚨 BLOCKING ERRORS - IMMEDIATE ACTION REQUIRED**