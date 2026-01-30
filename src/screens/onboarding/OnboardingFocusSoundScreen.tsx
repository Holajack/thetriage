import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../context/AuthContext';
import { useConvexProfile } from '../../hooks/useConvex';
import { useTheme, ThemeName, lightThemePalettes } from '../../context/ThemeContext';
import { useBackgroundMusic } from '../../hooks/useBackgroundMusic';
import NoraSpeechBubble from '../../components/onboarding/NoraSpeechBubble';
import { AnimatedButton } from '../../components/premium/AnimatedButton';

type OnboardingFocusSoundNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'OnboardingFocusSound'>;

interface FocusMethod {
  id: string;
  title: string;
  subtitle: string;
  studyTime: number;
  breakTime: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const FOCUS_METHODS: FocusMethod[] = [
  {
    id: 'balanced',
    title: 'Balanced Focus',
    subtitle: 'Perfect for Deep Learning',
    studyTime: 45,
    breakTime: 15,
    icon: 'scale',
    color: '#4CAF50',
  },
  {
    id: 'sprint',
    title: 'Sprint Focus',
    subtitle: 'Quick & Efficient',
    studyTime: 25,
    breakTime: 5,
    icon: 'flash',
    color: '#FF9800',
  },
  {
    id: 'deepwork',
    title: 'Deep Work',
    subtitle: 'Maximum Concentration',
    studyTime: 90,
    breakTime: 5,
    icon: 'time',
    color: '#2196F3',
  },
];

const SOUND_OPTIONS = ['Lo-Fi', 'Nature', 'Classical', 'Jazz Ambient', 'Ambient'];

const THEME_ICONS: Record<ThemeName, keyof typeof Ionicons.glyphMap> = {
  home: 'home-outline',
  office: 'briefcase-outline',
  library: 'book-outline',
  coffee: 'cafe-outline',
  park: 'leaf-outline',
};

export default function OnboardingFocusSoundScreen() {
  const navigation = useNavigation<OnboardingFocusSoundNavigationProp>();
  const { updateOnboarding } = useAuth();
  const { updateProfile } = useConvexProfile();
  const { theme, isDark, themeName, setThemeName } = useTheme();
  const { playPreview, stopPreview, isPlaying, isPreviewMode, currentTrack, isLoading } = useBackgroundMusic();

  const [selectedMethod, setSelectedMethod] = useState<string>('balanced');
  const [selectedSound, setSelectedSound] = useState<string>('Ambient');
  const [selectedEnv, setSelectedEnv] = useState<ThemeName>(themeName);

  // Stop sound preview on unmount
  useEffect(() => {
    return () => {
      stopPreview();
    };
  }, []);

  const handleMethodSelect = (methodId: string) => {
    Haptics.selectionAsync();
    setSelectedMethod(methodId);
  };

  const handleSoundSelect = (sound: string) => {
    Haptics.selectionAsync();
    setSelectedSound(sound);
  };

  const handleEnvSelect = (env: ThemeName) => {
    Haptics.selectionAsync();
    setSelectedEnv(env);
  };

  const handleSoundPreview = (sound: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // If this sound is currently playing, stop it
    if (isPreviewMode && currentTrack?.category === sound) {
      stopPreview();
    } else {
      // Play preview for this sound
      playPreview(sound);
    }
  };

  const handleContinue = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Save focus method to onboarding
      await updateOnboarding({ focus_method: selectedMethod });
      console.log('✅ Focus method saved:', selectedMethod);

      // Save sound preference to profile
      await updateProfile({ soundPreference: selectedSound });
      console.log('✅ Sound preference saved:', selectedSound);

      // Save environment theme to profile AND apply it
      await updateProfile({ environmentTheme: selectedEnv });
      setThemeName(selectedEnv);
      console.log('✅ Environment theme saved and applied:', selectedEnv);

      navigation.navigate('AppTutorial' as any);
    } catch (error) {
      console.error('⚠️ Failed to save preferences:', error);
      // Still navigate - preferences can be updated later in settings
      navigation.navigate('AppTutorial' as any);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const renderMethodCard = (method: FocusMethod, index: number) => {
    const isSelected = selectedMethod === method.id;

    return (
      <Animated.View
        key={method.id}
        entering={FadeInDown.delay(index * 100).duration(400)}
      >
        <TouchableOpacity
          style={[
            styles.methodCard,
            isSelected && styles.selectedMethodCard,
            { borderColor: isSelected ? method.color : 'rgba(232, 245, 233, 0.2)' },
            isSelected && { transform: [{ scale: 1.02 }] },
          ]}
          onPress={() => handleMethodSelect(method.id)}
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
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderSoundOption = (option: string, index: number) => {
    const isSelected = selectedSound === option;
    const isSoundPlaying = isPreviewMode && currentTrack?.category === option;

    return (
      <Animated.View
        key={option}
        entering={FadeInDown.delay(300 + index * 80).duration(400)}
      >
        <TouchableOpacity
          style={[
            styles.soundCard,
            isSelected && styles.selectedSoundCard,
          ]}
          onPress={() => handleSoundSelect(option)}
          activeOpacity={0.8}
        >
          <View style={[
            styles.soundIconContainer,
            { backgroundColor: isSelected ? '#4CAF5020' : 'rgba(232, 245, 233, 0.1)' }
          ]}>
            <Ionicons
              name="musical-notes-outline"
              size={20}
              color={isSelected ? '#4CAF50' : '#B8E6C1'}
            />
          </View>
          <Text style={[
            styles.soundName,
            isSelected && styles.soundNameSelected
          ]}>
            {option}
          </Text>

          {/* Play/Stop preview button */}
          <TouchableOpacity
            onPress={() => handleSoundPreview(option)}
            style={styles.previewButton}
            disabled={isLoading}
          >
            <Ionicons
              name={isSoundPlaying ? "stop-circle" : "play-circle-outline"}
              size={24}
              color={isSoundPlaying ? '#4CAF50' : '#B8E6C1'}
            />
          </TouchableOpacity>

          {isSelected && (
            <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderEnvironmentCard = (env: ThemeName, index: number) => {
    const isSelected = selectedEnv === env;
    const palette = lightThemePalettes[env];
    const icon = THEME_ICONS[env];

    return (
      <Animated.View
        key={env}
        entering={FadeInDown.delay(600 + index * 80).duration(400)}
        style={styles.envCardWrapper}
      >
        <TouchableOpacity
          style={[
            styles.envCard,
            { backgroundColor: palette.background },
            isSelected && {
              borderColor: palette.primary,
              borderWidth: 3,
            }
          ]}
          onPress={() => handleEnvSelect(env)}
          activeOpacity={0.8}
        >
          <Ionicons
            name={icon}
            size={32}
            color={palette.primary}
          />
          <Text style={[
            styles.envName,
            { color: palette.text }
          ]}>
            {palette.name}
          </Text>
          {isSelected && (
            <View style={[styles.envCheckmark, { backgroundColor: palette.primary }]}>
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const gradientColors = isDark
    ? ['#000000', '#1a1a1a', '#2a2a2a', '#1a1a1a']
    : ['#0F2419', '#1B4A3A', '#2E5D4F', '#1B4A3A'];

  return (
    <LinearGradient
      colors={gradientColors as [string, string, ...string[]]}
      locations={[0, 0.3, 0.7, 1]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Back button */}
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#E8F5E9" />
          </TouchableOpacity>

          {/* Nora Speech Bubble */}
          <NoraSpeechBubble message="Let's set up your perfect study session!" />

          {/* Step indicator */}
          <Text style={styles.stepIndicator}>Step 4 of 5</Text>

          {/* Scrollable content */}
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Focus Method Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Choose Your Focus Style</Text>
              {FOCUS_METHODS.map((method, index) => renderMethodCard(method, index))}
            </View>

            {/* Sound Preference Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pick Your Study Sounds</Text>
              <View style={styles.soundGrid}>
                {SOUND_OPTIONS.map((option, index) => renderSoundOption(option, index))}
              </View>
            </View>

            {/* Environment Theme Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Choose Your Environment</Text>
              <Text style={styles.sectionDescription}>This changes the look and feel of the entire app</Text>
              <View style={styles.envGrid}>
                {(['home', 'office', 'library', 'coffee', 'park'] as ThemeName[]).map((env, index) =>
                  renderEnvironmentCard(env, index)
                )}
              </View>
            </View>
          </ScrollView>

          {/* Continue button */}
          <View style={styles.bottomContainer}>
            <AnimatedButton
              title="Continue"
              onPress={handleContinue}
              gradient={true}
              gradientColors={['#4CAF50', '#66BB6A', '#4CAF50']}
              size="large"
              fullWidth={true}
              icon={<Ionicons name="arrow-forward" size={20} color="#FFFFFF" />}
              iconPosition="right"
            />
          </View>
        </View>
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
  },
  backButton: {
    padding: 8,
    marginTop: 10,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  stepIndicator: {
    fontSize: 14,
    color: '#B8E6C1',
    textAlign: 'center',
    marginBottom: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E8F5E9',
    marginBottom: 6,
  },
  sectionDescription: {
    fontSize: 13,
    color: '#B8E6C1',
    marginBottom: 16,
  },
  methodCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E8F5E9',
    marginBottom: 2,
  },
  methodSubtitle: {
    fontSize: 13,
    color: '#B8E6C1',
  },
  timingContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
  },
  timingItem: {
    flex: 1,
    alignItems: 'center',
  },
  timingSeparator: {
    width: 1,
    backgroundColor: 'rgba(232, 245, 233, 0.2)',
    marginHorizontal: 12,
  },
  timingLabel: {
    fontSize: 11,
    color: '#B8E6C1',
    marginBottom: 4,
  },
  timingValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  soundGrid: {
    gap: 10,
  },
  soundCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(232, 245, 233, 0.2)',
  },
  selectedSoundCard: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: 'rgba(76, 175, 80, 0.4)',
  },
  soundIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  soundName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#E8F5E9',
  },
  soundNameSelected: {
    color: '#E8F5E9',
  },
  previewButton: {
    padding: 4,
    marginRight: 8,
  },
  envGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  envCardWrapper: {
    width: '47%',
  },
  envCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  envName: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  envCheckmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomContainer: {
    paddingTop: 16,
    paddingBottom: 10,
  },
});
