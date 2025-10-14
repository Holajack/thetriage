import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Switch, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

type PrivacySettingsNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'PrivacySettings'>;
type PrivacySettingsRouteProp = RouteProp<OnboardingStackParamList, 'PrivacySettings'>;

interface PrivacySetting {
  id: string;
  title: string;
  description: string;
  defaultValue: boolean;
  icon: keyof typeof Ionicons.glyphMap; // Use keyof typeof Ionicons.glyphMap for type safety
  category: 'profile' | 'activity' | 'communication' | 'data';
}

const PRIVACY_SETTINGS: PrivacySetting[] = [
  { id: 'profileVisibility', title: 'Public Profile', description: 'Allow other users to view your profile information', defaultValue: true, icon: 'person-circle-outline', category: 'profile' },
  { id: 'showProgress', title: 'Show Study Progress', description: 'Display your study statistics and achievements publicly', defaultValue: true, icon: 'trending-up-outline', category: 'profile' },
  { id: 'showLeaderboard', title: 'Appear on Leaderboards', description: 'Include your scores in community leaderboards', defaultValue: true, icon: 'trophy-outline', category: 'profile' },
  { id: 'studySessionVisibility', title: 'Study Session Visibility', description: 'Allow others to see when you\'re studying', defaultValue: false, icon: 'time-outline', category: 'activity' },
  { id: 'shareStudyRooms', title: 'Public Study Rooms', description: 'Allow others to join your study rooms', defaultValue: true, icon: 'people-outline', category: 'activity' },
  { id: 'locationSharing', title: 'Location Sharing', description: 'Share your general location with study groups', defaultValue: false, icon: 'location-outline', category: 'activity' },
  { id: 'directMessages', title: 'Direct Messages', description: 'Allow other users to send you private messages', defaultValue: true, icon: 'chatbubble-ellipses-outline', category: 'communication' },
  { id: 'studyInvites', title: 'Study Invitations', description: 'Receive invitations to join study sessions', defaultValue: true, icon: 'mail-outline', category: 'communication' },
  { id: 'emailNotifications', title: 'Email Notifications', description: 'Receive study reminders and updates via email', defaultValue: true, icon: 'notifications-outline', category: 'communication' },
  { id: 'analyticsSharing', title: 'Anonymous Analytics', description: 'Help improve the app by sharing anonymous usage data', defaultValue: true, icon: 'analytics-outline', category: 'data' },
  { id: 'personalizedRecommendations', title: 'Personalized Recommendations', description: 'Use your data to provide personalized study suggestions', defaultValue: true, icon: 'bulb-outline', category: 'data' },
];

const CATEGORY_TITLES = {
  profile: 'Profile & Visibility',
  activity: 'Study Activity',
  communication: 'Communication',
  data: 'Data & Analytics'
};

const CATEGORY_ICONS: Record<keyof typeof CATEGORY_TITLES, keyof typeof Ionicons.glyphMap> = {
  profile: 'person-outline',
  activity: 'library-outline',
  communication: 'chatbubbles-outline',
  data: 'bar-chart-outline'
};

