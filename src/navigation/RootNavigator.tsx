import React, { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { NavigationContainer, NavigationContainerRef, CommonActions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
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
    
    // Handle navigation for users who just logged in
    if (isAuthenticated && justLoggedIn) {
      // User just logged in - route them appropriately
      if (hasCompletedOnboarding) {
        console.log("RootNavigator: Login successful, navigating to Main (HomeScreen)");
        navigationRef.current.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Main' }],
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
    
    // Handle logout - only if user was on an authenticated screen
    if (!isAuthenticated && currentRoute && 
        (['Main', 'Onboarding'].includes(currentRoute.name as string))) {
      console.log("RootNavigator: User logged out, returning to Landing");
      navigationRef.current.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Landing' }],
        })
      );
    }
  }, [isAuthenticated, hasCompletedOnboarding, justLoggedIn, isInitialLoading, showSplash]);

  if (isInitialLoading || showSplash) {
    return <SplashScreen onAnimationComplete={handleSplashComplete} />;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName="Landing" // Always start at Landing after splash
      >
        <Stack.Screen name="Landing" component={LandingPage} />
        <Stack.Screen name="Auth" component={AuthNavigator} />
        <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
        <Stack.Screen name="Main" component={MainNavigator} />
        <Stack.Screen name="StudySessionScreen" component={StudySessionScreen} />
        <Stack.Screen name="BreakTimerScreen" component={BreakTimerScreen} />
        <Stack.Screen name="SessionReportScreen" component={SessionReportScreen} />
        <Stack.Screen name="SessionHistory" component={SessionHistoryScreen} />
        <Stack.Screen name="PatrickSpeak" component={PatrickSpeakScreen} />
        <Stack.Screen name="MessageScreen" component={MessageScreen} />
        <Stack.Screen name="StudyRoomScreen" component={StudyRoomScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};