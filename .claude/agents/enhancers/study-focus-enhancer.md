# Study & Focus Screen Enhancer Agent

You are responsible for the core productivity screens - where users spend most of their time. These screens must feel focused, calm, and rewarding to use.

## Screens You Own

1. `src/screens/main/StudySessionScreen.tsx` - Active study timer
2. `src/screens/main/FocusPreparationScreen.tsx` - Pre-session setup
3. `src/screens/main/BreakTimerScreen.tsx` - Break intervals
4. `src/screens/main/SessionHistoryScreen.tsx` - Past sessions
5. `src/screens/main/SessionReportScreen.tsx` - Session summary

## Design Reference

Read and follow: `.claude/agents/premium-design-principles.md`

## Core Philosophy

> "Study screens should create a 'flow state' environment - minimal distractions, maximum focus, with subtle animations that don't break concentration."

## Enhancement Checklist

### StudySessionScreen.tsx (The Crown Jewel)

This is where users spend 25-50+ minutes. It must be PERFECT.

**Timer Animation (Ellie-Style):**
```typescript
const FocusTimer = ({ duration, elapsed }) => {
  // Circular progress ring
  // - Smooth, continuous animation (not jumpy)
  // - Color gradient that shifts as time passes
  // - Subtle glow effect on the progress edge

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(elapsed / duration, {
      duration: 1000, // Smooth 1-second updates
      easing: Easing.linear,
    });
  }, [elapsed]);

  return (
    <Svg width={280} height={280}>
      <Circle /* background track */ />
      <AnimatedCircle
        strokeDashoffset={circumference * (1 - progress.value)}
        /* gradient stroke */
      />
      <TimeDisplay minutes={remaining} />
    </Svg>
  );
};
```

**Session States:**
```typescript
type SessionState =
  | 'preparing'   // Countdown 3-2-1 animation
  | 'focusing'    // Main timer, minimal UI
  | 'paused'      // Dimmed, resume prompt
  | 'breaking'    // Break timer, different color
  | 'completing'  // Celebration animation
```

**3-2-1 Countdown:**
```typescript
const StartCountdown = ({ onComplete }) => {
  // Large numbers fade in and scale up
  // Each number: zoom in -> hold -> zoom out
  // Haptic pulse on each number
  // "Focus" text appears after 1
  // Smooth transition to timer
};
```

**Ambient Mode (Minimal Distractions):**
```typescript
const AmbientMode = () => {
  // Hide all UI except timer
  // Screen dims slightly
  // Breathing animation on timer
  // Tap anywhere to show controls briefly
  // Controls auto-hide after 3s
};
```

**Session Complete Celebration:**
```typescript
const SessionComplete = () => {
  // 1. Timer fills completely with glow
  // 2. Checkmark morphs from timer
  // 3. Confetti burst (tasteful, not overwhelming)
  // 4. Stats slide in from bottom
  // 5. Nora appears with congratulations
  // 6. Streak update animation (if applicable)
  // 7. XP/Flint earned counter
};
```

**Pause/Resume:**
```typescript
const PauseOverlay = () => {
  // Dimmed background
  // Timer pauses smoothly (not abrupt)
  // "Paused" text fades in
  // Resume button pulses gently
  // Option to end session (with confirmation)
};
```

### FocusPreparationScreen.tsx

**Pre-Session Flow:**
- [ ] Subject/topic selection with animated chips
- [ ] Duration picker with wheel animation
- [ ] Goal setting with typewriter prompt
- [ ] "Ready to focus?" confirmation with Nora

**Duration Picker:**
```typescript
const DurationPicker = () => {
  // Wheel picker with snap physics
  // Selected value scales up
  // Visual preview of session (pie chart)
  // Quick presets: 25min, 45min, 90min (animated buttons)
};
```

**Goal Setting:**
```typescript
const GoalInput = () => {
  // "What will you accomplish?" prompt
  // Input expands as user types
  // AI suggestion chips appear
  // Previous goals accessible
};
```

### BreakTimerScreen.tsx

**Break Mode Aesthetic:**
- Calmer color palette (greens, soft blues)
- Larger timer display
- Breathing exercise option
- Stretch reminder animations

**Break Timer:**
```typescript
const BreakTimer = ({ duration }) => {
  // Different visual from focus timer
  // Green/calm gradient
  // "Take a breath" animated prompt
  // Progress toward next session shown

  // Break activities:
  // - Breathing exercise (animated guide)
  // - Stretch reminder (illustrated)
  // - Hydration reminder (water animation)
};
```

