# Database Fixes Deployment Guide

## Overview
This guide provides step-by-step instructions for applying the database schema fixes and RLS policy updates to resolve the onboarding and Nora chat issues.

## Files to Apply
1. `fix_onboarding_schema_complete.sql` - Comprehensive onboarding schema and RLS fixes
2. `fix_nora_chat_rls.sql` - Nora chat table RLS policy fixes

## Deployment Steps

### Method 1: Supabase Dashboard (Recommended)

1. **Log into Supabase Dashboard**
   - Go to [https://app.supabase.com](https://app.supabase.com)
   - Navigate to your project

2. **Apply Onboarding Schema Fixes**
   - Go to SQL Editor
   - Copy and paste the contents of `fix_onboarding_schema_complete.sql`
   - Run the query
   - Verify no errors in the output

3. **Apply Nora Chat RLS Fixes**
   - In the same SQL Editor
   - Copy and paste the contents of `fix_nora_chat_rls.sql`
   - Run the query
   - Verify no errors in the output

### Method 2: Supabase CLI

1. **Start Local Development (if using local)**
   ```bash
   supabase start
   ```

2. **Apply Migrations**
   ```bash
   # Apply onboarding schema fixes
   supabase db reset --migrations-path fix_onboarding_schema_complete.sql
   
   # Apply nora chat fixes
   supabase db reset --migrations-path fix_nora_chat_rls.sql
   ```

3. **Push to Production**
   ```bash
   supabase db push
   ```

## What These Fixes Address

### Onboarding Schema Fixes (`fix_onboarding_schema_complete.sql`)
- ✅ Adds missing `bio` column
- ✅ Adds missing `allow_direct_messages` column  
- ✅ Adds comprehensive privacy settings columns
- ✅ Fixes RLS policies for user access
- ✅ Updates user signup trigger with complete column set
- ✅ Adds proper indexes for performance

### Nora Chat RLS Fixes (`fix_nora_chat_rls.sql`)
- ✅ Enables Row Level Security on nora_chat table
- ✅ Creates proper RLS policies for user access
- ✅ Allows service role access for edge functions
- ✅ Adds performance indexes
- ✅ Ensures proper table structure

## Expected Results After Deployment

1. **Sign Up Process**
   - No more "Could not find the 'bio' column" errors
   - No more "Could not find the 'allow_direct_messages' column" errors
   - No more RLS policy violations during user creation

2. **Nora Chat**
   - Users can access their chat history without RLS errors
   - Chat messages save properly
   - Edge functions can access chat data

3. **Privacy Settings**
   - All privacy settings save correctly
   - No database column errors in PrivacySettingsScreen

## Verification Steps

After applying the fixes, test the following:

1. **Test Sign Up Flow**
   - Create a new user account
   - Complete all onboarding steps
   - Verify no database errors in console

2. **Test Nora Chat**
   - Navigate to Nora screen
   - Send a message
   - Verify message appears and saves
   - Check that chat history loads

3. **Test Privacy Settings**
   - Navigate to Privacy Settings during onboarding
   - Toggle various settings
   - Verify settings save without errors

## Error Monitoring

Monitor the following for success:
- No "Could not find column" errors
- No "RLS policy violation" errors
- No "Database error saving new user" errors
- Successful onboarding completion

## Rollback Plan

If issues occur, the fixes can be rolled back by:
1. Reverting the RLS policies
2. Removing the added columns (if safe)
3. Restoring the original trigger functions

## Files Modified/Created

- ✅ `fix_onboarding_schema_complete.sql` - Database schema fixes
- ✅ `fix_nora_chat_rls.sql` - RLS policy fixes  
- ✅ `NoraOnboarding.tsx` - New interactive onboarding component
- ✅ `NoraScreen.tsx` - Integrated onboarding component
- ✅ Various onboarding screens updated for compatibility

## Support

If you encounter issues:
1. Check the Supabase logs for specific error messages
2. Verify all columns exist in the database
3. Check that RLS policies are properly applied
4. Ensure the signup trigger is functioning correctly

## Next Steps

After successful deployment:
1. Test the complete user flow end-to-end
2. Monitor for any remaining issues
3. Consider enabling the NoraOnboarding component for new users
4. Verify all privacy settings are working correctly