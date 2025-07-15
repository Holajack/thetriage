import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  ScrollView,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface NoraOnboardingProps {
  visible: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

interface OnboardingStep {
  id: string;
  title: string;
  content: string;
  type: 'intro' | 'capabilities' | 'limitations' | 'policies' | 'welcome';
  icon?: keyof typeof Ionicons.glyphMap;
  features?: string[];
  warnings?: string[];
  requiresAcceptance?: boolean;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'intro',
    type: 'intro',
    title: 'Meet Nora',
    content: 'Hi! I\'m Nora, your AI study assistant. I\'m here to help you succeed in your academic journey.',
    icon: 'chatbubbles-outline',
    features: [
      'Answer questions about your study topics',
      'Help you create study plans and schedules',
      'Provide explanations and clarifications',
      'Assist with research and learning strategies',
      'Give motivational support and study tips'
    ]
  },
  {
    id: 'capabilities',
    type: 'capabilities',
    title: 'What I can help with',
    content: 'I\'m designed to be your comprehensive study companion. Here\'s how I can assist you:',
    icon: 'bulb-outline',
    features: [
      'Subject-specific questions and explanations',
      'Study technique recommendations',
      'Time management and planning advice',
      'Motivation and accountability support',
      'Research assistance and source suggestions',
      'Note-taking and summary strategies'
    ]
  },
  {
    id: 'limitations',
    type: 'limitations',
    title: 'Important limitations',
    content: 'While I\'m here to help, there are important things to keep in mind:',
    icon: 'warning-outline',
    warnings: [
      'I can make mistakes - always verify important information',
      'I can\'t browse the internet or access real-time data',
      'I shouldn\'t be your only source for critical decisions',
      'I can\'t complete assignments for you or help with cheating',
      'My knowledge has limitations and may not be current',
      'I can\'t provide professional medical, legal, or financial advice'
    ]
  },
  {
    id: 'policies',
    type: 'policies',
    title: 'Privacy & Safety',
    content: 'Your safety and privacy are important. Please understand:',
    icon: 'shield-checkmark-outline',
    warnings: [
      'Our conversations are regularly reviewed for safety and quality',
      'Don\'t share personal information like passwords or SSN',
      'Flagged conversations may be reviewed by our team',
      'We use conversations to improve our AI systems',
      'Our AI policies and capabilities may change over time',
      'Report any concerning responses to our support team'
    ],
    requiresAcceptance: true
  },
  {
    id: 'welcome',
    type: 'welcome',
    title: 'Ready to start!',
    content: 'I\'m excited to help you on your learning journey. What would you like to study today?',
    icon: 'rocket-outline'
  }
];