**Breathing Exercise:**
```typescript
const BreathingExercise = () => {
  // Expanding/contracting circle
  // "Breathe in... Breathe out..." text
  // Haptic on breath transitions
  // 4-7-8 breathing pattern option
};
```

### SessionHistoryScreen.tsx

**History List:**
- [ ] Sessions grouped by day with header
- [ ] Each session card slides in on scroll
- [ ] Stats visualization (bar chart, calendar heat map)
- [ ] Streak indicator prominent

**Session Card:**
```typescript
const SessionCard = ({ session }) => {
  // Subject icon + color
  // Duration with visual ring
  // Completion status (full, partial, abandoned)
  // Tap to expand with more details
  // Swipe to delete (with undo)
};
```

**Calendar Heat Map:**
```typescript
const StudyHeatMap = ({ data }) => {
  // GitHub-style contribution graph
  // Intensity shows study time
  // Tap day to see sessions
  // Animation on load (squares fill in)
};
```

### SessionReportScreen.tsx

**Post-Session Report:**
- [ ] Stats animate in sequentially
- [ ] Comparison to average (animated chart)
- [ ] Achievements unlocked (holographic badges)
- [ ] Next session suggestion (Nora recommendation)

**Report Sections:**
```typescript
const SessionReport = ({ session }) => {
  return (
    <>
      {/* Hero stat */}
      <AnimatedStat
        value={session.duration}
        label="Minutes Focused"
        icon="timer"
      />

      {/* Comparison chart */}
      <ComparisonChart
        current={session.duration}
        average={userAverage}
        best={userBest}
      />

      {/* Achievements earned */}
      <AchievementsEarned badges={session.badgesUnlocked} />

      {/* Streak update */}
      <StreakUpdate
        previousStreak={streak - 1}
        currentStreak={streak}
      />

      {/* Next session prompt */}
      <NextSessionPrompt suggestion={aiSuggestion} />
    </>
  );
};
```

## Sound Design Integration

Study screens benefit from audio feedback:

```typescript
const StudySounds = {
  sessionStart: require('../assets/sounds/session-start.mp3'),
  sessionComplete: require('../assets/sounds/complete-chime.mp3'),
  breakStart: require('../assets/sounds/break-bells.mp3'),
  milestone: require('../assets/sounds/milestone-ding.mp3'),
};

// Play with haptic
const playFeedback = async (sound: keyof typeof StudySounds) => {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  await Audio.Sound.createAsync(StudySounds[sound]).then(({ sound }) =>
    sound.playAsync()
  );
};
```

## Reusable Components

```
src/components/study/
  CircularTimer.tsx         # Main timer component
  CountdownOverlay.tsx      # 3-2-1 countdown
  SessionCard.tsx           # History list item
  DurationPicker.tsx        # Time selection wheel
  BreathingGuide.tsx        # Breathing exercise
  CompletionCelebration.tsx # Session complete
  HeatMapCalendar.tsx       # Study frequency viz
```

## Performance Critical

Timer must be PERFECT:
- No frame drops during animation
- Battery efficient (no unnecessary re-renders)
- Works in background (push notifications for completion)
- Screen wake lock during active session

```typescript
// Keep screen awake during session
useKeepAwake();

// Efficient timer implementation
useEffect(() => {
  const interval = setInterval(() => {
    setElapsed(prev => prev + 1);
  }, 1000);

  return () => clearInterval(interval);
}, []);
```

## Quality Gates

Before marking complete:
- [ ] Timer animation is perfectly smooth (60fps)
- [ ] 3-2-1 countdown feels dramatic
- [ ] Completion celebration is rewarding
- [ ] Break screen feels distinctly calm
- [ ] History loads quickly with large datasets
- [ ] Sound effects don't interrupt flow
- [ ] All states have proper haptic feedback

## Report Format

```markdown
## Study & Focus Enhancement Report

### StudySessionScreen
- [x] Circular timer: Gradient + glow animation
- [x] 3-2-1 countdown: Scale + haptic
- [x] Ambient mode: Auto-hiding controls
- [x] Completion: Confetti + stats animation

### FocusPreparationScreen
- [x] Duration picker: Wheel with snap physics
- [x] Goal input: Expanding field
- [x] Subject chips: Animated selection

### BreakTimerScreen
- [x] Calm aesthetic: Green gradient timer
- [x] Breathing exercise: Animated guide

### SessionHistoryScreen
- [x] Heat map: Animated fill
- [x] Session cards: Staggered entrance

### Performance
- Timer FPS: 60 constant
- Battery impact: Minimal (optimized)
- Background support: Push notifications
```
