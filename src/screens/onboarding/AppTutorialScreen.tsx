import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Dimensions, Platform } from 'react-native'; // Added Platform
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, CommonActions, useRoute, RouteProp } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList, RootStackParamList } from '../../navigation/types';

type AppTutorialNavigationProp = NativeStackNavigationProp<RootStackParamList>;
type AppTutorialRouteProp = RouteProp<OnboardingStackParamList, 'AppTutorial'>;

const { width } = Dimensions.get('window');

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap; // Type-safe icons
  color: string;
  details: string[];
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'focus-sessions',
    title: 'Start Focus Sessions',
    description: 'Learn how to begin productive study sessions with our focus methods',
    icon: 'play-circle-outline',
    color: '#4CAF50',
    details: [
      'Choose your preferred focus method (Balanced, Sprint, or Deep Work)',
      'Set your study goals and select subjects',
      'Start the timer and begin your focused study session',
      'Take breaks when prompted to maintain peak concentration',
      'Track your progress and celebrate achievements'
    ]
  },
  {
    id: 'navigation',
    title: 'Navigate the App',
    description: 'Discover all the features and sections available to enhance your learning',
    icon: 'compass-outline',
    color: '#2196F3',
    details: [
      'Home: Your dashboard with study stats and quick actions',
      'Community: Connect with study groups and join discussions',
      'Patrick: Your AI study assistant for personalized help',
      'Bonuses: Unlock achievements and rewards for progress',
      'Profile: Manage your account and track your journey'
    ]
  },
  {
    id: 'study-rooms',
    title: 'Join Study Rooms',
    description: 'Collaborate with others in virtual study environments',
    icon: 'people-outline',
    color: '#FF9800',
    details: [
      'Browse available public study rooms by subject',
      'Create your own study room and invite friends',
      'Use voice or text chat during study breaks',
      'Share study materials and resources',
      'Motivate each other and stay accountable'
    ]
  },
  {
    id: 'settings',
    title: 'Customize Settings',
    description: 'Personalize your experience and manage your preferences',
    icon: 'settings-outline',
    color: '#9C27B0',
    details: [
      'Adjust notification preferences and study reminders',
      'Customize your profile and privacy settings',
      'Set your preferred study times and break durations',
      'Choose your theme and display preferences',
      'Manage your account and subscription settings'
    ]
  }
];

