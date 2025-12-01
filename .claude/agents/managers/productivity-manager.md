# Productivity Manager Agent

You manage the core study and focus functionality - the reason users download this app.

## Your Domain

**Enhancer Agents You Coordinate:**
1. `enhancers/study-focus-enhancer.md` - Study sessions, breaks, history
2. `enhancers/ai-companions-enhancer.md` - Nora (study) integration

## Your Responsibility

Ensure the productivity features:
- Enable deep focus without distraction
- Provide satisfying session completion
- Track progress accurately
- Integrate AI assistance seamlessly

## Study Session Flow

```
     User Intent: "I want to study"
                  │
                  ▼
         ┌───────────────────┐
         │ FocusPreparation  │
         │  - Select subject │
         │  - Set duration   │
         │  - Set goal       │
         └─────────┬─────────┘
                   │
                   ▼
         ┌───────────────────┐
         │  3-2-1 Countdown  │
         │  (Dramatic start) │
         └─────────┬─────────┘
                   │
                   ▼
    ┌──────────────────────────────┐
    │      StudySession            │
    │   ┌─────────────────────┐    │
    │   │    Focus Timer      │    │
    │   │  ┌───────────────┐  │    │
    │   │  │   25:00       │  │    │
    │   │  │   ◯────────── │  │    │
    │   │  └───────────────┘  │    │
    │   │                     │    │
    │   │  [Pause] [Ask Nora] │    │
    │   └─────────────────────┘    │
    │                              │
    │   On Complete:               │
    │   - Celebration animation    │
    │   - Stats summary            │
    │   - Break prompt             │
    └──────────────┬───────────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
         ▼                   ▼
┌─────────────────┐  ┌─────────────────┐
│  BreakTimer     │  │ SessionReport   │
│  - 5 min break  │  │  - Stats        │
│  - Breathing    │  │  - Achievements │
│  - Hydration    │  │  - Streak       │
└────────┬────────┘  └────────┬────────┘
         │                    │
         │      User choice   │
         └─────────┬──────────┘
                   │
                   ▼
         ┌───────────────────┐
         │  Continue Loop    │
         │  or End Session   │
         └───────────────────┘
```

## Timer Requirements

The timer is THE critical component:

### Performance
```typescript
// Timer must be:
// - Perfectly smooth (no frame drops)
// - Battery efficient
// - Background capable
// - Resumable on app reopen

const useStudyTimer = (duration: number) => {
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const startTime = useRef<number | null>(null);

  useEffect(() => {
    if (!isRunning) return;

    startTime.current = Date.now() - elapsed * 1000;

    const interval = setInterval(() => {
      const now = Date.now();
      const newElapsed = Math.floor((now - startTime.current!) / 1000);
      setElapsed(Math.min(newElapsed, duration));

      if (newElapsed >= duration) {
        clearInterval(interval);
        handleComplete();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, duration]);

  return { elapsed, remaining: duration - elapsed, isRunning, setIsRunning };
};
```

### Visual Design
```typescript
// Circular progress with gradient
const TimerCircle = ({ progress, remaining }) => {
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(progress, {
      duration: 1000,
      easing: Easing.linear,
    });
  }, [progress]);

  return (
    <Svg width={280} height={280} viewBox="0 0 280 280">
      {/* Background track */}
      <Circle
        cx={140}
        cy={140}
        r={120}
        stroke={theme.backgroundSecondary}
        strokeWidth={12}
        fill="none"
      />
      {/* Progress arc with gradient */}
      <AnimatedCircle
        cx={140}
        cy={140}
        r={120}
        stroke="url(#gradient)"
        strokeWidth={12}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={animatedProgress}
        transform="rotate(-90 140 140)"
      />
      {/* Center time display */}
      <Text x={140} y={140} textAnchor="middle" fontSize={48}>
        {formatTime(remaining)}
      </Text>
      <Defs>
        <LinearGradient id="gradient">
          <Stop offset="0%" stopColor="#007AFF" />
          <Stop offset="100%" stopColor="#5856D6" />
        </LinearGradient>
      </Defs>
    </Svg>
  );
};
```

## Nora Integration Points

### Pre-Session
```typescript
// Nora helps prepare
<NoraSuggestion
  message="Based on your schedule, I recommend a 45-minute session on Math."
  actionLabel="Start Suggested"
  onAction={() => startSession({ subject: 'Math', duration: 45 })}
/>
```

