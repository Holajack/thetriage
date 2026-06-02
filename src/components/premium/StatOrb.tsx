/**
 * StatOrb
 *
 * An interactive stat card with gradient background, animated counter,
 * floating animation, and haptic feedback.
 */

import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import {
  useCounterAnimation,
  useFloatingAnimation,
  useButtonPressAnimation,
  triggerHaptic,
} from "../../utils/animationUtils";
import {
  Typography,
  Spacing,
  Shadows,
  BorderRadius,
} from "../../theme/premiumTheme";

type StatType = "streak" | "focus" | "tasks";

interface StatOrbProps {
  type: StatType;
  value: number;
  label: string;
  sublabel?: string;
  unit?: string;
  onPress?: () => void;
  delay?: number;
}

const STAT_CONFIG: Record<
  StatType,
  {
    icon: keyof typeof Ionicons.glyphMap;
    gradient: [string, string, ...string[]];
    iconColor: string;
  }
> = {
  streak: {
    icon: "flame",
    gradient: ["#F97316", "#EC4899"],
    iconColor: "#FFF",
  },
  focus: {
    icon: "time",
    gradient: ["#06B6D4", "#3B82F6"],
    iconColor: "#FFF",
  },
  tasks: {
    icon: "checkmark-circle",
    gradient: ["#22C55E", "#16A34A"],
    iconColor: "#FFF",
  },
};

export const StatOrb: React.FC<StatOrbProps> = ({
  type,
  value,
  label,
  sublabel,
  unit = "",
  onPress,
  delay = 0,
}) => {
  const { theme, isDark } = useTheme();
  const config = STAT_CONFIG[type];

  // Animated counter
  const { value: displayValue } = useCounterAnimation(value, 800);

  // Floating animation
  const floatingStyle = useFloatingAnimation();

  // Button press animation
  const {
    animatedStyle: pressStyle,
    onPressIn,
    onPressOut,
  } = useButtonPressAnimation();

  const handlePress = useCallback(() => {
    triggerHaptic("buttonPress");
    onPress?.();
  }, [onPress]);

  // Format value for display
  const formattedValue =
    type === "focus" ? displayValue.toFixed(1) : displayValue.toString();

  return (
    <Animated.View
      entering={FadeIn.delay(delay).duration(400)}
      style={[styles.container, floatingStyle]}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={!onPress}
      >
        <Animated.View style={[styles.orbWrapper, pressStyle]}>
          <LinearGradient
            colors={config.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.orb,
              {
                ...Shadows.md,
                shadowColor: config.gradient[0],
              },
            ]}
          >
            {/* Icon */}
            <Ionicons name={config.icon} size={24} color={config.iconColor} />

            {/* Value */}
            <Text style={styles.value}>
              {formattedValue}
              {unit && <Text style={styles.unit}>{unit}</Text>}
            </Text>

            {/* Label */}
            <Text style={styles.label}>{label}</Text>
          </LinearGradient>

          {/* Sublabel (outside gradient) */}
          {sublabel && (
            <View
              style={[
                styles.sublabelContainer,
                {
                  backgroundColor: isDark
                    ? "rgba(255, 255, 255, 0.08)"
                    : "rgba(0, 0, 0, 0.05)",
                },
              ]}
            >
              <Text style={[styles.sublabel, { color: theme.textSecondary }]}>
                {sublabel}
              </Text>
            </View>
          )}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
  },
  orbWrapper: {
    alignItems: "center",
  },
  orb: {
    width: 100,
    height: 110,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  value: {
    ...Typography.statSmall,
    color: "#FFF",
    marginTop: Spacing.xxs,
  },
  unit: {
    fontSize: 12,
    fontWeight: "400",
  },
  label: {
    ...Typography.caption,
    color: "rgba(255, 255, 255, 0.9)",
    marginTop: 2,
    textAlign: "center",
  },
  sublabelContainer: {
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: BorderRadius.sm,
  },
  sublabel: {
    ...Typography.caption,
    fontSize: 10,
  },
});

export default StatOrb;