export default function AppTutorialScreen() {
  const navigation = useNavigation<AppTutorialNavigationProp>();
  const route = useRoute<AppTutorialRouteProp>();
  const { setHasCompletedOnboarding, updateOnboarding, user } = useAuth();
  const { theme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  
  // Get focus method from route params
  const focusMethod = route.params?.focusMethod;
  
  const [currentStep, setCurrentStep] = useState(0);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([0]));

  useEffect(() => {
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

  const toggleStepExpansion = (stepIndex: number) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepIndex)) {
      newExpanded.delete(stepIndex);
    } else {
      newExpanded.clear(); // Collapse other steps
      newExpanded.add(stepIndex);
    }
    setExpandedSteps(newExpanded);
    setCurrentStep(stepIndex);
  };

  const handleComplete = async () => {
    try {
      console.log('🎯 Completing onboarding with focus method:', focusMethod);
      
      await updateOnboarding({ 
        is_onboarding_complete: true,
        focus_method: focusMethod,
        welcome_completed: true,
        goals_set: true,
        first_session_completed: false,
        profile_customized: true,
        completed_at: new Date().toISOString()
      });
      
      setHasCompletedOnboarding(true); // Update local state immediately
      console.log('✅ Onboarding completed successfully, navigating to Main app');
      
      // Navigate to main app and reset navigation stack
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        })
      );
    } catch (error) {
      console.error('AppTutorialScreen: Error completing onboarding:', error);
      
      // Try a fallback approach - directly update the database
      try {
        console.log('🔄 Attempting fallback onboarding completion...');
        const { supabase } = await import('../../utils/supabase');
        
        if (user?.id) {
          await supabase
            .from('onboarding_preferences')
            .upsert({
              user_id: user.id,
              is_onboarding_complete: true,
              focus_method: focusMethod,
              updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });
          
          console.log('✅ Fallback onboarding completion successful');
        }
      } catch (fallbackError) {
        console.error('❌ Fallback onboarding completion also failed:', fallbackError);
      }
      
      // Still navigate to main app since user has gone through all the steps
      setHasCompletedOnboarding(true);
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        })
      );
    }
  };

  const handleBack = () => navigation.goBack();

  const renderTutorialStep = (step: TutorialStep, index: number) => {
    const isExpanded = expandedSteps.has(index);
    const isActive = currentStep === index;
    
    return (
      <TouchableOpacity
        key={step.id}
        style={[
          styles.stepCard,
          { 
            backgroundColor: theme.isDark ? theme.card : 'rgba(255, 255, 255, 0.05)',
            borderColor: isActive ? step.color : (theme.isDark ? theme.border : 'rgba(232, 245, 233, 0.2)')
          },
          isActive && [styles.activeStepCard, { backgroundColor: theme.isDark ? theme.cardHover : 'rgba(76, 175, 80, 0.1)' }]
        ]}
        onPress={() => toggleStepExpansion(index)}
        activeOpacity={0.8}
      >
        <View style={styles.stepHeaderContainer}>
          <View style={[styles.stepIconContainer, { backgroundColor: step.color + '20' }]}>
            <Ionicons name={step.icon} size={24} color={step.color} />
          </View>
          <View style={styles.stepInfoContainer}>
            <Text style={[styles.stepTitle, { color: theme.isDark ? theme.text : '#E8F5E9' }]}>{step.title}</Text>
            <Text style={[styles.stepDescription, { color: theme.isDark ? theme.textSecondary : '#B8E6C1' }]}>{step.description}</Text>
          </View>
          <Ionicons 
            name={isExpanded ? "chevron-up-circle-outline" : "chevron-down-circle-outline"} // Changed icon for clarity
            size={24} // Slightly larger icon
            color={isActive ? step.color : (theme.isDark ? theme.textSecondary : '#B8E6C1')} 
          />
        </View>
        
        {isExpanded && (
          <Animated.View style={styles.stepDetailsContainer}>
            <View style={styles.detailsListContainer}>
              {step.details.map((detail, detailIndex) => (
                <View key={detailIndex} style={styles.detailItem}>
                  <View style={styles.detailNumber}>
                    <Text style={styles.detailNumberText}>{detailIndex + 1}</Text>
                  </View>
                  <Text style={[styles.detailText, { color: theme.isDark ? theme.textSecondary : '#B8E6C1' }]}>{detail}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient
      colors={theme.isDark ? ['#000000', '#1a1a1a', '#2a2a2a', '#1a1a1a'] : ['#0F2419', '#1B4A3A', '#2E5D4F', '#1B4A3A']}
      locations={[0, 0.3, 0.7, 1]} // Updated gradient colors
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.isDark ? theme.text : '#E8F5E9'} />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={[styles.headerTitle, { color: theme.isDark ? theme.text : '#E8F5E9' }]}>App Tutorial</Text>
              <Text style={[styles.headerSubtitle, { color: theme.isDark ? theme.textSecondary : '#B8E6C1' }]}>
                Step 5 of 5 • Get the most out of your study experience
              </Text>
            </View>
            <View style={{ width: 24 }} /> 
          </View>
          
          <ScrollView 
            style={styles.tutorialList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            <View style={styles.welcomeCard}>
              <View style={styles.welcomeIcon}>
                <Ionicons name="school-outline" size={32} color="#4CAF50" />
              </View>
              <Text style={[styles.welcomeTitle, { color: theme.isDark ? theme.text : '#E8F5E9' }]}>Welcome to Study Tracker!</Text>
              <Text style={[styles.welcomeText, { color: theme.isDark ? theme.textSecondary : '#B8E6C1' }]}>
                You're all set! Here's a quick guide to help you get started.
              </Text>
            </View>

            {TUTORIAL_STEPS.map(renderTutorialStep)}

            <View style={styles.tipsCard}>
              <View style={styles.tipsHeader}>
                <Ionicons name="bulb-outline" size={20} color="#FF9800" />
                <Text style={[styles.tipsTitle, { color: theme.isDark ? theme.text : '#E8F5E9' }]}>Pro Tips</Text>
              </View>
              <View style={styles.tipsList}>
                <Text style={[styles.tipItem, { color: theme.isDark ? theme.textSecondary : '#B8E6C1' }]}>• Start with shorter sessions and gradually increase duration.</Text>
                <Text style={[styles.tipItem, { color: theme.isDark ? theme.textSecondary : '#B8E6C1' }]}>• Join study groups in your field of interest.</Text>
                <Text style={[styles.tipItem, { color: theme.isDark ? theme.textSecondary : '#B8E6C1' }]}>• Use Patrick AI for personalized study recommendations.</Text>
                <Text style={[styles.tipItem, { color: theme.isDark ? theme.textSecondary : '#B8E6C1' }]}>• Set daily study goals to track your progress.</Text>
                <Text style={[styles.tipItem, { color: theme.isDark ? theme.textSecondary : '#B8E6C1' }]}>• Don't forget to take breaks and stay hydrated!</Text>
              </View>
            </View>
          </ScrollView>
          
          <View style={styles.bottomContainer}>
            <TouchableOpacity style={styles.completeButton} onPress={handleComplete} activeOpacity={0.8}>
              <LinearGradient
                colors={['#4CAF50', '#66BB6A', '#4CAF50']} // Consistent button gradient
                locations={[0, 0.5, 1]}
                style={styles.buttonGradient}
              >
                <Text style={styles.completeButtonText}>Start My Journey</Text>
                <Ionicons name="rocket-outline" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
              </LinearGradient>
            </TouchableOpacity>
            
            <View style={styles.progressIndicator}>
              <View style={[styles.progressDot, styles.progressDotCompleted]} />
              <View style={[styles.progressDot, styles.progressDotCompleted]} />
              <View style={[styles.progressDot, styles.progressDotCompleted]} />
              <View style={[styles.progressDot, styles.progressDotCompleted]} />
              <View style={[styles.progressDot, styles.progressDotActive]} />
            </View>
          </View>
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingTop: Platform.OS === 'android' ? 25 : 0 }, // Consistent with other onboarding screens
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 }, // Consistent paddingTop
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTextContainer: {
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
  tutorialList: { flex: 1 },
  welcomeCard: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)', // Match PrivacySettingsScreen pattern
    borderRadius: 16, // Consistent rounding
    padding: 16, // Match FocusMethodIntroScreen
    marginBottom: 24, 
    alignItems: 'center',
    borderWidth: 2, // Match FocusMethodIntroScreen
    borderColor: 'rgba(76, 175, 80, 0.25)', // Subtle border
  },
  welcomeIcon: { 
    marginBottom: 12, 
    backgroundColor: 'rgba(76, 175, 80, 0.2)', // Match PrivacySettingsScreen pattern
    padding: 10, 
    borderRadius: 25, // Circular background
  },
  welcomeTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' }, // Larger title
  welcomeText: { fontSize: 15, textAlign: 'center', lineHeight: 22 }, // Adjusted size/lineHeight
  stepCard: {
    borderRadius: 16, // Consistent rounding
    padding: 16, // Match FocusMethodIntroScreen
    marginBottom: 12, // Match FocusMethodIntroScreen
    borderWidth: 2, 
  },
  activeStepCard: {}, // Empty - will be handled dynamically 
  stepHeaderContainer: { // Renamed from stepHeader
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  stepIconContainer: { // Renamed from stepIcon
    width: 40, height: 40, borderRadius: 20, // Match FocusMethodIntroScreen sizing
    justifyContent: 'center', alignItems: 'center', marginRight: 16, // Consistent margin
  },
  stepInfoContainer: { flex: 1 }, // Renamed from stepInfo
  stepTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 }, // Consistent title
  stepDescription: { fontSize: 14, lineHeight: 20 }, // Consistent description
  stepDetailsContainer: { // Renamed from stepDetails
    marginTop: 16, 
    paddingTop: 16, 
    borderTopWidth: 1, 
    borderTopColor: 'rgba(232, 245, 233, 0.15)' // Subtle separator
  },
  detailsListContainer: { gap: 12 }, // Renamed from detailsList
  detailItem: { flexDirection: 'row', alignItems: 'flex-start' },
  detailNumber: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(76, 175, 80, 0.2)', // Consistent with FocusMethodIntro features if applicable
    justifyContent: 'center', alignItems: 'center', marginRight: 12, marginTop: 1,
  },
  detailNumberText: { fontSize: 12, fontWeight: 'bold', color: '#4CAF50' },
  detailText: { flex: 1, fontSize: 14, lineHeight: 20 },
  tipsCard: {
    backgroundColor: 'rgba(255, 152, 0, 0.08)', // Subtle orange background
    borderRadius: 16, padding: 16, marginTop: 12, marginBottom: 20, // Match standard padding
    borderWidth: 2, borderColor: 'rgba(255, 152, 0, 0.25)', // Match border width pattern
  },
  tipsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  tipsTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 8 },
  tipsList: { gap: 8 },
  tipItem: { fontSize: 14, lineHeight: 20 },
  bottomContainer: { 
    paddingTop: 20, 
    paddingBottom: 10, // Match FocusMethodIntroScreen
  },
  completeButton: {
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
  completeButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' }, // Consistent text
  progressIndicator: { flexDirection: 'row', justifyContent: 'center', gap: 8 }, // Match FocusMethodIntroScreen
  progressDot: { 
    width: 8, height: 8, borderRadius: 4, // Match FocusMethodIntroScreen
    backgroundColor: 'rgba(232, 245, 233, 0.3)', 
  },
  progressDotActive: { backgroundColor: '#4CAF50' }, // Consistent active color
  progressDotCompleted: { backgroundColor: 'rgba(76, 175, 80, 0.6)' }, // Consistent completed color
});
