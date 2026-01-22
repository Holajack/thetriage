# LLM Prompts for Convex + Clerk Migration

Copy and paste each prompt to an LLM to execute that migration step. Test after each step before proceeding.

---

## PHASE 1: Project Setup

### Prompt 1.1: Install Dependencies

```
I'm migrating my React Native Expo app from Supabase to Convex + Clerk.

Please help me install the required dependencies:
1. @clerk/clerk-expo for authentication
2. convex for database and backend
3. expo-secure-store for secure token storage

Run the npm install commands and verify they installed correctly by checking package.json.

After installing, show me what was added to package.json.
```

### Prompt 1.2: Initialize Convex

```
I just installed convex in my React Native Expo project.

Please:
1. Run `npx convex dev` to initialize the Convex project
2. This should create a convex/ directory with _generated/ folder
3. Show me the contents of the created files
4. Explain what each file does

If there are any errors, help me fix them.
```

### Prompt 1.3: Configure Environment Variables

```
I need to set up environment variables for Clerk and Convex in my Expo app.

My current .env file has Supabase variables. Please:
1. Read my current .env file
2. Add placeholders for:
   - EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
   - CONVEX_DEPLOYMENT (this should have been auto-created by convex init)
3. Keep the existing Supabase variables for now (we'll remove them later)
4. Show me what the updated .env should look like

Note: I'll fill in the actual Clerk key after creating my Clerk account.
```

---

## PHASE 2: Clerk Authentication

### Prompt 2.1: Create Clerk Provider

```
I'm setting up Clerk authentication in my React Native Expo app.

Please create a ClerkProvider component at src/providers/ClerkProvider.tsx that:
1. Wraps the app with ClerkProvider from @clerk/clerk-expo
2. Uses expo-secure-store for token storage
3. Handles loading state while Clerk initializes
4. Gets the publishable key from environment variables

Here's my current AuthContext for reference - we're replacing this complexity with Clerk:
[Read src/context/AuthContext.tsx and include relevant parts]

The new ClerkProvider should be much simpler since Clerk handles:
- Token refresh automatically
- Session persistence
- Auth state management
```

### Prompt 2.2: Create Convex Provider with Clerk Auth

```
I need to set up Convex to work with Clerk authentication.

Please create src/providers/ConvexClientProvider.tsx that:
1. Uses ConvexProviderWithClerk from convex/react-clerk
2. Gets the Clerk auth token and passes it to Convex
3. Wraps children with the provider

Also, update or create convex/auth.config.ts to configure Clerk as the auth provider.

Show me both files.
```

### Prompt 2.3: Update App Entry Point

```
I need to update my app's entry point to use Clerk and Convex providers.

Please read my current App.tsx (or index.ts) and update it to:
1. Wrap everything with ClerkProvider (outermost)
2. Then wrap with ConvexClientProvider (uses Clerk for auth)
3. Keep existing navigation structure
4. Handle loading states properly

Show me the before and after of the file.
```

### Prompt 2.4: Rewrite Sign In Screen

```
I'm migrating from Supabase Auth to Clerk.

Please rewrite src/screens/auth/SignInScreen.tsx (or similar) to:
1. Use useSignIn() hook from @clerk/clerk-expo
2. Handle email/password sign in
3. Handle errors and show appropriate messages
4. Navigate to main app on success
5. Link to forgot password and sign up screens

Here's my current screen for reference:
[Read the current SignInScreen.tsx]

Keep the same UI/styling but replace Supabase auth calls with Clerk.
```

### Prompt 2.5: Rewrite Sign Up Screen

```
Please rewrite src/screens/auth/SignUpScreen.tsx to use Clerk:
1. Use useSignUp() hook from @clerk/clerk-expo
2. Handle email/password registration
3. Handle email verification if required
4. Collect any additional user metadata (full_name, etc.)
5. Navigate appropriately after signup

Here's my current screen:
[Read the current SignUpScreen.tsx]

Keep the UI but use Clerk's auth methods.
```

### Prompt 2.6: Rewrite Forgot Password Screen

