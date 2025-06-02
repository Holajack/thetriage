import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';

type FocusMethodNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'FocusMethodIntro'>;

interface FocusMethod {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  studyTime: number;
  breakTime: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  features: string[];
}

const FOCUS_METHODS: FocusMethod[] = [
  {
    id: 'balanced',
    title: 'Balanced Focus',
    subtitle: 'Perfect for Deep Learning',
    description: 'Extended study sessions with longer breaks for complex topics and in-depth understanding.',
    studyTime: 45,
    breakTime: 15,
    icon: 'scale' as keyof typeof Ionicons.glyphMap,
    color: '#4CAF50',
    features: [
      'Ideal for complex subjects',
      'Extended focus time',
      'Quality rest periods',
      'Deep learning retention'
    ]
  },
  {
    id: 'sprint',
    title: 'Sprint Focus',
    subtitle: 'Quick & Efficient',
    description: 'Short, intense bursts of focused studying with brief breaks to maintain high energy.',
    studyTime: 25,
    breakTime: 5,
    icon: 'flash' as keyof typeof Ionicons.glyphMap,
    color: '#FF9800',
    features: [
      'High-energy sessions',
      'Quick task completion',
      'Maintains concentration',
      'Great for reviews'
    ]
  },
  {
    id: 'deepwork',
    title: 'Deep Work',
    subtitle: 'Maximum Concentration',
    description: 'Long, uninterrupted focus sessions for one subject with minimal breaks.',
    studyTime: 90,
    breakTime: 5,
    icon: 'library' as keyof typeof Ionicons.glyphMap,
    color: '#2196F3',
    features: [
      'Single subject focus',
      'Maximum concentration',
      'Minimal interruptions',
      'Flow state achievement'
    ]
  }
];

export default function FocusMethodIntroScreen() {
  const navigation = useNavigation<FocusMethodNavigationProp>();
  const { updateOnboarding } = useAuth();
  const [selectedMethod, setSelectedMethod] = useState<string>('balanced');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

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

  const handleContinue = async () => {
    // Store selected method and pass it through navigation
    navigation.navigate('AccountCreation', { focusMethod: selectedMethod });
  };

  const renderMethodCard = (method: FocusMethod) => {
    const isSelected = selectedMethod === method.id;
    
    return (
      <TouchableOpacity
        key={method.id}
        style={[
          styles.methodCard,
          isSelected && styles.selectedMethodCard,
          { borderColor: isSelected ? method.color : 'rgba(232, 245, 233, 0.2)' }
        ]}
        onPress={() => setSelectedMethod(method.id)}
        activeOpacity={0.8}
      >
        <View style={styles.methodHeader}>
          <View style={[styles.methodIcon, { backgroundColor: method.color + '20' }]}>
            <Ionicons name={method.icon} size={24} color={method.color} />
          </View>
          <View style={styles.methodTitleContainer}>
            <Text style={styles.methodTitle}>{method.title}</Text>
            <Text style={styles.methodSubtitle}>{method.subtitle}</Text>
          </View>
          {isSelected && (
            <Ionicons name="checkmark-circle" size={24} color={method.color} />
          )}
        </View>
        
        <Text style={styles.methodDescription}>{method.description}</Text>
        
        <View style={styles.timingContainer}>
          <View style={styles.timingItem}>
            <Text style={styles.timingLabel}>Study</Text>
            <Text style={[styles.timingValue, { color: method.color }]}>
              {method.studyTime} min
            </Text>
          </View>
          <View style={styles.timingSeparator} />
          <View style={styles.timingItem}>
            <Text style={styles.timingLabel}>Break</Text>
            <Text style={[styles.timingValue, { color: method.color }]}>
              {method.breakTime} min
            </Text>
          </View>
        </View>
        
        <View style={styles.featuresContainer}>
          {method.features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <View style={[styles.featureDot, { backgroundColor: method.color }]} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient
      colors={['#0F2419', '#1B4A3A', '#2E5D4F', '#1B4A3A']}
      locations={[0, 0.3, 0.7, 1]}
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
            <Text style={styles.headerTitle}>Choose Your Focus Method</Text>
            <Text style={styles.headerSubtitle}>
              Step 1 of 5 • Select the study technique that best fits your learning style and goals
            </Text>
          </View>
          
          <ScrollView 
            style={styles.methodsList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {FOCUS_METHODS.map(renderMethodCard)}
          </ScrollView>
          
          <View style={styles.bottomContainer}>
            <TouchableOpacity 
              style={styles.continueButton}
              onPress={handleContinue}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#4CAF50', '#66BB6A', '#4CAF50']}
                locations={[0, 0.5, 1]}
                style={styles.buttonGradient}
              >
                <Text style={styles.continueButtonText}>Continue</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
              </LinearGradient>
            </TouchableOpacity>
            
            <View style={styles.progressIndicator}>
              <View style={[styles.progressDot, styles.progressDotActive]} />
              <View style={styles.progressDot} />
              <View style={styles.progressDot} />
              <View style={styles.progressDot} />
            </View>
          </View>
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    marginBottom: 30,
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
    paddingHorizontal: 10,
  },
  methodsList: {
    flex: 1,
  },
  methodCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(232, 245, 233, 0.2)',
  },
  selectedMethodCard: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  methodTitleContainer: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E8F5E9',
    marginBottom: 2,
  },
  methodSubtitle: {
    fontSize: 14,
    color: '#B8E6C1',
  },
  methodDescription: {
    fontSize: 14,
    color: '#B8E6C1',
    lineHeight: 20,
    marginBottom: 16,
  },
  timingContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  timingItem: {
    flex: 1,
    alignItems: 'center',
  },
  timingSeparator: {
    width: 1,
    backgroundColor: 'rgba(232, 245, 233, 0.2)',
    marginHorizontal: 16,
  },
  timingLabel: {
    fontSize: 12,
    color: '#B8E6C1',
    marginBottom: 4,
  },
  timingValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  featuresContainer: {
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  featureText: {
    fontSize: 13,
    color: '#B8E6C1',
  },
  bottomContainer: {
    paddingTop: 20,
    paddingBottom: 10,
  },
  continueButton: {
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
  continueButtonText: {
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
});
