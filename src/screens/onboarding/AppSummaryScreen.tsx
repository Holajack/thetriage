import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, CommonActions, useRoute, RouteProp } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList, RootStackParamList } from '../../navigation/types';

type AppSummaryNavigationProp = NativeStackNavigationProp<RootStackParamList>;
type AppSummaryRouteProp = RouteProp<OnboardingStackParamList, 'AppTutorial'>;

interface AppFeature {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const APP_FEATURES: AppFeature[] = [
  {
    id: 'focus-sessions',
    title: 'Focus Sessions',
    description: 'Personalized study sessions with Pomodoro timer and ambient sounds',
    icon: 'timer-outline',
    color: '#4CAF50',
  },
  {
    id: 'ai-assistant',
    title: 'AI Study Assistant',
    description: 'Get personalized study tips and answers from Patrick AI',
    icon: 'chatbubbles-outline',
    color: '#2196F3',
  },
  {
    id: 'community',
    title: 'Study Community',
    description: 'Connect with fellow students and join study groups',
    icon: 'people-outline',
    color: '#FF9800',
  },
  {
    id: 'progress-tracking',
    title: 'Progress Tracking',
    description: 'Monitor your study habits and achievements over time',
    icon: 'analytics-outline',
    color: '#9C27B0',
  },
];

export default function AppSummaryScreen() {
  const navigation = useNavigation<AppSummaryNavigationProp>();
  const route = useRoute<AppSummaryRouteProp>();
  const { updateOnboarding, setHasCompletedOnboarding } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const confettiAnim = useRef(new Animated.Value(0)).current;
  
  const focusMethod = route.params?.focusMethod;

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

  const handleComplete = async () => {
    try {
      await updateOnboarding({ 
        is_onboarding_complete: true,
        focus_method: focusMethod 
      });
      
      // Update local state immediately
      setHasCompletedOnboarding(true);
      
      // Show welcome modal first
      setShowWelcomeModal(true);
      
      // Start confetti animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(confettiAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(confettiAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
      
    } catch (error) {
      console.error('AppSummaryScreen: Error completing onboarding:', error);
      // Still show welcome modal even if database update fails
      setShowWelcomeModal(true);
    }
  };

  const handleStartJourney = () => {
    setShowWelcomeModal(false);
    // Navigate to main app and reset navigation stack
    // The walkthrough will be triggered by the main app after navigation
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Main', params: { showWalkthrough: true } }],
      })
    );
  };

  const renderFeature = (feature: AppFeature) => (
    <View key={feature.id} style={styles.featureCard}>
      <View style={[styles.featureIcon, { backgroundColor: feature.color + '20' }]}>
        <Ionicons name={feature.icon} size={24} color={feature.color} />
      </View>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{feature.title}</Text>
        <Text style={styles.featureDescription}>{feature.description}</Text>
      </View>
    </View>
  );

  return (
    <LinearGradient
      colors={['#0F2419', '#1B4A3A', '#2E5D4F', '#1B4A3A']}
      locations={[0, 0.3, 0.7, 1]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#E8F5E9" />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>You're All Set!</Text>
              <Text style={styles.headerSubtitle}>
                Step 5 of 5 • Ready to transform your study experience
              </Text>
            </View>
            <View style={{ width: 24 }} />
          </View>
          
          <ScrollView 
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.welcomeSection}>
              <View style={styles.welcomeIcon}>
                <Ionicons name="school-outline" size={40} color="#4CAF50" />
              </View>
              <Text style={styles.welcomeTitle}>Welcome to The Triage System</Text>
              <Text style={styles.welcomeText}>
                Your personalized study companion designed to maximize focus, productivity, and learning outcomes through proven techniques and AI-powered insights.
              </Text>
            </View>

            <View style={styles.featuresSection}>
              <Text style={styles.sectionTitle}>What You Can Do</Text>
              {APP_FEATURES.map(renderFeature)}
            </View>

            <View style={styles.howToSection}>
              <Text style={styles.sectionTitle}>How to Get Started</Text>
              <View style={styles.stepsList}>
                <View style={styles.stepItem}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>1</Text>
                  </View>
                  <Text style={styles.stepText}>Tap the "Home" tab to access your study dashboard</Text>
                </View>
                <View style={styles.stepItem}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>2</Text>
                  </View>
                  <Text style={styles.stepText}>Start your first focus session with your chosen method</Text>
                </View>
                <View style={styles.stepItem}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>3</Text>
                  </View>
                  <Text style={styles.stepText}>Explore the community and connect with other students</Text>
                </View>
                <View style={styles.stepItem}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>4</Text>
                  </View>
                  <Text style={styles.stepText}>Check your progress and celebrate your achievements</Text>
                </View>
              </View>
            </View>
          </ScrollView>
          
          <View style={styles.bottomContainer}>
            <TouchableOpacity style={styles.completeButton} onPress={handleComplete} activeOpacity={0.8}>
              <LinearGradient
                colors={['#4CAF50', '#66BB6A', '#4CAF50']}
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

      {/* Welcome Modal */}
      <Modal
        visible={showWelcomeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowWelcomeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Confetti Animation */}
            <Animated.View 
              style={[
                styles.confettiContainer,
                {
                  opacity: confettiAnim,
                  transform: [
                    {
                      translateY: confettiAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -20],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.confetti}>🎉 ✨ 🎉 ✨ 🎉</Text>
            </Animated.View>
            
            <View style={styles.modalIcon}>
              <Ionicons name="star-outline" size={50} color="#FFD700" />
            </View>
            
            <Text style={styles.modalTitle}>Welcome, Beta Tester!</Text>
            <Text style={styles.modalSubtitle}>Thank you for being part of our journey</Text>
            
            <Text style={styles.modalText}>
              You're among the first to experience The Triage System. Your feedback and usage will help us create a world-class study app that empowers students everywhere.
            </Text>
            
            <Text style={styles.modalText}>
              We're excited to have you on board as we build something amazing together! 🚀
            </Text>
            
            <TouchableOpacity style={styles.modalButton} onPress={handleStartJourney}>
              <LinearGradient
                colors={['#FFD700', '#FFA500', '#FFD700']}
                locations={[0, 0.5, 1]}
                style={styles.modalButtonGradient}
              >
                <Text style={styles.modalButtonText}>Let's Get Started!</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  backButton: {
    padding: 8,
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#E8F5E9',
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#B8E6C1',
    textAlign: 'center',
    lineHeight: 22,
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  welcomeIcon: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    padding: 20,
    borderRadius: 40,
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E8F5E9',
    textAlign: 'center',
    marginBottom: 12,
  },
  welcomeText: {
    fontSize: 16,
    color: '#B8E6C1',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  featuresSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E8F5E9',
    marginBottom: 16,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E8F5E9',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#B8E6C1',
    lineHeight: 20,
  },
  howToSection: {
    marginBottom: 20,
  },
  stepsList: {
    gap: 12,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    color: '#B8E6C1',
    lineHeight: 22,
  },
  bottomContainer: {
    paddingTop: 20,
    paddingBottom: 10,
  },
  completeButton: {
    borderRadius: 12,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  buttonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
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
  progressDotActive: {
    backgroundColor: '#4CAF50',
  },
  progressDotCompleted: {
    backgroundColor: 'rgba(76, 175, 80, 0.6)',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#1B4A3A',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    width: '100%',
    maxWidth: 350,
  },
  confettiContainer: {
    position: 'absolute',
    top: -20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  confetti: {
    fontSize: 24,
    textAlign: 'center',
  },
  modalIcon: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    padding: 20,
    borderRadius: 40,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E8F5E9',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '600',
  },
  modalText: {
    fontSize: 16,
    color: '#B8E6C1',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  modalButton: {
    borderRadius: 12,
    marginTop: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  modalButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});