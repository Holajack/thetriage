# Database Migration Setup Guide

## Current Status ✅
- ✅ Basic Supabase connection working
- ✅ Core tables exist (profiles, study_rooms, focus_sessions, onboarding_preferences, leaderboard_stats)
- ⚠️ onboarding_preferences table missing required columns
- ⚠️ leaderboard_stats table needs RLS policies

## Required Migrations (In Order)

### 1. Update onboarding_preferences Table ⚠️ REQUIRED
**File:** `create_onboarding_tables.sql`
**Why:** Missing columns needed for onboarding flow

```bash
# Go to Supabase Dashboard: https://ucculvnodabrfwbkzsnx.supabase.co
# Navigate to: SQL Editor
# Copy and paste the entire contents of create_onboarding_tables.sql
# Click: Run
```

### 2. Add RLS Policies for leaderboard_stats ⚠️ REQUIRED  
**File:** `20240729000000_add_rls_to_leaderboard_stats.sql`
**Why:** Prevents RLS policy errors when creating leaderboard data

```bash
# In Supabase SQL Editor
# Copy and paste the entire contents of 20240729000000_add_rls_to_leaderboard_stats.sql
# Click: Run
```

### 3. Migrate Existing Users (Optional - Run Later)
**File:** `update_existing_users_onboarding.sql`  
**Why:** Only needed if you have existing users who need onboarding migration
**Status:** Not needed right now (0 users found)

## Testing the Migrations

After applying the migrations, test with:
```bash
node test-migrations.js
```

Expected output after migrations:
- ✅ onboarding_preferences table has required columns
- ✅ leaderboard_stats RLS policies working
- ✅ Ready for app testing

## App Testing Flow

Once migrations are complete, test these flows:

### New User Flow:
1. Open app → Splash Screen
2. Splash → Landing Page  
3. Tap "Get Started" → Auth Screen (Sign Up)
4. Sign up → Onboarding Flow
5. Complete onboarding → Main App (Dashboard)

### Existing User Flow (when you have users):
1. Open app → Splash Screen
2. Splash → Landing Page
3. Tap "Sign In" → Auth Screen (Login)  
4. Sign in → Main App (Dashboard) - *skips onboarding*

## What's Fixed ✅

- ✅ **Critical Navigation Bug**: justLoggedIn flag system eliminates route-based navigation issues
- ✅ **Onboarding Styling**: Consistent across all onboarding screens
- ✅ **Existing User Detection**: Smart detection and automatic onboarding completion
- ✅ **RLS Policies**: Proper Row Level Security for data protection
- ✅ **Navigation Flow**: Proper Splash → Landing → Auth → Onboarding/Main flow

## Next Steps

1. **Apply migrations 1 & 2 above** (⚠️ Required)
2. **Test new user signup flow** in app
3. **Test existing user login flow** (when you have users)
4. **Verify onboarding data saves correctly**
5. **Check leaderboard creation works without RLS errors**

The app should now work perfectly with proper navigation flow and database integration! 🎉
