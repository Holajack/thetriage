// RESTORED: Original RootNavigator after fixing OBJLoader URL error
import React, { useEffect, useRef } from "react";
import { Linking } from "react-native";
import {
  NavigationContainer,
  NavigationContainerRef,
  CommonActions,
  type LinkingOptions,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth as useClerkAuth } from "@clerk/clerk-expo";
import { useAuth } from "../context/AuthContext";
import { setQRNavigationRef } from "../context/QRAcceptanceContext";
// import { FloatingNoraProvider } from '../context/FloatingNoraContext'; // Disabled - using modal instead
import { MainNavigator } from "./MainNavigator";
import { AuthNavigator } from "./AuthNavigator";
import { OnboardingNavigator } from "./OnboardingNavigator";
import { RootStackParamList } from "./types";
import { usePresence } from "../hooks/usePresence";
import { track, flushAnalytics } from "../analytics/analytics";
import { AnalyticsEvent } from "../analytics/events";
import { StudySessionScreen } from "../screens/main/StudySessionScreen";
import BreakTimerScreen from "../screens/main/BreakTimerScreen";
import SessionReportScreen from "../screens/main/SessionReportScreen";
import MessageScreen from "../screens/main/MessageScreen";
import StudyRoomScreen from "../screens/main/StudyRoomScreen";
import { PatrickSpeakScreen } from "../screens/main/PatrickScreen";
import LandingPage from "../screens/LandingPage";
import SessionHistoryScreen from "../screens/main/SessionHistoryScreen";
import NineLayerPreviewScreen from "../screens/main/NineLayerPreviewScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  // Use Clerk for authentication state
  const { isLoaded: isClerkLoaded, isSignedIn: clerkSignedIn } = useClerkAuth();

  // Use legacy AuthContext for onboarding state and fallback auth (will be migrated to Convex in Phase 4)
  const { hasCompletedOnboarding, justLoggedIn, clearJustLoggedIn, user } =
    useAuth();

  // Fall back to legacy auth if Clerk isn't providing sign-in state
  const isSignedIn = clerkSignedIn ?? user !== null;

  // Track if we've ever completed the initial load - prevents splash from showing again after sign out
  const hasEverLoaded = useRef(false);
  const navigationRef =
    useRef<NavigationContainerRef<RootStackParamList>>(null);

  // Keep users.lastSeen fresh. Nothing wrote it before, which silently made the
  // daily notification cron deliver to zero users.
  usePresence();

  // The one event that makes retention measurable at all.
  useEffect(() => {
    track(AnalyticsEvent.APP_OPENED);
    return () => {
      void flushAnalytics();
    };
  }, []);

  // Track when Clerk has loaded at least once
  useEffect(() => {
    if (isClerkLoaded && !hasEverLoaded.current) {
      hasEverLoaded.current = true;
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
    // ONLY handle navigation for users who just logged in - NOT existing authenticated users
    if (isAuthenticated && justLoggedIn) {
      // User just logged in - route them appropriately
      if (hasCompletedOnboarding) {
        navigationRef.current.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: "Main" }], // This should go to MainNavigator with drawer
          }),
        );
      } else {
        navigationRef.current.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: "Onboarding" }],
          }),
        );
      }

      // Reset the login flag after navigation
      clearJustLoggedIn();
    }

    // REMOVED: The automatic navigation for existing authenticated users
    // This was preventing users from seeing the Landing page on app restart

    // Handle logout - navigate to Landing when user is not authenticated
    // This triggers when Clerk sign out completes and isSignedIn becomes false
    else if (
      !isAuthenticated &&
      currentRoute &&
      [
        "Main",
        "Onboarding",
        "StudySessionScreen",
        "BreakTimerScreen",
        "SessionReportScreen",
        "PatrickSpeak",
        "MessageScreen",
        "StudyRoomScreen",
      ].includes(currentRoute.name as string)
    ) {
      navigationRef.current.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Landing" }],
        }),
      );
    }
  }, [
    isAuthenticated,
    hasCompletedOnboarding,
    justLoggedIn,
    isInitialLoading,
    clearJustLoggedIn,
  ]);

  // Note: Clerk handles password reset via email code verification
  // The ResetPassword screen is navigated to from ForgotPassword screen after initiating reset

  // Deep linking configuration.
  // This object used to be built and then never handed to NavigationContainer,
  // so every hikewise:// link — including every invite — was inert.
  const linking: LinkingOptions<RootStackParamList> = {
    prefixes: [
      "hikewise://",
      "https://hikewise.app",
      "https://www.hikewise.app",
    ],
    config: {
      screens: {
        Auth: {
          screens: {
            ResetPassword: "reset-password",
            Login: "login",
            ForgotPassword: "forgot-password",
          },
        },
        Landing: "",
        Onboarding: "onboarding",

        // The invite target. StudyRoomScreen is a ROOT stack screen — an earlier
        // attempt nested it under Main, where it does not exist, so the link
        // resolved to nothing and invites stayed dead even once linking was wired.
        StudyRoomScreen: "join/:roomCode",

        Main: "main",
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

      const subscription = Linking.addEventListener("url", onReceiveURL);

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

  return (
    <NavigationContainer
      ref={navigationRef}
      linking={linking}
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
          animation: "fade",
          animationDuration: 280,
          // DISABLE all swipe gestures - users must use in-app navigation
          gestureEnabled: false,
          gestureDirection: "horizontal",
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
          options={{ presentation: "fullScreenModal", gestureEnabled: false }}
        />
        <Stack.Screen
          name="BreakTimerScreen"
          component={BreakTimerScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen
          name="SessionReportScreen"
          component={SessionReportScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen name="SessionHistory" component={SessionHistoryScreen} />
        <Stack.Screen
          name="PatrickSpeak"
          component={PatrickSpeakScreen as any}
          options={{ presentation: "fullScreenModal" }}
        />
        <Stack.Screen name="MessageScreen" component={MessageScreen} />
        <Stack.Screen
          name="NineLayerPreview"
          component={NineLayerPreviewScreen}
          options={{ presentation: "fullScreenModal" }}
        />
        <Stack.Screen
          name="StudyRoomScreen"
          component={StudyRoomScreen}
          options={{ presentation: "fullScreenModal" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