export default function PrivacySettingsScreen() {
  const navigation = useNavigation<PrivacySettingsNavigationProp>();
  const route = useRoute<PrivacySettingsRouteProp>();
  const { updateOnboarding } = useAuth();
  const { theme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Get focus method from route params
  const focusMethod = route.params?.focusMethod;

  const [settings, setSettings] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Initialize settings with default values
    const defaultSettings: Record<string, boolean> = {};
    PRIVACY_SETTINGS.forEach(setting => {
      defaultSettings[setting.id] = setting.defaultValue;
    });
    setSettings(defaultSettings);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const toggleSetting = (settingId: string) => {
    setSettings(prev => ({
      ...prev,
      [settingId]: !prev[settingId]
    }));
  };

  const handleContinue = async () => {
    try {
      await updateOnboarding({
        profile_visibility: settings.profileVisibility ? 'public' : 'private',
        show_study_progress: settings.showProgress,
        appear_on_leaderboards: settings.showLeaderboard,
        study_session_visibility: settings.studySessionVisibility ? 'visible' : 'hidden',
        public_study_rooms: settings.shareStudyRooms,
        location_sharing_preference: settings.locationSharing ? 'enabled' : 'disabled',
        allow_direct_messages: settings.directMessages,
        receive_study_invitations: settings.studyInvites,
        email_notification_preference: settings.emailNotifications,
        share_anonymous_analytics: settings.analyticsSharing,
        personalized_recommendations_preference: settings.personalizedRecommendations,
        // Ensure focusMethod is passed along if it exists, or handle its absence
        focus_method: route.params?.focusMethod || undefined, 
      });
      
      navigation.navigate('AppTutorial', { focusMethod: route.params?.focusMethod });
    } catch (error) {
      console.error('Failed to save privacy settings:', error);
      // Still navigate to AppTutorial, passing focusMethod
      navigation.navigate('AppTutorial', { focusMethod: route.params?.focusMethod });
    }
  };

  const handleBack = () => navigation.goBack();

  const renderSettingCard = (setting: PrivacySetting) => {
    const isEnabled = settings[setting.id];
    
    return (
      <View key={setting.id} style={[styles.settingCard, { backgroundColor: theme.isDark ? theme.card : 'rgba(255, 255, 255, 0.05)', borderColor: theme.isDark ? theme.border : 'rgba(232, 245, 233, 0.2)' }]}>
        <View style={styles.settingHeaderContainer}>
          <View style={[styles.settingIconContainer, { backgroundColor: isEnabled ? '#4CAF5020' : (theme.isDark ? theme.cardHover : 'rgba(232, 245, 233, 0.1)')}]}>
            <Ionicons name={setting.icon} size={20} color={isEnabled ? '#4CAF50' : (theme.isDark ? theme.textSecondary : '#B8E6C1')} />
          </View>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingTitle, { color: theme.isDark ? theme.text : '#E8F5E9' }]}>{setting.title}</Text>
            <Text style={[styles.settingDescription, { color: theme.isDark ? theme.textSecondary : '#B8E6C1' }]}>{setting.description}</Text>
          </View>
          <Switch
            value={isEnabled}
            onValueChange={() => toggleSetting(setting.id)}
            trackColor={{ false: theme.isDark ? theme.border : 'rgba(232, 245, 233, 0.2)', true: 'rgba(76, 175, 80, 0.4)' }}
            thumbColor={isEnabled ? '#4CAF50' : (theme.isDark ? theme.text : '#E8F5E9')}
            ios_backgroundColor={theme.isDark ? theme.border : 'rgba(232, 245, 233, 0.2)'}
            style={{ transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] }}
          />
        </View>
      </View>
    );
  };

  const renderCategory = (category: keyof typeof CATEGORY_TITLES) => {
    const categorySettings = PRIVACY_SETTINGS.filter(setting => setting.category === category);
    
    return (
      <View key={category} style={styles.categorySection}>
        <View style={[styles.categoryHeader, { borderBottomColor: theme.isDark ? theme.border : 'rgba(232, 245, 233, 0.2)' }]}>
          <View style={[styles.categoryIconContainer, { backgroundColor: theme.isDark ? theme.primary + '30' : 'rgba(76, 175, 80, 0.2)' }]}>
            <Ionicons name={CATEGORY_ICONS[category]} size={18} color="#4CAF50" />
          </View>
          <Text style={[styles.categoryTitle, { color: theme.isDark ? theme.text : '#E8F5E9' }]}>{CATEGORY_TITLES[category]}</Text>
        </View>
        {categorySettings.map(renderSettingCard)}
      </View>
    );
  };

  return (
    <LinearGradient
      colors={theme.isDark ? ['#000000', '#1a1a1a', '#2a2a2a', '#1a1a1a'] : ['#0F2419', '#1B4A3A', '#2E5D4F', '#1B4A3A']}
      locations={[0, 0.3, 0.7, 1]} // Updated gradient colors
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.isDark ? theme.text : '#E8F5E9'} />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={[styles.headerTitle, { color: theme.isDark ? theme.text : '#E8F5E9' }]}>Privacy Settings</Text>
              <Text style={[styles.headerSubtitle, { color: theme.isDark ? theme.textSecondary : '#B8E6C1' }]}>
                Step 5 of 6 • Control how your information is shared
              </Text>
            </View>
            {/* Placeholder for potential right-side header element if needed */}
            <View style={{ width: 24 }} /> 
          </View>
          
          <ScrollView 
            style={styles.settingsList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            <View style={[styles.privacyNotice, { backgroundColor: theme.isDark ? theme.cardHover : 'rgba(76, 175, 80, 0.1)', borderColor: theme.isDark ? theme.primary + '40' : 'rgba(76, 175, 80, 0.3)' }]}>
              <View style={[styles.noticeIcon, { backgroundColor: theme.isDark ? theme.primary + '30' : 'rgba(76, 175, 80, 0.2)' }]}>
                <Ionicons name="shield-checkmark-outline" size={24} color="#4CAF50" />
              </View>
              <View style={styles.noticeContent}>
                <Text style={[styles.noticeTitle, { color: theme.isDark ? theme.text : '#E8F5E9' }]}>Your Privacy Matters</Text>
                <Text style={[styles.noticeText, { color: theme.isDark ? theme.textSecondary : '#B8E6C1' }]}>
                  You can change these settings anytime in your profile. We are committed to protecting your privacy.
                </Text>
              </View>
            </View>

            {Object.keys(CATEGORY_TITLES).map(category => 
              renderCategory(category as keyof typeof CATEGORY_TITLES)
            )}
          </ScrollView>
          
          <View style={[styles.bottomContainer, { borderTopColor: theme.isDark ? theme.border : 'rgba(232, 245, 233, 0.1)' }]}>
            <TouchableOpacity 
              style={styles.continueButton}
              onPress={handleContinue}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#4CAF50', '#66BB6A', '#4CAF50']} // Consistent button gradient
                locations={[0, 0.5, 1]}
                style={styles.buttonGradient}
              >
                <Text style={styles.continueButtonText}>Continue</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
              </LinearGradient>
            </TouchableOpacity>
            
            <View style={styles.progressIndicator}>
              <View style={[styles.progressDot, styles.progressDotCompleted]} />
              <View style={[styles.progressDot, styles.progressDotCompleted]} />
              <View style={[styles.progressDot, styles.progressDotCompleted]} />
              <View style={[styles.progressDot, styles.progressDotCompleted]} />
              <View style={[styles.progressDot, styles.progressDotActive]} />
              <View style={styles.progressDot} />
            </View>
          </View>
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingTop: Platform.OS === 'android' ? 25 : 0 }, // Consistent with FocusMethodIntro
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 }, // Consistent paddingTop
  header: {
    flexDirection: 'row', // Added for back button alignment
    justifyContent: 'space-between', // Distribute space
    alignItems: 'center', // Align items vertically
    marginBottom: 30,
  },
  backButton: {
    padding: 8, // Make it easier to press
    marginRight: 8, // Add some space if there's a title next to it
  },
  headerTextContainer: { // To center the text when back button is present
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28, // Matched FocusMethodIntroScreen
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16, // Matched FocusMethodIntroScreen
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10, // Matched FocusMethodIntroScreen
  },
  settingsList: { flex: 1 },
  privacyNotice: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    flexDirection: 'row',
    borderWidth: 2,
    alignItems: 'center',
  },
  noticeIcon: { 
    marginRight: 16,
    padding: 8,
    borderRadius: 20,
  },
  noticeContent: { flex: 1 },
  noticeTitle: { fontSize: 17, fontWeight: '600', marginBottom: 5 }, // Adjusted size/weight
  noticeText: { fontSize: 14, lineHeight: 20 }, // Adjusted line height
  categorySection: { marginBottom: 24 },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  categoryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  settingCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
  },
  settingHeaderContainer: { // Renamed from settingHeader for clarity
    flexDirection: 'row', 
    alignItems: 'center',
  },
  settingIconContainer: { // Renamed from settingIcon
    width: 40, height: 40, borderRadius: 20, // Consistent icon container size
    justifyContent: 'center', alignItems: 'center', marginRight: 16, // Increased margin
  },
  settingInfo: { flex: 1, marginRight: 12 },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  bottomContainer: { 
    paddingTop: 20, 
    paddingBottom: Platform.OS === 'ios' ? 20 : 25, // Consistent padding
    borderTopWidth: 1, // Add a subtle separator
  },
  continueButton: {
    borderRadius: 12, // Consistent rounding
    marginBottom: 20, 
    elevation: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 3,
  },
  buttonGradient: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingVertical: 16, // Consistent padding
    borderRadius: 12, // Consistent rounding
  },
  continueButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' }, // Consistent text
  progressIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(232, 245, 233, 0.3)',
  },
  progressDotActive: { backgroundColor: '#4CAF50' }, // Consistent active color
  progressDotCompleted: { backgroundColor: 'rgba(76, 175, 80, 0.6)' }, // Consistent completed color
});
