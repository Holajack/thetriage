# Visual Environment System - Implementation Guide

## 🎯 Overview

This guide implements an animated environment system where:
- Users select animal companions (owl, deer, dog, fox, bear, rabbit)
- Animals walk through parallax scrolling backgrounds during focus sessions
- Purchased items (gear, trails, shelters) affect the visual appearance
- Break scenes show shelters with resting animals
- Visual style: Illustrated/painterly with emoji placeholders (upgradeable to custom artwork)

---

## 📊 Reference Images

- **Animal Selection**: `/src/assets/IMG_045EB2D5D845-1.jpeg` - Carousel with 3 animals
- **Walking Animation**: `/src/assets/IMG_8AE8806FE72E-1.jpeg` - Forest background with walking character
- **Break Scene**: `/src/assets/IMG_A8816F67249F-1.jpeg` - Character at shelter with decorations

---

## 🗂️ Project Structure

```
src/
├── components/
│   ├── visual/
│   │   ├── AnimalCharacter.tsx        # Animal with equipped gear
│   │   ├── ParallaxBackground.tsx     # Scrolling layered background
│   │   ├── BreakScene.tsx             # Shelter + resting animal
│   │   └── EnvironmentRenderer.tsx    # Main visual orchestrator
│   └── AnimalSelector.tsx             # Carousel for animal selection
├── screens/
│   ├── onboarding/
│   │   └── AnimalSelectionScreen.tsx  # Initial/change animal choice
│   └── main/
│       └── StudySessionScreen.tsx     # (Update to include visuals)
├── utils/
│   ├── animalService.ts               # Animal CRUD operations
│   └── visualAssets.ts                # Theme/asset mappings
└── types/
    └── animals.ts                     # TypeScript interfaces
```

---

## 📝 Implementation Phases

### Phase 1: Database & Animal Selection System
### Phase 2: Visual Asset Mappings
### Phase 3: Visual Components
### Phase 4: Integration into Study Sessions
### Phase 5: Break Scene Implementation

---

## 🚀 Phase 1: Database & Animal Selection System

### Step 1.1: Create Database Migration

**Claude Code Prompt:**
```
Create a new Supabase migration file at:
supabase/migrations/20251117000001_add_visual_customization.sql

Add the following columns to the profiles table:
- selected_animal (TEXT, default 'owl')
- unlocked_animals (TEXT[], default ['owl'])

Include proper comments explaining the purpose of each column.
```

**Expected File Content:**
```sql
-- Add visual customization columns to profiles
-- selected_animal: Currently active animal companion
-- unlocked_animals: Array of unlocked animal IDs

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS selected_animal TEXT DEFAULT 'owl',
ADD COLUMN IF NOT EXISTS unlocked_animals TEXT[] DEFAULT ARRAY['owl']::TEXT[];

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_selected_animal ON public.profiles(selected_animal);

-- Update RLS policies are already in place for profiles table
```

### Step 1.2: Create Animal Service

**Claude Code Prompt:**
```
Create a new file at src/utils/animalService.ts

This file should export:
1. AnimalType type: 'owl' | 'deer' | 'dog' | 'fox' | 'bear' | 'rabbit'
2. AnimalDefinition interface with: id, name, emoji, description, unlockCost, unlocked
3. ANIMALS constant: Record<AnimalType, Omit<AnimalDefinition, 'unlocked'>> with all 6 animals:
   - owl: Wise Owl, 🦉, scholarly companion, 0 Flint (starter)
   - deer: Noble Deer, 🦌, graceful and determined, 50 Flint
   - dog: Loyal Pup, 🐕, enthusiastic trail buddy, 50 Flint
   - fox: Clever Fox, 🦊, quick-witted and agile, 75 Flint
   - bear: Strong Bear, 🐻, powerful and steady, 100 Flint
   - rabbit: Swift Rabbit, 🐰, fast and focused, 75 Flint

4. Functions:
   - selectAnimal(animalId): Update user's selected_animal
   - unlockAnimal(animalId): Check Flint balance, deduct cost, add to unlocked_animals
   - getAvailableAnimals(): Return all animals with unlocked status

Use Supabase for database operations and proper error handling.
```

