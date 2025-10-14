import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';

interface BottomTabBarProps {
  currentRoute?: string;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ currentRoute }) => {
  const navigation = useNavigation();
  const { theme } = useTheme();

  const tabs = [
    {
      name: 'Profile',
      icon: 'person',
      label: 'Profile',
      route: 'Profile',
    },
    {
      name: 'History',
      icon: 'document-text',
      label: 'History',
      route: 'SessionHistory',
    },
    {
      name: 'Stats',
      icon: 'stats-chart',
      label: 'Stats',
      route: 'Results',
    },
    {
      name: 'Bonuses',
      icon: 'trophy',
      label: 'Bonuses',
      route: 'Bonuses',
    },
    {
      name: 'Community',
      icon: 'people',
      label: 'Community',
      route: 'Community',
    },
  ];

  const handleTabPress = (route: string) => {
    navigation.navigate(route as never);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.primary }]}>
      {tabs.map((tab) => {
        const isActive = currentRoute === tab.route;
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tabButton}
            onPress={() => handleTabPress(tab.route)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isActive ? tab.icon : `${tab.icon}-outline`}
              size={24}
              color="#FFFFFF"
            />
            <Text style={[styles.tabLabel, { color: '#FFFFFF' }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
    height: 70,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    paddingHorizontal: 4,
    minWidth: 55,
    flex: 1,
    maxWidth: 70,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
});
