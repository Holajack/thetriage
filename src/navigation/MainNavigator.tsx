import React from 'react';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { createStackNavigator, CardStyleInterpolators, TransitionPresets, TransitionSpecs, StackCardStyleInterpolator } from '@react-navigation/stack';
import { Animated, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNavigation, CommonActions, DrawerActions } from '@react-navigation/native';

// ── Direction-aware navigation for tab transitions ──
// Tab screens in left-to-right order as they appear in the bottom bar
export const TAB_ORDER: Record<string, number> = {
  Profile: 0,
  SessionHistory: 1,
  Results: 2,
  Bonuses: 3,
  Community: 4,
};


// Slide-from-left interpolator (mirror of forHorizontalIOS)
const forSlideFromLeft: StackCardStyleInterpolator = ({
  current,
  next,
  inverted,
  layouts: { screen },
}) => {
  const translateFocused = Animated.multiply(
    current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [-screen.width, 0],
      extrapolate: 'clamp',
    }),
    inverted,
  );
  const translateUnfocused = next
    ? Animated.multiply(
        next.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, screen.width * 0.3],
          extrapolate: 'clamp',
        }),
        inverted,
      )
    : 0;
  const overlayOpacity = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.07],
    extrapolate: 'clamp',
  });

  return {
    cardStyle: {
      transform: [
        { translateX: translateFocused },
        ...(translateUnfocused !== 0 ? [{ translateX: translateUnfocused }] : []),
      ],
    },
    overlayStyle: { opacity: overlayOpacity },
  };
};

// Main screens
import HomeScreen from '../screens/main/HomeScreen';
import CommunityScreen from '../screens/main/CommunityScreen';
import NoraScreen from '../screens/main/NoraScreenNew';
import BonusesScreen from '../screens/main/BonusesScreen';
import ResultsScreen from '../screens/main/AnalyticsScreen';
import LeaderboardScreen from '../screens/main/LeaderboardScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import ShopScreen from '../screens/main/ShopScreen';
import SettingsScreen from '../screens/main/SettingsScreen';
import SubscriptionScreen from '../screens/main/SubscriptionScreen';
import ProTrekkerScreen from '../screens/main/ProTrekkerScreen';
import SessionHistoryScreen from '../screens/main/SessionHistoryScreen';
import FocusPreparationScreen from '../screens/main/FocusPreparationScreen';
import { StudySessionScreen } from '../screens/main/StudySessionScreen';
import TrailBuddySelectionScreen from '../screens/main/TrailBuddySelectionScreen';
import AchievementsScreen from '../screens/bonuses/AchievementsScreen';
import SelfDiscoveryQuizScreen from '../screens/main/SelfDiscoveryQuizScreen';
// NOTE: BrainMappingScreen uses React.lazy() to defer Three.js loading (fixes URL error)
import BrainMappingScreen from '../screens/main/BrainMappingScreen';

// Profile sub-screens
import {
  ProfileCustomizationScreen,
  PersonalInformationScreen,
  EducationScreen,
  LocationAndTimeScreen,
  PrivacyScreen,
  PreferencesScreen
} from '../screens/main/profile/ProfileScreens';

// Additional screens
import PDFViewerScreen from '../screens/main/PDFViewerScreen';
import AIIntegrationScreen from '../screens/main/AIIntegrationScreen';
import QRScannerScreen from '../screens/main/QRScannerScreen';
import EBooksScreen from '../screens/main/EBooksScreen';

// Settings sub-screens
import SoundSettingsScreen from '../screens/main/settings/SoundSettingsScreen';
import ThemeSettingsScreen from '../screens/main/settings/ThemeSettingsScreen';
import AISettingsScreen from '../screens/main/settings/AISettingsScreen';
import NotificationSettingsScreen from '../screens/main/settings/NotificationSettingsScreen';


const Drawer = createDrawerNavigator();
const SettingsStackNav = createStackNavigator();
const ContentStackNav = createStackNavigator();

function SettingsStack() {
  return (
    <SettingsStackNav.Navigator
      screenOptions={{
        headerShown: false,
        ...TransitionPresets.SlideFromRightIOS,
        gestureEnabled: true,
        gestureDirection: 'horizontal',
      }}
    >
      <SettingsStackNav.Screen name="SettingsMain" component={SettingsScreen} />
      <SettingsStackNav.Screen name="SoundSettings" component={SoundSettingsScreen} />
      <SettingsStackNav.Screen name="ThemeSettings" component={ThemeSettingsScreen} />
      <SettingsStackNav.Screen name="AISettings" component={AISettingsScreen} />
      <SettingsStackNav.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
      <SettingsStackNav.Screen name="Privacy" component={PrivacyScreen} />
      <SettingsStackNav.Screen name="Subscription" component={SubscriptionScreen} />
    </SettingsStackNav.Navigator>
  );
}

