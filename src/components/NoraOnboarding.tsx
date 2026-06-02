import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { LiquidGlassCard } from "./premium/LiquidGlass";
import { StaggeredItem } from "./premium/StaggeredList";
import {
  Typography,
  Spacing,
  BorderRadius,
  AnimationConfig,
  TimingConfig,
} from "../theme/premiumTheme";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  runOnJS,
} from "react-native-reanimated";

interface NoraOnboardingProps {
  visible: boolean;
  onComplete: () => void;
  onSkip: () => void;
  isFirstTime?: boolean;
}

// ── Grouped Card (multiple items in one LiquidGlassCard with dividers) ──
interface CardItem {
  icon: string;
  iconColor: string;
  iconBgColor: string;
  text: string;
}

function GroupedCard({
  title,
  titleIcon,
  onTitlePress,
  items,
}: {
  title?: string;
  titleIcon?: string;
  onTitlePress?: () => void;
  items: CardItem[];
}) {
  const { theme } = useTheme();
  return (
    <LiquidGlassCard
      intensity="subtle"
      borderRadius={BorderRadius.lg}
      padding={0}
    >
      {title && (
        <>
          <Pressable
            onPress={onTitlePress}
            disabled={!onTitlePress}
            style={groupStyles.titleRow}
          >
            <Text
              style={[
                groupStyles.titleText,
                { color: onTitlePress ? theme.primary : theme.text },
              ]}
            >
              {title}
            </Text>
            {titleIcon && (
              <Ionicons
                name={titleIcon as any}
                size={16}
                color={theme.primary}
              />
            )}
          </Pressable>
          <View
            style={{
              height: StyleSheet.hairlineWidth,
              backgroundColor: theme.border ?? "rgba(0,0,0,0.08)",
            }}
          />
        </>
      )}
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <View
              style={{
                height: StyleSheet.hairlineWidth,
                backgroundColor: theme.border ?? "rgba(0,0,0,0.08)",
              }}
            />
          )}
          <View style={groupStyles.itemRow}>
            <View
              style={[
                groupStyles.iconCircle,
                { backgroundColor: item.iconBgColor },
              ]}
            >
              <Ionicons
                name={item.icon as any}
                size={20}
                color={item.iconColor}
              />
            </View>
            <Text style={[groupStyles.itemText, { color: theme.text }]}>
              {item.text}
            </Text>
          </View>
        </React.Fragment>
      ))}
    </LiquidGlassCard>
  );
}

const groupStyles = StyleSheet.create({
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  titleText: {
    fontSize: 15,
    fontWeight: "600" as const,
    letterSpacing: -0.1,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  itemText: {
    fontSize: 16,
    fontWeight: "500" as const,
    lineHeight: 24,
    letterSpacing: -0.1,
    flex: 1,
    paddingTop: 2,
  },
});

// ── Acknowledged Badge (inline) ──
function AcknowledgedBadge() {
  const { theme } = useTheme();
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, AnimationConfig.bouncy);
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: scale.value,
  }));

  return (
    <Animated.View
      style={[
        badgeStyles.container,
        { backgroundColor: theme.primary + "20" },
        animStyle,
      ]}
    >
      <Ionicons name="checkmark-circle" size={16} color={theme.primary} />
      <Text style={[badgeStyles.text, { color: theme.primary }]}>
        Acknowledged
      </Text>
    </Animated.View>
  );
}

const badgeStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: 6,
    marginVertical: Spacing.lg,
  },
  text: {
    ...Typography.caption,
    fontWeight: "600",
  },
});

// ── Policy items ──
const POLICY_ITEMS: CardItem[] = [
  {
    icon: "shield-checkmark",
    iconColor: "#3B82F6",
    iconBgColor: "rgba(96,165,250,0.19)",
    text: "Your conversations may be reviewed to keep things safe and improve Nora. Avoid sharing sensitive info like passwords or SSNs.",
  },
  {
    icon: "eye-outline",
    iconColor: "#F59E0B",
    iconBgColor: "rgba(252,211,77,0.19)",
    text: "Flagged conversations may be reviewed by our team. We use these interactions to make Nora better over time.",
  },
];

