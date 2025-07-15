import React from 'react';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

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
import SessionHistoryScreen from '../screens/main/SessionHistoryScreen';
import PDFViewerScreen from '../screens/main/PDFViewerScreen';

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
        onPress={signOut}
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
      <Drawer.Screen name="Home" component={HomeScreen} />
      <Drawer.Screen name="Community" component={CommunityScreen} />
      <Drawer.Screen 
        name="NoraScreen" 
        component={NoraScreen} 
        options={{ 
          headerTitle: 'Nora Assistant',
          headerShown: false // Let NoraScreen handle its own header with custom buttons
        }} 
      />
      <Drawer.Screen name="Bonuses" component={BonusesScreen} />
      <Drawer.Screen name="Results" component={ResultsScreen} />
      <Drawer.Screen name="Leaderboard" component={LeaderboardScreen} />
      <Drawer.Screen name="Profile" component={ProfileScreen} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
      <Drawer.Screen name="SessionHistory" component={SessionHistoryScreen} options={{ title: 'Session History' }} />
      <Drawer.Screen name="Subscription" component={SubscriptionScreen} />
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