function ContentStack() {
  return (
    <ContentStackNav.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => {
        // Tab-to-tab navigations pass _slideLeft via route params
        const slideLeft = (route.params as any)?._slideLeft === true;

        return {
          headerShown: false,
          headerStyle: { backgroundColor: '#F8FCF8' },
          headerTintColor: '#1B5E20',
          headerTitleStyle: { fontWeight: 'bold' as const },
          gestureEnabled: true,
          gestureDirection: slideLeft ? 'horizontal-inverted' : 'horizontal',
          cardStyleInterpolator: slideLeft
            ? forSlideFromLeft
            : CardStyleInterpolators.forHorizontalIOS,
          transitionSpec: {
            open: TransitionSpecs.TransitionIOSSpec,
            close: TransitionSpecs.TransitionIOSSpec,
          },
          cardOverlayEnabled: true,
        };
      }}
    >
      {/* Main screens — all manage their own headers */}
      <ContentStackNav.Screen name="Home" component={HomeScreen} />
      <ContentStackNav.Screen name="Community" component={CommunityScreen} />
      <ContentStackNav.Screen name="NoraScreen" component={NoraScreen} />
      <ContentStackNav.Screen name="Bonuses" component={BonusesScreen} />
      <ContentStackNav.Screen name="Results" component={ResultsScreen} />
      <ContentStackNav.Screen name="Leaderboard" component={LeaderboardScreen} />
      <ContentStackNav.Screen name="Profile" component={ProfileScreen} />
      <ContentStackNav.Screen name="Shop" component={ShopScreen} />
      <ContentStackNav.Screen name="Settings" component={SettingsStack} />
      <ContentStackNav.Screen name="SessionHistory" component={SessionHistoryScreen} />
      <ContentStackNav.Screen name="Subscription" component={SubscriptionScreen} />
      <ContentStackNav.Screen name="QRScanner" component={QRScannerScreen} />
      <ContentStackNav.Screen name="ProTrekker" component={ProTrekkerScreen} />
      <ContentStackNav.Screen name="EBooks" component={EBooksScreen} />
      <ContentStackNav.Screen name="Achievements" component={AchievementsScreen} />
      <ContentStackNav.Screen name="SelfDiscoveryQuiz" component={SelfDiscoveryQuizScreen} />
      <ContentStackNav.Screen name="BrainMapping" component={BrainMappingScreen} />
      <ContentStackNav.Screen name="TrailBuddySelection" component={TrailBuddySelectionScreen} />
      <ContentStackNav.Screen name="FocusPreparation" component={FocusPreparationScreen} />
      <ContentStackNav.Screen name="StudySessionScreen" component={StudySessionScreen} />
      <ContentStackNav.Screen name="AIIntegration" component={AIIntegrationScreen} />
      <ContentStackNav.Screen name="Privacy" component={PrivacyScreen} />
      <ContentStackNav.Screen name="PDFViewer" component={PDFViewerScreen} />

      {/* Profile sub-screens — use navigator header with back button */}
      <ContentStackNav.Screen
        name="ProfileCustomization"
        component={ProfileCustomizationScreen}
        options={{ headerShown: true, title: 'Customize Profile' }}
      />
      <ContentStackNav.Screen
        name="PersonalInformation"
        component={PersonalInformationScreen}
        options={{ headerShown: true, title: 'Personal Information' }}
      />
      <ContentStackNav.Screen
        name="Education"
        component={EducationScreen}
        options={{ headerShown: true, title: 'Education' }}
      />
      <ContentStackNav.Screen
        name="LocationAndTime"
        component={LocationAndTimeScreen}
        options={{ headerShown: true, title: 'Location and Time' }}
      />
      <ContentStackNav.Screen
        name="Preferences"
        component={PreferencesScreen}
        options={{ headerShown: true, title: 'Preferences' }}
      />
    </ContentStackNav.Navigator>
  );
}