### Step 1.3: Create Animal Selection Screen

**Claude Code Prompt:**
```
Create a new file at src/screens/onboarding/AnimalSelectionScreen.tsx

Requirements:
1. Use react-native-reanimated-carousel for horizontal scrolling (install if needed: npx expo install react-native-reanimated-carousel)
2. Display animal cards with:
   - Large emoji (fontSize: 120)
   - Animal name and description
   - Lock badge if not unlocked (opacity: 0.4)
   - Unlock button showing Flint cost or "Select" if owned
3. Title: "Choose A Traveller"
4. Subtitle: "You can change anytime"
5. Footer with selected animal name and action buttons
6. Handle unlock flow:
   - Show confirmation alert with Flint cost
   - Deduct Flint and unlock on confirm
   - Auto-select after unlocking
7. Use theme context for styling
8. Import from: ../../utils/animalService, ../../utils/supabaseHooks, ../../context/ThemeContext

Match the visual style from IMG_045EB2D5D845-1.jpeg (carousel with 3 visible animals, centered selection).
```

### Step 1.4: Add Navigation Route

**Claude Code Prompt:**
```
Update src/navigation/types.ts:

Add to MainTabParamList:
  AnimalSelection: undefined;

Then update src/navigation/MainNavigator.tsx:

Import AnimalSelectionScreen and add Drawer.Screen:
  <Drawer.Screen
    name="AnimalSelection"
    component={AnimalSelectionScreen}
    options={{ headerShown: false, drawerItemStyle: { display: 'none' } }}
  />
```

### Step 1.5: Run Migration

**Claude Code Prompt:**
```
Run the database migration to production:
supabase db push --linked

Verify the migration was applied successfully.
```

---

## 🎨 Phase 2: Visual Asset Mappings

### Step 2.1: Create Visual Assets File

**Claude Code Prompt:**
```
Create a new file at src/utils/visualAssets.ts

Export the following constants:

1. TRAIL_THEMES: Mapping trail IDs to visual themes with:
   - name: Display name
   - colors: { sky: [color1, color2], ground: [color1, color2], accent: color }
   - emoji: Trail emoji
   - Include themes for: mountains, forest, desert, beach, jungle, snow, canyon, volcano, northern

2. SHELTER_VISUALS: Mapping shelter IDs to visual properties:
   - emoji: Shelter emoji
   - scale: Size multiplier (1.5 for all)
   - Include: tent, cabin, treehouse, igloo, lighthouse, castle

3. GEAR_OVERLAYS: Mapping gear IDs to overlay properties:
   - emoji: Gear emoji
   - position: 'head' | 'body' | 'face' | 'accessory'
   - Include: bandana, hat, vest, sunglasses, backpack, scarf, boots, compass

Use color schemes that match the reference image style (painterly, layered, atmospheric).
```

---

## 🖼️ Phase 3: Visual Components

### Step 3.1: Create Animal Character Component

**Claude Code Prompt:**
```
Create a new file at src/components/visual/AnimalCharacter.tsx

This component should:
1. Accept props: animalType, equippedGear (array of gear IDs), size, isWalking
2. Render the animal emoji at specified size
3. Overlay equipped gear emojis based on position (head, body, face)
4. Apply simple animation if isWalking is true:
   - Use Animated.View with transform: [{ translateX }]
   - Oscillate left-right subtly (±5px over 0.8s)
   - Use Animated.loop for continuous animation
5. Stack gear overlays using absolute positioning:
   - head items: top 0-20%
   - face items: center 40-60%
   - body items: center 50-70%
6. Return View with animal + gear layers

Import gear positions from visualAssets.ts (GEAR_OVERLAYS).
```

