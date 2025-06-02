import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';

export const DebugInfo: React.FC = () => {
  const { 
    isAuthenticated, 
    isLoading, 
    hasSeenLanding, 
    hasCompletedOnboarding, 
    user, 
    onboarding 
  } = useAuth();

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.title}>Debug Information ({Platform.OS})</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Platform Info:</Text>
          <Text style={styles.debugText}>Platform: {Platform.OS}</Text>
          <Text style={styles.debugText}>Version: {Platform.Version}</Text>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Authentication State:</Text>
          <Text style={styles.debugText}>isAuthenticated: {String(isAuthenticated)}</Text>
          <Text style={styles.debugText}>isLoading: {String(isLoading)}</Text>
          <Text style={styles.debugText}>hasSeenLanding: {String(hasSeenLanding)}</Text>
          <Text style={styles.debugText}>hasCompletedOnboarding: {String(hasCompletedOnboarding)}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Data:</Text>
          <Text style={styles.debugText}>User ID: {user?.id || 'null'}</Text>
          <Text style={styles.debugText}>User Email: {user?.email || 'null'}</Text>
          <Text style={styles.debugText}>User Username: {user?.username || 'null'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Onboarding Data:</Text>
          <Text style={styles.debugText}>Onboarding ID: {onboarding?.id || 'null'}</Text>
          <Text style={styles.debugText}>User ID: {onboarding?.user_id || 'null'}</Text>
          <Text style={styles.debugText}>Is Complete: {String(onboarding?.is_onboarding_complete)}</Text>
          <Text style={styles.debugText}>Learning Environment: {onboarding?.learning_environment || 'null'}</Text>
          <Text style={styles.debugText}>User Goal: {onboarding?.user_goal || 'null'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Navigation Logic:</Text>
          <Text style={styles.debugText}>
            Should show: {
              !isAuthenticated 
                ? (hasSeenLanding ? "Auth Screen" : "Landing Page")
                : (hasCompletedOnboarding ? "Main App" : "Onboarding")
            }
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 10,
    padding: 10,
    zIndex: 1000,
    maxHeight: 400,
  },
  scrollView: {
    flex: 1,
  },
  title: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  debugText: {
    color: 'white',
    fontSize: 12,
    marginBottom: 2,
  },
});
