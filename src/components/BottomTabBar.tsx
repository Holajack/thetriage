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
    <View style={styles.floatingContainer}>
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
              <Text
                style={[styles.tabLabel, { color: '#FFFFFF', fontWeight: isActive ? '700' : '600' }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 15,
    width: '100%',
    maxWidth: 400,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 4,
    flex: 1,
    minHeight: 60,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
});
