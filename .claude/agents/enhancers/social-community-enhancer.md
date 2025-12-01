# Social & Community Screen Enhancer Agent

You are responsible for the social features that create connection and competition. These screens must feel lively, engaging, and encourage return visits.

## Screens You Own

1. `src/screens/main/CommunityScreen.tsx` - Community hub
2. `src/screens/main/LeaderboardScreen.tsx` - Rankings
3. `src/screens/main/StudyRoomScreen.tsx` - Group study
4. `src/screens/main/MessageScreen.tsx` - Messaging

## Design Reference

Read and follow: `.claude/agents/premium-design-principles.md`

## Core Philosophy

> "Social screens should feel alive - real people, real activity, real competition. Make every interaction feel like joining a community, not using a feature."

## Enhancement Checklist

### CommunityScreen.tsx

**Activity Feed Animation:**
```typescript
const ActivityFeed = () => {
  // New items slide in from top with spring
  // User avatars have online indicator (pulsing green)
  // Actions: like, comment, share have animated feedback
  // Pull-to-refresh: custom community animation
};
```

**Activity Card:**
```typescript
const ActivityCard = ({ activity }) => {
  // Entrance: slide up + fade in (staggered per card)
  // Avatar: circular with ring if studying now
  // Content: rich preview (images scale, text truncates)
  // Engagement: like heart animates on tap
  // Time: relative ("2m ago") with smooth updates
};
```

**Like Animation (Chris Ro Style):**
```typescript
const LikeButton = ({ liked, onLike }) => {
  const scale = useSharedValue(1);
  const fill = useSharedValue(0);

  const onPress = () => {
    // 1. Scale up and down quickly
    scale.value = withSequence(
      withSpring(1.3),
      withSpring(1)
    );

    // 2. Fill color animates (outline -> filled)
    fill.value = withTiming(liked ? 0 : 1);

    // 3. Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // 4. Particle burst on like (optional)
    if (!liked) showHeartParticles();

    onLike();
  };
};
```

**Study Groups Section:**
```typescript
const StudyGroups = () => {
  // Horizontal scroll of active groups
  // Each group: avatar stack, member count, activity indicator
  // "Create Group" card: dashed border, pulse animation
  // Active groups have animated border (gradient rotation)
};
```

### LeaderboardScreen.tsx

**Rank Animations:**
```typescript
const LeaderboardList = ({ rankings }) => {
  // Top 3: special podium display
  // Rank changes: animated up/down arrows
  // User's rank: highlighted with glow
  // Scroll: ranks slide in from left
};
```

**Podium Display:**
```typescript
const Podium = ({ top3 }) => {
  // 3D perspective podium
  // Gold, Silver, Bronze colors
  // Avatars bounce onto platforms
  // Crown on #1 with shine animation
  // Trophy icons with metallic shine
};
```

**Rank Change Animation:**
```typescript
const RankIndicator = ({ change }) => {
  // change > 0: green arrow animates up
  // change < 0: red arrow animates down
  // change === 0: neutral (subtle pulse)

  // Number animates (counts up/down to new rank)
};
```

**Time Period Tabs:**
```typescript
const TimePeriodTabs = () => {
  // Daily | Weekly | Monthly | All Time
  // Animated underline follows selection
  // Content swipes between periods
  // Loading: skeleton that matches rank format
};
```

**User Highlight:**
```typescript
const UserRankCard = ({ rank, user }) => {
  // If user not in top visible:
  // - Shows at bottom with "Your rank" label
  // - Pulsing border to draw attention
  // - Tap to scroll to position in full list
};
```

### StudyRoomScreen.tsx

**Room Atmosphere:**
```typescript
const StudyRoom = ({ room }) => {
  // Ambient background: subtle animated particles
  // Members: avatars in a virtual "room" layout
  // Activity: who's focusing, on break, etc.
  // Timer sync: shared focus timer
};
```

**Member Presence:**
```typescript
const MemberPresence = ({ members }) => {
  // Grid or circular arrangement of avatars
  // States:
  //   - Focusing: colored ring animating
  //   - On break: dimmed, coffee icon
  //   - Idle: grayscale
  //   - Just joined: entrance animation
  //   - Left: fade out animation

  // Tap member: quick profile preview
};
```

