# Before and After: Mode Button Animation Comparison

## BEFORE

### Basecamp Button
```tsx
<ReAnimated.View style={mode1AnimStyle}>
  <TouchableOpacity
    style={[styles.modeButton, { backgroundColor: theme.card, borderColor: theme.primary }]}
    onPress={() => {
      triggerHaptic('selection');
      handleModeSelection('basecamp');
    }}
    activeOpacity={0.7}
  >
    {/* Button content */}
  </TouchableOpacity>
</ReAnimated.View>
```

**Animations:**
- Entrance fade-in/slide-up only
- Fixed opacity fade to 0.7 on press
- No spring physics
- No visual feedback beyond opacity change

---

## AFTER

### Basecamp Button
```tsx
<ReAnimated.View style={[mode1AnimStyle, basecampButton.animatedStyle, basecampBorderStyle]}>
  <Pressable
    style={[styles.modeButton, { 
      backgroundColor: theme.card, 
      borderColor: theme.primary, 
      shadowColor: theme.primary 
    }]}
    onPress={() => {
      triggerHaptic('selection');
      basecampBorderGlow.value = withSequence(
        withTiming(1, { duration: 100 }),
        withTiming(0, { duration: 300 })
      );
      handleModeSelection('basecamp');
    }}
    onPressIn={() => {
      basecampButton.onPressIn();
      basecampBorderGlow.value = withTiming(1, { duration: 100 });
    }}
    onPressOut={() => {
      basecampButton.onPressOut();
      basecampBorderGlow.value = withTiming(0, { duration: 300 });
    }}
  >
    {/* Button content */}
  </Pressable>
</ReAnimated.View>
```

**Animations:**
1. **Entrance** (mode1AnimStyle): Fade-in + slide-up on mount
2. **Press Scale** (basecampButton.animatedStyle):
   - Scale: 1.0 → 0.95 (snappy spring)
   - Opacity: 1.0 → 0.9
3. **Release Bounce** (basecampButton.animatedStyle):
   - Scale: 0.95 → 1.0 (bouncy spring)
   - Opacity: 0.9 → 1.0
4. **Border Glow** (basecampBorderStyle):
   - Shadow opacity: 0.1 → 0.4
   - Shadow radius: 4px → 12px
   - Quick pulse on press completion

---

## Key Improvements

### 1. Spring Physics
- **Before**: Simple linear opacity fade
- **After**: Bouncy spring that overshoots slightly for playful feel

### 2. Visual Feedback
- **Before**: Only opacity changes
- **After**: Scale-down + border glow + opacity = multi-dimensional feedback

### 3. Timing Control
- **Before**: Fixed React Native timing
- **After**: Custom timings (100ms in, 300ms out) for polished feel

### 4. Layered Animations
- **Before**: Single animation layer
- **After**: Three independent, composable animation layers

### 5. Press States
- **Before**: Simple `activeOpacity` prop
- **After**: Separate `onPressIn`/`onPressOut` handlers for fine control

---

## Animation Config Source

All spring configurations come from `/src/theme/premiumTheme.ts`:

```typescript
AnimationConfig.snappy  // Fast, tight spring for press-down
AnimationConfig.bouncy  // Playful overshoot for release
AnimationConfig.standard // Balanced spring for general use
```

These were already defined and used throughout the app (e.g., Go button), 
ensuring consistent animation feel across all interactive elements.