### Step 3.2: Create Parallax Background Component

**Claude Code Prompt:**
```
Create a new file at src/components/visual/ParallaxBackground.tsx

This component should:
1. Accept props: trailTheme (from visualAssets.ts), animationSpeed
2. Create 3 layers using LinearGradient from expo-linear-gradient:
   - Sky layer: Full height, gradient from trailTheme.colors.sky
   - Mid layer: Semi-transparent, slower parallax
   - Ground layer: Bottom 30%, gradient from trailTheme.colors.ground
3. Implement parallax scrolling:
   - Use Animated.ScrollView or Animated.View
   - Each layer moves at different speeds (sky: 0.2x, mid: 0.5x, ground: 1x)
   - Continuous horizontal loop using transform: [{ translateX }]
4. Add decorative elements:
   - Scatter 5-8 emojis representing trail theme (trees for forest, cacti for desert, etc.)
   - Use absolute positioning with varying sizes
   - Layer them between mid and ground for depth
5. Return full-screen View with stacked layers

Use Animated.timing for smooth continuous animation.
Match the layered style from IMG_8AE8806FE72E-1.jpeg (deep background, atmospheric layers).
```

### Step 3.3: Create Break Scene Component

**Claude Code Prompt:**
```
Create a new file at src/components/visual/BreakScene.tsx

This component should:
1. Accept props: animalType, shelterType, trailTheme, equippedGear
2. Render ParallaxBackground (static, no animation)
3. Render shelter emoji at large size (fontSize: 80) centered-bottom
4. Render AnimalCharacter sitting/resting near shelter:
   - isWalking: false
   - Smaller size than during walking
   - Positioned to the side of shelter
5. Add decorative foreground elements:
   - Campfire emoji (🔥) if applicable
   - Seasonal decorations (pumpkin, snowman, etc.) based on theme
   - Use absolute positioning for layering
6. Add subtle glow/warmth effect around shelter using View with backgroundColor and opacity
7. Return full-screen composition

Match the cozy break scene style from IMG_A8816F67249F-1.jpeg (character resting, shelter visible, decorative items).
```

### Step 3.4: Create Environment Renderer

**Claude Code Prompt:**
```
Create a new file at src/components/visual/EnvironmentRenderer.tsx

This component should:
1. Accept props: mode ('walking' | 'break'), duration (for timing), onComplete (callback)
2. Load user's visual state:
   - selected_animal from profile
   - equipped items from inventoryService (gear, shelter, trail)
3. Determine which components to render based on mode:
   - walking: ParallaxBackground + AnimalCharacter (walking)
   - break: BreakScene with all equipped items
4. Handle scene transitions with fade animation (Animated.FadeIn/FadeOut)
5. Manage animation lifecycle:
   - Start animations on mount
   - Clean up on unmount
   - Call onComplete when duration expires
6. Return a full-screen container with appropriate scene

This is the orchestrator component that brings everything together.
Use useEffect for lifecycle management and Animated API for transitions.
```

---

## 🎮 Phase 4: Integration into Study Sessions

### Step 4.1: Update StudySessionScreen

**Claude Code Prompt:**
```
Update src/screens/main/StudySessionScreen.tsx

Add EnvironmentRenderer to the screen:
1. Import EnvironmentRenderer component
2. Position it as a full-screen background layer (position: 'absolute', top: 0, left: 0, right: 0, bottom: 0)
3. Place it before other UI elements (so it renders behind)
4. Set mode to 'walking' during focus periods
5. Pass session duration and handle onComplete for session end
6. Add zIndex styling to ensure UI controls stay on top:
   - Background: zIndex: 0
   - Timer/controls: zIndex: 10
7. Consider adding a semi-transparent overlay between background and controls for text readability

The visual environment should enhance the study experience without distracting from the timer and controls.
```

