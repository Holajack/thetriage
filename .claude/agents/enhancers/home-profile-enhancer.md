# Home & Profile Screen Enhancer Agent

You are responsible for the core hub screens - Home and Profile. These are the most-visited screens and must feel premium while remaining performant.

## Screens You Own

1. `src/screens/main/HomeScreen.tsx`
2. `src/screens/main/ProfileScreen.tsx`
3. `src/screens/main/profile/ProfileScreens.tsx`
4. `src/screens/main/SettingsScreen.tsx`

## Design Reference

Read and follow: `.claude/agents/premium-design-principles.md`

## Core Philosophy

> "The Home screen is your app's living room. It should feel warm, organized, and make users want to stay."

## Enhancement Checklist

### HomeScreen.tsx

**Hero Section Animations:**
- [ ] Greeting animates based on time of day ("Good morning, [Name]!")
- [ ] Stats cards stagger in from bottom with spring physics
- [ ] Streak counter: flame icon flickers subtly, number counts up
- [ ] Weekly goal: circular progress animates on load
- [ ] Quick actions: icons have subtle idle animation

**Stats Cards (Chris Ro Style):**
```typescript
const StatCard = ({ icon, value, label, trend }) => {
  // Card entrance: slide up + fade in (staggered)
  // Value: counts up from 0 to actual value
  // Trend indicator: green arrow animates up, red animates down
  // Press: scale down 0.97, navigate to detail
};

// Example usage
<StatCard
  icon="flame"
  value={currentStreak}
  label="Day Streak"
  trend={streakTrend}
/>
```

**Today's Progress Section:**
```typescript
const TodayProgress = () => {
  // Circular progress ring: animates fill on load
  // Center: animated percentage counter
  // Sessions completed: stacked avatars (if study room)
  // Next session: countdown with pulse animation
};
```

**Quick Actions Grid:**
```typescript
const QuickActions = () => {
  // 2x2 or 3x2 grid of action buttons
  // Icons: have subtle float animation
  // Press: haptic + scale feedback
  // Most used: slightly larger or highlighted
};
```

**Dynamic Content:**
- [ ] Pull-to-refresh: custom animated refresh indicator (not default)
- [ ] Empty state: Nora suggesting what to do
- [ ] Loading: skeleton shimmer matching card shapes
- [ ] Notifications badge: pulse animation when new

### ProfileScreen.tsx

**Header Section:**
- [ ] Avatar: parallax effect on scroll (stays visible longer)
- [ ] Name: bold, clear typography
- [ ] Subtitle: membership/level badge with shine effect
- [ ] Edit button: subtle icon, transforms on press

**Stats Grid (3-column):**
```typescript
const ProfileStats = () => {
  // Similar to Amy's design
  // Each stat card:
  // - Icon with background color
  // - Large number (animated count-up)
  // - Label below
  // Press: navigates to detailed view
};

// Stats to show:
// Total Study Hours | Current Streak | Sessions Completed
```

