import React, { useRef } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../../context/ThemeContext";
import { BottomTabBar } from "../../components/BottomTabBar";
import { UnifiedHeader } from "../../components/UnifiedHeader";
import Animated, { FadeInUp, FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Typography } from "../../theme/premiumTheme";
import {
  useFocusAnimationKey,
  useCounterAnimation,
} from "../../utils/animationUtils";
import { glassStyles } from "../../components/premium/LiquidGlass";
import { useConvexAchievements } from "../../hooks/useConvex";
import InteractiveWalkthrough from "../../components/InteractiveWalkthrough";
import { useScreenWalkthrough } from "../../hooks/useScreenWalkthrough";
import { BONUSES_STEPS } from "../../config/walkthroughSteps";
import { navigateHomeWithSlide } from "../../navigation/navHelpers";

const BonusesScreen = () => {
  const navigation = useNavigation<any>();
  const { theme, isDark } = useTheme();
  const focusKey = useFocusAnimationKey();
  const { achievements: earnedAchievements } = useConvexAchievements();

  const earnedCount = earnedAchievements.length;
  const earnedCounter = useCounterAnimation(earnedCount, 800);

  // Walkthrough refs and hook
  const featureGridRef = useRef<View>(null);
  const walkthroughRefs = {
    "feature-grid": featureGridRef,
  };
  const {
    visible: walkthroughVisible,
    measurements: walkthroughMeasurements,
    complete: walkthroughComplete,
  } = useScreenWalkthrough("bonuses", walkthroughRefs);

  const features = [
    {
      id: "ebooks",
      title: "E-Book Library",
      stat: "Upload & study anywhere",
      description:
        "Access your study materials on the go. Upload PDFs and textbooks for easy reference during sessions.",
      icon: "book" as const,
      color: "#4CAF50",
      onPress: () => navigation.navigate("EBooks"),
    },
    {
      id: "self-discovery",
      title: "Self-Discovery",
      stat: "6 assessments",
      description:
        "Understand your learning style, strengths, and areas for growth through science-backed quizzes.",
      icon: "bulb" as const,
      color: "#9C27B0",
      onPress: () => navigation.navigate("SelfDiscoveryQuiz"),
    },
    {
      id: "brain-mapping",
      title: "Brain Mapping",
      stat: "Cognitive insights",
      description:
        "Visualize your cognitive patterns and discover how your brain performs across different focus areas.",
      icon: "pulse" as const,
      color: "#E91E63",
      onPress: () => navigation.navigate("BrainMapping"),
    },
  ];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <UnifiedHeader
        title="Bonuses"
        onClose={() => navigateHomeWithSlide(navigation)}
      />

      <ScrollView
        key={focusKey}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ===== ACHIEVEMENT HERO CARD ===== */}
        <Animated.View entering={FadeIn.duration(400)}>
          <Pressable
            style={[
              styles.achievementCard,
              glassStyles.mediumCard(isDark),
              { backgroundColor: theme.card },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate("Achievements");
            }}
          >
            <View
              style={[styles.achievementIcon, { backgroundColor: "#FFD70018" }]}
            >
              <Ionicons name="trophy" size={24} color="#FFD700" />
            </View>
            <View style={styles.achievementInfo}>
              <View style={styles.achievementStatRow}>
                <Animated.Text
                  style={[styles.achievementCount, { color: theme.text }]}
                >
                  {Math.round(earnedCounter.value)}
                </Animated.Text>
                <Text
                  style={[
                    styles.achievementLabel,
                    { color: theme.textSecondary },
                  ]}
                >
                  {" "}
                  Unlocked
                </Text>
              </View>
              <Text
                style={[
                  styles.achievementSubtext,
                  { color: theme.textSecondary },
                ]}
              >
                {earnedCount === 0
                  ? "Start earning achievements!"
                  : earnedCount < 5
                    ? "Great start! Keep going."
                    : "Nice progress!"}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.textSecondary}
            />
          </Pressable>
        </Animated.View>

        {/* ===== EXPLORE SECTION ===== */}
        <Animated.View entering={FadeIn.delay(100).duration(400)}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            EXPLORE
          </Text>
        </Animated.View>

        <View ref={featureGridRef} collapsable={false}>
          {features.map((feature, index) => (
            <Animated.View
              key={feature.id}
              entering={FadeInUp.delay(160 + index * 80).duration(400)}
            >
              <Pressable
                style={[
                  styles.featureCard,
                  glassStyles.subtleCard(isDark),
                  { backgroundColor: theme.card },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  feature.onPress();
                }}
              >
                <View style={styles.featureCardHeader}>
                  <View
                    style={[
                      styles.featureCardIcon,
                      { backgroundColor: feature.color + "15" },
                    ]}
                  >
                    <Ionicons
                      name={feature.icon}
                      size={28}
                      color={feature.color}
                    />
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={theme.textSecondary}
                  />
                </View>
                <Text style={[styles.featureCardTitle, { color: theme.text }]}>
                  {feature.title}
                </Text>
                <Text
                  style={[styles.featureCardStat, { color: feature.color }]}
                >
                  {feature.stat}
                </Text>
                <Text
                  style={[
                    styles.featureCardDesc,
                    { color: theme.textSecondary },
                  ]}
                >
                  {feature.description}
                </Text>
              </Pressable>
            </Animated.View>
          ))}
        </View>
      </ScrollView>

      {/* Walkthrough Overlay */}
      <InteractiveWalkthrough
        visible={walkthroughVisible}
        onComplete={walkthroughComplete}
        measurements={walkthroughMeasurements}
        steps={BONUSES_STEPS}
      />

      <BottomTabBar currentRoute="Bonuses" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ===== ACHIEVEMENT HERO CARD =====
  achievementCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 14,
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementStatRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  achievementCount: {
    fontSize: 22,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  achievementLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  achievementSubtext: {
    fontSize: 12,
    marginTop: 2,
  },

  // ===== SECTION LABEL =====
  sectionLabel: {
    ...Typography.label,
    paddingHorizontal: 16,
    marginTop: 28,
    marginBottom: 12,
  },

  // ===== FEATURE CARDS (enlarged) =====
  featureCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 20,
    borderRadius: 16,
  },
  featureCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  featureCardIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  featureCardTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  featureCardStat: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  featureCardDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
});

export default BonusesScreen;
