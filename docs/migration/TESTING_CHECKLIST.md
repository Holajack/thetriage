# Migration Testing Checklist

Use this checklist to verify each feature works after migration. Test on both iOS and Android.

---

## Phase 2: Authentication Tests

### Sign Up Flow
- [ ] Can enter email and password
- [ ] Validation works (email format, password requirements)
- [ ] Account creates successfully
- [ ] Email verification sent (if enabled)
- [ ] User profile created in Convex
- [ ] Redirected to main app after signup
- [ ] Error shown for duplicate email

### Sign In Flow
- [ ] Can enter credentials
- [ ] Successful login redirects to main app
- [ ] Wrong password shows error
- [ ] Non-existent email shows error
- [ ] Loading state shown during auth

### Session Persistence
- [ ] Close app completely
- [ ] Reopen app
- [ ] Still logged in (no sign in required)
- [ ] User data loads correctly

### Sign Out
- [ ] Sign out button works
- [ ] Redirected to auth screen
- [ ] Cannot access protected screens
- [ ] Signing back in works

### Password Reset
- [ ] Can request password reset
- [ ] Email received with reset link/code
- [ ] Can set new password
- [ ] Can sign in with new password
- [ ] Old password no longer works

### Deep Linking (Password Reset)
- [ ] Reset link opens app
- [ ] Navigates to reset password screen
- [ ] Reset flow completes successfully

---

## Phase 3-4: Database Tests

### Schema Verification
- [ ] All tables created in Convex dashboard
- [ ] Indexes visible in dashboard
- [ ] No schema errors in console

### User Profile
- [ ] Profile loads for authenticated user
- [ ] Profile data matches expected fields
- [ ] Can update profile
- [ ] Changes persist after app restart
- [ ] Avatar upload works (if applicable)

### User Settings
- [ ] Settings load correctly
- [ ] Can update each setting
- [ ] Settings persist
- [ ] Default values work for new users

---

## Phase 5: Feature Tests

### Tasks
- [ ] Task list loads
- [ ] Can create new task
- [ ] New task appears in list
- [ ] Can edit task title
- [ ] Can edit task description
- [ ] Can change task priority
- [ ] Can set due date
- [ ] Can mark task complete
- [ ] Can mark task incomplete
- [ ] Can delete task
- [ ] Deleted task removed from list
- [ ] Tasks persist after restart

### Subtasks
- [ ] Can add subtask to task
- [ ] Subtask appears under task
- [ ] Can complete subtask
- [ ] Can delete subtask
- [ ] Task completion reflects subtasks

### Friends
- [ ] Friend list loads
- [ ] Shows correct friends
- [ ] Can view friend profile
- [ ] Can unfriend (if feature exists)

### Friend Requests
- [ ] Can search for users
- [ ] Can send friend request
- [ ] Request shows in sent requests
- [ ] Recipient sees pending request
- [ ] Can accept request
- [ ] Both users become friends
- [ ] Can decline request
- [ ] Request removed after decline

### Messages (needs 2 test accounts)
- [ ] Conversation list loads
- [ ] Can open conversation
- [ ] Message history loads
- [ ] Can send text message
- [ ] Message appears in conversation
- [ ] **REAL-TIME**: Other user sees message without refresh
- [ ] Can send to new user (start conversation)
- [ ] Unread count updates
- [ ] Marking as read works

### Study Rooms
- [ ] Room list loads
- [ ] Can create new room
- [ ] Room appears in list
- [ ] Can set room name
- [ ] Can set room privacy
- [ ] Can join public room
- [ ] Room participant list shows correctly
- [ ] **REAL-TIME**: New participant appears for all users
- [ ] Can send message in room
- [ ] **REAL-TIME**: Messages appear instantly for all
- [ ] Can leave room
- [ ] Owner can delete room
- [ ] Deleted room removed for all

### Study Room Invitations
- [ ] Can invite user to room
- [ ] Invitee receives invitation
- [ ] Can accept invitation
- [ ] Joins room after accepting
- [ ] Can decline invitation

### Focus Sessions
- [ ] Can start focus session
- [ ] Timer displays correctly
- [ ] Can pause session
- [ ] Can resume session
- [ ] Can end session early
- [ ] Session recorded in history
- [ ] Duration calculated correctly
- [ ] Points/rewards awarded (if applicable)

### Leaderboard
- [ ] Leaderboard loads
- [ ] Correct users displayed
- [ ] Rankings are correct
- [ ] User's own rank shown
- [ ] Friends leaderboard works (if feature exists)
- [ ] Updates after earning points

### Achievements
- [ ] Achievement list loads
- [ ] Earned achievements marked
- [ ] Unearned achievements show progress
- [ ] Earning achievement triggers notification
- [ ] Achievement persists

### AI Chat (Nora)
- [ ] Chat screen loads
- [ ] Can send message
- [ ] AI responds
- [ ] Response is relevant
- [ ] Chat history persists
- [ ] New conversation works

