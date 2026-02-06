# Directive: HikeWise Data Sync Fixer

## Goal
Fix issues with real-time data synchronization between the app and Convex backend, including cache invalidation, optimistic updates, and offline support.

## Inputs
- **Required:**
  - `issue_id`: Issue ID from Kanban (e.g., "sync-001")
- **Optional:**
  - `data_type`: Specific data type (user, session, leaderboard)
  - `dry_run`: Preview changes without writing (default: false)

## Execution Scripts
1. `execution/maestro_test_runner.py` - Test data persistence
2. `execution/worktree_manager.py` - Isolated development environment

## Key Files to Analyze

### Convex Backend
- `convex/users.ts` - User data queries and mutations
- `convex/focusSessions.ts` - Study session management
- `convex/leaderboard.ts` - Leaderboard calculations
- `convex/studyRooms.ts` - Study room sync

### React Hooks
- `src/hooks/useConvex.ts` - Custom Convex hooks
- `src/context/AuthContext.tsx` - User data subscription

### Services
- `src/utils/convexStudyRoomService.ts` - Study room operations
- `src/utils/convexMessagingService.ts` - Message sync

## Process
1. **Claim task in isolated worktree:**
   ```bash
   python execution/worktree_manager.py --action create --branch agent-1/sync-fix-{issue_id}
   ```

2. **Identify sync issue type:**
   - Data not updating in real-time?
   - Stale data after mutation?
   - Optimistic update not working?
   - Offline changes not syncing?

3. **Common fixes:**

   **Data not updating in real-time:**
   ```typescript
   // WRONG: One-time fetch
   const user = await fetchUser();

   // RIGHT: Reactive subscription
   const user = useQuery(api.users.me);  // Auto-updates
   ```

   **Stale data after mutation:**
   ```typescript
   // Convex auto-invalidates queries, but if using custom cache:
   const queryClient = useQueryClient();
   await mutation();
   queryClient.invalidateQueries(['user']);  // Manual invalidation
   ```

   **Optimistic update not reflecting:**
   ```typescript
   // Update local state immediately
   const [sessions, setSessions] = useState([]);

   const addSession = async (session) => {
     // Optimistic update
     setSessions(prev => [...prev, session]);

     try {
       await createSession(session);
     } catch (error) {
       // Revert on failure
       setSessions(prev => prev.filter(s => s.id !== session.id));
     }
   };
   ```

   **Subscription not triggering:**
   ```typescript
   // Ensure query args are stable (use useMemo)
   const args = useMemo(() => ({ roomId }), [roomId]);
   const messages = useQuery(api.messages.list, args);
   ```

4. **Test the fix:**
   ```bash
   python execution/maestro_test_runner.py \
     --action run \
     --flows .maestro/flows/verify/data-sync.yaml
   ```

5. **Commit and create PR:**
   ```bash
   git add -A
   git commit -m "fix(sync): {description} - Issue #{issue_id}"
   ```

## Convex Reactivity Model
```
Client Component
      │
      ├──► useQuery(api.data.get)  ─── Subscribes to server
      │           │
      │           └──► Server pushes updates automatically
      │
      └──► useMutation(api.data.set)
                  │
                  └──► Triggers re-render of all subscribers
```

## Common Sync Issues

### 1. Profile Not Updating After Save
**Cause:** Using stale reference or not subscribing
**Fix:** Ensure component uses useQuery, not one-time fetch

### 2. Leaderboard Outdated
**Cause:** Leaderboard not recalculating after session
**Fix:** Add trigger in session completion to update leaderboard

### 3. Study Room Members Not Syncing
**Cause:** Members query not including new participants
**Fix:** Verify query includes all room members, check join mutation

### 4. Focus Session Timer Out of Sync
**Cause:** Timer running locally but not syncing to server
**Fix:** Periodic sync during session, final sync on completion

### 5. Messages Appearing Twice
**Cause:** Optimistic update + server response both adding
**Fix:** Use unique ID to deduplicate or skip optimistic for messages

## Outputs
- **Primary:** Fixed sync code, PR created
- **Test Results:** `.tmp/tests/sync/`

## Error Handling
- **Network Error:** Queue mutation, retry when online
- **Conflict:** Server wins, show notification to user
- **Timeout:** Increase timeout, add retry logic

## Edge Cases
- What if offline for extended period? Queue all mutations
- What if conflicting edits? Last-write-wins with timestamp
- What if subscription drops? Auto-reconnect with Convex

## Debugging Sync Issues
```typescript
// Enable Convex debug logging
import { ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(convexUrl, {
  verbose: true,  // Log all queries/mutations
});
```

## Maestro Test for Data Sync
```yaml
# .maestro/flows/verify/data-sync.yaml
appId: com.hikewise.app
---
- launchApp
- tapOn: "Start Session"
- wait: 5000
- tapOn: "End Session"
- assertVisible: "Session Complete"
- tapOn: "Home"
- assertVisible:
    text: "Today: 1 session"  # Verify sync
```

## Learnings
> Add discoveries here as you use this directive

- [Initial]: Convex queries are reactive by default
- [Initial]: useQuery args must be stable (memoized) to prevent re-subscriptions
