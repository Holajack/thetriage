import React, { useEffect, useState } from 'react';
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
import { ProfileCustomizationScreen, PersonalInformationScreen, EducationScreen, LocationAndTimeScreen, PrivacyScreen, PreferencesScreen } from '../screens/main/profile/ProfileScreens';
import { Ionicons, Entypo } from '@expo/vector-icons';
import { TouchableOpacity, View, Text, LayoutChangeEvent } from 'react-native';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from './types';
import PDFViewerScreen from '../screens/main/PDFViewerScreen';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { AnimationConfig } from '../theme/premiumTheme';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createStackNavigator<MainTabParamList>();
const VISIBLE_TABS = ['Home', 'Community', 'Patrick', 'Bonuses', 'Results'];

function DrawerToggleButton() {
  const navigation = useNavigation();
  return (
    <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())} style={{ marginRight: 12 }}>
      <Entypo name="dots-three-horizontal" size={28} color="#1B5E20" />
    </TouchableOpacity>
  );
}

function CustomTabBar(props: BottomTabBarProps) {
  const { state, descriptors, navigation } = props;
  const { theme, isDark } = useTheme();

  // Get visible routes and find current focused index among visible tabs
  const visibleRoutes = state.routes.filter(route => VISIBLE_TABS.includes(route.name));
  const currentRouteIndex = state.routes.findIndex(r => r.key === state.routes[state.index]?.key);
  const focusedVisibleIndex = visibleRoutes.findIndex(route =>
    state.routes.findIndex(r => r.key === route.key) === currentRouteIndex
  );

  // Animation state for sliding indicator
  const indicatorPosition = useSharedValue(Math.max(0, focusedVisibleIndex));
  const [tabWidth, setTabWidth] = useState(0);
  const numTabs = visibleRoutes.length;

  // Update indicator position when tab changes
  useEffect(() => {
    if (focusedVisibleIndex >= 0) {
      indicatorPosition.value = withSpring(focusedVisibleIndex, AnimationConfig.bouncy);
    }
  }, [focusedVisibleIndex]);

  // Animated style for the sliding indicator
  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: indicatorPosition.value * (tabWidth / numTabs) }
    ],
  }));

  const handleLayout = (e: LayoutChangeEvent) => {
    setTabWidth(e.nativeEvent.layout.width - 32); // Subtract horizontal padding
  };

  return (
    <View
      style={{
        backgroundColor: isDark ? theme.card : '#FFFFFF',
        paddingTop: 8,
        paddingBottom: 20,
        paddingHorizontal: 16,
        borderTopWidth: 1,
        borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      }}
      onLayout={handleLayout}
    >
      {/* Container for tabs with indicator */}
      <View style={{ position: 'relative' }}>
        {/* Sliding shadow indicator */}
        {tabWidth > 0 && (
          <Animated.View
            style={[
              {
                position: 'absolute',
                top: 0,
                left: 0,
                width: tabWidth / numTabs,
                height: '100%',
                backgroundColor: isDark ? 'rgba(76, 175, 80, 0.15)' : 'rgba(76, 175, 80, 0.1)',
                borderRadius: 12,
                // Prominent shadow
                shadowColor: '#4CAF50',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
                elevation: 4,
              },
              indicatorStyle,
            ]}
          />
        )}

        {/* Tab buttons */}
        <View style={{ flexDirection: 'row' }}>
          {visibleRoutes.map((route, index) => {
            const { options } = descriptors[route.key];
            const label = options.tabBarLabel !== undefined ? options.tabBarLabel : options.title !== undefined ? options.title : route.name;
            const isFocused = focusedVisibleIndex === index;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate(route.name, route.params);
              }
            };

            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                testID={options.tabBarTestID}
                onPress={onPress}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  paddingVertical: 8,
                  zIndex: 1,
                }}
              >
                <Ionicons
                  name={getTabIcon(route.name)}
                  size={22}
                  color={isFocused ? '#4CAF50' : isDark ? '#888' : '#888'}
                />
                <Text style={{
                  color: isFocused ? '#4CAF50' : isDark ? '#888' : '#888',
                  fontSize: 12,
                  marginTop: 2,
                  fontWeight: isFocused ? 'bold' : 'normal',
                }}>
                  {typeof label === 'string' ? label : route.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function getTabIcon(routeName: string): any {
  switch (routeName) {
    case 'Home': return 'home-outline';
    case 'Community': return 'people-outline';
    case 'Patrick': return 'chatbubble-outline';
    case 'Bonuses': return 'gift-outline';
    case 'Results': return 'bar-chart-outline';
    default: return 'ellipse-outline';
  }
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
        name="ProfileCustomization"
        component={ProfileCustomizationScreen}
        options={{ title: 'Customize Profile' }}
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
      tabBar={CustomTabBar}
      screenOptions={() => ({
        headerStyle: { backgroundColor: '#FAFCFA' },
        headerTintColor: '#1B5E20',
        headerTitleStyle: { fontWeight: 'bold' },
        headerRight: () => <DrawerToggleButton />,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Community" component={CommunityScreen} />
      <Tab.Screen name="Patrick" component={PatrickScreen} />
      <Tab.Screen name="Bonuses" component={BonusesScreen} />
      <Tab.Screen name="Results" component={ResultsScreen} />
      <Tab.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{ tabBarButton: () => null, title: 'Leaderboard', headerShown: false }}
      />
      <Tab.Screen name="Profile" component={ProfileStack} options={{ tabBarButton: () => null, title: 'Profile' }} />
      <Tab.Screen name="EBooks" component={EBooksScreen} options={{ tabBarButton: () => null, headerRight: () => null }} />
      <Tab.Screen name="PDFViewer" component={PDFViewerScreen} options={{ tabBarButton: () => null }} />
      {/* ADD MISSING SCREENS HERE */}
      <Tab.Screen name="Achievements" component={AchievementsScreen} options={{ tabBarButton: () => null, headerRight: () => null }} />
      <Tab.Screen name="SelfDiscoveryQuiz" component={SelfDiscoveryQuizScreen} options={{ tabBarButton: () => null, headerRight: () => null }} />
      <Tab.Screen name="BrainMapping" component={BrainMappingScreen} options={{ tabBarButton: () => null, headerRight: () => null }} />
      <Tab.Screen name="PatrickSpeak" component={PatrickSpeakScreen} options={{ tabBarButton: () => null }} />
      <Tab.Screen name="Quizzes" component={QuizzesScreen} options={{ tabBarButton: () => null }} />
      <Tab.Screen name="QuizPrompt" component={QuizPromptScreen} options={{ tabBarButton: () => null }} />
      <Tab.Screen name="HistoryPrompt" component={HistoryPromptScreen} options={{ tabBarButton: () => null }} />
      <Tab.Screen name="SessionReport" component={SessionReportScreen} options={{ tabBarButton: () => null }} />
    </Tab.Navigator>
  );
}
