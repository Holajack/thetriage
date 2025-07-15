import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface WalkthroughStep {
  id: string;
  title: string;
  description: string;
  targetComponent?: string;
  highlightArea?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  position: 'top' | 'bottom' | 'center';
  action?: 'tap' | 'navigate' | 'observe';
  actionText?: string;
}

const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: 'home-tab',
    title: 'Welcome to Your Dashboard',
    description: 'This is your Home screen where you can start focus sessions, view your progress, and access quick actions.',
    targetComponent: 'home-tab',
    position: 'top',
    action: 'observe',
  },
  {
    id: 'start-session',
    title: 'Start Your First Focus Session',
    description: 'Tap this button to begin a focused study session. You can choose your study method and set goals.',
    targetComponent: 'start-session-button',
    position: 'bottom',
    action: 'tap',
    actionText: 'Try tapping the Start Session button',
  },
  {
    id: 'community-tab',
    title: 'Connect with the Community',
    description: 'Join study groups, connect with other students, and share your progress with the community.',
    targetComponent: 'community-tab',
    position: 'top',
    action: 'tap',
    actionText: 'Tap to explore the Community',
  },
  {
    id: 'patrick-tab',
    title: 'Meet Patrick, Your AI Assistant',
    description: 'Ask Patrick questions about studying, get personalized tips, and receive AI-powered insights.',
    targetComponent: 'patrick-tab',
    position: 'top',
    action: 'tap',
    actionText: 'Tap to chat with Patrick',
  },
  {
    id: 'bonuses-tab',
    title: 'Track Your Achievements',
    description: 'View your study streaks, unlock achievements, and see your progress towards goals.',
    targetComponent: 'bonuses-tab',
    position: 'top',
    action: 'tap',
    actionText: 'Check out your achievements',
  },
  {
    id: 'profile-tab',
    title: 'Manage Your Profile',
    description: 'Update your settings, view your study history, and customize your experience.',
    targetComponent: 'profile-tab',
    position: 'top',
    action: 'tap',
    actionText: 'Visit your profile',
  },
  {
    id: 'complete',
    title: 'You\'re Ready to Go!',
    description: 'You now know the basics of The Triage System. Start with a focus session and explore at your own pace. Happy studying!',
    position: 'center',
    action: 'observe',
  },
];

interface InteractiveWalkthroughProps {
  visible: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export default function InteractiveWalkthrough({
  visible,
  onComplete,
  onSkip,
}: InteractiveWalkthroughProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsVisible(false);
        setCurrentStep(0);
      });
    }
  }, [visible]);

  const getCurrentStep = () => WALKTHROUGH_STEPS[currentStep];
  const isLastStep = () => currentStep === WALKTHROUGH_STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep()) {
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  const renderTooltip = () => {
    const step = getCurrentStep();
    const tooltipStyle = getTooltipStyle(step.position);

    return (
      <Animated.View
        style={[
          styles.tooltip,
          tooltipStyle,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={['#1B4A3A', '#2E5D4F', '#1B4A3A']}
          style={styles.tooltipGradient}
        >
          <View style={styles.tooltipHeader}>
            <Text style={styles.tooltipTitle}>{step.title}</Text>
            <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
              <Ionicons name="close" size={20} color="#B8E6C1" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.tooltipDescription}>{step.description}</Text>
          
          {step.actionText && (
            <View style={styles.actionContainer}>
              <Ionicons name="hand-left-outline" size={16} color="#4CAF50" />
              <Text style={styles.actionText}>{step.actionText}</Text>
            </View>
          )}
          
          <View style={styles.tooltipFooter}>
            <View style={styles.progressDots}>
              {WALKTHROUGH_STEPS.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.progressDot,
                    index === currentStep && styles.progressDotActive,
                  ]}
                />
              ))}
            </View>
            
            <TouchableOpacity onPress={handleNext} style={styles.nextButton}>
              <LinearGradient
                colors={['#4CAF50', '#66BB6A']}
                style={styles.nextButtonGradient}
              >
                <Text style={styles.nextButtonText}>
                  {isLastStep() ? 'Finish' : 'Next'}
                </Text>
                <Ionicons
                  name={isLastStep() ? 'checkmark' : 'arrow-forward'}
                  size={16}
                  color="#FFFFFF"
                  style={{ marginLeft: 6 }}
                />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  const getTooltipStyle = (position: 'top' | 'bottom' | 'center') => {
    const baseStyle = {
      position: 'absolute' as const,
      left: 20,
      right: 20,
      maxWidth: screenWidth - 40,
    };

    switch (position) {
      case 'top':
        return {
          ...baseStyle,
          top: 100,
        };
      case 'bottom':
        return {
          ...baseStyle,
          bottom: 120,
        };
      case 'center':
        return {
          ...baseStyle,
          top: screenHeight / 2 - 100,
        };
      default:
        return {
          ...baseStyle,
          top: screenHeight / 2 - 100,
        };
    }
  };

  const renderHighlight = () => {
    const step = getCurrentStep();
    if (!step.highlightArea) return null;

    return (
      <View
        style={[
          styles.highlight,
          {
            left: step.highlightArea.x - 10,
            top: step.highlightArea.y - 10,
            width: step.highlightArea.width + 20,
            height: step.highlightArea.height + 20,
          },
        ]}
      />
    );
  };

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="none"
      onRequestClose={handleSkip}
    >
      <View style={styles.overlay}>
        <View style={styles.backdrop} />
        {renderHighlight()}
        {renderTooltip()}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  highlight: {
    position: 'absolute',
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#4CAF50',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  tooltip: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  tooltipGradient: {
    padding: 20,
  },
  tooltipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tooltipTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E8F5E9',
    flex: 1,
  },
  skipButton: {
    padding: 4,
  },
  tooltipDescription: {
    fontSize: 15,
    color: '#B8E6C1',
    lineHeight: 22,
    marginBottom: 16,
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  actionText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    marginLeft: 8,
  },
  tooltipFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressDots: {
    flexDirection: 'row',
    gap: 6,
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
  nextButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});