```
Please rewrite src/screens/auth/ForgotPasswordScreen.tsx to use Clerk:
1. Use useSignIn() hook's resetPassword methods
2. Send password reset email
3. Handle success/error states
4. Show appropriate feedback to user

Here's my current implementation:
[Read the current ForgotPasswordScreen.tsx]
```

### Prompt 2.7: Rewrite Reset Password Screen

```
Please rewrite src/screens/auth/ResetPasswordScreen.tsx to use Clerk:
1. Handle the reset code from deep link or email
2. Allow user to set new password
3. Use Clerk's attemptFirstFactor or resetPassword methods
4. Navigate to sign in on success

Here's my current implementation:
[Read the current ResetPasswordScreen.tsx]

Also update app.json deep linking if needed for Clerk's reset flow.
```

### Prompt 2.8: Update Navigation for Clerk Auth

```
Please update my navigation to use Clerk's auth state:

Read src/navigation/AppNavigator.tsx (or RootNavigator.tsx) and:
1. Replace useAuth from my custom AuthContext with useAuth from @clerk/clerk-expo
2. Use isSignedIn from Clerk to determine auth state
3. Use isLoaded to handle loading state
4. Remove any references to the old AuthContext

Show me the updated navigation file.
```

### Prompt 2.9: Delete Old AuthContext

```
Now that Clerk is handling authentication, we can remove the old Supabase AuthContext.

Please:
1. Search the codebase for any remaining imports of AuthContext
2. List all files still using it
3. Help me update those files to use Clerk's useAuth() instead
4. Once all references are removed, delete src/context/AuthContext.tsx

Don't delete until we've confirmed no files are using it.
```

---

## PHASE 3: Convex Schema

### Prompt 3.1: Analyze Current Database Schema

```
I need to convert my Supabase database schema to Convex.

Please read all my Supabase migration files in supabase/migrations/ and:
1. List all tables with their columns and types
2. Identify all foreign key relationships
3. Note any unique constraints or indexes
4. Identify RLS policies (we won't need these in Convex)

Create a summary document of the current schema.
```

### Prompt 3.2: Create Convex Schema

```
Based on my Supabase schema analysis, please create convex/schema.ts.

Convert these Supabase tables to Convex:
[List from previous analysis]

For each table:
1. Use appropriate Convex types (v.string(), v.number(), v.id(), etc.)
2. Convert foreign keys to v.id("tableName") references
3. Add appropriate indexes for common queries
4. Use v.optional() for nullable fields

Important mappings:
- UUID → v.id() or v.string() depending on usage
- TIMESTAMPTZ → v.number() (store as Unix timestamp)
- JSONB → v.any() or define specific object shape
- User IDs → v.string() (Clerk user IDs are strings)

Show me the complete schema.ts file.
```

### Prompt 3.3: Verify Schema

```
Please run `npx convex dev` and check if the schema deploys correctly.

If there are any errors:
1. Show me the error messages
2. Explain what's wrong
3. Fix the schema.ts file
4. Re-run to verify

Also show me what tables appear in the Convex dashboard.
```

---

## PHASE 4: Convex Queries & Mutations

### Prompt 4.1: Create User Functions

```
Please create convex/users.ts with these functions:

Queries:
- getUser(userId): Get user profile by Clerk ID
- getCurrentUser(): Get authenticated user's profile

Mutations:
- createUser(data): Create user profile (called from Clerk webhook)
- updateUser(data): Update user profile
- updateAvatar(url): Update avatar URL

Use ctx.auth.getUserIdentity() for authentication.
Throw errors for unauthorized access.

Reference my current supabaseHooks.ts for the data shapes:
[Read src/utils/supabaseHooks.ts - profile related hooks]
```

### Prompt 4.2: Create Clerk Webhook Handler

```
Please create convex/http.ts to handle Clerk webhooks:

1. Set up HTTP routes using httpRouter
2. Handle user.created webhook - create user in Convex
3. Handle user.updated webhook - sync user data
4. Handle user.deleted webhook - handle user deletion
5. Verify webhook signature using svix

This ensures user data stays in sync between Clerk and Convex.

Show me the complete http.ts file.
```

