import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useConvexAchievements } from "../../hooks/useConvex";
import { useTheme } from "../../context/ThemeContext";
import Animated, { FadeInUp, FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { HolographicBadge } from "../../components/premium/HolographicBadge";
import { AnimatedButton } from "../../components/premium/AnimatedButton";
import { StaggeredItem } from "../../components/premium/StaggeredList";
import { ShimmerLoader } from "../../components/premium/ShimmerLoader";
import { Typography, Spacing, PremiumColors } from "../../theme/premiumTheme";
import { glassStyles } from "../../components/premium/LiquidGlass";
import {
  useCounterAnimation,
  useFocusAnimationKey,
} from "../../utils/animationUtils";
import AchievementBadgeIcon from "../../components/AchievementBadgeIcon";
import Svg, {
  Path,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from "react-native-svg";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface EarnedAchievement {
  id: string;
  achievement_type: string;
  title: string;
  description: string;
  icon?: string;
  pointsAwarded?: number;
  category?: string;
  earned_at?: string;
}

// Derive rarity from points awarded
const getRarity = (
  points: number,
): "common" | "rare" | "epic" | "legendary" => {
  if (points >= 100) return "legendary";
  if (points >= 75) return "epic";
  if (points >= 50) return "rare";
  return "common";
};

// Derive display category from achievement type or Convex category field
const getDisplayCategory = (achievement: EarnedAchievement): string => {
  if (achievement.category) return achievement.category;
  const type = achievement.achievement_type;
  if (type.includes("streak") || type === "week_warrior") return "Streaks";
  if (
    type.includes("focus") ||
    type.includes("session") ||
    type === "deep_focus"
  )
    return "Focus";
  if (type.includes("task") || type.includes("productive")) return "Tasks";
  if (type.includes("social") || type.includes("community")) return "Social";
  if (type.includes("level")) return "Levels";
  if (type.includes("early") || type.includes("bird")) return "Milestones";
  return "Milestones";
};

// Category display config: icon, color, and sort order
const CATEGORY_CONFIG: Record<
  string,
  { icon: string; color: string; order: number }
> = {
  Focus: { icon: "time", color: "#4CAF50", order: 0 },
  Streaks: { icon: "flame", color: "#F44336", order: 1 },
  Tasks: { icon: "checkmark-circle", color: "#00BCD4", order: 2 },
  Social: { icon: "people", color: "#3F51B5", order: 3 },
  Levels: { icon: "star", color: "#FFC107", order: 4 },
  Milestones: { icon: "ribbon", color: "#FF9800", order: 5 },
};

const AchievementsScreen = () => {
  const navigation = useNavigation();
  const { achievements: earnedAchievements, loading } = useConvexAchievements();
  const [selectedAchievement, setSelectedAchievement] =
    useState<EarnedAchievement | null>(null);
  const { theme, isDark } = useTheme();
  const focusKey = useFocusAnimationKey();

  // Defensive: ensure array even if hook returns null/undefined edge case
  const safeAchievements = earnedAchievements ?? [];

  // Animated counters
  const earnedCount = safeAchievements.length;
  const earnedCounter = useCounterAnimation(earnedCount, 800);

  // Group earned achievements by display category, sorted by points within each
  const groupedAchievements = safeAchievements.reduce(
    (acc, achievement) => {
      const category = getDisplayCategory(achievement);
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(achievement);
      return acc;
    },
    {} as Record<string, EarnedAchievement[]>,
  );

  // Sort achievements within each category by points (lowest first)
  Object.values(groupedAchievements).forEach((list) => {
    list.sort((a, b) => (a.pointsAwarded ?? 0) - (b.pointsAwarded ?? 0));
  });

  // Sort categories in fixed display order
  const sortedCategories = Object.entries(groupedAchievements).sort(
    ([catA], [catB]) => {
      const orderA = CATEGORY_CONFIG[catA]?.order ?? 99;
      const orderB = CATEGORY_CONFIG[catB]?.order ?? 99;
      return orderA - orderB;
    },
  );

  const renderIcon = (
    achievement: EarnedAchievement,
    iconSize: number = 32,
  ) => {
    return (
      <AchievementBadgeIcon
        achievementId={achievement.achievement_type}
        size={iconSize}
        earned={true}
        fallbackIcon={
          achievement.icon ? `${achievement.icon}-outline` : undefined
        }
      />
    );
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <View style={[styles.header, { backgroundColor: theme.background }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate("Bonuses" as never)}
          >
            <View
              style={[
                styles.backButtonCircle,
                { backgroundColor: theme.text + "20" },
              ]}
            >
              <Ionicons name="arrow-back" size={22} color={theme.text} />
            </View>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Achievements
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContent}>
          <ShimmerLoader
            variant="card"
            height={140}
            style={{ marginBottom: 24, marginHorizontal: 16 }}
          />
          <ShimmerLoader
            variant="text"
            width={120}
            height={16}
            style={{ marginBottom: 16, marginHorizontal: 20 }}
          />
          <View style={styles.loadingGrid}>
            <ShimmerLoader
              variant="card"
              width={80}
              height={100}
              style={{ borderRadius: 12 }}
            />
            <ShimmerLoader
              variant="card"
              width={80}
              height={100}
              style={{ borderRadius: 12 }}
            />
            <ShimmerLoader
              variant="card"
              width={80}
              height={100}
              style={{ borderRadius: 12 }}
            />
            <ShimmerLoader
              variant="card"
              width={80}
              height={100}
              style={{ borderRadius: 12 }}
            />
          </View>
          <ShimmerLoader
            variant="text"
            width={100}
            height={16}
            style={{ marginTop: 24, marginBottom: 16, marginHorizontal: 20 }}
          />
          <View style={styles.loadingGrid}>
            <ShimmerLoader
              variant="card"
              width={80}
              height={100}
              style={{ borderRadius: 12 }}
            />
            <ShimmerLoader
              variant="card"
              width={80}
              height={100}
              style={{ borderRadius: 12 }}
            />
            <ShimmerLoader
              variant="card"
              width={80}
              height={100}
              style={{ borderRadius: 12 }}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      {/* ===== HEADER ===== */}
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate("Bonuses" as never);
          }}
        >
          <View
            style={[
              styles.backButtonCircle,
              { backgroundColor: theme.text + "20" },
            ]}
          >
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </View>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Achievements
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        key={focusKey}
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ===== PROGRESS SUMMARY CARD ===== */}
        <Animated.View entering={FadeIn.duration(400)}>
          <View
            style={[
              styles.progressCard,
              glassStyles.mediumCard(isDark),
              { backgroundColor: theme.card },
            ]}
          >
            <View style={styles.progressContent}>
              <View
                style={[
                  styles.earnedIconContainer,
                  { backgroundColor: theme.primary + "15" },
                ]}
              >
                <Ionicons name="trophy" size={28} color={theme.primary} />
              </View>
              <View style={styles.progressStats}>
                <View style={styles.progressStatRow}>
                  <Animated.Text
                    style={[styles.progressStatNumber, { color: theme.text }]}
                  >
                    {Math.round(earnedCounter.value)}
                  </Animated.Text>
                  <Text
                    style={[
                      styles.progressStatLabel,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {" "}
                    Unlocked
                  </Text>
                </View>
                <Text
                  style={[
                    styles.progressSubtext,
                    { color: theme.textSecondary },
                  ]}
                >
                  {earnedCount === 0
                    ? "Start earning achievements!"
                    : "Keep going! More to discover."}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ===== ACHIEVEMENT SKILL TREE PATH ===== */}
        {Object.keys(groupedAchievements).length === 0 ? (
          <Animated.View
            entering={FadeIn.delay(200).duration(400)}
            style={styles.emptyState}
          >
            <View
              style={[
                styles.emptyIconContainer,
                { backgroundColor: theme.primary + "10" },
              ]}
            >
              <Ionicons
                name="trophy-outline"
                size={48}
                color={theme.primary + "40"}
              />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              No achievements yet
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
              Complete focus sessions, build streaks, and explore features to
              unlock achievements.
            </Text>
          </Animated.View>
        ) : (
          // Skill-tree path layout. Each category becomes a labeled "biome" along
          // a vertical zig-zag path. Earned achievements render as glowing nodes;
          // the path is drawn via SVG between consecutive node centers.
          (() => {
            // Flatten all categories into a single ordered list of nodes,
            // inserting category headers as path "biome" markers.
            type PathItem =
              | {
                  type: "biome";
                  category: string;
                  meta: (typeof CATEGORY_CONFIG)[string];
                }
              | { type: "node"; achievement: EarnedAchievement };
            const items: PathItem[] = [];
            sortedCategories.forEach(([category, list]) => {
              const meta = CATEGORY_CONFIG[category] || {
                icon: "help-circle",
                color: theme.primary,
                order: 99,
              };
              items.push({ type: "biome", category, meta });
              list.forEach((achievement) =>
                items.push({ type: "node", achievement }),
              );
            });

            const NODE_VERTICAL_SPACING = 130;
            const NODE_HORIZONTAL_OFFSET = SCREEN_WIDTH * 0.22; // distance from center
            const PATH_HEIGHT = items.length * NODE_VERTICAL_SPACING + 80;

            // Build the SVG curve between consecutive node centers (skip biome markers).
            const nodeCenters: Array<{ x: number; y: number }> = [];
            items.forEach((item, idx) => {
              if (item.type !== "node") return;
              const nodeIndex = items
                .slice(0, idx)
                .filter((i) => i.type === "node").length;
              const isLeft = nodeIndex % 2 === 0;
              const centerX =
                SCREEN_WIDTH / 2 +
                (isLeft ? -NODE_HORIZONTAL_OFFSET : NODE_HORIZONTAL_OFFSET);
              const centerY = idx * NODE_VERTICAL_SPACING + 60;
              nodeCenters.push({ x: centerX, y: centerY });
            });

            let pathD = "";
            for (let i = 0; i < nodeCenters.length - 1; i++) {
              const from = nodeCenters[i];
              const to = nodeCenters[i + 1];
              const midY = (from.y + to.y) / 2;
              if (i === 0) pathD += `M ${from.x} ${from.y} `;
              pathD += `Q ${from.x} ${midY}, ${(from.x + to.x) / 2} ${midY} `;
              pathD += `T ${to.x} ${to.y} `;
            }

            return (
              <View style={[styles.pathContainer, { height: PATH_HEIGHT }]}>
                {/* SVG curved trail */}
                {nodeCenters.length > 1 && (
                  <Svg
                    width={SCREEN_WIDTH}
                    height={PATH_HEIGHT}
                    style={StyleSheet.absoluteFill}
                  >
                    <Defs>
                      <SvgLinearGradient
                        id="trailGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <Stop
                          offset="0"
                          stopColor={theme.primary}
                          stopOpacity="0.45"
                        />
                        <Stop
                          offset="1"
                          stopColor={theme.primary}
                          stopOpacity="0.15"
                        />
                      </SvgLinearGradient>
                    </Defs>
                    <Path
                      d={pathD}
                      stroke="url(#trailGradient)"
                      strokeWidth={5}
                      strokeDasharray="10 8"
                      fill="none"
                      strokeLinecap="round"
                    />
                  </Svg>
                )}

                {/* Nodes + biome markers */}
                {items.map((item, idx) => {
                  if (item.type === "biome") {
                    return (
                      <View
                        key={`biome-${item.category}`}
                        style={[
                          styles.biomeMarker,
                          { top: idx * NODE_VERTICAL_SPACING + 18 },
                        ]}
                      >
                        <View
                          style={[
                            styles.biomePill,
                            {
                              backgroundColor: item.meta.color + "15",
                              borderColor: item.meta.color + "40",
                            },
                          ]}
                        >
                          <Ionicons
                            name={item.meta.icon as any}
                            size={14}
                            color={item.meta.color}
                          />
                          <Text
                            style={[
                              styles.biomeLabel,
                              { color: item.meta.color },
                            ]}
                          >
                            {item.category.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                    );
                  }
                  const center =
                    nodeCenters[
                      items.slice(0, idx).filter((i) => i.type === "node")
                        .length
                    ];
                  if (!center) return null;
                  return (
                    <View
                      key={item.achievement.id}
                      style={{
                        position: "absolute",
                        top: center.y - 36,
                        left: center.x - 36,
                      }}
                    >
                      <HolographicBadge
                        title={item.achievement.title}
                        description={item.achievement.description}
                        icon={renderIcon(item.achievement)}
                        unlocked={true}
                        rarity={getRarity(item.achievement.pointsAwarded ?? 0)}
                        progress={1}
                        size="medium"
                        onPress={() => {
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Light,
                          );
                          setSelectedAchievement(item.achievement);
                        }}
                        showCelebration={false}
                      />
                    </View>
                  );
                })}
              </View>
            );
          })()
        )}
      </ScrollView>

      {/* ===== ACHIEVEMENT DETAIL MODAL ===== */}
      <Modal
        visible={!!selectedAchievement}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedAchievement(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            {selectedAchievement && (
              <>
                <View style={styles.modalIcon}>
                  {renderIcon(selectedAchievement, 48)}
                </View>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  {selectedAchievement.title}
                </Text>
                <Text
                  style={[
                    styles.modalDescription,
                    { color: theme.textSecondary },
                  ]}
                >
                  {selectedAchievement.description}
                </Text>

                <View
                  style={[
                    styles.earnedBadge,
                    { backgroundColor: theme.primary + "15" },
                  ]}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={theme.primary}
                  />
                  <Text style={[styles.earnedText, { color: theme.primary }]}>
                    Earned!
                  </Text>
                </View>

                {(selectedAchievement.pointsAwarded ?? 0) > 0 && (
                  <View style={styles.rewardContainer}>
                    <Ionicons name="gift" size={16} color="#FF9800" />
                    <Text style={[styles.rewardText, { color: theme.text }]}>
                      +{selectedAchievement.pointsAwarded} points
                    </Text>
                  </View>
                )}

                <AnimatedButton
                  title="Close"
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedAchievement(null);
                  }}
                  variant="primary"
                  size="large"
                  gradient
                  gradientColors={
                    PremiumColors.gradients.primary as [
                      string,
                      string,
                      ...string[],
                    ]
                  }
                  style={{ marginTop: Spacing.md }}
                />
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ===== HEADER =====
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  backButton: {
    padding: 4,
  },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
  },
  headerSpacer: {
    width: 48,
  },

  // ===== LOADING =====
  loadingContent: {
    paddingTop: 20,
  },
  loadingGrid: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 16,
  },

  // ===== SCROLL =====
  scrollContent: {
    paddingBottom: 24,
  },

  // ===== PROGRESS CARD =====
  progressCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    padding: 20,
    borderRadius: 16,
  },
  progressContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  earnedIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  progressStats: {
    flex: 1,
    marginLeft: 16,
  },
  progressStatRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  progressStatNumber: {
    fontSize: 28,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  progressStatLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  progressSubtext: {
    fontSize: 13,
    marginTop: 4,
  },

  // ===== EMPTY STATE =====
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 40,
    paddingTop: 48,
    paddingBottom: 32,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },

  // ===== CATEGORIES =====
  categoryContainer: {
    marginTop: 28,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  categoryDot: {
    width: 4,
    height: 16,
    borderRadius: 2,
    marginRight: 8,
  },
  categoryTitle: {
    ...Typography.label,
  },
  achievementsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 14,
    gap: 10,
    justifyContent: "flex-start",
  },
  achievementBadge: {
    marginBottom: 4,
  },

  // ===== SKILL TREE PATH =====
  pathContainer: {
    position: "relative",
    marginTop: 16,
  },
  biomeMarker: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  biomePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  biomeLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },

  // ===== MODAL =====
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    borderRadius: 20,
    padding: 24,
    width: "85%",
    alignItems: "center",
  },
  modalIcon: {
    width: 90,
    height: 90,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
  earnedBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
    gap: 8,
  },
  earnedText: {
    fontWeight: "700",
    fontSize: 14,
  },
  rewardContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 8,
  },
  rewardText: {
    fontSize: 14,
    fontWeight: "600",
  },
});

export default AchievementsScreen;