const DISCLAIMER_ITEMS: CardItem[] = [
  {
    icon: "alert-circle",
    iconColor: "#F59E0B",
    iconBgColor: "rgba(252,211,77,0.19)",
    text: "I can make mistakes — always double-check important information.",
  },
  {
    icon: "school-outline",
    iconColor: "#3B82F6",
    iconBgColor: "rgba(96,165,250,0.19)",
    text: "I'm a study tool, not a replacement for professional academic, medical, or legal advice. Don't rely on me alone without doing your own research.",
  },
  {
    icon: "construct-outline",
    iconColor: "#D97706",
    iconBgColor: "#FEF3C7",
    text: "My features and capabilities may change as I'm updated and improved.",
  },
];

// ── Main Component ──
export default function NoraOnboarding({
  visible,
  onComplete,
  onSkip,
  isFirstTime = true,
}: NoraOnboardingProps) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const completeOnboarding = useMutation(api.noraOnboarding.complete);

  const [currentStep, setCurrentStep] = useState(0); // 0 = intro, 1 = policies+disclaimers
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const [isRendered, setIsRendered] = useState(false);

  // Animations
  const containerOpacity = useSharedValue(0);
  const stepOpacity = useSharedValue(1);
  const stepTranslateX = useSharedValue(0);
  const buttonScale = useSharedValue(1);
  const disclaimerOpacity = useSharedValue(0);
  const disclaimerTranslateY = useSharedValue(30);

  const getFirstName = useCallback(() => {
    if (!user?.full_name) return "there";
    return user.full_name.split(/[_\s]/)[0] || "there";
  }, [user?.full_name]);

  // Entrance / exit
  useEffect(() => {
    if (visible) {
      setIsRendered(true);
      setCurrentStep(0);
      setHasAcknowledged(false);
      stepOpacity.value = 1;
      stepTranslateX.value = 0;
      disclaimerOpacity.value = 0;
      disclaimerTranslateY.value = 30;
      containerOpacity.value = withTiming(1, {
        duration: TimingConfig.entrance,
      });
    } else if (isRendered) {
      containerOpacity.value = withTiming(
        0,
        { duration: TimingConfig.fast },
        () => {
          runOnJS(setIsRendered)(false);
        },
      );
    }
  }, [visible]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const stepStyle = useAnimatedStyle(() => ({
    opacity: stepOpacity.value,
    transform: [{ translateX: stepTranslateX.value }],
  }));

  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const disclaimerStyle = useAnimatedStyle(() => ({
    opacity: disclaimerOpacity.value,
    transform: [{ translateY: disclaimerTranslateY.value }],
  }));

  // Step transition (intro → policies)
  const animateToStep = useCallback((nextStep: number) => {
    stepOpacity.value = withTiming(0, { duration: 150 });
    stepTranslateX.value = withTiming(-20, { duration: 150 });

    setTimeout(() => {
      setCurrentStep(nextStep);
      stepTranslateX.value = 30;
      stepOpacity.value = withTiming(1, { duration: 250 });
      stepTranslateX.value = withSpring(0, AnimationConfig.gentle);
    }, 160);
  }, []);

  // Handlers
  const handleContinue = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (currentStep === 0) {
      // Intro → policies page
      animateToStep(1);
    } else if (currentStep === 1 && !hasAcknowledged) {
      // Acknowledge → reveal disclaimers below
      setHasAcknowledged(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Animate disclaimers in
      disclaimerOpacity.value = withDelay(
        200,
        withTiming(1, { duration: 400 }),
      );
      disclaimerTranslateY.value = withDelay(
        200,
        withSpring(0, AnimationConfig.gentle),
      );

      // Auto-scroll down to show disclaimers
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 400);
    } else if (currentStep === 1 && hasAcknowledged) {
      // Final — complete onboarding
      try {
        await completeOnboarding();
      } catch (e) {
        // Failed to complete onboarding
      }
      onComplete();
    }
  }, [
    currentStep,
    hasAcknowledged,
    animateToStep,
    completeOnboarding,
    onComplete,
  ]);

  const handleButtonPressIn = useCallback(() => {
    buttonScale.value = withSpring(0.97, AnimationConfig.snappy);
  }, []);

  const handleButtonPressOut = useCallback(() => {
    buttonScale.value = withSpring(1, AnimationConfig.bouncy);
  }, []);

  if (!isRendered) return null;

  // ── Button text & state ──
  const getButtonText = () => {
    if (currentStep === 0) return "Continue";
    if (!hasAcknowledged) return "Acknowledge & Continue";
    return "Sounds Good, Let's Begin";
  };

  // ── Step content ──
  const renderStep = () => {
    if (currentStep === 0) {
      return (
        <>
          <Text style={[styles.heading, { color: theme.text }]}>
            Hi {getFirstName()}, I'm Nora.
          </Text>
          <Text style={[styles.body, { color: theme.text }]}>
            I'm your AI study companion — here to help you understand tricky
            topics, build study plans, and stay on track with your goals.
          </Text>
          <Text
            style={[
              styles.body,
              { color: theme.textSecondary ?? "#888", marginTop: Spacing.lg },
            ]}
          >
            Let's get a couple things out of the way first.
          </Text>
        </>
      );
    }

    // Step 1: Combined policies + disclaimers (scrollable reveal)
    return (
      <>
        <Text style={[styles.heading, { color: theme.text }]}>
          A few things to know
        </Text>
        <Text
          style={[
            styles.body,
            { color: theme.textSecondary ?? "#888", marginBottom: Spacing.lg },
          ]}
        >
          Your privacy matters. Here's how we handle your data when you chat
          with Nora.
        </Text>

        {/* Policies grouped card */}
        <StaggeredItem index={0} delay="fast" direction="up">
          <GroupedCard
            title="Privacy & Acceptable Use"
            titleIcon="open-outline"
            onTitlePress={() => Linking.openURL("https://hikewise.app/privacy")}
            items={POLICY_ITEMS}
          />
        </StaggeredItem>

        {/* Acknowledged badge (shows after acknowledge) */}
        {hasAcknowledged && <AcknowledgedBadge />}

        {/* Disclaimers section — revealed on acknowledge */}
        {hasAcknowledged && (
          <Animated.View style={disclaimerStyle}>
            <Text style={[styles.subheading, { color: theme.text }]}>
              Almost there
            </Text>
            <GroupedCard items={DISCLAIMER_ITEMS} />
          </Animated.View>
        )}
      </>
    );
  };

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: theme.background, zIndex: 999 },
        containerStyle,
      ]}
    >
      {/* Progress dots (2 steps) */}
      <View
        style={[styles.progressRow, { marginTop: insets.top + Spacing.md }]}
      >
        {[0, 1].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: theme.border ?? "#E0E0E0" },
              i === currentStep && {
                width: 20,
                backgroundColor: theme.primary,
              },
              i < currentStep && { backgroundColor: theme.primary + "99" },
            ]}
          />
        ))}
      </View>

      {/* Skip button (only when not first time) */}
      {!isFirstTime && (
        <Pressable
          onPress={onSkip}
          style={[styles.skipButton, { top: insets.top + Spacing.sm }]}
        >
          <Text
            style={[styles.skipText, { color: theme.textSecondary ?? "#888" }]}
          >
            Skip
          </Text>
        </Pressable>
      )}

      {/* Step content */}
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 140 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={stepStyle}>{renderStep()}</Animated.View>
      </ScrollView>

      {/* Footer button */}
      <View
        style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}
      >
        <Animated.View style={buttonAnimStyle}>
          <Pressable
            onPress={handleContinue}
            onPressIn={handleButtonPressIn}
            onPressOut={handleButtonPressOut}
            style={[styles.button, { backgroundColor: theme.primary }]}
          >
            <Text style={styles.buttonText}>{getButtonText()}</Text>
            {hasAcknowledged && currentStep === 1 && (
              <Ionicons
                name="arrow-forward"
                size={18}
                color="#FFFFFF"
                style={{ marginLeft: 8 }}
              />
            )}
          </Pressable>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  progressRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginBottom: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  skipButton: {
    position: "absolute",
    right: Spacing.lg,
    zIndex: 10,
  },
  skipText: {
    ...Typography.body,
    fontWeight: "500",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl,
  },
  heading: {
    ...Typography.display,
    marginBottom: Spacing.lg,
  },
  subheading: {
    ...Typography.h2,
    marginBottom: Spacing.md,
  },
  body: {
    fontSize: 18,
    fontWeight: "500" as const,
    lineHeight: 28,
    letterSpacing: -0.1,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  button: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
});
