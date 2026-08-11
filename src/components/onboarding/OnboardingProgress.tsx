import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";

/**
 * Onboarding progress with an endowed-progress head start.
 *
 * The endowed-progress effect (Nunes & Drèze, 2006): people who are given a task
 * that is ALREADY partially complete finish it markedly more often than people
 * starting the identical task from zero. Signing up is real work the user has
 * already done, so the bar credits it instead of opening at 0% — which reads as
 * "nothing done, five things left".
 *
 * Progress = ACCOUNT_CREDIT + (1 - ACCOUNT_CREDIT) * (stepsDone / totalSteps)
 */

/** Creating the account is worth this much of the whole flow. */
const ACCOUNT_CREDIT = 0.25;

export const ONBOARDING_TOTAL_STEPS = 5;

interface OnboardingProgressProps {
  /** 1-based index of the step the user is currently ON. */
  step: number;
  totalSteps?: number;
  /** Optional label override. */
  label?: string;
}

export function onboardingProgress(
  step: number,
  totalSteps: number = ONBOARDING_TOTAL_STEPS,
): number {
  const done = Math.max(0, Math.min(step - 1, totalSteps));
  return ACCOUNT_CREDIT + (1 - ACCOUNT_CREDIT) * (done / totalSteps);
}

export const OnboardingProgress: React.FC<OnboardingProgressProps> = ({
  step,
  totalSteps = ONBOARDING_TOTAL_STEPS,
  label,
}) => {
  const { theme } = useTheme();
  const progress = onboardingProgress(step, totalSteps);
  const percent = Math.round(progress * 100);

  const fillStyle = useAnimatedStyle(() => ({
    width: withTiming(`${percent}%`, {
      duration: 520,
      easing: Easing.out(Easing.cubic),
    }),
  }));

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={[styles.percent, { color: theme.primary }]}>
          {percent}% set up
        </Text>
        <Text style={[styles.step, { color: theme.textSecondary }]}>
          Step {step} of {totalSteps}
        </Text>
      </View>

      <View
        style={[styles.track, { backgroundColor: theme.text + "14" }]}
        accessibilityRole="progressbar"
        accessibilityValue={{ now: percent, min: 0, max: 100 }}
      >
        <Animated.View
          style={[styles.fill, { backgroundColor: theme.primary }, fillStyle]}
        />
      </View>

      {/* Name the thing they already did. The head start has to feel earned,
          not arbitrary, or it reads as a fake progress bar. */}
      <View style={styles.creditRow}>
        <Ionicons name="checkmark-circle" size={14} color={theme.primary} />
        <Text style={[styles.credit, { color: theme.textSecondary }]}>
          {label ?? "Account created — you're already on your way"}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: 8,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  percent: {
    fontSize: 14,
    fontWeight: "700",
  },
  step: {
    fontSize: 12,
    fontWeight: "600",
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 3,
  },
  creditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  credit: {
    fontSize: 12,
  },
});

export default OnboardingProgress;