### Prompt 4.3: Create Task Functions

```
Please create convex/tasks.ts with these functions:

Queries:
- list(): Get all tasks for authenticated user
- getById(id): Get single task
- getByStatus(status): Get tasks by status

Mutations:
- create(data): Create new task
- update(id, data): Update task
- remove(id): Delete task
- toggleComplete(id): Toggle task completion

Reference my current implementation:
[Read the task-related hooks from supabaseHooks.ts]

Make sure all functions verify the user owns the task.
```

### Prompt 4.4: Create Subtask Functions

```
Please create convex/subtasks.ts:

Queries:
- listByTask(taskId): Get subtasks for a task

Mutations:
- create(taskId, data): Create subtask
- update(id, data): Update subtask
- remove(id): Delete subtask
- toggleComplete(id): Toggle completion

Verify user owns parent task before allowing operations.
```

### Prompt 4.5: Create Friend Functions

```
Please create convex/friends.ts:

Queries:
- listFriends(): Get user's friends
- listFriendRequests(): Get pending friend requests (sent and received)
- getFriendship(userId): Check friendship status with another user

Mutations:
- sendRequest(toUserId): Send friend request
- acceptRequest(requestId): Accept friend request
- declineRequest(requestId): Decline friend request
- removeFriend(friendId): Remove friend

Reference:
[Read friend-related hooks from supabaseHooks.ts]

Handle both directions of friendship properly.
```

### Prompt 4.6: Create Message Functions

```
Please create convex/messages.ts:

Queries:
- listConversations(): Get all conversations for user
- getConversation(otherUserId): Get messages with specific user
- getUnreadCount(): Get count of unread messages

Mutations:
- send(toUserId, content): Send message
- markAsRead(messageId): Mark message as read
- markConversationRead(otherUserId): Mark all messages in conversation as read

These queries should be real-time (they are by default in Convex).

Reference:
[Read message-related code from supabaseHooks.ts and messagingService.ts]
```

### Prompt 4.7: Create Study Room Functions

```
Please create convex/studyRooms.ts:

Queries:
- list(): Get all public/joinable study rooms
- getById(id): Get room details with participants
- getMyRooms(): Get rooms user is participating in
- getParticipants(roomId): Get room participants

Mutations:
- create(data): Create study room
- update(id, data): Update room (owner only)
- delete(id): Delete room (owner only)
- join(roomId): Join study room
- leave(roomId): Leave study room
- sendMessage(roomId, content): Send message in room

Reference:
[Read study room related code from supabaseHooks.ts]
```

### Prompt 4.8: Create Focus Session Functions

```
Please create convex/focusSessions.ts:

Queries:
- getActive(): Get user's active focus session
- list(): Get user's session history
- getStats(): Get focus statistics (total time, streaks, etc.)

Mutations:
- start(data): Start new focus session
- end(sessionId): End focus session
- pause(sessionId): Pause session
- resume(sessionId): Resume session

Track duration, subject, and any rewards/points earned.
```

### Prompt 4.9: Create Leaderboard Functions

```
Please create convex/leaderboard.ts:

Queries:
- getGlobal(limit): Get top users globally
- getFriends(): Get leaderboard among friends
- getUserRank(userId): Get specific user's rank
- getMyStats(): Get authenticated user's stats

Mutations:
- updateStats(data): Update user's leaderboard stats (usually called by other functions)
- addPoints(amount, reason): Add points to user

Make sure stats can only be updated through legitimate actions.
```

### Prompt 4.10: Create Settings Functions

```
Please create convex/settings.ts:

Queries:
- get(): Get user's settings

Mutations:
- update(data): Update settings
- resetToDefaults(): Reset all settings to defaults

Also create convex/onboarding.ts:

Queries:
- get(): Get onboarding status

Mutations:
- update(data): Update onboarding preferences
- complete(): Mark onboarding as complete
```

### Prompt 4.11: Create Achievement Functions

