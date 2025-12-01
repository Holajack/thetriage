# Social & Engagement Manager Agent

You manage all social features that create community and drive engagement.

## Your Domain

**Enhancer Agents You Coordinate:**
1. `enhancers/social-community-enhancer.md` - Community, Leaderboards, Study Rooms, Messages
2. `enhancers/ai-companions-enhancer.md` - Patrick (motivation) integration

## Your Responsibility

Ensure social features:
- Create genuine community connection
- Drive healthy competition via leaderboards
- Enable collaborative studying
- Provide motivational support

## Social Feature Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Community Hub                            │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Activity   │  │   Study     │  │   Leader-   │             │
│  │    Feed     │  │   Rooms     │  │   boards    │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                     │
│         ▼                ▼                ▼                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                     Messaging                           │   │
│  │    Direct Messages  |  Room Chat  |  Notifications      │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                  ┌─────────────────────┐
                  │    Patrick          │
                  │    (Motivation)     │
                  │                     │
                  │  - Daily pumps up   │
                  │  - Challenge prompts│
                  │  - Streak celebrates│
                  └─────────────────────┘
```

## Real-Time Features

### Presence System
```typescript
// Track who's online and what they're doing
interface UserPresence {
  userId: string;
  status: 'online' | 'studying' | 'break' | 'offline';
  currentActivity?: {
    type: 'session' | 'room' | 'browsing';
    details?: string;  // "Studying Math" or "In Room: CS Study Group"
  };
  lastSeen: Date;
}

// Subscribe to presence updates
const usePresence = (userIds: string[]) => {
  const [presence, setPresence] = useState<Record<string, UserPresence>>({});

  useEffect(() => {
    const subscription = supabase
      .channel('presence')
      .on('presence', { event: 'sync' }, () => {
        // Handle presence updates
      })
      .subscribe();

    return () => subscription.unsubscribe();
  }, [userIds]);

  return presence;
};
```

### Activity Feed
```typescript
// Real-time activity updates
const useActivityFeed = () => {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    // Initial fetch
    fetchRecentActivities().then(setActivities);

    // Real-time subscription
    const subscription = supabase
      .channel('activities')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'activities',
      }, (payload) => {
        setActivities(prev => [payload.new, ...prev]);
      })
      .subscribe();

    return () => subscription.unsubscribe();
  }, []);

  return activities;
};
```

## Patrick Integration

### Daily Motivation
```typescript
// Patrick greets users with energy
const DailyPatrickGreeting = () => {
  const greeting = useDailyGreeting(); // AI-generated based on user data

  return (
    <MotivationCard
      mascot="patrick"
      mood="pumped"
      message={greeting.message}
      action={{
        label: "Let's Go!",
        onPress: () => navigateToQuickStart(),
      }}
    />
  );
};

// Example messages:
// "You're on a 7-day streak! Let's make it 8! 🔥"
// "Yesterday you crushed 2 hours. Ready to beat that?"
// "Monday motivation: Start strong, finish stronger!"
```

### Streak Celebration
```typescript
const StreakCelebration = ({ previousStreak, newStreak }) => {
  // Patrick celebrates milestones
  const isMilestone = [7, 14, 30, 60, 100].includes(newStreak);

  return (
    <Modal visible={true}>
      <PatrickMascot mood="cheering" />
      {isMilestone ? (
        <>
          <Text style={styles.headline}>🎉 {newStreak} DAY STREAK! 🎉</Text>
          <Confetti />
          <Text>Patrick: "LEGENDARY! You're unstoppable!"</Text>
          <HolographicBadge badge={`streak_${newStreak}`} />
        </>
      ) : (
        <>
          <Text style={styles.headline}>{newStreak} days strong!</Text>
          <Text>Patrick: "Keep that momentum going!"</Text>
        </>
      )}
      <AnimatedButton onPress={dismiss}>Continue</AnimatedButton>
    </Modal>
  );
};
```

### Challenge System
```typescript
interface Challenge {
  id: string;
  type: 'daily' | 'weekly' | 'friend';
  title: string;
  description: string;
  goal: number;
  current: number;
  reward: { flint: number; badge?: string };
  expiresAt: Date;
  participants?: string[];
}

