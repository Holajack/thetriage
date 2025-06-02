import React from 'react';
import { createBottomTabNavigator, BottomTabBar } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/main/HomeScreen';
import CommunityScreen from '../screens/main/CommunityScreen';
import PatrickScreen from '../screens/main/PatrickScreen';
import BonusesScreen from '../screens/main/BonusesScreen';
import ResultsScreen from '../screens/main/AnalyticsScreen';
import LeaderboardScreen from '../screens/main/LeaderboardScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import SettingsScreen from '../screens/main/SettingsScreen';
import { PatrickSpeakScreen, QuizzesScreen } from '../screens/main/PatrickScreen';
import SessionReportScreen from '../screens/main/SessionReportScreen';
import QuizPromptScreen from '../screens/main/QuizPromptScreen';
import HistoryPromptScreen from '../screens/main/HistoryPromptScreen';
import EBooksScreen from '../screens/main/EBooksScreen';
import SelfDiscoveryQuizScreen from '../screens/main/SelfDiscoveryQuizScreen';
import BrainMappingScreen from '../screens/main/BrainMappingScreen';
import AchievementsScreen from '../screens/bonuses/AchievementsScreen';
import { PersonalInformationScreen, EducationScreen, LocationAndTimeScreen, PrivacyScreen, PreferencesScreen } from '../screens/main/profile/ProfileScreens';
import { Ionicons, Entypo } from '@expo/vector-icons';
import { TouchableOpacity, View, Text } from 'react-native';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createStackNavigator<MainTabParamList>();
const VISIBLE_TABS = ['Home', 'Community', 'Patrick', 'Bonuses', 'Results'];

function DrawerToggleButton() {
  const navigation = useNavigation();
  return (
    <TouchableOpacity
      onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      style={{ marginRight: 16 }}
      accessibilityLabel="Open menu"
    >
      <Entypo name="dots-three-horizontal" size={28} color="#1B5E20" />
    </TouchableOpacity>
  );
}

function CustomTabBar(props: BottomTabBarProps) {
  const filteredState = {
    ...props.state,
    routes: props.state.routes.filter(route => VISIBLE_TABS.includes(route.name)),
    index: Math.max(
      0,
      VISIBLE_TABS.indexOf(props.state.routes[props.state.index]?.name)
    ),
  };
  return <BottomTabBar {...props} state={filteredState} />;
}

function ProfileStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="ProfileMain" 
        component={ProfileScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="PersonalInformation" 
        component={PersonalInformationScreen}
        options={{ title: 'Personal Information' }}
      />
      <Stack.Screen 
        name="Education" 
        component={EducationScreen}
        options={{ title: 'Education' }}
      />
      <Stack.Screen 
        name="LocationAndTime" 
        component={LocationAndTimeScreen}
        options={{ title: 'Location and Time' }}
      />
      <Stack.Screen
        name="Privacy"
        component={PrivacyScreen}
        options={{ title: 'Privacy' }}
      />
      <Stack.Screen
        name="Preferences"
        component={PreferencesScreen}
        options={{ title: 'Preferences' }}
      />
    </Stack.Navigator>
  );
}

export function BottomTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={({ route }: { route: { name: string } }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = '';
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Community') iconName = focused ? 'people' : 'people-outline';
          else if (route.name === 'Patrick') iconName = focused ? 'person-circle' : 'person-circle-outline';
          else if (route.name === 'Bonuses') iconName = focused ? 'gift' : 'gift-outline';
          else if (route.name === 'Results') iconName = focused ? 'bar-chart' : 'bar-chart-outline';
          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: 'gray',
        headerShown: true,
        headerRight: () => <DrawerToggleButton />,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Community" component={CommunityScreen} />
      <Tab.Screen name="Patrick" component={PatrickScreen} />
      <Tab.Screen name="Bonuses" component={BonusesScreen} />
      <Tab.Screen name="Results" component={ResultsScreen} />
      <Tab.Screen name="Leaderboard" component={LeaderboardScreen} options={{ tabBarButton: () => null, title: 'Leaderboard' }} />
      <Tab.Screen name="Profile" component={ProfileStack} options={{ tabBarButton: () => null, title: 'Profile' }} />
      <Tab.Screen name="EBooks" component={EBooksScreen} options={{ tabBarButton: () => null, title: 'E-Books' }} />
      <Tab.Screen name="SelfDiscoveryQuiz" component={SelfDiscoveryQuizScreen} options={{ tabBarButton: () => null, title: 'Self-Discovery Quiz' }} />
      <Tab.Screen name="BrainMapping" component={BrainMappingScreen} options={{ tabBarButton: () => null, title: 'Brain Mapping' }} />
      <Tab.Screen name="Achievements" component={AchievementsScreen} options={{ tabBarButton: () => null, title: 'Achievements' }} />
    </Tab.Navigator>
  );
} 