```
Please create convex/achievements.ts:

Queries:
- list(): Get all achievements with earned status
- getEarned(): Get only earned achievements
- checkProgress(): Check progress toward unearned achievements

Mutations:
- award(achievementId): Award achievement to user
- checkAndAward(): Check all achievement conditions and award any earned

Define achievement conditions and check them automatically.
```

### Prompt 4.12: Create AI Chat Functions

```
Please create convex/noraChat.ts and convex/patrickChat.ts:

For each:

Queries:
- getHistory(): Get chat history with AI
- getRecent(limit): Get recent messages

Mutations:
- sendMessage(content): Send message to AI (this should be an action that calls OpenAI)
- clearHistory(): Clear chat history

Actions (for external API calls):
- generateResponse(prompt): Call OpenAI/Claude API

Reference my current edge functions:
[Read supabase/functions/nora-chat and patrick-chat]

Store conversation history and return AI responses.
```

---

## PHASE 5: React Hooks Migration

### Prompt 5.1: Create Convex Hook Wrappers

```
Please create src/hooks/useConvex.ts with wrapper hooks for all our Convex functions.

For each Convex function, create a hook like:
- useProfile() → uses useQuery(api.users.getCurrentUser)
- useTasks() → uses useQuery(api.tasks.list)
- useCreateTask() → uses useMutation(api.tasks.create)
- etc.

This makes migration easier - components just change their import path.

Include all the hooks that currently exist in supabaseHooks.ts:
[Read supabaseHooks.ts and list all hooks]

Show me the complete hooks file.
```

### Prompt 5.2: Migrate Profile Screens

```
Please update all profile-related screens to use Convex hooks:

Find all files that import from supabaseHooks.ts and use profile-related hooks:
1. List those files
2. Update imports to use the new Convex hooks
3. Update any data shape differences
4. Verify TypeScript types are correct

Show me each file's changes.
```

### Prompt 5.3: Migrate Task Screens

```
Please update all task-related screens to use Convex hooks:

1. Find files using task hooks from supabaseHooks
2. Update to use Convex task hooks
3. Handle any loading/error state differences
4. Update data shapes if needed

List files changed and show the key changes.
```

### Prompt 5.4: Migrate Social Screens

```
Please update all social features (friends, messages) to use Convex:

1. Friend list screens
2. Friend request screens
3. Messaging screens
4. User search/profile viewing

Update all to use the new Convex hooks.
Show me the changes for each file.
```

### Prompt 5.5: Migrate Study Room Screens

```
Please update study room screens to use Convex:

1. Room list
2. Room detail/chat
3. Room creation
4. Room settings

Update all to use Convex hooks and verify real-time updates work.
```

### Prompt 5.6: Migrate Remaining Screens

```
Please find and update any remaining screens still using Supabase:

1. Search for all imports of supabaseHooks
2. Search for direct supabase client usage
3. Update each to use Convex equivalents
4. List any features that don't have Convex equivalents yet

Goal: Zero imports from supabaseHooks.ts or supabase.ts
```

---

## PHASE 6: Real-time Features

### Prompt 6.1: Verify Real-time Messages

```
Convex queries are automatically real-time. Let's verify messaging works:

1. Check that the messages screens use useQuery for messages
2. Verify new messages appear instantly without refresh
3. Remove any manual subscription code from messagingService.ts
4. Test with two users sending messages

If there are any issues, help me debug them.
```

### Prompt 6.2: Verify Real-time Notifications

```
Check that notifications work in real-time:

1. Verify notification queries use useQuery
2. Test that new notifications appear instantly
3. Remove any Supabase realtime subscription code
4. Verify notification counts update

Show me what code can be removed.
```

### Prompt 6.3: Remove Supabase Real-time Code

```
Now that Convex handles real-time automatically, let's clean up:

1. Find all .subscribe() calls to Supabase channels
2. Find all .on() event listeners
3. Remove or replace with Convex equivalents
4. Delete src/utils/messagingService.ts if no longer needed

Show me what's being removed.
```

---

## PHASE 7: Server Functions