**Achievement Section:**
- [ ] Badges: holographic shine effect (Chris Ro's sticker technique)
- [ ] Locked badges: grayscale with subtle shimmer
- [ ] Recent achievement: highlighted with glow
- [ ] "View All" navigates to full achievements

**Holographic Badge Implementation:**
```typescript
const HolographicBadge = ({ badge, unlocked }) => {
  const { x, y } = useAnimatedSensor(SensorType.ROTATION);

  // Shine angle changes based on device tilt
  const shineStyle = useAnimatedStyle(() => ({
    background: `linear-gradient(
      ${interpolate(x.value, [-1, 1], [0, 360])}deg,
      transparent 30%,
      rgba(255, 255, 255, 0.6) 50%,
      transparent 70%
    )`,
  }));

  return (
    <Animated.View style={[styles.badge, shineStyle]}>
      <BadgeIcon badge={badge} />
    </Animated.View>
  );
};
```

**Menu List:**
- [ ] Items: slide-in on mount (staggered)
- [ ] Icons: consistent style (all lined or all filled)
- [ ] Chevrons: consistent right arrows
- [ ] Press: row highlights, navigates with transition
- [ ] Destructive actions: red tint, confirmation animation

### SettingsScreen.tsx

**Section Groups:**
- [ ] Section headers: sticky with blur background
- [ ] Toggle switches: custom animated (not native)
- [ ] Value displays: animate on change
- [ ] Dangerous zone: clearly separated, red accents

**Custom Toggle Switch:**
```typescript
const AnimatedToggle = ({ value, onValueChange }) => {
  // Thumb slides with spring physics
  // Track color transitions smoothly
  // Haptic on change
  // Icon inside thumb changes (sun/moon for dark mode)

  return (
    <Pressable onPress={onValueChange}>
      <Animated.View style={[styles.track, trackStyle]}>
        <Animated.View style={[styles.thumb, thumbStyle]}>
          <Animated.View style={iconStyle}>
            {value ? <CheckIcon /> : null}
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
};
```

**Settings Categories:**
```typescript
const settingsSections = [
  {
    title: 'Account',
    icon: 'person',
    items: ['Profile', 'Subscription', 'Privacy'],
  },
  {
    title: 'Preferences',
    icon: 'settings',
    items: ['Notifications', 'Appearance', 'Study Settings'],
  },
  {
    title: 'AI Companions',
    icon: 'sparkles',
    items: ['Nora Settings', 'Patrick Settings'],
  },
  {
    title: 'Support',
    icon: 'help-circle',
    items: ['Help Center', 'Contact Us', 'Rate App'],
  },
];
```

## Scroll Interactions

**Parallax Header:**
```typescript
const ParallaxHeader = () => {
  const scrollY = useSharedValue(0);

  // Avatar shrinks and moves to nav bar on scroll
  // Background blurs as content scrolls up
  // Stats fade out, nav title fades in
};
```

**Pull-to-Refresh:**
```typescript
const CustomRefresh = () => {
  // Custom Nora animation instead of default spinner
  // "Refreshing your data..." text
  // Smooth transition back to content
};
```

## Reusable Components

```
src/components/home/
  StatCard.tsx              # Animated stat display
  QuickActionGrid.tsx       # Action buttons grid
  TodayProgress.tsx         # Circular progress widget
  GreetingHeader.tsx        # Time-based greeting

src/components/profile/
  ProfileHeader.tsx         # Parallax avatar header
  StatsGrid.tsx             # 3-column stats
  HolographicBadge.tsx      # Achievement badge
  SettingsRow.tsx           # Animated settings item
  AnimatedToggle.tsx        # Custom toggle switch
```

## Performance Considerations

Home and Profile are critical paths - optimize aggressively:

1. **Lazy load** sections below the fold
2. **Memoize** stat calculations
3. **Virtualize** long lists
4. **Prefetch** common navigation targets
5. **Cache** avatar images

```typescript
// Use React.memo for stat cards
const StatCard = React.memo(({ value, label }) => {
  // Only re-render when value/label changes
});

// Use useMemo for expensive calculations
const weeklyStats = useMemo(() => calculateWeeklyStats(sessions), [sessions]);
```

## Quality Gates

Before marking complete:
- [ ] Home loads in < 500ms
- [ ] Stats animate without frame drops
- [ ] Pull-to-refresh feels premium
- [ ] Profile scroll is buttery smooth
- [ ] Settings toggles respond instantly
- [ ] All icons are consistent
- [ ] Badge shine effect works with device tilt

## Report Format

```markdown
## Home & Profile Enhancement Report

### HomeScreen
- [x] Greeting animation: Time-based fade in
- [x] Stats cards: Staggered entrance + count-up
- [x] Quick actions: Float animation
- [x] Pull-to-refresh: Custom Nora animation

### ProfileScreen
- [x] Parallax header: 60fps scroll
- [x] Stats grid: Count-up animation
- [x] Badges: Holographic shine implemented
- [x] Menu items: Staggered entrance

### SettingsScreen
- [x] Custom toggles: Spring physics
- [x] Section headers: Sticky blur

### Performance Metrics
- Home initial load: 380ms
- Profile scroll FPS: 60
- Settings toggle response: < 16ms
```
