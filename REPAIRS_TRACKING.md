# Hike Wise - Repairs Tracking

> Comprehensive audit findings and repair tracking for the Hike Wise mobile app.
> Last Updated: December 3, 2025

---

## Priority Legend
- **CRITICAL**: App-breaking, security issues, or major functionality failures
- **HIGH**: Significant UX issues or broken features
- **MEDIUM**: Visual inconsistencies, minor bugs, code quality
- **LOW**: Enhancements, optimizations, code cleanup

---

## 1. Navigation & Screen Name Errors

### CRITICAL - Screen Name Mismatches

| Location | Issue | Status |
|----------|-------|--------|
| ProfileScreen.tsx | Navigates to `'Subscription'` but MainNavigator defines `'SubscriptionScreen'` | [ ] |
| ProfileScreen.tsx | Navigates to `'ProTrekker'` but MainNavigator defines `'ProTrekkerScreen'` | [ ] |
| MainNavigator.tsx | `name="SubscriptionScreen"` inconsistent with navigation calls | [ ] |
| MainNavigator.tsx | `name="ProTrekkerScreen"` inconsistent with navigation calls | [ ] |
| SettingsScreen.tsx | May reference incorrect screen names | [ ] |
| Various Screens | Navigation type safety not enforced | [ ] |

### Recommended Fix
Standardize all screen names to match `MainNavigator.tsx` definitions exactly, or update MainNavigator to use shortened names consistently.

---

## 2. Non-Functional Features

### CRITICAL - Placeholder/Broken Code

| Screen | Feature | Issue | Status |
|--------|---------|-------|--------|
| SubscriptionScreen.tsx | Purchase Flow | `handlePurchase()` is placeholder - logs but doesn't process | [ ] |
| ProTrekkerScreen.tsx | Terms of Service | Links to placeholder/non-existent URLs | [ ] |
| ProTrekkerScreen.tsx | Privacy Policy | Links to placeholder/non-existent URLs | [ ] |
| ProfileScreen.tsx | Trail Buddy | Button exists but feature not implemented | [ ] |
| CommunityScreen.tsx | Share Button | May not function correctly | [ ] |
| SelfDiscoveryQuizScreen.tsx | Progress Saving | No persistence implemented | [ ] |

### HIGH - Incomplete Implementations

| Screen | Feature | Issue | Status |
|--------|---------|-------|--------|
| NoraScreenNew.tsx | AI Chat | Verify Supabase function integration works | [ ] |
| LeaderboardScreen.tsx | Real-time Updates | Check if live sync is functional | [ ] |
| ActivityScreen.tsx | Activity Logging | Verify data persistence | [ ] |

---

## 3. Dark Mode / Theme Issues

### CRITICAL - Hardcoded Colors

| File | Approximate Count | Status |
|------|-------------------|--------|
| CommunityScreen.tsx | 43+ hardcoded colors | [ ] |
| SelfDiscoveryQuizScreen.tsx | 16+ hardcoded colors | [ ] |
| ActivityScreen.tsx | 12+ hardcoded colors | [ ] |
| SubscriptionScreen.tsx | 10+ hardcoded colors | [ ] |
| ProTrekkerScreen.tsx | 8+ hardcoded colors | [ ] |
| OnboardingScreen.tsx | Multiple hardcoded colors | [ ] |
| LoginScreen.tsx | Multiple hardcoded colors | [ ] |
| SignUpScreen.tsx | Multiple hardcoded colors | [ ] |

### HIGH - Style Cascade Issues

| File | Issue | Status |
|------|-------|--------|
| ProfileScreen.tsx | Cards showing wrong colors due to style order | [x] Fixed |
| ProfileScreen.tsx | Change buttons showing off-white in dark mode | [x] Fixed |
| ProfileScreen.tsx | Partner icon background not respecting theme | [x] Fixed |

### Common Hardcoded Colors to Replace

```
#FFFFFF → theme.card or theme.surface
#000000 → theme.text
#E3F2FD → isDark ? theme.primary + '20' : '#E3F2FD'
#F5F5F5 → theme.background or theme.surface2
#666666 → theme.textSecondary
```

---

## 4. Page Transition Animations

### Completed Fixes

| Screen | Status |
|--------|--------|
| LeaderboardScreen.tsx | [x] Added Animated.ScrollView with focusKey |
| NoraScreenNew.tsx | [x] Added useFocusAnimationKey hook |

### Screens to Verify

| Screen | Has Animation? | Status |
|--------|----------------|--------|
| HomeScreen.tsx | Verify | [ ] |
| ProfileScreen.tsx | Verify | [ ] |
| ActivityScreen.tsx | Verify | [ ] |
| CommunityScreen.tsx | Verify | [ ] |
| SettingsScreen.tsx | Verify | [ ] |
| SubscriptionScreen.tsx | Verify | [ ] |

---

## 5. Security Issues

### CRITICAL

| Issue | Location | Status |
|-------|----------|--------|
| Hardcoded API Keys | Various source files | [ ] |
| API Keys in Client Code | Check for exposed secrets | [ ] |
| Supabase Keys | Verify proper env handling | [ ] |

### Recommended Actions
1. Move all API keys to environment variables
2. Use `.env` file properly with react-native-dotenv
3. Audit all imports for exposed credentials
4. Check Supabase RLS policies

---

## 6. Supabase / Database Issues

### CRITICAL - Schema Inconsistencies

