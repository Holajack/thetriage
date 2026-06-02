import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { OnboardingStackParamList } from "../../navigation/types";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useAuth } from "../../context/AuthContext";
import { useConvexProfile } from "../../hooks/useConvex";
import {
  useTheme,
  ThemeName,
  lightThemePalettes,
} from "../../context/ThemeContext";
import { useBackgroundMusic } from "../../hooks/useBackgroundMusic";
import NoraSpeechBubble from "../../components/onboarding/NoraSpeechBubble";
import { AnimatedButton } from "../../components/premium/AnimatedButton";
import { AnimationConfig } from "../../theme/premiumTheme";

type OnboardingFocusSoundNavigationProp = NativeStackNavigationProp<
  OnboardingStackParamList,
  "FocusSoundSetup"
>;

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
    id: "balanced",
    title: "Balanced Focus",
    subtitle: "Perfect for Deep Learning",
    studyTime: 45,
    breakTime: 15,
    icon: "scale",
    color: "#4CAF50",
  },
  {
    id: "sprint",
    title: "Sprint Focus",
    subtitle: "Quick & Efficient",
    studyTime: 25,
    breakTime: 5,
    icon: "flash",
    color: "#FF9800",
  },
  {
    id: "deepwork",
    title: "Deep Work",
    subtitle: "Maximum Concentration",
    studyTime: 90,
    breakTime: 5,
    icon: "time",
    color: "#2196F3",
  },
];

const SOUND_OPTIONS = [
  "Lo-Fi",
  "Nature",
  "Classical",
  "Jazz Ambient",
  "Ambient",
];

const THEME_ICONS: Record<ThemeName, keyof typeof Ionicons.glyphMap> = {
  home: "home-outline",
  office: "briefcase-outline",
  library: "book-outline",
  coffee: "cafe-outline",
  park: "leaf-outline",
};

const NORA_MESSAGES = [
  "Let's set up your perfect study session!",
  "Great choice! Now pick your study sounds.",
  "Almost there! Choose your environment.",
];

// ── Collapsed Summary Row ──
function CollapsedSummary({
  icon,
  iconColor,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.collapsedSummary}
      activeOpacity={0.7}
    >
      <View style={[styles.summaryIcon, { backgroundColor: iconColor + "20" }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.summaryLabel}>{label}</Text>
        <Text style={styles.summaryValue}>{value}</Text>
      </View>
      <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
    </TouchableOpacity>
  );
}

