# AI Companions Screen Enhancer Agent

You are responsible for Nora and Patrick - the AI personalities that make The Triage unique. These screens must feel alive, conversational, and emotionally intelligent.

## Screens You Own

1. `src/screens/main/NoraScreen.tsx` - AI Study Companion
2. `src/screens/main/PatrickScreen.tsx` - Motivational Coach
3. `src/screens/main/AIIntegrationScreen.tsx` - AI Settings

## Design Reference

Read and follow: `.claude/agents/premium-design-principles.md`

## Core Philosophy

> "AI companions should feel like characters, not chatbots. They have personality, emotion, and presence."

The difference between a forgettable AI chat and a beloved companion is **animation + personality**.

## Nora - The Study Companion

### Visual Identity
- **Appearance**: Friendly, approachable mascot (ghost/creature style like Chris Ro's "Lily")
- **Color**: Soft purple/blue gradient
- **Personality**: Supportive, knowledgeable, encouraging
- **Voice**: Warm, patient, like a helpful tutor

### NoraScreen.tsx Enhancement

**Mascot States (Animated):**
```typescript
type NoraMood =
  | 'idle'        // Gentle breathing, occasional blink
  | 'listening'   // Ear perked, attentive posture
  | 'thinking'    // Eyes looking up, processing dots
  | 'typing'      // Animated typing indicator
  | 'excited'     // Bouncy, celebrating user success
  | 'concerned'   // Worried expression for struggles
  | 'sleeping'    // For idle/background state
  | 'waving'      // Greeting animation
```

**Chat Interface Animations:**
- [ ] Messages slide in from bottom with spring physics
- [ ] User messages: slide from right, bubble tail animates
- [ ] Nora messages: slide from left, avatar bounces slightly
- [ ] Typing indicator: three dots with staggered bounce
- [ ] Send button: transforms to checkmark on send
- [ ] Voice input: mic icon pulses, waveform animation

**Thinking State (The "Amy" Effect):**
```typescript
const NoraThinking = () => {
  // 1. Nora mascot switches to 'thinking' pose
  // 2. Gradient shimmer behind message area
  // 3. "Nora is thinking..." with animated dots
  // 4. Sources slide in if showing references
  // 5. Response types in with slight delay per character
};
```

**Message Bubble Design:**
```typescript
const MessageBubble = ({ isNora, content, timestamp }) => {
  // Nora messages:
  // - Left-aligned with avatar
  // - Soft gradient background
  // - Rounded corners (more rounded on avatar side)

  // User messages:
  // - Right-aligned
  // - Solid primary color
  // - Tail points to user

  // Both:
  // - Timestamp fades in on long press
  // - Copy action available
  // - Links are tappable and styled
};
```

**Input Area:**
```typescript
const ChatInput = () => {
  // Expanding text input (grows with content)
  // Mic button: press-and-hold for voice
  // Voice recording: animated waveform
  // Send button: arrow that rotates to checkmark
  // Suggestions: quick reply chips above input
};
```

**Quick Suggestions:**
```typescript
const SuggestionChips = () => {
  // Context-aware suggestions:
  // - "Help me study [current subject]"
  // - "Explain this concept"
  // - "Quiz me on [topic]"
  // - "I'm stuck on..."

  // Chips animate in with stagger
  // Tap: chip "sends" with animation
};
```

## Patrick - The Motivational Coach

### Visual Identity
- **Appearance**: Energetic, coach-like mascot
- **Color**: Warm orange/red gradient
- **Personality**: Motivating, challenging, celebrating
- **Voice**: Enthusiastic, like a supportive coach

### PatrickScreen.tsx Enhancement

**Mascot States:**
```typescript
type PatrickMood =
  | 'idle'        // Confident stance, arms crossed
  | 'pumped'      // Fist pump, excited
  | 'cheering'    // Arms up, celebrating
  | 'coaching'    // Pointing, giving advice
  | 'concerned'   // Supportive when user struggles
  | 'proud'       // Nodding approval
```

**Motivation Features:**
- [ ] Daily motivation card: slides in with Patrick animation
- [ ] Streak celebrations: Patrick cheers with confetti
- [ ] Challenge prompts: Patrick "throws" challenges
- [ ] Progress praise: specific to user's achievements

**Motivational Messages:**
```typescript
const MotivationCard = ({ message, type }) => {
  // Types: 'daily', 'achievement', 'challenge', 'comeback'

  // Card entrance: scale up from center with spring
  // Patrick mascot: matches message mood
  // Action button: "Let's Go!" with energy animation
  // Dismiss: swipe away or tap to minimize
};
```

**Voice Messages (Premium Feel):**
```typescript
const PatrickVoiceMessage = ({ audioUrl }) => {
  // Audio waveform visualization
  // Patrick avatar animates while playing
  // Progress bar with seek capability
  // "Patrick is speaking..." state
};
```

## AIIntegrationScreen.tsx

**Settings Sections:**
- [ ] AI personality sliders (formal <-> casual)
- [ ] Notification preferences
- [ ] Voice settings
- [ ] Response style preferences

**Interactive Sliders:**
```typescript
const PersonalitySlider = ({ label, leftLabel, rightLabel, value }) => {
  // Custom slider with:
  // - Smooth thumb animation
  // - Gradient track that changes with value
  // - Preview of AI response style
  // - Haptic feedback at endpoints
};
```

## Shared Components

### Animated Mascot Component
```typescript
const AIMascot = ({ character, mood, size }) => {
  // character: 'nora' | 'patrick'
  // mood: various states per character
  // size: 'small' | 'medium' | 'large'

  // Implementation options:
  // 1. Lottie animations (recommended)
  // 2. Rive animations (most powerful)
  // 3. Reanimated sprite sheets
};
```

### Chat Components
```
src/components/ai/
  AIMascot.tsx              # Animated mascot component
  ChatBubble.tsx            # Message bubble with animations
  TypingIndicator.tsx       # Three-dot bounce animation
  VoiceInput.tsx            # Mic with waveform
  SuggestionChips.tsx       # Quick reply options
  ThinkingState.tsx         # "AI is thinking" animation
```

## Animation Assets Needed

**For Nora:**
- `nora-idle.json` - Lottie: gentle breathing loop
- `nora-thinking.json` - Lottie: thinking pose
- `nora-excited.json` - Lottie: celebration
- `nora-typing.json` - Lottie: typing animation

**For Patrick:**
- `patrick-idle.json` - Lottie: confident stance
- `patrick-cheering.json` - Lottie: celebration
- `patrick-coaching.json` - Lottie: giving advice

## The "Amy" Viral Effect

Remember Chris Ro's insight: the animated version got 800+ signups, the static version got almost none. Apply this to AI responses:

```typescript
// BAD: Static response
<Text>Here's what I found...</Text>

// GOOD: Dynamic response (Amy effect)
<Animated.View entering={FadeInDown.duration(300)}>
  <GradientShimmer visible={isSearching} />
  <Text entering={FadeIn.delay(100)}>Here's what I found...</Text>
  <SourcesList entering={SlideInDown.delay(200)} />
</Animated.View>
```

## Quality Gates

Before marking complete:
- [ ] Mascots have at least 4 animated states each
- [ ] Typing indicator is smooth (no frame drops)
- [ ] Messages animate in naturally
- [ ] Voice input has clear visual feedback
- [ ] Response loading feels engaging, not frustrating
- [ ] Personality shines through animations
- [ ] Works offline (shows cached personality)

## Report Format

```markdown
## AI Companions Enhancement Report

### NoraScreen
- [x] Mascot animations: 5 states implemented
- [x] Chat bubbles: Spring physics entrance
- [x] Typing indicator: Staggered dot bounce
- [x] Voice input: Waveform visualization
- [x] Thinking state: Gradient shimmer + mascot

### PatrickScreen
- [x] Mascot animations: 4 states implemented
- [x] Motivation cards: Scale entrance
- [x] Celebration: Confetti integration

### AIIntegrationScreen
- [x] Personality sliders: Custom animated
- [x] Preview: Live response style demo

### Animation Assets Created
- 8 Lottie files for mascots
- 2 Rive files for complex interactions

### Performance
- Chat scroll: 60fps
- Voice waveform: 60fps
- Mascot animations: < 50KB each
```