### Step 4.2: Update Break Screen Integration

**Claude Code Prompt:**
```
Update the break screen (or create BreakScreen.tsx if it doesn't exist) at src/screens/main/BreakScreen.tsx

Add EnvironmentRenderer with mode 'break':
1. Show BreakScene component with shelter and resting animal
2. Display break timer overlay
3. Add "Skip Break" and "Continue" buttons with proper zIndex
4. Include motivational message about rest importance
5. Transition back to StudySessionScreen when break ends

If a dedicated break screen doesn't exist, integrate the break mode into StudySessionScreen with conditional rendering based on session state.
```

---

## 🏠 Phase 5: Additional Integration Points

### Step 5.1: Add to Profile Screen

**Claude Code Prompt:**
```
Update src/screens/main/ProfileScreen.tsx (or src/screens/main/profile/ProfileScreens.tsx)

Add a section showing:
1. Currently selected animal with emoji and name
2. "Change Companion" button that navigates to AnimalSelection screen:
   navigation.navigate('AnimalSelection' as any)
3. Preview of equipped items (gear, shelter, trail) with emojis
4. Quick stats: Animals unlocked (X/6), Items owned, etc.

Style it as a card similar to other profile sections with theme colors.
```

### Step 5.2: Add Quick Animal Preview to Home

**Claude Code Prompt:**
```
Consider adding a small animal preview to the home/main screen:
1. Small animated animal emoji (32-40px) in a corner or header
2. Shows currently equipped gear as tiny overlays
3. Tapping opens animal customization or profile
4. Subtle walking animation (optional)

This gives users a constant visual reminder of their companion.
Only implement if it fits the current home screen design.
```

---

## 🧪 Testing & Validation

### Test Checklist:

- [ ] Migration applied successfully to production database
- [ ] Animal selection screen loads with all 6 animals
- [ ] Owl is unlocked by default for new users
- [ ] Unlock flow deducts correct Flint amount
- [ ] Selected animal persists across app restarts
- [ ] ParallaxBackground animates smoothly (no jank)
- [ ] AnimalCharacter displays with correct equipped gear
- [ ] Gear overlays position correctly on animal
- [ ] BreakScene shows shelter + resting animal
- [ ] Environment integrates into StudySessionScreen without UI conflicts
- [ ] Break mode transitions smoothly
- [ ] Performance: No lag during animation (test on real device)
- [ ] Theme switching works with all visual components

---

## 📐 Design Decisions & Notes

### Emoji vs Custom Illustrations:
- **Current**: Using emojis as placeholders for rapid development
- **Future**: Replace with custom SVG or PNG illustrations
- **Migration Path**: Update visualAssets.ts to reference image files instead of emojis
  ```typescript
  // Before:
  emoji: '🦉'

  // After:
  image: require('../../assets/animals/owl.png')
  ```

### Animation Performance:
- Use `useNativeDriver: true` for transform animations
- Limit concurrent animations to 3-4 layers max
- Consider reducing animation on low-end devices (detect via Platform or device specs)
- Test on physical device, not just simulator

