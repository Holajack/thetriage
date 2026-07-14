/**
 * One row in the brain-mapping list. Used for both the plain-language groups
 * (core view) and the anatomical regions (Elite detail view) — they render
 * identically, only their labels differ.
 */

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";

interface BrainAreaCardProps {
  title: string;
  subtitle: string;
  /** Right-hand value, e.g. "45m" or "Resting". */
  valueLabel: string;
  /** 0-1, drives the progress bar. */
  activity: number;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  isSelected: boolean;
  onPress: () => void;
}

const BrainAreaCard: React.FC<BrainAreaCardProps> = ({
  title,
  subtitle,
  valueLabel,
  activity,
  color,
  icon,
  isSelected,
  onPress,
}) => {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: theme.card },
        isSelected && { borderColor: color },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${valueLabel}.`}
      accessibilityState={{ selected: isSelected }}
    >
      <View style={[styles.icon, { backgroundColor: color + "1F" }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>

      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.value, { color }]}>{valueLabel}</Text>
        </View>

        <Text
          style={[styles.subtitle, { color: theme.text + "99" }]}
          numberOfLines={2}
        >
          {subtitle}
        </Text>

        <View
          style={[styles.progressBar, { backgroundColor: theme.text + "14" }]}
        >
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.max(2, activity * 100)}%`,
                backgroundColor: color,
              },
            ]}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  body: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 3,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },
  value: {
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 8,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 9,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
});

export default BrainAreaCard;
