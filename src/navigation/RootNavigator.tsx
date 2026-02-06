// RESTORED: Original RootNavigator after fixing OBJLoader URL error
import React, { useEffect, useRef } from 'react';
import { Linking } from 'react-native';
import { NavigationContainer, NavigationContainerRef, CommonActions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth as useClerkAuth } from '@clerk/clerk-expo';
import { useAuth } from '../context/AuthContext';
import { setQRNavigationRef } from '../context/QRAcceptanceContext';
// import { FloatingNoraProvider } from '../context/FloatingNoraContext'; // Disabled - using modal instead
import { MainNavigator } from './MainNavigator';
import { AuthNavigator } from './AuthNavigator';
import { OnboardingNavigator } from './OnboardingNavigator';
import { RootStackParamList } from './types';
import { StudySessionScreen } from '../screens/main/StudySessionScreen';
import BreakTimerScreen from '../screens/main/BreakTimerScreen';
import SessionReportScreen from '../screens/main/SessionReportScreen';
import MessageScreen from '../screens/main/MessageScreen';
import StudyRoomScreen from '../screens/main/StudyRoomScreen';
import { PatrickSpeakScreen } from '../screens/main/PatrickScreen';
import LandingPage from '../screens/LandingPage';
import SessionHistoryScreen from '../screens/main/SessionHistoryScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  // Use Clerk for authentication state
  const { isLoaded: isClerkLoaded, isSignedIn: clerkSignedIn } = useClerkAuth();

  // Use legacy AuthContext for onboarding state and fallback auth (will be migrated to Convex in Phase 4)
  const { hasCompletedOnboarding, justLoggedIn, clearJustLoggedIn, user } = useAuth();

  // Fall back to legacy auth if Clerk isn't providing sign-in state
  const isSignedIn = clerkSignedIn ?? (user !== null);

  // Track if we've ever completed the initial load - prevents splash from showing again after sign out
  const hasEverLoaded = useRef(false);
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  // Track when Clerk has loaded at least once
  useEffect(() => {
    if (isClerkLoaded && !hasEverLoaded.current) {
      hasEverLoaded.current = true;
      console.log('RootNavigator: Initial Clerk load complete');
    }
  }, [isClerkLoaded]);

  // Only show initial loading on first app launch, not during sign out
  const isInitialLoading = !isClerkLoaded && !hasEverLoaded.current;
  // Use Clerk's isSignedIn for authentication check
  const isAuthenticated = isSignedIn ?? false;

  // Navigation logic for post-authentication routing
  useEffect(() => {
    if (isInitialLoading || !navigationRef.current) {
      return;
    }

    const currentRoute = navigationRef.current.getCurrentRoute();
    console.log("RootNavigator: Navigation effect triggered", {
      isAuthenticated,
      hasCompletedOnboarding,
      justLoggedIn,
      currentRoute: currentRoute?.name,
      isInitialLoading
    });

    // ONLY handle navigation for users who just logged in - NOT existing authenticated users
    if (isAuthenticated && justLoggedIn) {
      // User just logged in - route them appropriately
      if (hasCompletedOnboarding) {
        console.log("RootNavigator: Login successful, navigating to Main (HomeScreen)");
        navigationRef.current.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Main' }], // This should go to MainNavigator with drawer
          })
        );
      } else {
        console.log("RootNavigator: Login successful, navigating to Onboarding");
        navigationRef.current.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Onboarding' }],
          })
        );
      }

      // Reset the login flag after navigation
      clearJustLoggedIn();
    }

    // REMOVED: The automatic navigation for existing authenticated users
    // This was preventing users from seeing the Landing page on app restart

    // Handle logout - navigate to Landing when user is not authenticated
    // This triggers when Clerk sign out completes and isSignedIn becomes false
    else if (!isAuthenticated && currentRoute &&
        (['Main', 'Onboarding', 'StudySessionScreen', 'BreakTimerScreen', 'SessionReportScreen', 'PatrickSpeak', 'MessageScreen', 'StudyRoomScreen'].includes(currentRoute.name as string))) {
      console.log("RootNavigator: User signed out, resetting to Landing page");
      navigationRef.current.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Landing' }],
        })
      );
    }
  }, [isAuthenticated, hasCompletedOnboarding, justLoggedIn, isInitialLoading, clearJustLoggedIn]);

  // Note: Clerk handles password reset via email code verification
  // The ResetPassword screen is navigated to from ForgotPassword screen after initiating reset

  // Deep linking configuration
  // Note: Clerk handles auth deep links internally
  const linking = {
    prefixes: ['hikewise://'],
    config: {
      screens: {
        Auth: {
          screens: {
            ResetPassword: 'reset-password',
            Login: 'login',
            ForgotPassword: 'forgot-password',
          },
        },
        Landing: '',
        Main: 'main',
        Onboarding: 'onboarding',
      },
    },
    async getInitialURL() {
      // Check if app was opened from a deep link
      const url = await Linking.getInitialURL();
      if (url != null) {
        return url;
      }
      return null;
    },
    subscribe(listener: (url: string) => void) {
      // Listen for deep link events while app is open
      const onReceiveURL = ({ url }: { url: string }) => {
        listener(url);
      };

      const subscription = Linking.addEventListener('url', onReceiveURL);

      return () => {
        subscription.remove();
      };
    },
  };

  // Show a minimal loading indicator while Clerk initializes
  // The LandingPage will handle its own animations
  if (isInitialLoading) {
    return null; // Minimal flash - Clerk loads very fast
  }

  // Note: linking config defined but not used - can re-enable after verifying deep links work
  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        // Set navigation ref for QR acceptance context when navigation is ready
        if (navigationRef.current) {
          setQRNavigationRef(navigationRef.current);
        }
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          // Subtle premium transitions - smooth fades
          animation: 'fade',
          animationDuration: 280,
          // DISABLE all swipe gestures - users must use in-app navigation
          gestureEnabled: false,
          gestureDirection: 'horizontal',
          fullScreenGestureEnabled: false,
        }}
        initialRouteName="Landing" // Always start at Landing after splash
      >
        <Stack.Screen name="Landing" component={LandingPage} />
        <Stack.Screen name="Auth" component={AuthNavigator} />
        <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
        <Stack.Screen name="Main" component={MainNavigator} />
        <Stack.Screen
          name="StudySessionScreen"
          component={StudySessionScreen}
          options={{ presentation: 'fullScreenModal' }}
        />
        <Stack.Screen name="BreakTimerScreen" component={BreakTimerScreen} />
        <Stack.Screen name="SessionReportScreen" component={SessionReportScreen} />
        <Stack.Screen name="SessionHistory" component={SessionHistoryScreen} />
        <Stack.Screen
          name="PatrickSpeak"
          component={PatrickSpeakScreen}
          options={{ presentation: 'fullScreenModal' }}
        />
        <Stack.Screen name="MessageScreen" component={MessageScreen} />
        <Stack.Screen
          name="StudyRoomScreen"
          component={StudyRoomScreen}
          options={{ presentation: 'fullScreenModal' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};