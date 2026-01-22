# Supabase → Convex + Clerk Migration Plan

## Overview

**Current Stack:** Supabase (Auth + Database + Real-time + Edge Functions)
**Target Stack:** Clerk (Auth) + Convex (Database + Real-time + Server Functions)
**Estimated Effort:** 40-60 developer-days
**Risk Level:** High (complete backend rewrite)

---

## Pre-Migration Checklist

- [ ] Create Clerk account at https://clerk.com
- [ ] Create Convex account at https://convex.dev
- [ ] Backup current Supabase database
- [ ] Document all current user IDs for data migration
- [ ] Set up staging environment for testing

---

## Phase 1: Project Setup (Day 1-2)

### 1.1 Install Dependencies

```bash
# Clerk for React Native
npm install @clerk/clerk-expo

# Convex
npm install convex

# Expo SecureStore for Clerk token storage
npm install expo-secure-store
```

### 1.2 Initialize Convex

```bash
npx convex dev
```

This creates:
- `convex/` directory
- `convex/_generated/` (auto-generated types)
- `.env.local` with CONVEX_DEPLOYMENT

### 1.3 Configure Clerk

1. Create Clerk application at dashboard.clerk.com
2. Enable Email/Password authentication
3. Configure React Native / Expo
4. Get `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`

### 1.4 Environment Variables

Add to `.env`:
```
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CONVEX_DEPLOYMENT=dev:your-project-xxx
```

### Files Created/Modified:
- `convex/` directory (new)
- `convex.json` (new)
- `.env` (modified)
- `package.json` (modified)

### Verification:
- [ ] `npx convex dev` runs without errors
- [ ] Convex dashboard shows your project
- [ ] Clerk dashboard shows your application

---

## Phase 2: Clerk Authentication Setup (Day 3-7)

### 2.1 Create Clerk Provider

**File:** `src/providers/ClerkProvider.tsx`

Replaces the complex AuthContext with Clerk's built-in handling.

### 2.2 Update App Entry Point

**File:** `App.tsx` or `index.ts`

Wrap app with ClerkProvider and ConvexProvider.

### 2.3 Create Auth Screens

Replace existing auth screens:
- `src/screens/auth/SignInScreen.tsx` → Use Clerk's `useSignIn`
- `src/screens/auth/SignUpScreen.tsx` → Use Clerk's `useSignUp`
- `src/screens/auth/ForgotPasswordScreen.tsx` → Use Clerk's password reset
- `src/screens/auth/ResetPasswordScreen.tsx` → Use Clerk's reset flow

### 2.4 Update Navigation

**File:** `src/navigation/AppNavigator.tsx`

Use `useAuth()` from Clerk instead of custom AuthContext.

### 2.5 Deep Linking Configuration

**File:** `app.json`

Configure deep links for Clerk's magic links and password reset.

### Files to Modify:
- `src/context/AuthContext.tsx` → DELETE (replaced by Clerk)
- `src/providers/ClerkProvider.tsx` → CREATE
- `src/screens/auth/*.tsx` → REWRITE (4 files)
- `src/navigation/AppNavigator.tsx` → MODIFY
- `App.tsx` → MODIFY
- `app.json` → MODIFY

### Verification:
- [ ] User can sign up with email/password
- [ ] User can sign in
- [ ] User can sign out
- [ ] Password reset flow works
- [ ] Session persists across app restarts
- [ ] Deep links work for password reset

---

## Phase 3: Convex Schema Definition (Day 8-12)

### 3.1 Define Schema

**File:** `convex/schema.ts`

Convert all 19 Supabase tables to Convex document schema.

### 3.2 Table Mapping

| Supabase Table | Convex Table | Notes |
|----------------|--------------|-------|
| profiles | users | Synced from Clerk via webhook |
| onboarding_preferences | onboardingPreferences | |
| user_settings | userSettings | |
| leaderboard_stats | leaderboardStats | |
| user_friends | friends | |
| friend_requests | friendRequests | |
| messages | messages | |
| message_notifications | messageNotifications | |
| tasks | tasks | |
| subtasks | subtasks | |
| focus_sessions | focusSessions | |
| subjects | subjects | |
| study_rooms | studyRooms | |
| study_room_participants | studyRoomParticipants | |
| study_room_messages | studyRoomMessages | |
| study_room_invitations | studyRoomInvitations | |
| achievements | achievements | |
| ai_insights | aiInsights | |
| nora_chat | noraChat | |
| patrick_chat | patrickChat | |

