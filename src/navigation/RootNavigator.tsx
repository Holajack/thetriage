import React, { useState, useEffect, useRef } from 'react';
import { Platform, Linking } from 'react-native';
import { NavigationContainer, NavigationContainerRef, CommonActions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
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
import { SplashScreen } from '../components/SplashScreen';
import SessionHistoryScreen from '../screens/main/SessionHistoryScreen';
import { supabase } from '../utils/supabase';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const { isAuthenticated, isInitialLoading, hasCompletedOnboarding, justLoggedIn, clearJustLoggedIn } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  // Fallback timeout to prevent splash screen from being stuck
  useEffect(() => {
    const maxSplashTime = setTimeout(() => {
      if (showSplash) {
        console.log('RootNavigator: Splash timeout reached, forcing completion');
        setShowSplash(false);
      }
    }, Platform.OS === 'ios' ? 6000 : 8000); // Shorter timeout for iOS: 6 seconds vs 8 seconds

    return () => clearTimeout(maxSplashTime);
  }, [showSplash]);

  // Navigation logic for post-authentication routing
  useEffect(() => {
    if (isInitialLoading || showSplash || !navigationRef.current) {
      return;
    }

    const currentRoute = navigationRef.current.getCurrentRoute();
    console.log("RootNavigator: Navigation effect triggered", {
      isAuthenticated,
      hasCompletedOnboarding,
      justLoggedIn,
      currentRoute: currentRoute?.name,
      isInitialLoading,
      showSplash
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
    
    // Handle logout - only if user was on an authenticated screen
    else if (!isAuthenticated && currentRoute && 
        (['Main', 'Onboarding'].includes(currentRoute.name as string))) {
      console.log("RootNavigator: User logged out, returning to Landing page with sign-in/get started options");
      navigationRef.current.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Landing' }],
        })
      );
    }
  }, [isAuthenticated, hasCompletedOnboarding, justLoggedIn, isInitialLoading, showSplash, clearJustLoggedIn]);

  // Handle deep linking for password reset
  useEffect(() => {
    // Listen for Supabase auth state changes (for password reset flow)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        console.log('RootNavigator: Password recovery event detected');
        // Navigate to reset password screen
        if (navigationRef.current) {
          navigationRef.current.dispatch(
            CommonActions.navigate({
              name: 'Auth',
              params: {
                screen: 'ResetPassword',
              },
            })
          );
        }
      }
    });

    // Cleanup subscription
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Deep linking configuration
  const linking = {
    prefixes: ['hikewise://', 'https://ucculvnodabrfwbkzsnx.supabase.co'],
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

  if (isInitialLoading || showSplash) {
    return <SplashScreen onAnimationComplete={handleSplashComplete} />;
  }

  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
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