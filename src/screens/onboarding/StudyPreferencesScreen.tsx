import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';

type StudyPreferencesNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'StudyPreferences'>;
type StudyPreferencesRouteProp = RouteProp<OnboardingStackParamList, 'StudyPreferences'>;

interface SoundOption {
  id: string;
  name: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

interface EnvironmentOption {
  id: string;
  name: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const SOUND_OPTIONS: SoundOption[] = [
  { id: 'nature', name: 'Nature Sounds', description: 'Forest, rain, ocean waves', icon: 'leaf-outline' },
  { id: 'ambient', name: 'Ambient Music', description: 'Soft instrumental background', icon: 'musical-notes-outline' },
  { id: 'white_noise', name: 'White Noise', description: 'Consistent background noise', icon: 'radio-outline' },
  { id: 'binaural', name: 'Binaural Beats', description: 'Focus-enhancing frequencies', icon: 'pulse-outline' },
  { id: 'silence', name: 'Complete Silence', description: 'No background sounds', icon: 'volume-mute-outline' },
];

const ENVIRONMENT_OPTIONS: EnvironmentOption[] = [
  { id: 'library', name: 'Library', description: 'Quiet, academic atmosphere', icon: 'library-outline' },
  { id: 'coffee_shop', name: 'Coffee Shop', description: 'Gentle background chatter', icon: 'cafe-outline' },
  { id: 'home_office', name: 'Home Office', description: 'Comfortable, personal space', icon: 'home-outline' },
  { id: 'outdoor', name: 'Outdoor', description: 'Fresh air and natural surroundings', icon: 'flower-outline' },
  { id: 'coworking', name: 'Co-working Space', description: 'Collaborative, energetic environment', icon: 'people-outline' },
];

export default function StudyPreferencesScreen() {
  const navigation = useNavigation<StudyPreferencesNavigationProp>();
  const route = useRoute<StudyPreferencesRouteProp>();
  const { updateOnboarding } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const [selectedSound, setSelectedSound] = useState<string>('ambient');
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('library');

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
    try {
      const updateData: any = {
        sound_preference: selectedSound,
        environment_preference: selectedEnvironment,
      };

      // Include focus_method as backup
      if (route.params?.focusMethod) {
        updateData.focus_method = route.params.focusMethod;
      }

      await updateOnboarding(updateData);
      console.log('✅ Study preferences saved successfully');

      navigation.navigate('PrivacySettings', { focusMethod: route.params?.focusMethod });
    } catch (error) {
      console.error('❌ Failed to save study preferences:', error);

      // Show error with retry option
      Alert.alert(
        'Save Warning',
        'Your preferences may not have been saved. You can update them later in Settings. Continue anyway?',
        [
          {
            text: 'Try Again',
            onPress: handleContinue,
            style: 'cancel'
          },
          {
            text: 'Continue',
            onPress: () => navigation.navigate('PrivacySettings', {
              focusMethod: route.params?.focusMethod
            })
          }
        ]
      );
    }
  };

  const handleBack = () => navigation.goBack();

  const renderSoundOption = (option: SoundOption) => {
    const isSelected = selectedSound === option.id;
    
    return (
      <TouchableOpacity
        key={option.id}
        style={[styles.optionCard, isSelected && styles.optionCardSelected]}
        onPress={() => setSelectedSound(option.id)}
        activeOpacity={0.8}
      >
        <View style={[styles.optionIconContainer, { backgroundColor: isSelected ? '#4CAF5020' : 'rgba(232, 245, 233, 0.1)'}]}>
          <Ionicons name={option.icon} size={24} color={isSelected ? '#4CAF50' : '#B8E6C1'} />
        </View>
        <View style={styles.optionInfo}>
          <Text style={[styles.optionTitle, isSelected && styles.optionTitleSelected]}>{option.name}</Text>
          <Text style={[styles.optionDescription, isSelected && styles.optionDescriptionSelected]}>{option.description}</Text>
        </View>
        {isSelected && (
          <View style={styles.selectedIndicator}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEnvironmentOption = (option: EnvironmentOption) => {
    const isSelected = selectedEnvironment === option.id;
    
    return (
      <TouchableOpacity
        key={option.id}
        style={[styles.optionCard, isSelected && styles.optionCardSelected]}
        onPress={() => setSelectedEnvironment(option.id)}
        activeOpacity={0.8}
      >
        <View style={[styles.optionIconContainer, { backgroundColor: isSelected ? '#4CAF5020' : 'rgba(232, 245, 233, 0.1)'}]}>
          <Ionicons name={option.icon} size={24} color={isSelected ? '#4CAF50' : '#B8E6C1'} />
        </View>
        <View style={styles.optionInfo}>
          <Text style={[styles.optionTitle, isSelected && styles.optionTitleSelected]}>{option.name}</Text>
          <Text style={[styles.optionDescription, isSelected && styles.optionDescriptionSelected]}>{option.description}</Text>
        </View>
        {isSelected && (
          <View style={styles.selectedIndicator}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
          </View>
        )}
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
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#E8F5E9" />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Study Preferences</Text>
              <Text style={styles.headerSubtitle}>
                Step 3.5 of 5 • Customize your ideal study environment
              </Text>
            </View>
            <View style={{ width: 24 }} />
          </View>
          
          <ScrollView 
            style={styles.preferencesList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconContainer}>
                  <Ionicons name="volume-high-outline" size={20} color="#4CAF50" />
                </View>
                <Text style={styles.sectionTitle}>Sound Preference</Text>
              </View>
              <Text style={styles.sectionDescription}>
                Choose your preferred background audio for focus sessions
              </Text>
              <View style={styles.optionsContainer}>
                {SOUND_OPTIONS.map(renderSoundOption)}
              </View>
            </View>

            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconContainer}>
                  <Ionicons name="location-outline" size={20} color="#4CAF50" />
                </View>
                <Text style={styles.sectionTitle}>Environment Preference</Text>
              </View>
              <Text style={styles.sectionDescription}>
                Select your ideal study environment setting
              </Text>
              <View style={styles.optionsContainer}>
                {ENVIRONMENT_OPTIONS.map(renderEnvironmentOption)}
              </View>
            </View>
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
  safeArea: { flex: 1, paddingTop: Platform.OS === 'android' ? 25 : 0 },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
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
  preferencesList: { flex: 1 },
  sectionContainer: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E8F5E9',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#B8E6C1',
    marginBottom: 16,
    lineHeight: 20,
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(232, 245, 233, 0.2)',
  },
  optionCardSelected: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: 'rgba(76, 175, 80, 0.4)',
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E8F5E9',
    marginBottom: 4,
  },
  optionTitleSelected: {
    color: '#E8F5E9',
  },
  optionDescription: {
    fontSize: 14,
    color: '#B8E6C1',
    lineHeight: 18,
  },
  optionDescriptionSelected: {
    color: '#B8E6C1',
  },
  selectedIndicator: {
    marginLeft: 12,
  },
  bottomContainer: {
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 20 : 25,
    borderTopWidth: 1,
    borderTopColor: 'rgba(232, 245, 233, 0.1)',
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
  progressDotCompleted: {
    backgroundColor: 'rgba(76, 175, 80, 0.6)',
  },
});