### 3.3 Indexes

Define indexes for common queries (user lookups, friend queries, message threads).

### Files Created:
- `convex/schema.ts`

### Verification:
- [ ] `npx convex dev` runs without schema errors
- [ ] All tables appear in Convex dashboard
- [ ] Indexes are created

---

## Phase 4: Convex Queries & Mutations (Day 13-22)

### 4.1 User Management

**Files:**
- `convex/users.ts` - User queries/mutations
- `convex/http.ts` - Clerk webhook handler

### 4.2 Profile & Settings

**Files:**
- `convex/profiles.ts`
- `convex/settings.ts`
- `convex/onboarding.ts`

### 4.3 Social Features

**Files:**
- `convex/friends.ts` - Friend requests, friend list
- `convex/messages.ts` - Direct messaging

### 4.4 Study Features

**Files:**
- `convex/tasks.ts` - Task management
- `convex/focusSessions.ts` - Focus session tracking
- `convex/subjects.ts` - Study subjects
- `convex/studyRooms.ts` - Study rooms & participants

### 4.5 Gamification

**Files:**
- `convex/leaderboard.ts`
- `convex/achievements.ts`

### 4.6 AI Chat

**Files:**
- `convex/noraChat.ts`
- `convex/patrickChat.ts`

### Mapping from supabaseHooks.ts:

| Supabase Hook | Convex Function | Type |
|---------------|-----------------|------|
| useProfile | users.getProfile | query |
| useUpdateProfile | users.updateProfile | mutation |
| useTasks | tasks.list | query |
| useCreateTask | tasks.create | mutation |
| useUpdateTask | tasks.update | mutation |
| useDeleteTask | tasks.remove | mutation |
| useFriends | friends.list | query |
| useFriendRequests | friendRequests.list | query |
| useSendFriendRequest | friendRequests.send | mutation |
| useAcceptFriendRequest | friendRequests.accept | mutation |
| useMessages | messages.list | query |
| useSendMessage | messages.send | mutation |

### Verification:
- [ ] All queries return correct data
- [ ] All mutations update data correctly
- [ ] TypeScript types are auto-generated
- [ ] No runtime errors in Convex dashboard

---

## Phase 5: React Hooks Migration (Day 23-30)

### 5.1 Create Convex Hooks

**File:** `src/hooks/useConvex.ts`

Wrapper hooks that use Convex's `useQuery` and `useMutation`.

### 5.2 Replace Supabase Hooks

For each component using `supabaseHooks.ts`:

1. Import from `@/hooks/useConvex` instead
2. Update hook names if changed
3. Update data shapes if needed

### 5.3 Files to Update

All files importing from `supabaseHooks.ts` (approximately 30+ files):

- Profile screens
- Task screens
- Social screens
- Study room screens
- Settings screens
- Leaderboard screens

### Verification:
- [ ] Each screen renders without errors
- [ ] Data loads correctly
- [ ] Mutations work (create, update, delete)
- [ ] Loading states work
- [ ] Error states work

---

## Phase 6: Real-time Features (Day 31-35)

### 6.1 Message Subscriptions

Convex queries are automatically real-time. Replace:
- `messagingService.subscribeToConversation()` → `useQuery(api.messages.list)`
- `messagingService.subscribeToNotifications()` → `useQuery(api.notifications.list)`

### 6.2 Study Room Real-time

- Room participant updates → automatic with `useQuery`
- Room message updates → automatic with `useQuery`

### 6.3 Remove Supabase Real-time Code

**Files to modify:**
- `src/utils/messagingService.ts` → DELETE or rewrite
- Components with `.subscribe()` calls → Remove subscription logic

### Verification:
- [ ] Messages appear instantly when sent
- [ ] Notifications update in real-time
- [ ] Study room participants update in real-time
- [ ] No memory leaks (subscriptions cleaned up)

---

## Phase 7: Server Functions (Day 36-40)

### 7.1 Convert Edge Functions to Convex Actions

| Supabase Edge Function | Convex Action |
|------------------------|---------------|
| nora-chat | convex/noraChat.ts → chat action |
| patrick-chat | convex/patrickChat.ts → chat action |
| whisper-transcribe | convex/transcribe.ts → action |