export default function NoraOnboarding({
  visible,
  onComplete,
  onSkip,
}: NoraOnboardingProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [hasAcceptedPolicies, setHasAcceptedPolicies] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    console.log('NoraOnboarding: visible prop changed to:', visible);
    if (visible) {
      setIsVisible(true);
      console.log('NoraOnboarding: Setting isVisible to true, starting animations');
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start(() => {
        console.log('NoraOnboarding: Animations completed');
      });
    } else {
      console.log('NoraOnboarding: visible false, hiding modal');
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsVisible(false);
        setCurrentStep(0);
        setHasAcceptedPolicies(false);
        console.log('NoraOnboarding: Modal completely hidden');
      });
    }
  }, [visible]);

  const getCurrentStep = () => ONBOARDING_STEPS[currentStep];
  const isLastStep = () => currentStep === ONBOARDING_STEPS.length - 1;
  const isPolicyStep = () => getCurrentStep().type === 'policies';

  const getFirstName = () => {
    if (!user?.full_name) return 'there';
    
    // Extract first name (everything before underscore or space)
    const fullName = user.full_name;
    const firstName = fullName.split(/[_\s]/)[0];
    return firstName || 'there';
  };

  const handleNext = () => {
    if (isPolicyStep() && !hasAcceptedPolicies) {
      return; // Can't proceed without accepting policies
    }

    if (isLastStep()) {
      onComplete();
    } else {
      // Animate transition
      Animated.sequence([
        Animated.timing(slideAnim, {
          toValue: -20,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 50,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
      
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  const handleAcceptPolicies = () => {
    setHasAcceptedPolicies(true);
  };

  const renderStepContent = () => {
    const step = getCurrentStep();
    console.log('NoraOnboarding: Rendering step:', step.title, 'User:', user?.full_name);
    
    return (
      <ScrollView 
        style={styles.contentScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {step.icon && (
          <View style={styles.iconContainer}>
            <View style={[styles.iconBackground, { backgroundColor: getStepColor(step.type) + '20' }]}>
              <Ionicons 
                name={step.icon} 
                size={32} 
                color={getStepColor(step.type)} 
              />
            </View>
          </View>
        )}
        
        <Text style={styles.stepTitle}>
          {step.type === 'welcome' ? `Welcome, ${getFirstName()}!` : step.title}
        </Text>
        
        <Text style={styles.stepContent}>
          {step.content}
        </Text>
        
        {step.features && (
          <View style={styles.featuresContainer}>
            {step.features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <View style={styles.featureBullet}>
                  <Ionicons name="checkmark" size={16} color="#4CAF50" />
                </View>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        )}
        
        {step.warnings && (
          <View style={styles.warningsContainer}>
            {step.warnings.map((warning, index) => (
              <View key={index} style={styles.warningItem}>
                <View style={styles.warningBullet}>
                  <Ionicons 
                    name={step.type === 'policies' ? "information-circle" : "alert-circle"} 
                    size={16} 
                    color={step.type === 'policies' ? "#2196F3" : "#FF9800"} 
                  />
                </View>
                <Text style={styles.warningText}>{warning}</Text>
              </View>
            ))}
          </View>
        )}
        
        {step.requiresAcceptance && (
          <TouchableOpacity 
            style={[
              styles.acceptanceButton,
              hasAcceptedPolicies && styles.acceptanceButtonAccepted
            ]}
            onPress={handleAcceptPolicies}
            activeOpacity={0.8}
          >
            <View style={styles.acceptanceContent}>
              <View style={[
                styles.checkbox,
                hasAcceptedPolicies && styles.checkboxChecked
              ]}>
                {hasAcceptedPolicies && (
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                )}
              </View>
              <Text style={[
                styles.acceptanceText,
                hasAcceptedPolicies && styles.acceptanceTextAccepted
              ]}>
                I understand and accept these terms
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </ScrollView>
    );
  };

  const getStepColor = (type: string) => {
    switch (type) {
      case 'intro': return '#4CAF50';
      case 'capabilities': return '#2196F3';
      case 'limitations': return '#FF9800';
      case 'policies': return '#9C27B0';
      case 'welcome': return '#4CAF50';
      default: return '#4CAF50';
    }
  };

  const getButtonText = () => {
    if (isPolicyStep() && !hasAcceptedPolicies) {
      return 'Accept to Continue';
    }
    if (isLastStep()) {
      return 'Start Chatting';
    }
    return 'Continue';
  };

  const canProceed = () => {
    if (isPolicyStep()) {
      return hasAcceptedPolicies;
    }
    return true;
  };

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="none"
      onRequestClose={handleSkip}
    >
      <View style={styles.modalOverlay}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={['#1B4A3A', '#2E5D4F', '#1B4A3A']}
            style={styles.modalGradient}
          >
            <View style={styles.header}>
              <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
              
              <View style={styles.progressContainer}>
                {ONBOARDING_STEPS.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.progressDot,
                      index === currentStep && styles.progressDotActive,
                      index < currentStep && styles.progressDotCompleted,
                    ]}
                  />
                ))}
              </View>
              
              <View style={styles.skipButton} />
            </View>
            
            {renderStepContent()}
            
            <View style={styles.footer}>
              <TouchableOpacity
                style={[
                  styles.continueButton,
                  !canProceed() && styles.continueButtonDisabled,
                ]}
                onPress={handleNext}
                disabled={!canProceed()}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={
                    canProceed() 
                      ? [getStepColor(getCurrentStep().type), getStepColor(getCurrentStep().type) + 'CC']
                      : ['#666666', '#555555']
                  }
                  style={styles.continueButtonGradient}
                >
                  <Text style={styles.continueButtonText}>
                    {getButtonText()}
                  </Text>
                  <Ionicons 
                    name={isLastStep() ? 'rocket' : 'arrow-forward'} 
                    size={16} 
                    color="#FFFFFF" 
                    style={{ marginLeft: 8 }} 
                  />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    maxHeight: screenHeight * 0.85,
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalGradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  skipButton: {
    width: 50,
  },
  skipText: {
    color: '#B8E6C1',
    fontSize: 16,
    fontWeight: '500',
  },
  progressContainer: {
    flexDirection: 'row',
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
    width: 20,
  },
  progressDotCompleted: {
    backgroundColor: 'rgba(76, 175, 80, 0.6)',
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconBackground: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E8F5E9',
    textAlign: 'center',
    marginBottom: 16,
  },
  stepContent: {
    fontSize: 16,
    color: '#B8E6C1',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  featuresContainer: {
    gap: 12,
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  featureBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    color: '#B8E6C1',
    lineHeight: 22,
  },
  warningsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  warningBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 152, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  warningText: {
    flex: 1,
    fontSize: 15,
    color: '#B8E6C1',
    lineHeight: 22,
  },
  acceptanceButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'rgba(232, 245, 233, 0.2)',
    marginTop: 10,
  },
  acceptanceButtonAccepted: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: 'rgba(76, 175, 80, 0.4)',
  },
  acceptanceContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#B8E6C1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  acceptanceText: {
    fontSize: 16,
    color: '#B8E6C1',
    fontWeight: '500',
  },
  acceptanceTextAccepted: {
    color: '#E8F5E9',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 10,
  },
  continueButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});