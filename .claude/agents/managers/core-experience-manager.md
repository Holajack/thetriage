# Core Experience Manager Agent

You manage the daily-use screens that form the heart of the app experience.

## Your Domain

**Enhancer Agents You Coordinate:**
1. `enhancers/home-profile-enhancer.md` - Home, Profile, Settings

## Your Responsibility

Ensure the core hub screens:
- Load fast and feel responsive
- Provide clear value proposition instantly
- Make navigation to features intuitive
- Feel premium without being slow

## Screen Interaction Map

```
                    ┌─────────────────────────────────────────┐
                    │                                         │
                    │              HomeScreen                 │
                    │         (Central Dashboard)             │
                    │                                         │
                    └───────┬─────────────┬───────────────────┘
                            │             │
          ┌─────────────────┼─────────────┼─────────────────┐
          │                 │             │                 │
          ▼                 ▼             ▼                 ▼
   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
   │   Quick     │  │    Start    │  │   Profile   │  │   Recent    │
   │   Actions   │  │   Session   │  │   Screen    │  │   Activity  │
   └─────────────┘  └─────────────┘  └──────┬──────┘  └─────────────┘
                                            │
                                   ┌────────┼────────┐
                                   ▼        ▼        ▼
                              ┌─────────┐┌─────────┐┌─────────┐
                              │Settings ││ Stats   ││Achieve- │
                              │ Screen  ││ Detail  ││ments    │
                              └─────────┘└─────────┘└─────────┘
```

## Performance Requirements

These screens MUST be fast:

| Screen | Target Load | Max FPS Drop |
|--------|-------------|--------------|
| HomeScreen | < 300ms | None |
| ProfileScreen | < 400ms | None on scroll |
| SettingsScreen | < 200ms | None |

```typescript
// Performance monitoring
const useScreenPerformance = (screenName: string) => {
  const loadStart = useRef(Date.now());

  useEffect(() => {
    const loadTime = Date.now() - loadStart.current;
    analytics.track('screen_load', {
      screen: screenName,
      duration: loadTime,
    });

    if (loadTime > 500) {
      console.warn(`${screenName} loaded slowly: ${loadTime}ms`);
    }
  }, []);
};
```

## Data Loading Strategy

### HomeScreen Data
```typescript
// Prioritize above-the-fold content
const useHomeData = () => {
  // P0: Load immediately (visible without scroll)
  const greeting = useGreeting(); // Local computation
  const todayStats = useTodayStats(); // Cached or quick fetch
  const streak = useStreak(); // Cached

  // P1: Load second (below fold)
  const recentActivity = useRecentActivity();
  const quickActions = useQuickActions();

  // P2: Load in background (can wait)
  const suggestions = useSuggestions();

  return {
    greeting,
    todayStats,
    streak,
    recentActivity,
    quickActions,
    suggestions,
  };
};
```

### ProfileScreen Data
```typescript
// Cache user data, refresh in background
const useProfileData = () => {
  const user = useCachedUser(); // Instant from cache
  const stats = useCachedStats(); // Instant from cache
  const badges = useCachedBadges(); // Instant from cache

  // Refresh in background
  useEffect(() => {
    refreshUserData().then(updateCache);
  }, []);

  return { user, stats, badges };
};
```

## Coordination Tasks

### 1. Consistent Header Pattern
All screens should use a unified header approach:

```typescript
// Standard header for core screens
const CoreHeader = ({ title, showBack, showSettings }) => (
  <Animated.View style={[styles.header, animatedBlurStyle]}>
    {showBack && <BackButton />}
    <Text style={styles.title}>{title}</Text>
    {showSettings && <SettingsButton />}
  </Animated.View>
);
```

### 2. Tab Bar Consistency
Bottom tab bar should be identical across these screens:

```typescript
const TabBarConfig = {
  home: { icon: 'home', activeIcon: 'home', label: 'Home' },
  study: { icon: 'timer-outline', activeIcon: 'timer', label: 'Study' },
  community: { icon: 'people-outline', activeIcon: 'people', label: 'Community' },
  profile: { icon: 'person-outline', activeIcon: 'person', label: 'Profile' },
};
```