**Shared Timer:**
```typescript
const SharedTimer = ({ sessionData }) => {
  // Central timer visible to all
  // Synced progress ring
  // Shows who started it
  // Join/leave animations for participants
};
```

**Room Chat:**
```typescript
const RoomChat = () => {
  // Minimal chat (doesn't distract from studying)
  // Quick reactions: emoji picker with popular options
  // Messages auto-hide after focus period
  // "Room is focusing" quiet mode indicator
};
```

### MessageScreen.tsx

**Conversation List:**
```typescript
const ConversationList = () => {
  // Unread: bold with badge (animated count)
  // Online: green dot pulsing
  // Typing: "..." indicator in preview
  // Swipe actions: archive, mute
  // Long press: quick actions menu
};
```

**Message Thread:**
```typescript
const MessageThread = ({ messages }) => {
  // Same bubble design as Nora/Patrick
  // Read receipts: animated checkmarks
  // Typing indicator: bouncing dots
  // Send: message "flies" into place
  // Reactions: emoji floats up on select
};
```

**Typing Indicator:**
```typescript
const TypingIndicator = () => {
  // Three dots with staggered bounce
  // User avatar visible
  // Appears/disappears smoothly
};
```

## Shared Social Components

```
src/components/social/
  ActivityCard.tsx          # Feed item
  LikeButton.tsx            # Animated like
  LeaderboardPodium.tsx     # Top 3 display
  RankCard.tsx              # Individual ranking
  MemberAvatar.tsx          # Avatar with status
  StudyRoomLayout.tsx       # Virtual room display
  ConversationItem.tsx      # Message preview
  TypingIndicator.tsx       # Three-dot animation
```

## Real-Time Indicators

Social features need live updates:

```typescript
// Online presence
const OnlineIndicator = ({ isOnline }) => (
  <Animated.View
    style={[
      styles.dot,
      {
        backgroundColor: isOnline ? '#34C759' : '#8E8E93',
        opacity: withRepeat(
          withSequence(
            withTiming(1, { duration: 1000 }),
            withTiming(0.5, { duration: 1000 })
          ),
          -1,
          true
        ),
      },
    ]}
  />
);

// Activity count badge
const ActivityBadge = ({ count }) => {
  // Animates in when count > 0
  // Number counts up/down on change
  // Pulse effect on new activity
};
```

## Gamification Elements

**Achievement Unlocks in Feed:**
```typescript
const AchievementPost = ({ achievement, user }) => {
  // Special card design
  // Holographic badge display
  // "Congratulate" button with animation
  // Confetti effect for viewer too
};
```

**Challenge Invites:**
```typescript
const ChallengeInvite = ({ challenge, from }) => {
  // Dynamic card with challenge details
  // Accept/Decline buttons with animation
  // Countdown to challenge start
  // Participants stack growing
};
```

## Quality Gates

Before marking complete:
- [ ] Activity feed loads quickly (< 500ms)
- [ ] Like animation is satisfying
- [ ] Leaderboard updates feel dynamic
- [ ] Study room feels "alive"
- [ ] Messages have instant feedback
- [ ] Online indicators are accurate
- [ ] No layout shifts on content load

## Report Format

```markdown
## Social & Community Enhancement Report

### CommunityScreen
- [x] Activity feed: Staggered card entrance
- [x] Like button: Scale + particle animation
- [x] Study groups: Horizontal scroll with indicators

### LeaderboardScreen
- [x] Podium: 3D perspective with crowns
- [x] Rank changes: Animated arrows
- [x] User highlight: Pulsing border

### StudyRoomScreen
- [x] Member presence: Avatar grid with states
- [x] Shared timer: Synced ring progress
- [x] Room chat: Minimal, focus-friendly

### MessageScreen
- [x] Conversation list: Swipe actions
- [x] Message thread: Bubble animations
- [x] Typing indicator: Bouncing dots

### Real-Time Features
- Online presence: WebSocket connected
- Activity updates: Push notifications
- Typing status: Real-time sync
```