### Prompt 7.1: Migrate Nora Chat Edge Function

```
Please convert supabase/functions/nora-chat to a Convex action.

Read the current edge function:
[Read supabase/functions/nora-chat/index.ts]

Create convex/noraChat.ts with:
1. An action that calls the OpenAI API
2. Stores user message in database
3. Gets AI response
4. Stores AI response in database
5. Returns the response

Use ctx.runMutation() to store messages from within the action.
Handle rate limiting and errors.
```

### Prompt 7.2: Migrate Patrick Chat Edge Function

```
Please convert supabase/functions/patrick-chat to a Convex action.

Same pattern as Nora chat:
[Read supabase/functions/patrick-chat/index.ts]

Create the equivalent Convex action.
```

### Prompt 7.3: Migrate Transcription Function

```
Please convert supabase/functions/whisper-transcribe to a Convex action.

Read the current function:
[Read supabase/functions/whisper-transcribe/index.ts]

Create convex/transcribe.ts with an action that:
1. Accepts audio file/blob
2. Calls Whisper API
3. Returns transcription

Handle file uploads appropriately.
```

### Prompt 7.4: Set Up Convex Environment Variables

```
I need to add API keys to Convex for the server functions.

Please tell me:
1. How to add environment variables in Convex dashboard
2. Which variables I need to add based on my edge functions
3. How to access them in Convex actions using process.env

List all the environment variables needed.
```

---

## PHASE 8: Data Migration

### Prompt 8.1: Export Supabase Data

```
I need to export all data from Supabase for migration to Convex.

Please create a script or give me SQL queries to export:
1. All user profiles
2. All tasks and subtasks
3. All friend relationships
4. All messages
5. All focus sessions
6. All study rooms and participants
7. All achievements
8. All settings
9. All chat history

Export as JSON or CSV that can be imported into Convex.
```

### Prompt 8.2: Create User ID Mapping

```
Supabase uses UUID user IDs, but Clerk uses string IDs.

Please create a migration script that:
1. For each existing user, creates them in Clerk (or maps existing Clerk IDs)
2. Creates a mapping file: { supabaseUserId: clerkUserId }
3. This mapping will be used to update all foreign key references

Note: If users need to re-register with Clerk, we need a different strategy.
Help me decide the best approach.
```

### Prompt 8.3: Create Convex Import Script

```
Please create convex/migrations/importData.ts:

This should be a Convex action that:
1. Accepts exported JSON data
2. Uses the user ID mapping
3. Imports data into each Convex table
4. Handles relationships correctly (import parent records first)
5. Reports progress and any errors

Include a function for each table.
Make it idempotent (safe to run multiple times).
```

### Prompt 8.4: Run Migration

```
Let's run the data migration:

1. First, do a dry run with a small subset of data
2. Verify the imported data looks correct in Convex dashboard
3. Fix any issues
4. Run full migration
5. Verify record counts match
6. Spot check some records for accuracy

Guide me through this process.
```

---

## PHASE 9: Testing

### Prompt 9.1: Create Test Checklist

```
Please create a comprehensive test checklist for the migration.

For each feature:
1. What to test
2. Expected behavior
3. How to verify

Categories:
- Authentication (signup, signin, signout, password reset)
- Profile (view, edit, avatar)
- Tasks (CRUD, subtasks, status)
- Friends (request, accept, decline, unfriend)
- Messages (send, receive, real-time)
- Study Rooms (create, join, chat, leave)
- Focus Sessions (start, pause, end, stats)
- Leaderboard (view, rankings)
- Achievements (view, earn)
- Settings (update, persist)
- AI Chat (Nora, Patrick)

Create a markdown checklist I can use.
```

### Prompt 9.2: Test Auth Flows

```
Let's test all authentication flows:

1. New user signup - create account, verify email if required
2. Existing user signin - login with credentials
3. Session persistence - close app, reopen, still logged in
4. Logout - sign out, verify redirected to auth screen
5. Password reset - request reset, receive email, set new password

Run through each and tell me if there are any issues.
```