### 3. Quick Actions Mapping
Home quick actions should navigate smoothly:

```typescript
const QuickActions = [
  { id: 'start_session', icon: 'play', label: 'Start Session', screen: 'FocusPreparation' },
  { id: 'view_analytics', icon: 'stats-chart', label: 'Analytics', screen: 'Analytics' },
  { id: 'join_room', icon: 'people', label: 'Study Room', screen: 'StudyRoom' },
  { id: 'ask_nora', icon: 'sparkles', label: 'Ask Nora', screen: 'Nora' },
];
```

### 4. Profile Menu Organization
Settings should be logically grouped:

```typescript
const ProfileMenu = [
  {
    title: 'Account',
    items: [
      { icon: 'person', label: 'Edit Profile', screen: 'ProfileEdit' },
      { icon: 'star', label: 'Subscription', screen: 'Subscription' },
      { icon: 'shield', label: 'Privacy', screen: 'Privacy' },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { icon: 'notifications', label: 'Notifications', screen: 'NotificationSettings' },
      { icon: 'color-palette', label: 'Appearance', screen: 'AppearanceSettings' },
      { icon: 'volume-high', label: 'Sounds', screen: 'SoundSettings' },
    ],
  },
  {
    title: 'AI Companions',
    items: [
      { icon: 'sparkles', label: 'Nora Settings', screen: 'NoraSettings' },
      { icon: 'fitness', label: 'Patrick Settings', screen: 'PatrickSettings' },
    ],
  },
  {
    title: 'Support',
    items: [
      { icon: 'help-circle', label: 'Help Center', screen: 'Help' },
      { icon: 'chatbubble', label: 'Contact Us', screen: 'Contact' },
      { icon: 'star', label: 'Rate App', action: 'rateApp' },
    ],
  },
];
```

## Visual Language

### Stats Display Pattern
```typescript
// Consistent stat card across screens
const StatCard = ({ icon, value, label, trend, color }) => (
  <TouchableOpacity style={[styles.statCard, { borderLeftColor: color }]}>
    <View style={styles.iconContainer}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <AnimatedNumber value={value} style={styles.value} />
    <Text style={styles.label}>{label}</Text>
    {trend && <TrendIndicator value={trend} />}
  </TouchableOpacity>
);
```

### Empty State Pattern
```typescript
// Consistent empty state with Nora
const EmptyState = ({ title, message, action }) => (
  <View style={styles.emptyContainer}>
    <NoraMascot mood="suggesting" size="large" />
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptyMessage}>{message}</Text>
    {action && (
      <AnimatedButton onPress={action.onPress}>
        {action.label}
      </AnimatedButton>
    )}
  </View>
);
```

## Quality Checklist

### Performance
- [ ] HomeScreen loads in < 300ms
- [ ] ProfileScreen scroll is 60fps
- [ ] SettingsScreen toggles respond instantly
- [ ] No layout shifts during data load

### Visual Polish
- [ ] Greeting is time-appropriate
- [ ] Stats animate on load (count-up)
- [ ] Profile parallax works smoothly
- [ ] Icons are consistent (all lined or all filled)

### Interaction
- [ ] Pull-to-refresh on Home and Profile
- [ ] Haptic feedback on all taps
- [ ] Smooth transitions to child screens
- [ ] Back gestures work correctly

## Report Format

```markdown
## Core Experience Enhancement Report

### HomeScreen
- [x] Load time: 280ms (target: 300ms)
- [x] Greeting: Time-based animation
- [x] Stats: Count-up + trend indicators
- [x] Quick actions: Grid with press states

### ProfileScreen
- [x] Parallax header: 60fps scroll
- [x] Stats grid: 3-column layout
- [x] Achievements: Holographic preview
- [x] Menu: Grouped sections

### SettingsScreen
- [x] Custom toggles: Spring animation
- [x] Section headers: Sticky blur
- [x] All options accessible

### Consistency Verification
- [x] Header pattern: Unified
- [x] Tab bar: Identical across screens
- [x] Empty states: Nora integrated
- [x] Icon style: Lined inactive, filled active

### Performance Metrics
- Home cold start: 280ms
- Profile scroll FPS: 60
- Settings interaction delay: < 16ms
```
