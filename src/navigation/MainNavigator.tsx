import React from 'react';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNavigation, CommonActions } from '@react-navigation/native';

// Import screens directly 
import HomeScreen from '../screens/main/HomeScreen';
import CommunityScreen from '../screens/main/CommunityScreen';
import NoraScreen from '../screens/main/NoraScreen';
import BonusesScreen from '../screens/main/BonusesScreen';
import ResultsScreen from '../screens/main/AnalyticsScreen';
import LeaderboardScreen from '../screens/main/LeaderboardScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import SettingsScreen from '../screens/main/SettingsScreen';
import SubscriptionScreen from '../screens/main/SubscriptionScreen';
import ProTrekkerScreen from '../screens/main/ProTrekkerScreen';
import SessionHistoryScreen from '../screens/main/SessionHistoryScreen';
import PDFViewerScreen from '../screens/main/PDFViewerScreen';
import AIIntegrationScreen from '../screens/main/AIIntegrationScreen';
import FocusPreparationScreen from '../screens/main/FocusPreparationScreen';
import { StudySessionScreen } from '../screens/main/StudySessionScreen';

// Hidden screens accessible through Bonuses
import EBooksScreen from '../screens/main/EBooksScreen';
import AchievementsScreen from '../screens/bonuses/AchievementsScreen';
import SelfDiscoveryQuizScreen from '../screens/main/SelfDiscoveryQuizScreen';
import BrainMappingScreen from '../screens/main/BrainMappingScreen';

// Profile sub-screens
import { 
  PersonalInformationScreen,
  EducationScreen,
  LocationAndTimeScreen,
  PrivacyScreen,
  PreferencesScreen 
} from '../screens/main/profile/ProfileScreens';

const Drawer = createDrawerNavigator();

