import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from './types';
import AccountCreationScreen from '../screens/onboarding/AccountCreationScreen';
import EmailVerificationScreen from '../screens/auth/EmailVerificationScreen';
import ProfileCreationScreen from '../screens/onboarding/ProfileCreationScreen';
import OnboardingTrailBuddyScreen from '../screens/onboarding/OnboardingTrailBuddyScreen';
import OnboardingFocusSoundScreen from '../screens/onboarding/OnboardingFocusSoundScreen';
import AppSummaryScreen from '../screens/onboarding/AppSummaryScreen';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export const OnboardingNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: false, // Prevent swiping back during onboarding
      }}
      initialRouteName="AccountCreation"
    >
      <Stack.Screen name="AccountCreation" component={AccountCreationScreen} />
      <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
      <Stack.Screen name="ProfileCreation" component={ProfileCreationScreen} />
      <Stack.Screen name="TrailBuddyOnboarding" component={OnboardingTrailBuddyScreen} />
      <Stack.Screen name="FocusSoundSetup" component={OnboardingFocusSoundScreen} />
      <Stack.Screen name="AppTutorial" component={AppSummaryScreen} />
    </Stack.Navigator>
  );
};