### Prompt 9.3: Test Core Features

```
Let's test the core app features:

For each, verify:
- Data loads correctly
- CRUD operations work
- Changes persist
- Real-time updates work (where applicable)

Test:
1. Tasks - create, edit, complete, delete
2. Profile - view, update
3. Settings - change settings, verify they persist

Report any issues found.
```

### Prompt 9.4: Test Social Features

```
Let's test social features (need two test accounts):

1. Friend request - User A sends to User B
2. Accept request - User B accepts
3. View friends - both see each other
4. Send message - User A messages User B
5. Real-time - User B sees message instantly
6. Unfriend - test removing friend

Report any issues.
```

### Prompt 9.5: Test Study Rooms

```
Let's test study room features:

1. Create room - set name, settings
2. Join room - another user joins
3. Room chat - send messages, verify real-time
4. Leave room - user leaves
5. Delete room - owner deletes

Report any issues.
```

---

## PHASE 10: Cleanup

### Prompt 10.1: Remove Supabase Dependencies

```
Now that everything is migrated, let's remove Supabase:

1. Search for any remaining Supabase imports
2. Remove @supabase/supabase-js from package.json
3. Delete src/utils/supabase.ts
4. Delete src/utils/supabaseHooks.ts
5. Delete supabase/ directory (keep a backup first)
6. Remove Supabase environment variables
7. Run npm install to update lock file

Verify the app still builds after removal.
```

### Prompt 10.2: Final Code Review

```
Please do a final code review:

1. Search for any TODO comments related to migration
2. Check for any dead code
3. Verify all TypeScript types are correct (no 'any')
4. Check for console.log statements to remove
5. Verify error handling is in place

List any issues found.
```

### Prompt 10.3: Update Documentation

```
Please update any documentation:

1. Update README with new architecture
2. Update any setup instructions
3. Document the new environment variables needed
4. Update any API documentation

Show me what needs updating.
```

---

## Troubleshooting Prompts

### If Auth Isn't Working

```
I'm having issues with Clerk authentication:

[Describe the issue]

Please help me debug:
1. Check ClerkProvider setup
2. Verify environment variables
3. Check for console errors
4. Verify Clerk dashboard configuration

Here's the error I'm seeing:
[Paste error]
```

### If Convex Queries Fail

```
I'm getting errors from Convex queries:

[Describe the issue]

Please help me debug:
1. Check the function in Convex dashboard
2. Verify authentication is passing through
3. Check the query/mutation code
4. Verify schema matches

Here's the error:
[Paste error]
```

### If Real-time Isn't Working

```
Real-time updates aren't working:

[Describe what's not updating]

Please help me verify:
1. The query is using useQuery (not a one-time fetch)
2. The component is subscribed correctly
3. The mutation is completing successfully
4. There are no caching issues

Show me how to debug this.
```

### If Data Migration Fails

```
Data migration is failing:

[Describe the error]

Please help me:
1. Identify which records are failing
2. Check for data validation issues
3. Verify ID mappings are correct
4. Handle the specific error

Here's the error:
[Paste error]
```

---

## Quick Reference

### Convex vs Supabase Equivalents

| Supabase | Convex |
|----------|--------|
| `supabase.from('table').select()` | `useQuery(api.table.list)` |
| `supabase.from('table').insert()` | `useMutation(api.table.create)` |
| `supabase.from('table').update()` | `useMutation(api.table.update)` |
| `supabase.from('table').delete()` | `useMutation(api.table.remove)` |
| `supabase.auth.signIn()` | `useSignIn()` from Clerk |
| `supabase.auth.signUp()` | `useSignUp()` from Clerk |
| `supabase.auth.signOut()` | `useClerk().signOut()` |
| `supabase.channel().subscribe()` | Automatic with `useQuery()` |
| Edge Functions | Convex Actions |
| RLS Policies | Auth checks in functions |

### Key Imports

```typescript
// Clerk
import { useAuth, useUser, useSignIn, useSignUp } from '@clerk/clerk-expo';

// Convex
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../convex/_generated/api';
```