function CustomDrawerContent(props: any) {
  const { signOut, user } = useAuth();
  const navigation = props.navigation;

  // Navigate to a screen inside the ContentStack from the Drawer menu
  const navigateTo = (screen: string, params?: any) => {
    navigation.closeDrawer();
    navigation.navigate('Content', { screen, params });
  };

  const handleLogout = async () => {
    try {
      await signOut();
      const rootNavigation = navigation.getParent();
      if (rootNavigation) {
        rootNavigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Landing' }],
          })
        );
      } else {
        navigation.navigate('Landing' as never);
      }
    } catch (error) {
      console.error('Logout error:', error);
      const rootNavigation = navigation.getParent();
      if (rootNavigation) {
        rootNavigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Landing' }],
          })
        );
      } else {
        navigation.navigate('Landing' as never);
      }
    }
  };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ flex: 1, backgroundColor: '#FFF' }}>
      <View style={styles.profileSection}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{user?.full_name?.[0] || user?.username?.[0] || 'U'}</Text>
        </View>
        <View>
          <Text style={styles.orgText}>{user?.email || 'No Email'}</Text>
          <Text style={styles.nameText}>{user?.full_name || user?.username || 'No Name'}</Text>
        </View>
      </View>

      {/* Primary Navigation Items */}
      <DrawerItem
        label="Home"
        icon={({ color, size }) => <Ionicons name="home-outline" size={size} color="#1B5E20" />}
        onPress={() => navigateTo('Home')}
        labelStyle={{ color: '#1B5E20', fontWeight: 'bold' }}
      />
      <DrawerItem
        label="Community"
        icon={({ color, size }) => <Ionicons name="people-outline" size={size} color="#1B5E20" />}
        onPress={() => navigateTo('Community')}
        labelStyle={{ color: '#1B5E20', fontWeight: 'bold' }}
      />
      <DrawerItem
        label="Nora Assistant"
        icon={({ color, size }) => <Ionicons name="chatbubble-ellipses-outline" size={size} color="#1B5E20" />}
        onPress={() => navigateTo('NoraScreen')}
        labelStyle={{ color: '#1B5E20', fontWeight: 'bold' }}
      />
      <DrawerItem
        label="Bonuses"
        icon={({ color, size }) => <Ionicons name="gift-outline" size={size} color="#1B5E20" />}
        onPress={() => navigateTo('Bonuses')}
        labelStyle={{ color: '#1B5E20', fontWeight: 'bold' }}
      />
      <DrawerItem
        label="Results"
        icon={({ color, size }) => <Ionicons name="bar-chart-outline" size={size} color="#1B5E20" />}
        onPress={() => navigateTo('Results')}
        labelStyle={{ color: '#1B5E20', fontWeight: 'bold' }}
      />
      <DrawerItem
        label="Session History"
        icon={({ color, size }) => <Ionicons name="time-outline" size={size} color="#1B5E20" />}
        onPress={() => navigateTo('SessionHistory')}
        labelStyle={{ color: '#1B5E20', fontWeight: 'bold' }}
      />
      <DrawerItem
        label="Leaderboard"
        icon={({ color, size }) => <Ionicons name="trophy-outline" size={size} color="#4CAF50" />}
        onPress={() => navigateTo('Leaderboard')}
        labelStyle={{ color: '#1B5E20', fontWeight: 'bold' }}
      />
      <DrawerItem
        label="Profile"
        icon={({ color, size }) => <Ionicons name="person-outline" size={size} color="#4CAF50" />}
        onPress={() => navigateTo('Profile')}
        labelStyle={{ color: '#1B5E20', fontWeight: 'bold' }}
      />
      <DrawerItem
        label="Settings"
        icon={({ color, size }) => <Ionicons name="settings-outline" size={size} color="#4CAF50" />}
        onPress={() => navigateTo('Settings')}
        labelStyle={{ color: '#1B5E20', fontWeight: 'bold' }}
      />
      <DrawerItem
        label="Subscription"
        icon={({ color, size }) => <Ionicons name="card-outline" size={size} color="#7B61FF" />}
        onPress={() => navigateTo('Subscription')}
        labelStyle={{ color: '#7B61FF', fontWeight: 'bold' }}
      />

      <View style={{ flex: 1 }} />

      {/* Logout at bottom */}
      <DrawerItem
        label="Logout"
        icon={({ color, size }) => <Ionicons name="log-out-outline" size={size} color="#ff4444" />}
        onPress={handleLogout}
        labelStyle={{ color: '#ff4444', fontWeight: 'bold' }}
        style={{ marginBottom: 16 }}
      />
    </DrawerContentScrollView>
  );
}

export const MainNavigator = () => {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: '#FFF',
          width: 300,
        },
        drawerPosition: 'right',
        drawerType: 'slide',
        overlayColor: 'rgba(0, 0, 0, 0.4)',
        swipeEnabled: false,
        swipeEdgeWidth: 0,
        drawerHideStatusBarOnOpen: false,
      }}
      drawerContent={props => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen name="Content" component={ContentStack} />
    </Drawer.Navigator>
  );
};

const styles = StyleSheet.create({
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  orgText: {
    fontSize: 12,
    color: '#888',
  },
  nameText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
});
