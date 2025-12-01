# Nora 403 Error - Root Cause and Fix

## Problem Summary
The Nora chat is returning a **403 Forbidden** error because the AI security system migration hasn't been applied to your production database.

## Root Cause
The Edge Function [nora-chat-auth-fix/index.ts](supabase/functions/nora-chat-auth-fix/index.ts:904-922) calls a database function `check_ai_access` to verify:
1. User's subscription tier (free/premium/pro/trial)
2. Daily message limits for Nora AI
3. Rate limiting and cooldown periods

This function doesn't exist yet because the migration file hasn't been applied:
- **Migration file**: `supabase/migrations/20250128000000_ai_security_system.sql`
- **Missing database objects**:
  - `subscription_tiers` table (defines free, premium, pro, trial tiers)
  - `ai_usage_tracking` table (tracks daily usage)
  - `check_ai_access()` function (validates user access)
  - `log_ai_message()` function (logs usage)
  - Subscription columns on `profiles` table

## Fix Options

### Option 1: Apply Migration via Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/ucculvnodabrfwbkzsnx
2. Navigate to **SQL Editor**
3. Open the migration file: `supabase/migrations/20250128000000_ai_security_system.sql`
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click **Run**

### Option 2: Force Apply via CLI

```bash
cd "/Users/jackenholland/App Development/thetriage"

# First, check what migrations are pending
supabase migration list --linked

# Force apply the specific migration
supabase db push --linked --include-all
```

### Option 3: Temporary Workaround (Development Only)

If you need Nora working immediately for testing, you can temporarily bypass the security check by modifying the Edge Function:

**File**: [supabase/functions/nora-chat-auth-fix/index.ts](supabase/functions/nora-chat-auth-fix/index.ts)

Replace lines 904-922 with:

```typescript
// TEMPORARY: Bypass rate limiting for development
const rateLimitResult = {
  allowed: true,
  tier: 'trial',
  reason: '',
  remaining_messages: 100,
  cooldown_seconds: 0
};

console.log('⚠️ DEVELOPMENT MODE: Rate limiting bypassed');
```

**⚠️ Warning**: This is only for development testing. Remove this before production!

## What the Migration Does

### 1. Creates Subscription Tiers Table
Defines 4 tiers with different AI limits:
- **Free**: 5 AI insights/day, No Nora/Patrick
- **Premium**: 50 insights/day, Patrick (30 msg/day), No Nora
- **Pro**: 200 insights/day, Nora (100 msg/day), Patrick (100 msg/day), PDF uploads
- **Trial**: 10 insights/day, Nora (5 msg/day), Patrick (5 msg/day), 14-day trial

### 2. Adds Subscription Columns to Profiles
- `subscription_tier` (default: 'trial')
- `subscription_status`
- `trial_started_at` / `trial_ends_at`
- `subscription_started_at` / `subscription_ends_at`
- `stripe_customer_id` / `stripe_subscription_id`

### 3. Creates Usage Tracking Tables
- `ai_usage_tracking` - Daily message counts per user
- `ai_message_cooldowns` - Rate limiting enforcement

### 4. Creates Security Functions
- `check_ai_access(user_id, ai_type)` - Validates access and limits
- `log_ai_message(user_id, ai_type, tokens, cost)` - Tracks usage

## Verification Steps

After applying the migration, verify it worked:

### 1. Check Tables Exist
```sql
SELECT tablename FROM pg_tables
WHERE tablename IN ('subscription_tiers', 'ai_usage_tracking', 'ai_message_cooldowns');
```

### 2. Check Function Exists
```sql
SELECT proname FROM pg_proc WHERE proname = 'check_ai_access';
```

### 3. Check User Has Subscription Tier
```sql
SELECT id, full_name, subscription_tier, trial_ends_at
FROM profiles
ORDER BY created_at DESC
LIMIT 5;
```

### 4. Test Nora Chat
Try sending a message in the Nora chat. It should now work!

## Expected Behavior After Fix

1. **New users** get a 14-day Pro trial with access to Nora (5 messages/day)
2. **Existing users** without `subscription_tier` are automatically set to 'trial'
3. **Trial users** have access to Nora with limited messages
4. **Rate limiting** enforces daily limits per tier
5. **Usage tracking** logs all AI interactions for analytics

## Files Involved

| File | Purpose |
|------|---------|
| [supabase/migrations/20250128000000_ai_security_system.sql](supabase/migrations/20250128000000_ai_security_system.sql) | Full AI security system migration |
| [supabase/functions/_shared/rateLimiter.ts](supabase/functions/_shared/rateLimiter.ts) | Rate limiting logic |
| [supabase/functions/nora-chat-auth-fix/index.ts](supabase/functions/nora-chat-auth-fix/index.ts) | Nora Edge Function with security checks |
| [src/screens/main/NoraScreen.tsx](src/screens/main/NoraScreen.tsx:416) | Client-side Nora chat interface |
| [src/components/FloatingNoraChatbot.tsx](src/components/FloatingNoraChatbot.tsx:168) | Floating Nora chatbot component |

## Support

If you encounter issues after applying the migration:

1. Check the Supabase logs: Dashboard > Logs > Postgres Logs
2. Check Edge Function logs: Dashboard > Edge Functions > nora-chat-auth-fix > Logs
3. Verify user's subscription_tier is set: Run the verification SQL above
4. Check for RLS policy errors: Dashboard > Database > Policies

## Related Error Messages

If you see these errors, they're all related to this issue:
- `ERROR Nora request error: [Error: Server error: 403]` ← Current error
- `ACCESS_DENIED` in Edge Function logs
- `Rate limit check failed` in console
- `Nora is only available for Pro users` in chat

## Summary

**Issue**: Missing database migration for AI security system
**Impact**: Nora chat returns 403 Forbidden
**Fix**: Apply migration file 20250128000000_ai_security_system.sql
**Time**: 2-5 minutes
**Risk**: Low (migration is idempotent with IF NOT EXISTS checks)
