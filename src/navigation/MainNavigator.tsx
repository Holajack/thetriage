import React from 'react';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';
import { BottomTabNavigator } from './BottomTabNavigator';
import ProfileScreen from '../screens/main/ProfileScreen';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import LeaderboardScreen from '../screens/main/LeaderboardScreen';
import SettingsScreen from '../screens/main/SettingsScreen';
import SubscriptionScreen from '../screens/main/SubscriptionScreen';
import SessionHistoryScreen from '../screens/main/SessionHistoryScreen';

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
      <DrawerItem
        label="Home"
        icon={({ color, size }) => <Ionicons name="home-outline" size={size} color="#1B5E20" />}
        onPress={() => navigation.navigate('Tabs', { screen: 'Home' })}
        labelStyle={{ color: '#1B5E20', fontWeight: 'bold' }}
      />
      <DrawerItem
        label="Community"
        icon={({ color, size }) => <Ionicons name="people-outline" size={size} color="#1B5E20" />}
        onPress={() => navigation.navigate('Tabs', { screen: 'Community' })}
        labelStyle={{ color: '#1B5E20', fontWeight: 'bold' }}
      />
      <DrawerItem
        label="Bonuses"
        icon={({ color, size }) => <Ionicons name="gift-outline" size={size} color="#1B5E20" />}
        onPress={() => navigation.navigate('Tabs', { screen: 'Bonuses' })}
        labelStyle={{ color: '#1B5E20', fontWeight: 'bold' }}
      />
      <DrawerItem
        label="Results"
        icon={({ color, size }) => <Ionicons name="bar-chart-outline" size={size} color="#1B5E20" />}
        onPress={() => navigation.navigate('Tabs', { screen: 'Results' })}
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
        onPress={() => navigation.navigate('Tabs', { screen: 'Leaderboard' })}
        labelStyle={{ color: '#1B5E20', fontWeight: 'bold' }}
      />
      <DrawerItem
        label="Profile"
        icon={({ color, size }) => <Ionicons name="person-outline" size={size} color="#4CAF50" />}
        onPress={() => navigation.navigate('Tabs', { screen: 'Profile' })}
        labelStyle={{ color: '#1B5E20', fontWeight: 'bold' }}
      />
      <DrawerItem
        label="Settings"
        icon={({ color, size }) => <Ionicons name="settings-outline" size={size} color={color || '#4CAF50'} />}
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
  const navigationRef = React.useRef(null);
  return (
    <Drawer.Navigator
      initialRouteName="Tabs"
      screenOptions={{
        drawerStyle: {
          backgroundColor: '#FFF',
          width: 300,
        },
        headerShown: false,
        drawerPosition: 'right',
      }}
      drawerContent={props => <CustomDrawerContent {...props} navigationRef={navigationRef} />}
    >
      <Drawer.Screen name="Tabs" component={BottomTabNavigator} options={{ drawerLabel: 'Main' }} />
      <Drawer.Screen 
        name="SessionHistory" 
        component={SessionHistoryScreen} 
        options={{
          drawerLabel: 'Session History',
          drawerIcon: ({ color, size }) => <Ionicons name="time-outline" size={size} color={color || '#1B5E20'} />,
        }} 
      />
      <Drawer.Screen name="Settings" component={SettingsScreen} options={{
        drawerLabel: 'Settings',
        drawerIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color || '#4CAF50'} />,
      }} />
      <Drawer.Screen name="Subscription" component={SubscriptionScreen} options={{ headerShown: true, title: 'Subscription' }} />
    </Drawer.Navigator>
  );
};

const styles = StyleSheet.create({
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 12,
    margin: 16,
    marginBottom: 24,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1B5E20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 20,
  },
  orgText: {
    color: '#1B5E20',
    fontWeight: 'bold',
    fontSize: 16,
  },
  nameText: {
    color: '#388E3C',
    fontSize: 13,
  },
});