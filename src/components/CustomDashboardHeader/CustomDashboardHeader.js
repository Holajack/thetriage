// src/components/CustomDashboardHeader/CustomDashboardHeader.js
import React, { useState } from 'react';
import { TouchableOpacity, Modal, Pressable, View, Text, StyleSheet } from 'react-native';
import { Entypo, Ionicons, MaterialIcons, Feather, FontAwesome5 } from '@expo/vector-icons';
import { theme } from '../../config/theme';

const MENU_ITEMS = [
  { label: 'Dashboard', icon: <MaterialIcons name="dashboard" size={22} color={theme.colors.primary} />, screen: 'Home' },
  { label: 'Community', icon: <Feather name="users" size={22} color={theme.colors.primary} />, screen: 'Community' },
  { label: 'Nora', icon: <MaterialIcons name="smart-toy" size={22} color={theme.colors.primary} />, screen: 'Nora' },
  { label: 'Leaderboard', icon: <FontAwesome5 name="trophy" size={22} color={theme.colors.primary} />, screen: 'Leaderboard' },
  { label: 'Reports', icon: <Feather name="bar-chart-2" size={22} color={theme.colors.primary} />, screen: 'Results' },
  { label: 'Session History', icon: <MaterialIcons name="history" size={22} color={theme.colors.primary} />, screen: 'SessionHistory' },
  { label: 'Bonuses', icon: <MaterialIcons name="stars" size={22} color={theme.colors.primary} />, screen: 'Bonuses' },
  { label: 'Profile', icon: <Feather name="user" size={22} color={theme.colors.primary} />, screen: 'Profile' },
  { label: 'Settings', icon: <Feather name="settings" size={22} color={theme.colors.primary} />, screen: 'Settings' },
];

const CustomDashboardHeader = ({ navigation }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);

  const handleMenuPress = (screen) => {
    console.log('🔍 Navigation Debug: Attempting to navigate to:', screen);
    setDrawerVisible(false);
    
    if (screen) {
      try {
        navigation.navigate(screen);
        console.log('✅ Navigation successful to:', screen);
      } catch (error) {
        console.error('❌ Navigation failed:', error);
      }
    }
  };

  const handleLogout = () => {
    setDrawerVisible(false);
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  return (
    <>
      <TouchableOpacity onPress={() => setDrawerVisible(true)} style={{ marginRight: 12 }}>
          <Entypo name="dots-three-horizontal" size={28} color={theme.colors.primary} />
        </TouchableOpacity>
      <Modal
        visible={drawerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setDrawerVisible(false)}
      >
        <Pressable style={styles.drawerOverlay} onPress={() => setDrawerVisible(false)} />
        <View style={styles.drawer}>
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerTitle}>The Triage System</Text>
            <TouchableOpacity onPress={() => setDrawerVisible(false)}>
              <Ionicons name="close" size={28} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles.menuList}>
            {MENU_ITEMS.map((item) => (
              <TouchableOpacity key={item.label} style={styles.menuItem} onPress={() => handleMenuPress(item.screen)}>
                {item.icon}
                <Text style={styles.menuLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Feather name="log-out" size={20} color="#fff" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
          <Text style={styles.copyright}>© 2025 The Triage System</Text>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  drawerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '75%',
    height: '100%',
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  drawerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  menuList: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 16,
  },
  menuLabel: {
    fontSize: 18,
    color: theme.colors.primary,
    marginLeft: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F44336',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignSelf: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  logoutText: {
    color: '#fff',
    fontSize: 18,
    marginLeft: 10,
    fontWeight: 'bold',
  },
  copyright: {
    textAlign: 'center',
    color: '#888',
    fontSize: 13,
    marginBottom: 16,
  },
});

export default CustomDashboardHeader;