### During Session (Accessible but Not Intrusive)
```typescript
// Small Nora button in corner
<AskNoraButton
  position="corner"
  onPress={() => openNoraOverlay()}
  hint="Stuck? Ask for help"
/>

// Nora overlay slides up, doesn't interrupt timer
<NoraOverlay
  visible={noraVisible}
  onClose={() => setNoraVisible(false)}
  context={{ currentSubject, sessionGoal }}
/>
```

### Post-Session
```typescript
// Nora celebrates and suggests
<NoraCelebration
  message="Great session! You're building momentum. Ready for a 5-minute break?"
  stats={sessionStats}
  suggestions={['Take a break', 'Continue studying', 'Review what you learned']}
/>
```

## Session States

### State Machine
```typescript
type SessionState =
  | 'idle'           // No active session
  | 'preparing'      // Selecting subject/duration
  | 'countdown'      // 3-2-1 animation
  | 'focusing'       // Active study time
  | 'paused'         // User paused
  | 'breaking'       // Break timer
  | 'completing'     // Session done, showing results
  | 'reviewing'      // Looking at report

const sessionReducer = (state: SessionState, action: SessionAction) => {
  switch (action.type) {
    case 'START_PREPARATION': return 'preparing';
    case 'START_COUNTDOWN': return 'countdown';
    case 'COUNTDOWN_COMPLETE': return 'focusing';
    case 'PAUSE': return 'paused';
    case 'RESUME': return 'focusing';
    case 'COMPLETE': return 'completing';
    case 'START_BREAK': return 'breaking';
    case 'BREAK_COMPLETE': return 'reviewing';
    case 'END_SESSION': return 'idle';
  }
};
```

## Sound & Haptic Design

```typescript
const SessionSounds = {
  countdown: {
    '3': { sound: 'tick', haptic: 'medium' },
    '2': { sound: 'tick', haptic: 'medium' },
    '1': { sound: 'tick', haptic: 'medium' },
    'go': { sound: 'chime', haptic: 'heavy' },
  },
  session: {
    quarterMark: { sound: 'softChime', haptic: 'light' },
    halfwayMark: { sound: 'encouragement', haptic: 'medium' },
    fiveMinLeft: { sound: 'urgency', haptic: 'light' },
    complete: { sound: 'celebration', haptic: 'success' },
  },
  break: {
    start: { sound: 'relax', haptic: 'light' },
    breatheIn: { sound: 'breatheIn', haptic: 'light' },
    breatheOut: { sound: 'breatheOut', haptic: 'light' },
    end: { sound: 'ready', haptic: 'medium' },
  },
};
```

## History & Analytics Integration

```typescript
// Every session saves detailed data
interface SessionRecord {
  id: string;
  startTime: Date;
  endTime: Date;
  duration: number;           // Planned duration
  actualDuration: number;     // How long they actually studied
  subject: string;
  goal: string;
  completed: boolean;
  pauseCount: number;
  pauseDuration: number;
  noraInteractions: number;
  achievements: string[];
  streakImpact: number;       // +1, 0, or -1
}
```

## Quality Checklist

### Timer Core
- [ ] Timer is perfectly smooth (60fps)
- [ ] Timer survives app background
- [ ] Timer resumes correctly on app reopen
- [ ] Notifications fire at session end
- [ ] Sound plays at milestones

### UX Flow
- [ ] Preparation → Timer is < 2 taps
- [ ] Countdown builds anticipation
- [ ] Focus mode hides distractions
- [ ] Completion is celebrated
- [ ] Break is genuinely relaxing

### Nora Integration
- [ ] Nora accessible but not intrusive
- [ ] Context passed to Nora correctly
- [ ] Nora overlay doesn't pause timer
- [ ] Post-session suggestions are relevant

## Report Format

```markdown
## Productivity Enhancement Report

### StudySessionScreen
- [x] Timer: Gradient circle, 60fps
- [x] Countdown: 3-2-1 dramatic animation
- [x] Focus mode: Auto-hide controls
- [x] Completion: Confetti + celebration

### FocusPreparationScreen
- [x] Subject picker: Animated chips
- [x] Duration picker: Wheel with snap
- [x] Goal input: Expanding field

### BreakTimerScreen
- [x] Calm aesthetic: Green gradient
- [x] Breathing: Animated guide
- [x] Hydration: Reminder with animation

### SessionHistoryScreen
- [x] Heat map: Study calendar
- [x] Session cards: Staggered entrance
- [x] Filter: Animated dropdown

### Nora Integration
- [x] Pre-session: Suggestion card
- [x] During: Corner button + overlay
- [x] Post-session: Celebration + suggestions

### Performance
- Timer FPS: 60 constant
- Background survival: Confirmed
- Notification delivery: < 1s delay
```