function CustomDrawerContent(props: any) {
  const { signOut, user } = useAuth();
  const navigation = props.navigation;

  const handleLogout = async () => {
    try {
      await signOut();
      // Navigate to Landing page after successful logout
      // We need to navigate to the root level, not just within the drawer
      const rootNavigation = navigation.getParent();
      if (rootNavigation) {
        rootNavigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Landing' }],
          })
        );
      } else {
        // Fallback if we can't get the parent navigator
        navigation.navigate('Landing' as never);
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Even if signOut fails, try to navigate to Landing
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
        onPress={() => navigation.navigate('Home')}
        labelStyle={{ color: '#1B5E20', fontWeight: 'bold' }}
      />
      <DrawerItem
        label="Community"
        icon={({ color, size }) => <Ionicons name="people-outline" size={size} color="#1B5E20" />}
        onPress={() => navigation.navigate('Community')}
        labelStyle={{ color: '#1B5E20', fontWeight: 'bold' }}
      />
      <DrawerItem
        label="Nora Assistant"
        icon={({ color, size }) => <Ionicons name="chatbubble-ellipses-outline" size={size} color="#1B5E20" />}
        onPress={() => navigation.navigate('NoraScreen')}
        labelStyle={{ color: '#1B5E20', fontWeight: 'bold' }}
      />
      <DrawerItem
        label="Bonuses"
        icon={({ color, size }) => <Ionicons name="gift-outline" size={size} color="#1B5E20" />}
        onPress={() => navigation.navigate('Bonuses')}
        labelStyle={{ color: '#1B5E20', fontWeight: 'bold' }}
      />
      <DrawerItem
        label="Results"
        icon={({ color, size }) => <Ionicons name="bar-chart-outline" size={size} color="#1B5E20" />}
        onPress={() => navigation.navigate('Results')}
        labelStyle={{ color: '#1B5E20', fontWeight: 'bold' }}
      />
      <DrawerItem
        label="Session History"
        icon={({ color, size }) => <Ionicons name="time-outline" size={size} color="#1B5E20" />}
        onPress={() => navigation.navigate('SessionHistory')}
        labelStyle={{ color: '#1B5E20', fontWeight: 'bold' }}
      />
      <DrawerItem
        label="Leaderboard"
        icon={({ color, size }) => <Ionicons name="trophy-outline" size={size} color="#4CAF50" />}
        onPress={() => navigation.navigate('Leaderboard')}
        labelStyle={{ color: '#1B5E20', fontWeight: 'bold' }}
      />
      <DrawerItem
        label="Profile"
        icon={({ color, size }) => <Ionicons name="person-outline" size={size} color="#4CAF50" />}
        onPress={() => navigation.navigate('Profile')}
        labelStyle={{ color: '#1B5E20', fontWeight: 'bold' }}
      />
      <DrawerItem
        label="Settings"
        icon={({ color, size }) => <Ionicons name="settings-outline" size={size} color="#4CAF50" />}
        onPress={() => navigation.navigate('Settings')}
        labelStyle={{ color: '#1B5E20', fontWeight: 'bold' }}
      />
      <DrawerItem
        label="Subscription"
        icon={({ color, size }) => <Ionicons name="card-outline" size={size} color="#7B61FF" />}
        onPress={() => navigation.navigate('Subscription')}
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
      initialRouteName="Home"
      screenOptions={({ navigation }) => ({
        headerShown: true,
        drawerStyle: {
          backgroundColor: '#FFF',
          width: 300,
        },
        headerStyle: {
          backgroundColor: '#F8FCF8',
        },
        headerTintColor: '#1B5E20',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        drawerPosition: 'right',
        headerLeft: () => null, // Remove default left toggle
        headerRight: () => (
          <TouchableOpacity 
            onPress={() => navigation.openDrawer()}
            style={{ marginRight: 16 }}
          >
            <Ionicons name="menu" size={24} color="#1B5E20" />
          </TouchableOpacity>
        ),
      })}
      drawerContent={props => <CustomDrawerContent {...props} />}
    >
      {/* Main screens - use the existing header with drawer toggle */}
      <Drawer.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ 
          headerShown: false // Hide header for full screen design
        }} 
      />
      <Drawer.Screen
        name="Community"
        component={CommunityScreen}
        options={{ headerShown: false }}
      />
      <Drawer.Screen 
        name="NoraScreen" 
        component={NoraScreen} 
        options={{ 
          headerTitle: 'Nora Assistant',
          headerShown: false // Let NoraScreen handle its own header with custom buttons
        }} 
      />
      <Drawer.Screen
        name="Bonuses"
        component={BonusesScreen}
        options={{ headerShown: false }}
      />
      <Drawer.Screen
        name="Results"
        component={ResultsScreen}
        options={{ headerShown: false }}
      />
      <Drawer.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{ headerShown: false }}
      />
      <Drawer.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <Drawer.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ headerShown: false }}
      />
      <Drawer.Screen
        name="SessionHistory"
        component={SessionHistoryScreen}
        options={{
          title: 'Session History',
          headerShown: false
        }}
      />
      <Drawer.Screen name="Subscription" component={SubscriptionScreen} />
      <Drawer.Screen
        name="ProTrekker"
        component={ProTrekkerScreen}
        options={{
          drawerItemStyle: { display: 'none' },
          headerShown: false,
          title: 'Become Pro Trekker'
        }}
      />
      <Drawer.Screen 
        name="PDFViewer" 
        component={PDFViewerScreen} 
        options={({ route }) => ({
          title: route.params?.title || 'PDF Viewer',
          drawerItemStyle: { display: 'none' } // Hide from drawer
        })}
      />
      
      {/* Hidden screens - accessible through Bonuses but not in drawer */}
      <Drawer.Screen 
        name="EBooks" 
        component={EBooksScreen} 
        options={{ 
          drawerItemStyle: { display: 'none' } // Hide from drawer
        }} 
      />
      <Drawer.Screen 
        name="Achievements" 
        component={AchievementsScreen} 
        options={{ 
          drawerItemStyle: { display: 'none' } // Hide from drawer
        }} 
      />
      <Drawer.Screen 
        name="SelfDiscoveryQuiz" 
        component={SelfDiscoveryQuizScreen} 
        options={{ 
          drawerItemStyle: { display: 'none' }, // Hide from drawer
          title: 'Self-Discovery Quiz'
        }} 
      />
      <Drawer.Screen 
        name="BrainMapping" 
        component={BrainMappingScreen} 
        options={{ 
          drawerItemStyle: { display: 'none' }, // Hide from drawer
          title: 'Brain Activity Mapping'
        }} 
      />
      
      {/* Profile sub-screens - hidden from drawer */}
      <Drawer.Screen 
        name="PersonalInformation" 
        component={PersonalInformationScreen} 
        options={{ 
          drawerItemStyle: { display: 'none' }, // Hide from drawer
          title: 'Personal Information'
        }} 
      />
      <Drawer.Screen 
        name="Education" 
        component={EducationScreen} 
        options={{ 
          drawerItemStyle: { display: 'none' }, // Hide from drawer
          title: 'Education'
        }} 
      />
      <Drawer.Screen 
        name="LocationAndTime" 
        component={LocationAndTimeScreen} 
        options={{ 
          drawerItemStyle: { display: 'none' }, // Hide from drawer
          title: 'Location and Time'
        }} 
      />
      <Drawer.Screen 
        name="Privacy" 
        component={PrivacyScreen} 
        options={{ 
          drawerItemStyle: { display: 'none' }, // Hide from drawer
          title: 'Privacy'
        }} 
      />
      <Drawer.Screen 
        name="Preferences" 
        component={PreferencesScreen} 
        options={{ 
          drawerItemStyle: { display: 'none' }, // Hide from drawer
          title: 'Preferences'
        }} 
      />
      
      {/* Focus and Session screens - hidden from drawer */}
      <Drawer.Screen 
        name="FocusPreparation" 
        component={FocusPreparationScreen} 
        options={{ 
          drawerItemStyle: { display: 'none' }, // Hide from drawer
          headerShown: false // Let screen handle its own header
        }} 
      />
      <Drawer.Screen 
        name="StudySessionScreen" 
        component={StudySessionScreen} 
        options={{ 
          drawerItemStyle: { display: 'none' }, // Hide from drawer
          headerShown: false // Let screen handle its own header
        }} 
      />

      {/* Settings sub-screens - hidden from drawer */}
      <Drawer.Screen 
        name="AIIntegration" 
        component={AIIntegrationScreen} 
        options={{ 
          drawerItemStyle: { display: 'none' }, // Hide from drawer
          title: 'AI Integration'
        }} 
      />
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
