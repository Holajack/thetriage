# Directive: HikeWise Navigation Fixer

## Goal
Diagnose and fix navigation bugs in the HikeWise app, particularly issues with back button behavior, screen transitions, and deep linking.

## Inputs
- **Required:**
  - `issue_id`: Issue ID from Kanban (e.g., "nav-001")
- **Optional:**
  - `affected_screens`: List of affected screen names
  - `dry_run`: Preview changes without writing (default: false)

## Execution Scripts
1. `execution/navigation_flow_verifier.py` - Parse and verify navigation routes
2. `execution/maestro_test_runner.py` - Test navigation flows
3. `execution/worktree_manager.py` - Isolated development environment

## Key Files to Analyze

### Navigation Structure
- `src/navigation/RootNavigator.tsx` - Root navigation container
- `src/navigation/MainNavigator.tsx` - Drawer with 40+ screens
- `src/navigation/AuthNavigator.tsx` - Auth flow screens
- `src/navigation/types.ts` - TypeScript navigation types

### Navigation Utilities
- `src/hooks/useNavigation.ts` - Navigation hooks
- `src/utils/navigationRef.ts` - Global navigation reference

## Process
1. **Claim task in isolated worktree:**
   ```bash
   python execution/worktree_manager.py --action create --branch agent-1/nav-fix-{issue_id}
   ```

2. **Verify current navigation state:**
   ```bash
   python execution/navigation_flow_verifier.py --action verify
   ```

3. **Analyze the issue:**
   - Parse navigation configuration
   - Build navigation graph
   - Identify broken routes or missing back handlers

4. **Common fixes:**

   **Back button returns to Home instead of previous screen:**
   ```typescript
   // WRONG: Using navigation.navigate('Home')
   // RIGHT: Using navigation.goBack()

   // Or if stack is reset:
   // Check if initialRouteName is correct in Navigator
   ```

   **Screen not in navigation type:**
   ```typescript
   // Add to types.ts
   export type MainParamList = {
     ExistingScreen: undefined;
     NewScreen: { param: string };  // Add missing screen
   };
   ```

   **Gesture conflicts:**
   ```typescript
   // Disable drawer gesture on certain screens
   <Drawer.Screen
     name="FocusSession"
     options={{ swipeEnabled: false }}
   />
   ```

5. **Test the fix:**
   ```bash
   python execution/maestro_test_runner.py \
     --action run \
     --flows .maestro/flows/verify/navigation-back-button.yaml
   ```

6. **Commit and create PR:**
   ```bash
   git add -A
   git commit -m "fix(navigation): {description} - Issue #{issue_id}"
   ```

## Navigation Graph Verification
```bash
# Generate navigation diagram
python execution/navigation_flow_verifier.py --action diagram --output nav-flow.mermaid

# Check for orphaned screens
python execution/navigation_flow_verifier.py --action verify
```

## Common Navigation Issues

### 1. Back Button Goes to Wrong Screen
**Cause:** Stack is being reset or using navigate instead of goBack
**Fix:** Use `navigation.goBack()` or check `initialRouteName`

### 2. Screen Not Found Error
**Cause:** Screen not registered in navigator or type mismatch
**Fix:** Add screen to Navigator and update TypeScript types

### 3. Drawer Opens on Back Gesture
**Cause:** Gesture conflict between stack and drawer
**Fix:** Disable `swipeEnabled` on affected screens

### 4. Deep Link Doesn't Work
**Cause:** Missing linking config or wrong path
**Fix:** Update linking configuration in navigation container

### 5. Navigation State Not Persisting
**Cause:** Navigation state not being saved/restored
**Fix:** Implement state persistence with AsyncStorage

## Outputs
- **Primary:** Fixed navigation code, PR created
- **Test Results:** `.tmp/tests/navigation/`
- **Navigation Diagram:** `.tmp/navigation/flow.mermaid`

## Error Handling
- **Type Error:** Update navigation types in `types.ts`
- **Test Failure:** Revert changes, re-analyze issue
- **Build Error:** Check for missing imports or circular deps

## Edge Cases
- What if multiple navigators are nested? Check parent navigator first
- What if screen is conditionally rendered? Verify condition logic
- What if using custom header? Check headerLeft/Back configuration

## Maestro Test for Back Button
```yaml
# .maestro/flows/verify/navigation-back-button.yaml
appId: com.hikewise.app
---
- launchApp
- tapOn: "Profile"
- tapOn: "Personal Information"
- pressKey: back
- assertVisible: "Profile"  # Should return to Profile, not Home
```

## Learnings
> Add discoveries here as you use this directive

- [Initial]: MainNavigator has 40+ hidden screens in drawer
- [Initial]: Back button issue is highest priority navigation bug
