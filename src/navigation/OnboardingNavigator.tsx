import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from './types';
import FocusMethodIntroScreen from '../screens/onboarding/FocusMethodIntroScreen';
import AccountCreationScreen from '../screens/onboarding/AccountCreationScreen';
import ProfileCreationScreen from '../screens/onboarding/ProfileCreationScreen';
import StudyPreferencesScreen from '../screens/onboarding/StudyPreferencesScreen';
import PrivacySettingsScreen from '../screens/onboarding/PrivacySettingsScreen';
import AppSummaryScreen from '../screens/onboarding/AppSummaryScreen';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export const OnboardingNavigator = () => {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        gestureEnabled: false, // Prevent swiping back during onboarding
      }}
      initialRouteName="FocusMethodIntro"
    >
      <Stack.Screen name="FocusMethodIntro" component={FocusMethodIntroScreen} />
      <Stack.Screen name="AccountCreation" component={AccountCreationScreen} />
      <Stack.Screen name="ProfileCreation" component={ProfileCreationScreen} />
      <Stack.Screen name="StudyPreferences" component={StudyPreferencesScreen} />
      <Stack.Screen name="PrivacySettings" component={PrivacySettingsScreen} />
      <Stack.Screen name="AppTutorial" component={AppSummaryScreen} />
    </Stack.Navigator>
  );
};
