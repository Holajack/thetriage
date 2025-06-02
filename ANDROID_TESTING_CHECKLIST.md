# Android Build Testing Checklist

## 🚀 Current Status
- ✅ Expo development server running on port 8081
- ✅ All TypeScript compilation errors resolved
- ✅ useInsertionEffect warnings fixed
- ✅ RLS policy errors handled gracefully
- ✅ Image asset naming fixed (transparent-triage.png)
- ✅ Navigation loop issues resolved
- ✅ Database error handling improved

## 📱 Testing Instructions

### 1. Connect to Expo Development Server
1. Ensure you have **Expo Go** app installed on your Android device
2. Open the terminal where Expo is running (PID: 15794)
3. Press `r` to show QR code, or scan the QR code in the terminal
4. Open Expo Go on your Android device and scan the QR code

### 2. Test Sequence (Complete User Journey)

#### Step 1: Splash Screen Testing ✅
- [ ] **Splash appears immediately** - no white flash or delay
- [ ] **Logo animation plays smoothly** - opacity and scale effects
- [ ] **Title and tagline text visible** - "The Triage System" and subtitle
- [ ] **Auto-transitions after 4 seconds** - doesn't hang indefinitely
- [ ] **No console warnings** - check for useInsertionEffect warnings
- [ ] **Android status bar properly styled** - matches theme

#### Step 2: Landing Page Testing ✅  
- [ ] **Navigates from splash to landing** - proper transition (ALWAYS happens)
- [ ] **Logo displays correctly** - transparent-triage.png loads
- [ ] **"Get Started" button works** - navigates to Auth with signup form
- [ ] **"Sign In" button works** - navigates to Auth with login form
- [ ] **Responsive layout** - looks good on Android screen sizes
- [ ] **No image loading errors** - check for asset 404s

#### Step 3: Authentication Testing ✅
- [ ] **Get Started → Sign up flow** - new users can register
- [ ] **Sign In → Login flow** - existing users can log in
- [ ] **Error handling displays** - network/validation errors
- [ ] **Loading states show** - appropriate spinners/feedback
- [ ] **Navigation after auth** - automatically goes to correct next screen

#### Step 4: Onboarding Flow Testing ✅
- [ ] **ProfileCreationScreen loads** - no crashes
- [ ] **Form submission works** - data saves to database
- [ ] **Navigation proceeds** - doesn't loop back to focus method
- [ ] **AppTutorialScreen loads** - tutorial content displays
- [ ] **Onboarding completion works** - sets is_onboarding_complete = true
- [ ] **Main app loads after onboarding** - proper navigation transition

#### Step 5: Database Integration Testing ✅
- [ ] **Default onboarding data created** - if none exists
- [ ] **Default leaderboard data handling** - graceful RLS error handling
- [ ] **User profile data loads** - from Supabase
- [ ] **No PGRST116 errors logged** - proper error handling
- [ ] **AsyncStorage persistence works** - hasSeenLanding remembers state

#### Step 6: Navigation State Testing ✅
- [ ] **No infinite loops** - app doesn't get stuck in navigation cycles
- [ ] **Proper state persistence** - refreshing doesn't break navigation
- [ ] **Back button handling** - Android back button works correctly
- [ ] **Deep link handling** - if applicable

## 🐛 Known Issues to Watch For

### Fixed Issues (Should NOT occur)
- ❌ ~~Image loading errors (transparent triage.png not found)~~
- ❌ ~~Navigation loops after ProfileCreationScreen~~
- ❌ ~~useInsertionEffect warnings in SplashScreen~~
- ❌ ~~PGRST116 errors for missing database records~~
- ❌ ~~RLS policy errors crashing the app~~
- ❌ ~~Splash screen hanging indefinitely~~

### Watch for New Issues
- Network connectivity problems
- Android-specific rendering issues
- Performance problems on older Android devices
- Keyboard behavior with forms
- Android permissions (if any are required)

## 📊 Debug Information

### Console Logs to Monitor
```javascript
// Authentication flow
"AuthContext [android]: Initializing..."
"AuthContext [android]: User authenticated"

// Navigation flow  
"RootNavigator [android]: Navigation state changed"
"SplashScreen [android]: Starting splash animation"
"SplashScreen [android]: Animation completed"

// Database operations
"Creating default onboarding data for user:"
"Creating default leaderboard data for user:"
"RLS policy prevents leaderboard creation, will try again later"
```

### Performance Metrics
- [ ] **Splash animation** - smooth 60fps performance
- [ ] **Screen transitions** - no jank or delays
- [ ] **Database queries** - reasonable response times
- [ ] **Memory usage** - no memory leaks detected

## 🛠 Debug Features Available

### DebugInfo Component
The app includes a debug overlay (DebugInfo component) that shows:
- Current platform (should show "android")
- Authentication state
- Navigation state
- Onboarding completion status
- Real-time state updates

**To remove in production:** Remove `<DebugInfo />` from RootNavigator.tsx

## ✅ Success Criteria

### Complete User Journey Success
1. **New User**: Splash → Landing → Get Started → Auth (Sign Up) → Onboarding → Dashboard  
2. **Existing User**: Splash → Landing → Sign In → Auth (Login) → Dashboard (skip onboarding)
3. **All Users**: Always see Landing Page after splash screen

### Technical Success
- No crashes or white screens
- Smooth animations and transitions
- Proper error handling and user feedback
- Consistent state management
- Database operations working correctly

## 🔄 Next Steps After Testing

1. **Remove Debug Components** - Clean up DebugInfo overlay
2. **Performance Optimization** - If any issues found
3. **Additional Platform Testing** - iOS testing
4. **Production Build Testing** - Test with actual .apk/.aab
5. **User Acceptance Testing** - Real user feedback

---

**Note**: This testing should be done with the current Expo development server running. If you encounter any issues, check the Metro bundler logs and device console for specific error messages.
