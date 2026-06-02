import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../context/ThemeContext";
import {
  Typography,
  Spacing,
  BorderRadius,
  PremiumColors,
} from "../../../theme/premiumTheme";

interface ComparisonRow {
  feature: string;
  premium: boolean;
  elite: boolean;
  highlight?: boolean;
}

const COMPARISON_DATA: ComparisonRow[] = [
  { feature: "Trails (Forest, Beach, Jungle)", premium: true, elite: true },
  { feature: "All Trails (incl. exclusive)", premium: false, elite: true },
  { feature: "All Themes", premium: true, elite: true },
  { feature: "All Sound Albums", premium: false, elite: true },
  { feature: "Pro-Level Trail Buddies", premium: true, elite: true },
  { feature: "Exclusive Lion Buddy", premium: false, elite: true },
  { feature: "Summit Focus Mode", premium: true, elite: true },
  { feature: "Community Messaging", premium: true, elite: true },
  { feature: "Study Rooms", premium: true, elite: true },
  { feature: "Unlimited Study Rooms", premium: false, elite: true },
  { feature: "Brain Mapping (limited)", premium: true, elite: false },
  { feature: "Full Brain Mapping", premium: false, elite: true },
  { feature: "Quick Self-Discovery Quizzes", premium: true, elite: true },
  { feature: "In-Depth Quizzes", premium: false, elite: true },
  { feature: "Nora Advanced AI", premium: false, elite: true, highlight: true },
  {
    feature: "Voice + PDF Analysis",
    premium: false,
    elite: true,
    highlight: true,
  },
  { feature: "AI Insights & Personalized Plans", premium: false, elite: true },
  { feature: "Elite Badge & Name Color", premium: false, elite: true },
  { feature: "Early Access to Features", premium: false, elite: true },
  { feature: "Exclusive In-App Gift", premium: false, elite: true },
];

const FeatureComparisonTable: React.FC = () => {
  const { theme } = useTheme();

  const renderCheckOrX = (included: boolean, highlight?: boolean) => {
    if (included) {
      return (
        <Ionicons
          name={highlight ? "sparkles" : "checkmark-circle"}
          size={20}
          color={highlight ? "#8B5CF6" : PremiumColors.success.main}
        />
      );
    }
    return (
      <Ionicons
        name="close-circle"
        size={20}
        color={theme.isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)"}
      />
    );
  };

  return (
    <Animated.View
      entering={FadeInUp.delay(700).duration(500)}
      style={styles.container}
    >
      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        Compare Plans
      </Text>

      {/* Table Header */}
      <View style={[styles.headerRow, { borderBottomColor: theme.border }]}>
        <Text style={[styles.featureHeader, { color: theme.textSecondary }]}>
          Feature
        </Text>
        <Text style={[styles.tierHeader, { color: "#6366F1" }]}>Pro</Text>
        <Text style={[styles.tierHeader, { color: "#8B5CF6" }]}>Elite</Text>
      </View>

      {/* Rows */}
      {COMPARISON_DATA.map((row, i) => (
        <Animated.View
          key={row.feature}
          entering={FadeInUp.delay(750 + i * 40).duration(300)}
          style={[
            styles.row,
            {
              backgroundColor:
                i % 2 === 0
                  ? theme.isDark
                    ? "rgba(255,255,255,0.03)"
                    : "rgba(0,0,0,0.02)"
                  : "transparent",
            },
            row.highlight && styles.highlightRow,
          ]}
        >
          <Text
            style={[
              styles.featureLabel,
              { color: theme.text },
              row.highlight && { color: "#8B5CF6", fontWeight: "600" },
            ]}
          >
            {row.feature}
          </Text>
          <View style={styles.checkCell}>{renderCheckOrX(row.premium)}</View>
          <View style={styles.checkCell}>
            {renderCheckOrX(row.elite, row.highlight)}
          </View>
        </Animated.View>
      ))}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.h2,
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  featureHeader: {
    flex: 1.4,
    ...Typography.caption,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tierHeader: {
    flex: 0.8,
    textAlign: "center",
    ...Typography.label,
    fontSize: 12,
    textTransform: "none",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  highlightRow: {
    backgroundColor: "rgba(139, 92, 246, 0.06)",
  },
  featureLabel: {
    flex: 1.4,
    ...Typography.bodySmall,
  },
  checkCell: {
    flex: 0.8,
    alignItems: "center",
  },
});

export default FeatureComparisonTable;
