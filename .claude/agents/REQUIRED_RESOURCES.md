# Required APIs, Resources & Dependencies

This document lists everything needed to implement the premium enhancement based on Chris Ro's methodology.

---

## NPM Dependencies to Install

### Animation Libraries
```bash
# Core animation library (likely already installed)
npx expo install react-native-reanimated

# Gesture handling for interactive animations
npx expo install react-native-gesture-handler

# Lottie for mascot animations
npx expo install lottie-react-native

# SVG for custom graphics (charts, timer circles)
npx expo install react-native-svg

# Skia for advanced effects (holographic shine)
npx expo install @shopify/react-native-skia

# Linear gradients
npx expo install expo-linear-gradient

# Blur effects (glassmorphism)
npx expo install expo-blur
```

### Feedback Libraries
```bash
# Haptic feedback
npx expo install expo-haptics

# Audio for sounds
npx expo install expo-av
```

### Chart Libraries
```bash
# Animated charts
npm install react-native-gifted-charts

# Alternative: Victory Native
npm install victory-native
```

### Widget Support (iOS)
```bash
# Widget Kit support
npx expo install expo-widgets
# Note: Requires native iOS development
```

---

## APIs Needed

### 1. Lottie Animation Files
**What**: JSON animation files for mascots and effects
**Where to get**:
- **LottieFiles**: https://lottiefiles.com (free tier available)
- **IconScout**: https://iconscout.com/lottie-animations

**Animations Needed**:
| Animation | Purpose | Estimated Cost |
|-----------|---------|----------------|
| Nora idle | Mascot breathing/blinking loop | $0-15 |
| Nora thinking | Processing indicator | $0-15 |
| Nora excited | Success celebration | $0-15 |
| Nora waving | Greeting | $0-15 |
| Patrick idle | Confident stance | $0-15 |
| Patrick cheering | Celebration | $0-15 |
| Confetti burst | Achievement unlock | Free |
| Checkmark success | Form completion | Free |
| Loading shimmer | Skeleton loading | Free |

