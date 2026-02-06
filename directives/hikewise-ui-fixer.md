# Directive: HikeWise UI Fixer

## Goal
Fix visual and UX issues in the HikeWise app, including animation bugs, layout problems, accessibility issues, and polish items.

## Inputs
- **Required:**
  - `issue_id`: Issue ID from Kanban (e.g., "ui-001")
- **Optional:**
  - `screen_name`: Specific screen to focus on
  - `dry_run`: Preview changes without writing (default: false)

## Execution Scripts
1. `execution/maestro_test_runner.py` - Visual regression testing
2. `execution/xcode_simulator_manager.py` - Screenshot capture
3. `execution/worktree_manager.py` - Isolated development environment

## Key Files to Analyze

### Animation Components
- `src/components/animations/` - Shared animation components
- `src/components/SplashAnimation.tsx` - Opening animation
- `src/components/NoraSidebar.tsx` - Nora character sidebar

### Layout Components
- `src/components/Layout.tsx` - Base layout wrapper
- `src/components/Header.tsx` - Screen headers
- `src/components/BottomNav.tsx` - Bottom navigation

### Screens
- `src/screens/` - All app screens

## Process
1. **Claim task in isolated worktree:**
   ```bash
   python execution/worktree_manager.py --action create --branch agent-1/ui-fix-{issue_id}
   ```

2. **Capture current state:**
   ```bash
   python execution/xcode_simulator_manager.py --action screenshot --output before.png
   ```

3. **Identify UI issue type:**
   - Animation too long/short?
   - Layout broken on certain devices?
   - Text not visible?
   - Accessibility missing?

4. **Common fixes:**

   **Animation too long:**
   ```typescript
   // Reduce duration
   const animationConfig = {
     duration: 500,  // Was 1500
     useNativeDriver: true,
   };
   ```

   **Bouncing animation excessive:**
   ```typescript
   // Reduce spring tension
   const springConfig = {
     tension: 40,  // Was 80
     friction: 7,
   };
   ```

   **Text not visible while typing:**
   ```typescript
   // Use KeyboardAvoidingView
   <KeyboardAvoidingView
     behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
     keyboardVerticalOffset={100}
   >
     <TextInput />
   </KeyboardAvoidingView>
   ```

   **Layout broken on small screens:**
   ```typescript
   // Use responsive sizing
   import { Dimensions } from 'react-native';
   const { width, height } = Dimensions.get('window');

   const isSmallDevice = width < 375;
   const padding = isSmallDevice ? 8 : 16;
   ```

5. **Test visually:**
   ```bash
   python execution/xcode_simulator_manager.py --action screenshot --output after.png
   ```

6. **Run visual regression:**
   ```bash
   python execution/maestro_test_runner.py \
     --action run \
     --flows .maestro/flows/verify/visual-check.yaml
   ```

7. **Commit and create PR:**
   ```bash
   git add -A
   git commit -m "fix(ui): {description} - Issue #{issue_id}"
   ```

## Common UI Issues

### 1. Opening Animation Too Long
**Cause:** Animation duration set too high
**Fix:** Reduce duration to 500-800ms for splash

### 2. Nora Sidebar Bouncing Too Much
**Cause:** Spring animation too aggressive
**Fix:** Reduce tension, increase friction

### 3. Text Not Visible When Typing
**Cause:** Keyboard covering input field
**Fix:** Wrap in KeyboardAvoidingView with proper offset

### 4. Profile Image Cropped Wrong
**Cause:** Wrong resizeMode or aspect ratio
**Fix:** Use `resizeMode="cover"` with `borderRadius`

### 5. Button Touch Area Too Small
**Cause:** No padding or hitSlop
**Fix:** Add `hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}`

### 6. Dark Mode Colors Wrong
**Cause:** Hardcoded colors instead of theme
**Fix:** Use theme colors from context

## Animation Best Practices
```typescript
// Use native driver when possible
Animated.timing(value, {
  duration: 300,
  useNativeDriver: true,  // Runs on UI thread
}).start();

// Prefer spring for natural feel
Animated.spring(value, {
  toValue: 1,
  useNativeDriver: true,
}).start();
```

## Accessibility Checklist
- [ ] All images have `accessibilityLabel`
- [ ] Buttons have `accessibilityRole="button"`
- [ ] Text contrast ratio >= 4.5:1
- [ ] Touch targets >= 44x44 points
- [ ] Screen reader announces content correctly

## Outputs
- **Primary:** Fixed UI code, PR created
- **Screenshots:** `.tmp/ui/before.png`, `.tmp/ui/after.png`
- **Test Results:** `.tmp/tests/visual/`

## Error Handling
- **Animation crash:** Wrap in try/catch, fall back to no animation
- **Layout warning:** Fix as genuine bug, don't suppress
- **Performance warning:** Profile and optimize render cycles

## Edge Cases
- What if device rotation? Test both orientations
- What if Dynamic Type enabled? Test with larger text sizes
- What if reduce motion enabled? Skip animations

## Device Testing Matrix
| Device | Screen Size | Test For |
|--------|-------------|----------|
| iPhone SE | 375x667 | Small screen layout |
| iPhone 15 | 393x852 | Standard layout |
| iPhone 15 Pro Max | 430x932 | Large screen |
| iPad | 810x1080 | Tablet layout |

## Learnings
> Add discoveries here as you use this directive

- [Initial]: Opening animation currently ~1.5s, users find it too long
- [Initial]: Nora sidebar uses spring animation that bounces excessively