### AI Chat (Patrick)
- [ ] Chat screen loads
- [ ] Can send message
- [ ] AI responds
- [ ] Response is relevant
- [ ] Chat history persists

---

## Phase 6: Real-time Tests

### Message Real-time
- [ ] User A sends message to User B
- [ ] User B sees message within 1 second (no refresh)
- [ ] Conversation list updates with new message preview
- [ ] Unread badge updates

### Study Room Real-time
- [ ] User joins room - others see immediately
- [ ] User sends message - others see immediately
- [ ] User leaves room - others see immediately
- [ ] Room deleted - participants kicked

### Notification Real-time
- [ ] New notification appears without refresh
- [ ] Notification count updates
- [ ] Marking as read updates count

---

## Phase 7: Server Functions Tests

### Nora Chat Action
- [ ] Message sent to AI
- [ ] Response received
- [ ] Response is coherent
- [ ] Messages saved to database
- [ ] Rate limiting works (if implemented)
- [ ] Error handling for API failures

### Patrick Chat Action
- [ ] Same tests as Nora

### Transcription (if applicable)
- [ ] Can upload audio
- [ ] Transcription returns
- [ ] Text is accurate
- [ ] Error handling works

---

## Phase 8: Data Migration Verification

### User Data
- [ ] All users migrated
- [ ] User count matches original
- [ ] Profile data correct
- [ ] Settings migrated

### Content Data
- [ ] All tasks migrated
- [ ] Task details correct
- [ ] Subtasks linked correctly
- [ ] All messages migrated
- [ ] Message threads intact
- [ ] All study rooms migrated
- [ ] Participants correct
- [ ] Room messages migrated

### Relationship Data
- [ ] Friend relationships preserved
- [ ] Friend request history preserved
- [ ] Study room memberships correct

### Historical Data
- [ ] Focus session history migrated
- [ ] Achievement data migrated
- [ ] Leaderboard stats migrated
- [ ] AI chat history migrated

---

## Performance Tests

### Load Times
- [ ] App startup < 3 seconds
- [ ] Screen transitions < 500ms
- [ ] Data loads < 2 seconds
- [ ] No UI freezing

### Real-time Performance
- [ ] Messages appear < 1 second
- [ ] No duplicate messages
- [ ] No missed messages

### Offline Behavior
- [ ] App shows cached data offline
- [ ] Error shown for actions requiring network
- [ ] Syncs when back online

---

## Edge Case Tests

### Error Handling
- [ ] Network error shows message
- [ ] API error shows message
- [ ] Invalid input shows validation error
- [ ] Graceful degradation

### Concurrent Edits
- [ ] Two users edit same item - no data loss
- [ ] Last write wins or merge (depending on implementation)

### Large Data
- [ ] User with 100+ tasks loads correctly
- [ ] Long message history loads correctly
- [ ] Large friend list works

### Empty States
- [ ] Empty task list shows message
- [ ] Empty friend list shows message
- [ ] Empty conversation shows message

---

## Security Tests

### Authentication
- [ ] Cannot access protected routes without login
- [ ] Token expires and refreshes correctly
- [ ] Cannot use another user's token

### Authorization
- [ ] Cannot view other user's private data
- [ ] Cannot edit other user's tasks
- [ ] Cannot delete other user's content
- [ ] Cannot join private room without invite

### Data Validation
- [ ] Cannot submit invalid data formats
- [ ] Cannot exceed field limits
- [ ] XSS attempts sanitized

---

## Regression Tests

Run these after each major phase to ensure nothing broke:

### Quick Smoke Test
- [ ] Can sign in
- [ ] Profile loads
- [ ] Can create task
- [ ] Can send message
- [ ] Can start focus session

---

## Test Accounts

Create these test accounts for testing:

1. **Test User A**
   - Email: testa@test.com
   - Use for: Primary testing

2. **Test User B**
   - Email: testb@test.com
   - Use for: Friend/message recipient

3. **Test User C**
   - Email: testc@test.com
   - Use for: Study room testing

---

## Bug Report Template

When you find a bug, document it:

```
## Bug: [Short description]

**Phase:** [Which migration phase]
**Feature:** [Which feature]
**Severity:** [Critical/High/Medium/Low]

**Steps to reproduce:**
1.
2.
3.

**Expected behavior:**
[What should happen]

**Actual behavior:**
[What actually happens]

**Error messages:**
[Any console errors]

**Screenshots:**
[If applicable]
```

---

## Sign-off

Each phase should be signed off before proceeding:

| Phase | Tested By | Date | Status |
|-------|-----------|------|--------|
| Phase 1: Setup | | | |
| Phase 2: Auth | | | |
| Phase 3: Schema | | | |
| Phase 4: Functions | | | |
| Phase 5: Hooks | | | |
| Phase 6: Real-time | | | |
| Phase 7: Server | | | |
| Phase 8: Migration | | | |
| Phase 9: Full QA | | | |
| Phase 10: Cleanup | | | |