| Issue | Description | Status |
|-------|-------------|--------|
| Fallback Chains | Multiple fallback field names for same data | [ ] |
| Type Mismatches | TypeScript types may not match DB schema | [ ] |
| RLS Policies | Verify row-level security is configured | [ ] |

### HIGH - Data Handling

| Issue | Description | Status |
|-------|-------------|--------|
| useNora.ts | `.single()` calls may throw on empty results | [ ] |
| useLeaderboard.ts | Error handling needs improvement | [ ] |
| useCommunity.ts | Missing loading states | [ ] |

### Fallback Chain Issues

```typescript
// Example of problematic fallback chains found:
const username = profile.display_name || profile.displayName || profile.username || 'Unknown';
```

This indicates database schema inconsistency. Should standardize to single field names.

---

## 7. Context Provider Issues

### CRITICAL - Memory Leaks

| Context | Issue | Status |
|---------|-------|--------|
| AuthContext.tsx | Subscriptions may not cleanup properly | [ ] |
| NotificationContext.tsx | Event listeners not removed | [ ] |
| LocationContext.tsx | Background tracking not stopped | [ ] |

### HIGH - State Management

| Context | Issue | Status |
|---------|-------|--------|
| AuthContext.tsx | Network retry logic added but needs testing | [ ] |
| ThemeContext.tsx | Working correctly | [x] |
| Multiple Contexts | Prop drilling could be optimized | [ ] |

---

## 8. Utility / Helper Issues

### CRITICAL

| File | Issue | Status |
|------|-------|--------|
| supabase.ts | Force cloud config implemented | [x] |
| Various Utils | Missing error boundaries | [ ] |
| API Helpers | Inconsistent error handling | [ ] |

### MEDIUM - Code Quality

| Issue | Description | Status |
|-------|-------------|--------|
| Console Logs | Remove debug logs for production | [ ] |
| TypeScript Any | Reduce usage of 'any' type | [ ] |
| Unused Imports | Clean up unused dependencies | [ ] |

---

## 9. Branding Updates

### App Name: "Hike Wise"

| Location | Current | Target | Status |
|----------|---------|--------|--------|
| SplashScreen.tsx | "HikeWise" | "Hike Wise" | [x] Fixed |
| LandingPage.tsx | "HikeWise" | "Hike Wise" | [x] Fixed |
| UnifiedHeader.tsx | "Traveller" default | "Hiker" or remove | [ ] |
| app.json | "HikeWise" | Already correct | [x] |
| package.json | "hikewise" | Already correct | [x] |
| iOS Info.plist | "HikeWise" | Already correct | [x] |
| Android strings.xml | "HikeWise" | Already correct | [x] |
| android/settings.gradle | "Triage System" | "HikeWise" | [x] Fixed |
| README.md | "Triage System" | "Hike Wise" | [x] Fixed |

---

## 10. Component Issues

### MEDIUM

| Component | Issue | Status |
|-----------|-------|--------|
| LiquidGlass.tsx | Working correctly | [x] |
| IconComponents.tsx | Icons standardized | [x] |
| Various Cards | May need theme integration | [ ] |

### LOW - Enhancements

| Component | Enhancement | Status |
|-----------|-------------|--------|
| Loading States | Add skeleton loaders | [ ] |
| Error States | Add error boundary components | [ ] |
| Empty States | Improve empty data displays | [ ] |

---

## Repair Progress Summary

| Category | Critical | High | Medium | Low | Completed |
|----------|----------|------|--------|-----|-----------|
| Navigation | 6 | 0 | 0 | 0 | 0 |
| Features | 6 | 3 | 0 | 0 | 0 |
| Dark Mode | 8 | 3 | 0 | 0 | 3 |
| Animations | 0 | 0 | 6 | 0 | 2 |
| Security | 3 | 0 | 0 | 0 | 0 |
| Database | 3 | 3 | 0 | 0 | 0 |
| Context | 3 | 2 | 0 | 0 | 1 |
| Utilities | 1 | 0 | 3 | 0 | 1 |
| Branding | 0 | 6 | 0 | 0 | 6 |
| Components | 0 | 0 | 3 | 3 | 2 |
| **TOTAL** | **30** | **17** | **12** | **3** | **15** |

---

## Quick Win List (Easy Fixes)

1. [ ] Fix navigation screen names (search & replace)
2. [x] Update app branding to "Hike Wise" - COMPLETED
3. [ ] Add page transition animations to remaining screens
4. [ ] Replace hardcoded `#FFFFFF` with `theme.card`
5. [ ] Replace hardcoded `#000000` with `theme.text`
6. [ ] Move API keys to environment variables
7. [ ] Remove console.log statements for production

---

## Next Sprint Priorities

### Sprint 1 - Critical Fixes
1. Fix all navigation screen name errors
2. Implement SubscriptionScreen purchase flow
3. Add proper Terms/Privacy Policy URLs
4. Secure API keys

### Sprint 2 - Theme Consistency
1. Fix CommunityScreen hardcoded colors (43+)
2. Fix SelfDiscoveryQuizScreen hardcoded colors (16+)
3. Standardize remaining screens

### Sprint 3 - Polish
1. Add remaining page transition animations
2. Implement skeleton loaders
3. Add error boundaries
4. Production cleanup (remove logs, fix types)

---

## Notes

- Always test changes in both light and dark mode
- Use `isDark` from `useTheme()` for conditional styling
- Style array order matters - later styles override earlier ones
- `glassStyles.subtleCard(isDark)` sets backgroundColor, place theme.card AFTER it

---

*Document maintained by development team. Update status checkboxes as repairs are completed.*
