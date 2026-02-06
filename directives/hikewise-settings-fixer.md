# Directive: HikeWise Settings Fixer

## Goal
Fix bugs related to settings persistence, ensuring user preferences (sound, notifications, focus settings) save correctly and persist across app restarts.

## Inputs
- **Required:**
  - `issue_id`: Issue ID from Kanban (e.g., "settings-001")
- **Optional:**
  - `setting_type`: Specific setting category to focus on
  - `dry_run`: Preview changes without writing (default: false)

## Execution Scripts
1. `execution/maestro_test_runner.py` - Test settings persistence
2. `execution/worktree_manager.py` - Isolated development environment

## Key Files to Analyze

### Settings Screens
- `src/screens/main/SettingsScreen.tsx` - Main settings hub
- `src/screens/settings/SoundSettingsScreen.tsx` - Sound preferences
- `src/screens/settings/NotificationSettingsScreen.tsx` - Notifications
- `src/screens/settings/FocusSettingsScreen.tsx` - Focus duration/breaks

### Data Layer
- `convex/users.ts` - User data mutations
- `convex/onboarding.ts` - Onboarding data (includes some settings)
- `src/context/AuthContext.tsx` - User state management

### Local Storage
- `src/utils/asyncStorageHelpers.ts` - AsyncStorage wrappers

## Process
1. **Claim task in isolated worktree:**
   ```bash
   python execution/worktree_manager.py --action create --branch agent-1/settings-fix-{issue_id}
   ```

2. **Identify the setting that doesn't persist:**
   - Is it stored in Convex (server-side)?
   - Is it stored in AsyncStorage (local)?
   - Is it stored in both (sync required)?

3. **Common fixes:**

   **Setting not saving to Convex:**
   ```typescript
   // Ensure mutation is called correctly
   const updateUser = useMutation(api.users.update);

   const handleSave = async () => {
     await updateUser({
       soundPreference: selectedSound,  // Ensure field name matches schema
     });
   };
   ```

   **Setting not persisting locally:**
   ```typescript
   // Save to AsyncStorage
   await AsyncStorage.setItem('soundPreference', JSON.stringify(value));

   // Load on app start
   const stored = await AsyncStorage.getItem('soundPreference');
   if (stored) setSoundPreference(JSON.parse(stored));
   ```

   **Onboarding settings not transferring:**
   ```typescript
   // After onboarding completes, copy to user record
   await updateUser({
     soundPreference: onboardingData.sound_preference,
     weeklyFocusGoal: onboardingData.weekly_focus_goal,
   });
   ```

4. **Test the fix:**
   ```bash
   python execution/maestro_test_runner.py \
     --action run \
     --flows .maestro/flows/verify/settings-persistence.yaml
   ```

5. **Commit and create PR:**
   ```bash
   git add -A
   git commit -m "fix(settings): {description} - Issue #{issue_id}"
   ```

## Settings Data Flow
```
User Changes Setting
        │
        ├──► Local State Update (immediate UI feedback)
        │
        ├──► Convex Mutation (server persistence)
        │
        └──► AsyncStorage (offline support)
```

## Common Settings Issues

### 1. Sound Preference Not Saving During Onboarding
**Cause:** Onboarding data not synced to user record
**Fix:** Call user update mutation after onboarding completion

### 2. Settings Reset After App Restart
**Cause:** Not loading from persistence on startup
**Fix:** Load from AsyncStorage in useEffect on mount

### 3. Settings Not Syncing Across Devices
**Cause:** Only saved locally, not to Convex
**Fix:** Add Convex mutation for server-side storage

### 4. Optimistic Update Not Working
**Cause:** Local state not updated before server confirms
**Fix:** Update local state immediately, revert on error

### 5. Settings Screen Shows Stale Data
**Cause:** Not subscribing to reactive Convex queries
**Fix:** Use useQuery instead of one-time fetch

## Outputs
- **Primary:** Fixed settings code, PR created
- **Test Results:** `.tmp/tests/settings/`

## Error Handling
- **Mutation Error:** Show error toast, keep local state as fallback
- **AsyncStorage Error:** Log error, fall back to defaults
- **Schema Mismatch:** Update Convex schema if field missing

## Edge Cases
- What if user is offline? Save to AsyncStorage, sync when online
- What if Convex mutation fails? Retry 3 times with exponential backoff
- What if user logs out? Clear local settings, keep server settings

## Maestro Test for Settings
```yaml
# .maestro/flows/verify/settings-persistence.yaml
appId: com.hikewise.app
---
- launchApp
- tapOn: "Settings"
- tapOn: "Sound"
- tapOn: "Ocean"
- pressKey: back
- pressKey: home  # Go to background
- launchApp
- tapOn: "Settings"
- tapOn: "Sound"
- assertVisible:
    id: "sound-option-ocean"
    traits: ["selected"]
```

## Convex Schema Reference
```typescript
// convex/schema.ts - User settings fields
users: defineTable({
  // ... other fields
  soundPreference: v.optional(v.string()),
  weeklyFocusGoal: v.optional(v.number()),
  focusDuration: v.optional(v.number()),
  breakDuration: v.optional(v.number()),
  // ...
})
```

## Learnings
> Add discoveries here as you use this directive

- [Initial]: Sound preferences during onboarding may not transfer to user record
- [Initial]: Convex uses camelCase, legacy code used snake_case