### 7.2 AI Integration

**File:** `convex/ai.ts`

Handle OpenAI/Anthropic calls in Convex actions.

### 7.3 Environment Variables

Add API keys to Convex dashboard (Settings → Environment Variables):
- `OPENAI_API_KEY`
- Any other API keys

### Verification:
- [ ] Nora chat responds correctly
- [ ] Patrick chat responds correctly
- [ ] Transcription works
- [ ] Rate limiting works

---

## Phase 8: Data Migration (Day 41-45)

### 8.1 Export Supabase Data

```sql
-- Run in Supabase SQL editor
COPY (SELECT * FROM profiles) TO STDOUT WITH CSV HEADER;
COPY (SELECT * FROM tasks) TO STDOUT WITH CSV HEADER;
-- ... for each table
```

### 8.2 User ID Mapping

Create mapping from Supabase user IDs to Clerk user IDs.

### 8.3 Import to Convex

**File:** `convex/migrations/importData.ts`

Convex action to import data with ID mapping.

### 8.4 Verify Data Integrity

- Count records match
- Relationships intact
- No orphaned records

### Verification:
- [ ] All users migrated
- [ ] All user data migrated
- [ ] Relationships preserved
- [ ] No data loss

---

## Phase 9: Testing & QA (Day 46-55)

### 9.1 Auth Flow Testing

- [ ] New user signup
- [ ] Existing user signin
- [ ] Password reset
- [ ] Session persistence
- [ ] Logout

### 9.2 Feature Testing

- [ ] Profile viewing/editing
- [ ] Task CRUD
- [ ] Friend requests
- [ ] Messaging
- [ ] Study rooms
- [ ] Focus sessions
- [ ] Leaderboard
- [ ] Achievements
- [ ] AI chat

### 9.3 Real-time Testing

- [ ] Messages update instantly
- [ ] Notifications work
- [ ] Study room sync works

### 9.4 Edge Cases

- [ ] Offline behavior
- [ ] Network errors
- [ ] Invalid data handling
- [ ] Concurrent edits

---

## Phase 10: Cutover & Cleanup (Day 56-60)

### 10.1 Final Data Sync

Run final migration to capture any data changes.

### 10.2 Update Production Environment

- Deploy Convex to production
- Configure Clerk production keys
- Update app environment variables

### 10.3 Remove Supabase Code

Delete:
- `src/utils/supabase.ts`
- `src/utils/supabaseHooks.ts`
- `src/utils/messagingService.ts`
- `supabase/` directory
- Supabase dependencies from package.json

### 10.4 Monitor

- Watch Convex dashboard for errors
- Monitor Clerk dashboard for auth issues
- Check app crash reports

### Verification:
- [ ] Production app works
- [ ] No Supabase references remain
- [ ] All features functional
- [ ] Performance acceptable

---

## Risk Mitigation

### Rollback Plan

1. Keep Supabase project active for 30 days post-migration
2. Maintain database backup
3. Keep old code in git branch

### Feature Flags

Consider implementing feature flags to gradually roll out:
1. New auth (Clerk) to 10% of users
2. New database (Convex) to 10% of users
3. Gradually increase

### Monitoring

Set up alerts for:
- Auth failure rate > 1%
- API error rate > 0.5%
- Response time > 2s

---

## Dependencies Between Phases

```
Phase 1 (Setup)
    ↓
Phase 2 (Clerk Auth) ←──────────────┐
    ↓                               │
Phase 3 (Convex Schema)             │
    ↓                               │
Phase 4 (Queries/Mutations)         │ Can work in parallel
    ↓                               │
Phase 5 (React Hooks) ──────────────┘
    ↓
Phase 6 (Real-time)
    ↓
Phase 7 (Server Functions)
    ↓
Phase 8 (Data Migration)
    ↓
Phase 9 (Testing)
    ↓
Phase 10 (Cutover)
```

---

## Success Criteria

- [ ] All existing features work identically
- [ ] Auth is simpler (no token management code)
- [ ] Real-time works without subscription boilerplate
- [ ] TypeScript types are auto-generated
- [ ] No security vulnerabilities (RLS issues eliminated)
- [ ] Performance equal or better
- [ ] Cost equal or lower
