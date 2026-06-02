import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  FadeIn,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { AnimatedButton } from "../../../components/premium/AnimatedButton";
import { useTheme } from "../../../context/ThemeContext";
import {
  Typography,
  Spacing,
  BorderRadius,
  AnimationConfig,
  PremiumColors,
  Shadows,
} from "../../../theme/premiumTheme";

interface EliteCelebrationViewProps {
  onManageSubscription: () => void;
}

const ELITE_FEATURES = [
  "Nora Advanced AI Study Assistant",
  "Voice Interaction & PDF Analysis",
  "All sound albums & themes",
  "Exclusive Lion Trail Buddy",
  "Unlimited Study Rooms",
  "Full Brain Mapping",
  "All Bonus Quizzes (incl. In-Depth)",
  "AI Insights & Personalized Plans",
  "Elite Badge & Name Color",
  "Early Access to New Features",
  "Exclusive in-app gift with purchase",
];

const EliteCelebrationView: React.FC<EliteCelebrationViewProps> = ({
  onManageSubscription,
}) => {
  const { theme } = useTheme();
  const badgeScale = useSharedValue(0.5);
  const glowOpacity = useSharedValue(0);
  const floatY = useSharedValue(0);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Badge entrance: scale bounce
    badgeScale.value = withDelay(
      200,
      withSequence(
        withSpring(1.15, AnimationConfig.bouncy),
        withSpring(0.95, AnimationConfig.quick),
        withSpring(1, AnimationConfig.standard),
      ),
    );

    // Glow pulse
    glowOpacity.value = withDelay(
      600,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1500 }),
          withTiming(0.4, { duration: 1500 }),
        ),
        -1,
        true,
      ),
    );

    // Gentle float
    floatY.value = withDelay(
      800,
      withRepeat(
        withSequence(
          withTiming(-6, { duration: 2000 }),
          withTiming(0, { duration: 2000 }),
        ),
        -1,
        true,
      ),
    );
  }, []);

  const badgeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }, { translateY: floatY.value }],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* Badge */}
      <Animated.View style={[styles.badgeWrapper, badgeAnimatedStyle]}>
        <Animated.View
          style={[
            styles.glowRing,
            glowAnimatedStyle,
            { ...Shadows.glow("#8B5CF6") },
          ]}
        />
        <LinearGradient
          colors={
            PremiumColors.gradients.premium as [string, string, ...string[]]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.badgeGradient}
        >
          <Ionicons name="diamond" size={48} color="#FFFFFF" />
          <Text style={styles.badgeTitle}>Elite Member</Text>
        </LinearGradient>
      </Animated.View>

      {/* Message */}
      <Animated.View entering={FadeInUp.delay(500).duration(400)}>
        <Text style={[styles.congratsTitle, { color: theme.text }]}>
          You have full access
        </Text>
        <Text style={[styles.congratsSubtitle, { color: theme.textSecondary }]}>
          Enjoy all Elite features including Nora AI
        </Text>
      </Animated.View>

      {/* Feature List */}
      <Animated.View
        entering={FadeIn.delay(700).duration(400)}
        style={styles.featuresList}
      >
        {ELITE_FEATURES.map((feature, i) => (
          <Animated.View
            key={feature}
            entering={FadeInUp.delay(800 + i * 40).duration(300)}
            style={styles.featureRow}
          >
            <Ionicons
              name="checkmark-circle"
              size={18}
              color={PremiumColors.success.main}
            />
            <Text style={[styles.featureText, { color: theme.text }]}>
              {feature}
            </Text>
          </Animated.View>
        ))}
      </Animated.View>

      {/* Manage Button */}
      <Animated.View entering={FadeInUp.delay(1200).duration(400)}>
        <AnimatedButton
          title="Manage Subscription"
          onPress={onManageSubscription}
          variant="outline"
          size="large"
          fullWidth
          icon={
            <Ionicons name="settings-outline" size={20} color={theme.primary} />
          }
          iconPosition="left"
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  badgeWrapper: {
    marginBottom: Spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  glowRing: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(139, 92, 246, 0.15)",
  },
  badgeGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 4,
  },
  congratsTitle: {
    ...Typography.h1,
    textAlign: "center",
    marginBottom: 4,
  },
  congratsSubtitle: {
    ...Typography.body,
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  featuresList: {
    width: "100%",
    marginBottom: Spacing.xl,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
    paddingHorizontal: Spacing.md,
  },
  featureText: {
    ...Typography.bodySmall,
    flex: 1,
  },
});

export default EliteCelebrationView;