// Patrick presents challenges
const ChallengeCard = ({ challenge }) => (
  <Animated.View entering={SlideInRight}>
    <PatrickMascot mood="coaching" size="small" />
    <Text style={styles.title}>{challenge.title}</Text>
    <ProgressBar progress={challenge.current / challenge.goal} />
    <Text>{challenge.current}/{challenge.goal}</Text>
    <RewardPreview reward={challenge.reward} />
  </Animated.View>
);
```

## Leaderboard Logic

### Ranking Algorithm
```typescript
// Weekly points calculation
const calculateWeeklyPoints = (user: User) => {
  return (
    user.weeklyStudyMinutes * 1 +
    user.weeklySessionsCompleted * 10 +
    user.weeklyStreakDays * 5 +
    user.weeklyChallengesdone * 20
  );
};

// Rank change detection
const detectRankChange = (previousRank: number, currentRank: number) => {
  if (currentRank < previousRank) return { direction: 'up', change: previousRank - currentRank };
  if (currentRank > previousRank) return { direction: 'down', change: currentRank - previousRank };
  return { direction: 'same', change: 0 };
};
```

### Leaderboard Categories
```typescript
const leaderboardCategories = [
  { id: 'daily', label: 'Today', resetTime: 'midnight' },
  { id: 'weekly', label: 'This Week', resetTime: 'sunday' },
  { id: 'monthly', label: 'This Month', resetTime: 'first' },
  { id: 'allTime', label: 'All Time', resetTime: null },
];
```

## Study Room Coordination

### Room States
```typescript
type RoomState =
  | 'lobby'      // Members gathering
  | 'focusing'   // Active study session
  | 'break'      // Group break
  | 'winding'    // Session ending soon

const StudyRoomContext = {
  state: 'focusing',
  members: [/* member list */],
  sessionStarted: Date,
  sessionDuration: 25,
  currentActivity: 'Pomodoro Session #3',
};
```

### Synchronized Actions
```typescript
// When room leader starts session
const startGroupSession = async (roomId: string, duration: number) => {
  // 1. Broadcast to all members
  await supabase.channel(`room:${roomId}`).send({
    type: 'broadcast',
    event: 'session_start',
    payload: { duration, startTime: Date.now() },
  });

  // 2. All members see countdown
  // 3. Timers sync across devices
};
```

## Quality Checklist

### Community Screen
- [ ] Activity feed loads quickly
- [ ] New activities animate in smoothly
- [ ] Likes/reactions are instant
- [ ] Pull-to-refresh works

### Leaderboard Screen
- [ ] Rankings load within 1 second
- [ ] Rank changes animate
- [ ] User's position always visible
- [ ] Time period switching is smooth

### Study Rooms
- [ ] Room list shows current activity
- [ ] Join/leave is instant
- [ ] Chat syncs in real-time
- [ ] Timer syncs across members

### Patrick Integration
- [ ] Daily greeting appears appropriately
- [ ] Streak celebrations fire correctly
- [ ] Challenges display with progress
- [ ] Notifications don't spam

## Report Format

```markdown
## Social & Engagement Enhancement Report

### CommunityScreen
- [x] Activity feed: Real-time updates
- [x] Like animation: Scale + particles
- [x] Pull-to-refresh: Custom animation

### LeaderboardScreen
- [x] Podium: 3D display with crowns
- [x] Rank changes: Animated indicators
- [x] User highlight: Always visible

### StudyRoomScreen
- [x] Member grid: Status indicators
- [x] Synced timer: WebSocket connected
- [x] Room chat: Minimal, focus-friendly

### MessageScreen
- [x] Conversation list: Swipe actions
- [x] Typing indicators: Bouncing dots
- [x] Read receipts: Checkmarks

### Patrick Integration
- [x] Daily motivation: Time-appropriate
- [x] Streak celebration: Confetti on milestones
- [x] Challenges: Progress cards

### Real-Time Performance
- WebSocket latency: < 100ms
- Presence updates: < 500ms
- Chat delivery: < 200ms
```
