# RevenueCat Payment Integration

## Goal
Integrate RevenueCat for subscription management in HikeWise, handling both iOS and Android in-app purchases with automatic sync to Supabase.

## Prerequisites

### 1. RevenueCat Account Setup
1. Create account at [RevenueCat Dashboard](https://app.revenuecat.com)
2. Create new project named "HikeWise"
3. Note the public API keys for iOS and Android

### 2. App Store Connect (iOS)
1. Go to App Store Connect > My Apps > HikeWise
2. Navigate to Features > In-App Purchases
3. Create subscription products:
   - `hikewise_premium_monthly` - $4.99/month
   - `hikewise_pro_monthly` - $14.99/month
   - `hikewise_premium_yearly` - $39.99/year (optional)
   - `hikewise_pro_yearly` - $119.99/year (optional)
4. Create subscription group: "HikeWise Subscriptions"
5. Configure App Store Server Notifications URL (from RevenueCat)

### 3. Google Play Console (Android)
1. Go to Play Console > HikeWise > Monetization > Subscriptions
2. Create subscription products with same IDs:
   - `hikewise_premium_monthly`
   - `hikewise_pro_monthly`
3. Configure base plans and pricing
4. Add RevenueCat service account for server-to-server validation

### 4. RevenueCat Configuration
1. Add iOS app with bundle ID: `com.hikewise.app`
2. Add Android app with package name: `com.hikewise.app`
3. Connect to App Store Connect (upload API key)
4. Connect to Google Play (upload service account JSON)
5. Create entitlements:
   - `premium` - grants premium features
   - `pro` - grants pro features (includes premium)
6. Create products matching store product IDs
7. Create offering named "default" with packages

## Installation

```bash
npm install react-native-purchases
```

For Expo, run prebuild if using bare workflow:
```bash
npx expo prebuild
```

## Environment Variables

Add to `.env`:
```bash
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxxxx
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxxxx
```

Add to GitHub secrets for CI/CD:
- `REVENUECAT_API_KEY_IOS`
- `REVENUECAT_API_KEY_ANDROID`

## Implementation Files

### Service Layer
- `src/services/revenuecat.ts` - Core RevenueCat integration

### UI Components
- `src/screens/main/SubscriptionScreen.tsx` - Update with real purchase flow

### Backend
- `supabase/functions/revenuecat-webhook/` - Webhook handler for subscription events

## Integration Points

### App Initialization
In `App.tsx` or main entry point:
```typescript
import { initRevenueCat, identifyUser } from './src/services/revenuecat';

// After user authentication
useEffect(() => {
  if (user) {
    initRevenueCat(user.id);
  }
}, [user]);
```

### Auth Context Integration
In `AuthContext.tsx`:
```typescript
import { identifyUser, logOutRevenueCat } from '../services/revenuecat';

// On sign in
const signIn = async (...) => {
  // ... existing auth logic
  await identifyUser(user.id);
};

// On sign out
const signOut = async () => {
  await logOutRevenueCat();
  // ... existing sign out logic
};
```

## Subscription Tiers

| Tier | Price | Features | Entitlement |
|------|-------|----------|-------------|
| Free | $0 | Basic timer, 5 AI insights/day | none |
| Premium | $4.99/mo | Unlimited AI, soundscapes, calendar | `premium` |
| Pro | $14.99/mo | AI study plans, brain mapping, analytics | `pro` |

## Testing

### Sandbox Testing (iOS)
1. Create sandbox tester in App Store Connect
2. Sign out of App Store on device
3. Sign in with sandbox account when prompted during purchase

### Test Environment (Android)
1. Add test account in Play Console > License testing
2. Use test card numbers for purchases

### RevenueCat Sandbox
1. Enable sandbox mode in RevenueCat dashboard
2. Purchases made in sandbox appear in RevenueCat dashboard
3. Subscriptions can be cancelled/refunded for testing

## Webhook Setup

### Supabase Edge Function
Create `supabase/functions/revenuecat-webhook/index.ts`:
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const signature = req.headers.get('Authorization');
  // Verify webhook signature...

  const event = await req.json();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const userId = event.app_user_id;
  const entitlements = event.subscriber?.entitlements || {};

  let tier = 'free';
  if (entitlements.pro?.is_active) tier = 'pro';
  else if (entitlements.premium?.is_active) tier = 'premium';

  await supabase
    .from('profiles')
    .update({ subscription_tier: tier })
    .eq('id', userId);

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

### RevenueCat Webhook Configuration
1. Go to RevenueCat > Project > Integrations > Webhooks
2. Add webhook URL: `https://ucculvnodabrfwbkzsnx.supabase.co/functions/v1/revenuecat-webhook`
3. Select events: All subscriber events
4. Note the authorization header for verification

## Error Handling

### Common Errors

**"Product not found"**
- Verify product IDs match exactly between stores and RevenueCat
- Ensure products are approved in stores

**"User not identified"**
- Call `identifyUser(userId)` after authentication
- Check RevenueCat dashboard for anonymous users

**"Purchase failed - network"**
- Implement retry logic with exponential backoff
- Show user-friendly error message

**"Already subscribed"**
- Check current entitlements before showing purchase UI
- Offer subscription management instead

## Monitoring

### RevenueCat Dashboard
- Active subscribers count
- MRR (Monthly Recurring Revenue)
- Churn rate
- Trial conversion rate

### Metrics to Track
- Conversion rate: free → paid
- Upgrade rate: premium → pro
- Retention rate at 30/60/90 days
- Revenue per user

## Rollout Plan

### Phase 1: Internal Testing
1. Deploy with sandbox credentials
2. Test all purchase flows with team
3. Verify Supabase sync works

### Phase 2: Beta Testing
1. Enable for TestFlight/Internal Testing users
2. Monitor for issues
3. Gather feedback on pricing/features

### Phase 3: Production
1. Switch to production API keys
2. Submit app update to stores
3. Monitor dashboard for first purchases
4. Set up alerts for failed purchases

## Related Files
- `src/services/revenuecat.ts` - Service implementation
- `src/screens/main/SubscriptionScreen.tsx` - Purchase UI
- `src/context/AuthContext.tsx` - Auth integration
- `supabase/migrations/` - Database schema for subscription_tiers