**Alternative**: Use **Rive** (https://rive.app) for more interactive animations with state machines.

---

### 2. AI Image Generation (Mascots)
**What**: Generate unique mascot variations
**Chris Ro's Method**:
1. Get a base sketch from an artist ($200-300)
2. Use that as reference in ChatGPT/Midjourney
3. Generate infinite variations

**Tools**:
- **ChatGPT Plus** ($20/mo) - Image generation with style reference
- **Midjourney** ($10-30/mo) - Animate static images
- **DALL-E API** ($0.02-0.08 per image)

**Example Prompt**:
```
Create a friendly ghost mascot similar to this reference [upload sketch].
Style: Soft gradients, cute eyes, simple design.
Variation: Holding a book for "study" context.
```

---

### 3. Icon Libraries
**Recommended** (Free):
- **Ionicons** (already in Expo): `@expo/vector-icons`
- **Hero Icons**: https://heroicons.com
- **Lucide Icons**: https://lucide.dev

**Premium** (if needed):
- **Nucleo**: https://nucleoapp.com ($99 one-time)
- **SF Symbols**: Native iOS (free, Apple only)

---

### 4. Sound Effects
**What**: Audio feedback for interactions
**Where to get** (Free):
- **Mixkit**: https://mixkit.co/free-sound-effects/
- **Pixabay**: https://pixabay.com/sound-effects/
- **Freesound**: https://freesound.org

**Sounds Needed**:
| Sound | Purpose |
|-------|---------|
| Soft tick | Countdown (3-2-1) |
| Chime | Session start |
| Celebration | Session complete |
| Click | Button press |
| Swoosh | Page transition |
| Ding | Achievement unlock |
| Coin | Flint earned |

---

### 5. Design Inspiration Resources
**Reference during implementation**:

| Resource | URL | Purpose |
|----------|-----|---------|
| **Mobbin** | mobbin.com | UI patterns from top apps |
| **60fps** | 60fps.design | Motion/animation gallery |
| **Spotted in Prod** | (Twitter) | Real app animations |
| **Dribbble** | dribbble.com | Design inspiration |
| **Refero** | refero.design | App design references |

---

## Asset Creation Checklist

### Mascot Assets (Priority: HIGH)
```
□ Nora base design (hire artist or generate)
  □ Idle animation (Lottie/Rive)
  □ Thinking animation
  □ Excited animation
  □ Waving animation
  □ Concerned animation
  □ Sleeping animation

□ Patrick base design
  □ Idle animation
  □ Pumped animation
  □ Cheering animation
  □ Coaching animation
```

### Sound Assets (Priority: MEDIUM)
```
□ UI Sounds pack
  □ Button clicks (3 variations)
  □ Success chime
  □ Error tone
  □ Notification sound

□ Session sounds
  □ Countdown tick
  □ Session start chime
  □ Break start (calm)
  □ Session complete (celebration)

□ Achievement sounds
  □ Badge unlock
  □ Streak milestone
  □ Level up
```

### Widget Assets (Priority: HIGH)
```
□ Widget backgrounds (gradients)
□ Compact stat icons
□ Mini mascot images
□ Progress ring assets
```

---

## Cost Estimates

### One-Time Costs
| Item | Cost | Notes |
|------|------|-------|
| Custom mascot artwork | $200-500 | Base designs for Nora & Patrick |
| Premium Lottie pack | $0-100 | Or create custom |
| Sound effects pack | $0-50 | Many free options |
| Premium icons | $0-99 | Nucleo if needed |

**Total One-Time**: $200-750

### Ongoing Costs
| Item | Cost/Month | Notes |
|------|------------|-------|
| ChatGPT Plus | $20 | For AI generation |
| Midjourney | $10-30 | For animation |

**Total Monthly**: $30-50 (during dev only)

---

## Implementation Priority

### Phase 1: Zero Cost (Use existing/free)
1. ✅ react-native-reanimated (installed)
2. ✅ Ionicons (installed)
3. ✅ expo-haptics (install)
4. ✅ expo-linear-gradient (install)
5. ⬜ Free Lottie animations (download)
6. ⬜ Free sound effects (download)

### Phase 2: Low Cost ($50-100)
1. ⬜ Premium Lottie mascot animations
2. ⬜ Sound effects pack (if free not sufficient)

### Phase 3: Investment ($200-500)
1. ⬜ Custom mascot artwork (artist)
2. ⬜ ChatGPT/Midjourney for variations
3. ⬜ Rive subscription for interactive mascots

---

## Quick Start Commands

```bash
# Install all required Expo packages
npx expo install react-native-reanimated react-native-gesture-handler \
  lottie-react-native react-native-svg expo-linear-gradient \
  expo-blur expo-haptics expo-av

# Install chart library
npm install react-native-gifted-charts

# For Skia (holographic effects) - optional
npx expo install @shopify/react-native-skia

# Update babel config for Reanimated
# Add to babel.config.js:
# plugins: ['react-native-reanimated/plugin']
```

---

## Verification Checklist

After installation, verify:
```
□ Reanimated works: Test a simple animated view
□ Lottie works: Test loading a basic animation
□ Haptics work: Test Haptics.impactAsync()
□ SVG works: Test rendering a simple circle
□ Gradients work: Test LinearGradient component
□ Audio works: Test playing a sound file
```

---

## Support Resources

### Documentation
- Reanimated: https://docs.swmansion.com/react-native-reanimated/
- Lottie: https://airbnb.io/lottie/#/react-native
- Skia: https://shopify.github.io/react-native-skia/
- Expo Haptics: https://docs.expo.dev/versions/latest/sdk/haptics/

### Community
- React Native Animations Discord
- Expo Discord
- r/reactnative on Reddit

### Video Tutorials
- "React Native Animations" by William Candillon (YouTube)
- "Reanimated 3 Course" by Catalin Miron
- Chris Ro's YouTube for design inspiration