export default function OnboardingFocusSoundScreen() {
  const navigation = useNavigation<OnboardingFocusSoundNavigationProp>();
  const { updateOnboarding } = useAuth();
  const { updateProfile } = useConvexProfile();
  const { theme, isDark, themeName, setThemeName } = useTheme();
  const {
    playPreview,
    stopPreview,
    isPlaying,
    isPreviewMode,
    currentTrack,
    isLoading,
  } = useBackgroundMusic();

  const [selectedMethod, setSelectedMethod] = useState<string>("balanced");
  const [selectedSound, setSelectedSound] = useState<string>("Ambient");
  const [selectedEnv, setSelectedEnv] = useState<ThemeName>(themeName);
  const [currentStep, setCurrentStep] = useState(0);

  const scrollViewRef = useRef<ScrollView>(null);
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animation shared values for section reveals
  const soundSectionOpacity = useSharedValue(0);
  const soundSectionTranslateY = useSharedValue(20);
  const envSectionOpacity = useSharedValue(0);
  const envSectionTranslateY = useSharedValue(20);

  const soundSectionStyle = useAnimatedStyle(() => ({
    opacity: soundSectionOpacity.value,
    transform: [{ translateY: soundSectionTranslateY.value }],
  }));

  const envSectionStyle = useAnimatedStyle(() => ({
    opacity: envSectionOpacity.value,
    transform: [{ translateY: envSectionTranslateY.value }],
  }));

  // Stop sound preview on unmount + cleanup timeouts
  useEffect(() => {
    return () => {
      stopPreview();
      if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
    };
  }, []);

  // ── Step advancement with animation ──
  const advanceToStep = useCallback((nextStep: number) => {
    setCurrentStep(nextStep);

    if (nextStep === 1) {
      soundSectionOpacity.value = withDelay(
        150,
        withTiming(1, { duration: 350 }),
      );
      soundSectionTranslateY.value = withDelay(
        150,
        withSpring(0, AnimationConfig.gentle),
      );
    } else if (nextStep === 2) {
      envSectionOpacity.value = withDelay(
        150,
        withTiming(1, { duration: 350 }),
      );
      envSectionTranslateY.value = withDelay(
        150,
        withSpring(0, AnimationConfig.gentle),
      );
    }

    // Auto-scroll after animation starts
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 300);
  }, []);

  // ── Go back to a previous step (re-expand) ──
  const goBackToStep = useCallback((step: number) => {
    Haptics.selectionAsync();
    setCurrentStep(step);

    // Reset animation values for sections that will need to re-animate
    if (step <= 0) {
      soundSectionOpacity.value = 0;
      soundSectionTranslateY.value = 20;
      envSectionOpacity.value = 0;
      envSectionTranslateY.value = 20;
    } else if (step <= 1) {
      envSectionOpacity.value = 0;
      envSectionTranslateY.value = 20;
    }

    // Scroll to top to show re-expanded section
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }, 100);
  }, []);

  // ── Selection handlers ──
  const handleMethodSelect = useCallback(
    (methodId: string) => {
      Haptics.selectionAsync();
      setSelectedMethod(methodId);

      // Only auto-advance if we're on step 0
      if (currentStep === 0) {
        if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
        advanceTimeoutRef.current = setTimeout(() => advanceToStep(1), 400);
      }
    },
    [currentStep, advanceToStep],
  );

  const handleSoundSelect = useCallback(
    (sound: string) => {
      Haptics.selectionAsync();
      setSelectedSound(sound);

      // Only auto-advance if we're on step 1
      if (currentStep === 1) {
        if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
        advanceTimeoutRef.current = setTimeout(() => advanceToStep(2), 400);
      }
    },
    [currentStep, advanceToStep],
  );

  const handleEnvSelect = useCallback(
    (env: ThemeName) => {
      Haptics.selectionAsync();
      setSelectedEnv(env);
      setThemeName(env); // Apply theme immediately
    },
    [setThemeName],
  );

  const handleSoundPreview = useCallback(
    (sound: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (isPreviewMode && currentTrack?.category === sound) {
        stopPreview();
      } else {
        playPreview(sound);
      }
    },
    [isPreviewMode, currentTrack, stopPreview, playPreview],
  );

  const handleContinue = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await updateOnboarding({ focus_method: selectedMethod });
      // Focus method saved

      await updateProfile({ soundPreference: selectedSound });
      // Sound preference saved

      await updateProfile({ environmentTheme: selectedEnv });
      // Environment theme saved

      navigation.navigate("AppTutorial" as any);
    } catch (error) {
      // Failed to save preferences
      navigation.navigate("AppTutorial" as any);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  // ── Lookup helpers ──
  const selectedMethodData =
    FOCUS_METHODS.find((m) => m.id === selectedMethod) || FOCUS_METHODS[0];

  // ── Render: Method Card ──
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
            {
              borderColor: isSelected
                ? method.color
                : "rgba(232, 245, 233, 0.2)",
            },
          ]}
          onPress={() => handleMethodSelect(method.id)}
          activeOpacity={0.8}
        >
          <View style={styles.methodHeader}>
            <View
              style={[
                styles.methodIcon,
                { backgroundColor: method.color + "20" },
              ]}
            >
              <Ionicons name={method.icon} size={24} color={method.color} />
            </View>
            <View style={styles.methodTitleContainer}>
              <Text style={styles.methodTitle}>{method.title}</Text>
              <Text style={styles.methodSubtitle}>{method.subtitle}</Text>
            </View>
            {isSelected && (
              <Ionicons
                name="checkmark-circle"
                size={24}
                color={method.color}
              />
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

  // ── Render: Sound Option ──
  const renderSoundOption = (option: string, index: number) => {
    const isSelected = selectedSound === option;
    const isSoundPlaying = isPreviewMode && currentTrack?.category === option;

    return (
      <Animated.View
        key={option}
        entering={FadeInDown.delay(index * 80).duration(400)}
      >
        <TouchableOpacity
          style={[styles.soundCard, isSelected && styles.selectedSoundCard]}
          onPress={() => handleSoundSelect(option)}
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.soundIconContainer,
              {
                backgroundColor: isSelected
                  ? "#4CAF5020"
                  : "rgba(232, 245, 233, 0.1)",
              },
            ]}
          >
            <Ionicons
              name="musical-notes-outline"
              size={20}
              color={isSelected ? "#4CAF50" : "#B8E6C1"}
            />
          </View>
          <Text
            style={[styles.soundName, isSelected && styles.soundNameSelected]}
          >
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
              color={isSoundPlaying ? "#4CAF50" : "#B8E6C1"}
            />
          </TouchableOpacity>

          {isSelected && (
            <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // ── Render: Environment Card ──
  const renderEnvironmentCard = (env: ThemeName, index: number) => {
    const isSelected = selectedEnv === env;
    const palette = lightThemePalettes[env];
    const icon = THEME_ICONS[env];

    return (
      <Animated.View
        key={env}
        entering={FadeInDown.delay(index * 80).duration(400)}
        style={styles.envCardWrapper}
      >
        <TouchableOpacity
          style={[
            styles.envCard,
            { backgroundColor: palette.background },
            isSelected && {
              borderColor: palette.primary,
              borderWidth: 3,
            },
          ]}
          onPress={() => handleEnvSelect(env)}
          activeOpacity={0.8}
        >
          <Ionicons name={icon} size={32} color={palette.primary} />
          <Text style={[styles.envName, { color: palette.text }]}>
            {palette.name}
          </Text>
          {isSelected && (
            <View
              style={[
                styles.envCheckmark,
                { backgroundColor: palette.primary },
              ]}
            >
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const gradientColors = isDark
    ? ["#000000", "#1a1a1a", "#2a2a2a", "#1a1a1a"]
    : ["#0F2419", "#1B4A3A", "#2E5D4F", "#1B4A3A"];

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

          {/* Nora Speech Bubble — message updates with each step */}
          <NoraSpeechBubble message={NORA_MESSAGES[currentStep]} />

          {/* Scrollable content */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* ── Section 1: Focus Method ── */}
            {currentStep === 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Choose Your Focus Style</Text>
                {FOCUS_METHODS.map((method, index) =>
                  renderMethodCard(method, index),
                )}
              </View>
            ) : (
              <CollapsedSummary
                icon={selectedMethodData.icon}
                iconColor={selectedMethodData.color}
                label="Focus Style"
                value={selectedMethodData.title}
                onPress={() => goBackToStep(0)}
              />
            )}

            {/* ── Section 2: Study Sounds ── */}
            {currentStep >= 1 && (
              <Animated.View style={soundSectionStyle}>
                {currentStep === 1 ? (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                      Pick Your Study Sounds
                    </Text>
                    <View style={styles.soundGrid}>
                      {SOUND_OPTIONS.map((option, index) =>
                        renderSoundOption(option, index),
                      )}
                    </View>
                  </View>
                ) : (
                  <CollapsedSummary
                    icon="musical-notes-outline"
                    iconColor="#4CAF50"
                    label="Study Sound"
                    value={selectedSound}
                    onPress={() => goBackToStep(1)}
                  />
                )}
              </Animated.View>
            )}

            {/* ── Section 3: Environment Theme ── */}
            {currentStep >= 2 && (
              <Animated.View style={envSectionStyle}>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    Choose Your Environment
                  </Text>
                  <Text style={styles.sectionDescription}>
                    This changes the look and feel of the entire app
                  </Text>
                  <View style={styles.envGrid}>
                    {(
                      [
                        "home",
                        "office",
                        "library",
                        "coffee",
                        "park",
                      ] as ThemeName[]
                    ).map((env, index) => renderEnvironmentCard(env, index))}
                  </View>
                </View>
              </Animated.View>
            )}
          </ScrollView>

          {/* Continue button */}
          <View style={styles.bottomContainer}>
            <AnimatedButton
              title="Continue"
              onPress={handleContinue}
              gradient={true}
              gradientColors={["#4CAF50", "#66BB6A", "#4CAF50"]}
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
    alignSelf: "flex-start",
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
    fontWeight: "bold",
    color: "#E8F5E9",
    marginBottom: 6,
  },
  sectionDescription: {
    fontSize: 13,
    color: "#B8E6C1",
    marginBottom: 16,
  },

  // ── Collapsed Summary ──
  collapsedSummary: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(76, 175, 80, 0.08)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(76, 175, 80, 0.25)",
    gap: 12,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 12,
    color: "#B8E6C1",
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#E8F5E9",
  },

  // ── Method Cards ──
  methodCard: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "rgba(232, 245, 233, 0.2)",
  },
  selectedMethodCard: {
    backgroundColor: "rgba(76, 175, 80, 0.1)",
  },
  methodHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  methodTitleContainer: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#E8F5E9",
    marginBottom: 2,
  },
  methodSubtitle: {
    fontSize: 13,
    color: "#B8E6C1",
  },
  timingContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 12,
  },
  timingItem: {
    flex: 1,
    alignItems: "center",
  },
  timingSeparator: {
    width: 1,
    backgroundColor: "rgba(232, 245, 233, 0.2)",
    marginHorizontal: 12,
  },
  timingLabel: {
    fontSize: 11,
    color: "#B8E6C1",
    marginBottom: 4,
  },
  timingValue: {
    fontSize: 16,
    fontWeight: "bold",
  },

  // ── Sound Cards ──
  soundGrid: {
    gap: 10,
  },
  soundCard: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(232, 245, 233, 0.2)",
  },
  selectedSoundCard: {
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    borderColor: "rgba(76, 175, 80, 0.4)",
  },
  soundIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  soundName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#E8F5E9",
  },
  soundNameSelected: {
    color: "#E8F5E9",
  },
  previewButton: {
    padding: 4,
    marginRight: 8,
  },

  // ── Environment Cards ──
  envGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  envCardWrapper: {
    width: "47%",
  },
  envCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 120,
    borderWidth: 2,
    borderColor: "transparent",
    position: "relative",
  },
  envName: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
    textAlign: "center",
  },
  envCheckmark: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  // ── Bottom ──
  bottomContainer: {
    paddingTop: 16,
    paddingBottom: 10,
  },
});