### Customization Expansion:
Future features to consider:
1. **Seasonal Themes**: Holiday decorations, weather effects
2. **Time-of-Day**: Dawn/day/dusk/night color shifts
3. **Achievement Badges**: Special visual unlocks for milestones
4. **Trail Companions**: Multiple animals walking together (friends' animals)
5. **Interactive Elements**: Tap animal for reactions, collectibles along trail

---

## 🐛 Common Issues & Solutions

### Issue: Carousel not working
**Solution**: Ensure react-native-reanimated-carousel is installed:
```bash
npx expo install react-native-reanimated-carousel react-native-reanimated react-native-gesture-handler
```

### Issue: Animations stuttering
**Solution**:
1. Use `useNativeDriver: true` in Animated calls
2. Reduce number of animated layers
3. Increase animation duration for smoother movement

### Issue: Gear overlays misaligned
**Solution**:
1. Adjust position percentages in AnimalCharacter.tsx
2. Use `aspectRatio: 1` on container for consistent sizing
3. Test with different device screen sizes

### Issue: Background not loading
**Solution**:
1. Check LinearGradient import from expo-linear-gradient
2. Verify color array format: `['#color1', '#color2']`
3. Ensure expo-linear-gradient is installed: `npx expo install expo-linear-gradient`

---

## 📦 Required Dependencies

Install these packages before starting implementation:

```bash
# Carousel for animal selection
npx expo install react-native-reanimated-carousel

# Animation libraries
npx expo install react-native-reanimated react-native-gesture-handler

# Gradients for backgrounds
npx expo install expo-linear-gradient

# If using custom images later
npx expo install expo-asset expo-file-system
```

---

## 🎯 Quick Start Commands

Run these commands in order to set up the system:

```bash
# 1. Install dependencies
npx expo install react-native-reanimated-carousel react-native-reanimated react-native-gesture-handler expo-linear-gradient

# 2. Create migration file (manually or via CLI)
# See Phase 1, Step 1.1 above

# 3. Push migration to database
supabase db push --linked

# 4. Verify migration
supabase migration list --linked

# 5. Start development server
npx expo start
```

---

## 📝 Implementation Order

Follow this order for smoothest implementation:

1. ✅ Database migration (Phase 1, Step 1.1-1.5)
2. ✅ Animal service (Phase 1, Step 1.2)
3. ✅ Visual assets mapping (Phase 2)
4. ✅ Animal selection screen (Phase 1, Step 1.3-1.4)
5. ✅ Animal character component (Phase 3, Step 3.1)
6. ✅ Parallax background (Phase 3, Step 3.2)
7. ✅ Break scene (Phase 3, Step 3.3)
8. ✅ Environment renderer (Phase 3, Step 3.4)
9. ✅ Study session integration (Phase 4)
10. ✅ Profile integration (Phase 5)

---

## 🎨 Future Enhancements

Once core system is working:

### Illustration Upgrade:
1. Commission or create custom animal illustrations (vector preferred)
2. Update visualAssets.ts to use image files instead of emojis
3. Add loading states for images
4. Consider animated sprites for walking cycles

### Advanced Animations:
1. Walking cycles: Multi-frame sprite animations
2. Parallax scrolling: Multiple background layers at different speeds
3. Particle effects: Snow, rain, leaves, dust particles
4. Ambient animations: Birds flying, clouds moving, water rippling

### Social Features:
1. Show friends' animals on trail (multiplayer visual)
2. Visit friends' shelters during breaks
3. Animal interactions: High-five, wave, race

### Progression System:
1. Animal leveling: Unlock new animations/expressions
2. Trail badges: Collect visual markers on completed trails
3. Shelter upgrades: Expand/decorate shelters over time

---

## 📚 References

- Reference Images: `/src/assets/IMG_*` (see Overview section)
- Existing Inventory System: `src/utils/inventoryService.ts`
- Shop Integration: `src/screens/main/ShopScreen.tsx`
- Theme System: `src/context/ThemeContext.tsx`
- Supabase Docs: https://supabase.com/docs

---

## ✅ Definition of Done

The visual environment system is complete when:

- [x] Users can select and unlock animal companions
- [x] Selected animal persists in database
- [x] Parallax backgrounds render with smooth animation
- [x] Animals display with equipped gear overlays
- [x] Study sessions show walking animation
- [x] Break scenes show shelter with resting animal
- [x] All purchased items (gear/trail/shelter) affect visuals
- [x] Performance is smooth on physical devices (60fps)
- [x] UI controls remain usable and readable over background
- [x] System works across all theme modes (light/dark)

---

**Last Updated**: 2025-11-17
**Version**: 1.0
**Status**: Ready for Implementation
