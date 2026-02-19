import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, CommonActions, useRoute, RouteProp } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList, RootStackParamList } from '../../navigation/types';
import NoraSpeechBubble from '../../components/onboarding/NoraSpeechBubble';
import * as Haptics from 'expo-haptics';

type AppSummaryNavigationProp = NativeStackNavigationProp<RootStackParamList>;
type AppSummaryRouteProp = RouteProp<OnboardingStackParamList, 'AppTutorial'>;

const HIGHLIGHTS = [
  { icon: 'timer-outline' as const, label: 'Focus Sessions', color: '#4CAF50' },
  { icon: 'chatbubbles-outline' as const, label: 'Nora, Your AI Tutor', color: '#2196F3' },
  { icon: 'people-outline' as const, label: 'Study Rooms', color: '#FF9800' },
  { icon: 'analytics-outline' as const, label: 'Progress & Streaks', color: '#9C27B0' },
];

export default function AppSummaryScreen() {
  const navigation = useNavigation<AppSummaryNavigationProp>();
  const route = useRoute<AppSummaryRouteProp>();
  const { updateOnboarding, setHasCompletedOnboarding } = useAuth();
  const { theme } = useTheme();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const focusMethod = route.params?.focusMethod;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleComplete = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      await updateOnboarding({
        is_onboarding_complete: true,
        focus_method: focusMethod,
        welcome_completed: true,
        goals_set: true,
        profile_customized: true,
        completed_at: new Date().toISOString(),
      });

      setHasCompletedOnboarding(true);
      console.log('✅ Onboarding completed successfully');
    } catch (error) {
      console.error('AppSummaryScreen: Error completing onboarding:', error);
      setHasCompletedOnboarding(true);
    }

    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Main', params: { showWalkthrough: true } }],
      })
    );
  };

  const textColor = theme.isDark ? theme.text : '#E8F5E9';
  const subtextColor = theme.isDark ? theme.textSecondary : '#B8E6C1';

  return (
    <LinearGradient
      colors={theme.isDark ? ['#000000', '#1a1a1a', '#2a2a2a', '#1a1a1a'] : ['#0F2419', '#1B4A3A', '#2E5D4F', '#1B4A3A']}
      locations={[0, 0.3, 0.7, 1]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          {/* Back button */}
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>

          {/* Nora — the central guide */}
          <NoraSpeechBubble message="You're all set! Here's a quick look at what's waiting for you." />

          {/* Compact highlights — scannable in seconds */}
          <View style={styles.highlightsCard}>
            {HIGHLIGHTS.map((item, index) => (
              <View key={item.label}>
                {index > 0 && <View style={[styles.divider, { backgroundColor: subtextColor + '20' }]} />}
                <View style={styles.highlightRow}>
                  <View style={[styles.highlightIcon, { backgroundColor: item.color + '20' }]}>
                    <Ionicons name={item.icon} size={22} color={item.color} />
                  </View>
                  <Text style={[styles.highlightLabel, { color: textColor }]}>{item.label}</Text>
                  <Ionicons name="checkmark-circle" size={18} color={item.color} />
                </View>
              </View>
            ))}
          </View>

          {/* Welcome message */}
          <View style={styles.welcomeSection}>
            <Text style={[styles.welcomeTitle, { color: textColor }]}>Welcome to HikeWise</Text>
            <Text style={[styles.welcomeText, { color: subtextColor }]}>
              We're building a better way to study — and you're part of it from day one. Let's make every session count.
            </Text>
          </View>

          {/* Spacer to push button down */}
          <View style={{ flex: 1 }} />

          {/* Bottom section */}
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  backButton: {
    padding: 8,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },

  // ── Highlights Card ──
  highlightsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(232, 245, 233, 0.15)',
    marginTop: 24,
    overflow: 'hidden',
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 14,
  },
  highlightIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  highlightLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },

  // ── Welcome ──
  welcomeSection: {
    marginTop: 28,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },

  // ── Bottom ──
  bottomContainer: {
    paddingTop: 16,
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
});
