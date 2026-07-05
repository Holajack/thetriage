import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import type { RootStackParamList } from "../../navigation/types";
const { useUserAppData } = require("../../utils/userAppData");
import { useBackgroundMusic } from "../../hooks/useBackgroundMusic";
import { useTheme } from "../../context/ThemeContext";
import { StaggeredItem } from "../../components/premium/StaggeredList";
import { ProductivityScoreRing } from "../../components/premium/ProductivityScoreRing";
import { glassStyles } from "../../components/premium/LiquidGlass";
import { useCounterAnimation } from "../../utils/animationUtils";

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>["name"];

interface CompletedTaskData {
  task: string;
  subject: string;
  duration: number;
  focusRating: number;
  productivityRating: number;
  notes?: string;
  completedFullSession?: boolean;
  sessionType?: string;
  plannedDuration?: number;
}

interface SessionAchievement {
  id: string;
  title: string;
  description: string;
  icon: MaterialIconName;
  color: string;
}

const SessionReportScreen = () => {
  const { data: userData } = useUserAppData();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const { theme, isDark } = useTheme();

  const params = route.params as
    | {
        sessionDuration: number;
        breakDuration: number;
        taskCompleted: boolean;
        focusRating: number;
        notes?: string;
        sessionType: "auto" | "manual";
        subject: string;
        plannedDuration: number;
        productivity: number;
        focusMode?: "basecamp" | "summit";
        completedTasksData?: CompletedTaskData[];
      }
    | undefined;

  const [newAchievements, setNewAchievements] = useState<SessionAchievement[]>(
    [],
  );
  const [sessionScore, setSessionScore] = useState(0);

  // Animated headline counter (must run before any early return -- hooks rule)
  const minutesCounter = useCounterAnimation(params?.sessionDuration ?? 0, 900);

  // Music hook
  const {
    currentTrack,
    isPlaying,
    stopPlayback,
    audioSupported,
    isPreviewMode,
  } = useBackgroundMusic();

  // Calculate comprehensive session score
  const calculateSessionScore = useMemo(() => {
    if (!params) return 0;

    let score = 0;
    const maxScore = 100;

    // Completion bonus (40 points max)
    if (params.taskCompleted) {
      score += 40;
    } else {
      // Partial credit for incomplete sessions
      const completionRatio = params.sessionDuration / params.plannedDuration;
      score += Math.floor(40 * completionRatio);
    }

    // Focus rating (25 points max)
    score += (params.focusRating / 5) * 25;

    // Productivity rating (25 points max)
    score += (params.productivity / 5) * 25;

    // Notes bonus (10 points max)
    if (params.notes && params.notes.trim().length > 0) {
      score += 10;
    }

    return Math.min(Math.floor(score), maxScore);
  }, [params]);

  // Check for new achievements
  useEffect(() => {
    const checkAchievements = async () => {
      if (!params) return;

      const achievements: SessionAchievement[] = [];

      // Focus Master achievement
      if (params.focusRating >= 5) {
        achievements.push({
          id: "focus_master",
          title: "Focus Master",
          description: "Achieved perfect focus rating",
          icon: "psychology",
          color: "#4CAF50",
        });
      }

      // Productivity Pro achievement
      if (params.productivity >= 5) {
        achievements.push({
          id: "productivity_pro",
          title: "Productivity Pro",
          description: "Achieved maximum productivity",
          icon: "trending-up",
          color: "#2196F3",
        });
      }

      // Session Completion achievement
      if (params.taskCompleted) {
        achievements.push({
          id: "session_complete",
          title: "Session Complete",
          description: "Completed full focus session",
          icon: "emoji-events",
          color: "#FF9800",
        });
      }

      // Note Taker achievement
      if (params.notes && params.notes.trim().length > 20) {
        achievements.push({
          id: "note_taker",
          title: "Thoughtful Learner",
          description: "Added detailed session notes",
          icon: "edit-note",
          color: "#9C27B0",
        });
      }

      // High Score achievement
      if (calculateSessionScore >= 90) {
        achievements.push({
          id: "high_score",
          title: "Excellence Achieved",
          description: "Scored 90+ on session quality",
          icon: "star",
          color: "#FFD700",
        });
      }

      setNewAchievements(achievements);

      // TODO: Save achievements to Convex
      // Achievement saving will use Convex mutations in a future update
      if (achievements.length > 0) {
        // Achievements earned (not saved yet)
      }
    };

    checkAchievements();
    setSessionScore(calculateSessionScore);
  }, [params, calculateSessionScore]);

  // Stop music on screen entry
  useEffect(() => {
    stopPlayback().catch((error) => {
      // Failed to stop music on session report entry
    });
  }, [stopPlayback]);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Ionicons
        key={i}
        name={i < rating ? "star" : "star-outline"}
        size={20}
        color={i < rating ? "#FFD700" : theme.border}
      />
    ));
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return theme.success ?? "#22C55E";
    if (score >= 70) return theme.warning ?? "#F59E0B";
    if (score >= 50) return theme.warning ?? "#FFC107";
    return theme.error ?? "#EF4444";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return "Excellent";
    if (score >= 70) return "Good";
    if (score >= 50) return "Fair";
    return "Needs Improvement";
  };

  const getScoreGradient = (score: number): [string, string, string] => {
    if (score >= 90) return ["#4ADE80", "#22C55E", "#16A34A"];
    if (score >= 70) return ["#FCD34D", "#F59E0B", "#D97706"];
    if (score >= 50) return ["#38BDF8", "#3B82F6", "#2563EB"];
    return ["#F87171", "#EF4444", "#DC2626"];
  };

  if (!params) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: theme.background }]}
      >
        <View style={styles.emptyState}>
          <View
            style={[
              styles.emptyIconContainer,
              { backgroundColor: theme.primary + "15" },
            ]}
          >
            <Ionicons
              name="document-text-outline"
              size={44}
              color={theme.primary + "80"}
            />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            No session data
          </Text>
          <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
            Complete a focus session to see your report here.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const tasksThisSession =
    params.completedTasksData?.length ?? (params.taskCompleted ? 1 : 0);
  const completionPoints = params.taskCompleted
    ? 40
    : Math.floor(40 * (params.sessionDuration / params.plannedDuration));

  const scoreBreakdown: {
    id: string;
    label: string;
    value: string;
    icon: MaterialIconName;
  }[] = [
    {
      id: "completion",
      label: "Completion",
      value: `${completionPoints}/40`,
      icon: "check-circle",
    },
    {
      id: "focus",
      label: "Focus Rating",
      value: `${Math.floor((params.focusRating / 5) * 25)}/25`,
      icon: "psychology",
    },
    {
      id: "productivity",
      label: "Productivity",
      value: `${Math.floor((params.productivity / 5) * 25)}/25`,
      icon: "trending-up",
    },
    {
      id: "notes",
      label: "Notes Bonus",
      value: `${params.notes && params.notes.trim().length > 0 ? "10" : "0"}/10`,
      icon: "edit-note",
    },
  ];

  const sessionDetails: {
    id: string;
    label: string;
    value: string;
    icon: MaterialIconName;
  }[] = [
    {
      id: "duration",
      label: "Duration",
      value: `${params.sessionDuration} of ${params.plannedDuration} min`,
      icon: "schedule",
    },
    {
      id: "subject",
      label: "Subject",
      value: params.subject,
      icon: "subject",
    },
    {
      id: "type",
      label: "Session Type",
      value: params.sessionType === "manual" ? "Custom Setup" : "Quick Start",
      icon: "settings",
    },
    {
      id: "break",
      label: "Break Duration",
      value: `${params.breakDuration} min`,
      icon: "free-breakfast",
    },
  ];

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
      edges={["top", "left", "right"]}
    >
      {/* Top Navigation */}
      <View style={[styles.topNavBar, { backgroundColor: theme.background }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate("Main", { screen: "Home" });
          }}
        >
          <View
            style={[
              styles.backButtonCircle,
              {
                backgroundColor: isDark ? theme.text + "20" : "#fff",
                borderColor: isDark ? "transparent" : theme.border,
                borderWidth: isDark ? 0 : 1,
              },
            ]}
          >
            <Ionicons name="close" size={18} color={theme.text} />
          </View>
        </TouchableOpacity>
        <Text style={[styles.topNavTitle, { color: theme.text }]}>
          Session Report
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ===== SUMMARY HEADER ===== */}
        <Animated.View
          entering={FadeIn.duration(400)}
          style={styles.summarySection}
        >
          <Text style={[styles.summaryEyebrow, { color: theme.primary }]}>
            SESSION COMPLETE
          </Text>
          <Animated.Text style={[styles.summaryTitle, { color: theme.text }]}>
            {minutesCounter.value} min focused
          </Animated.Text>
          <Text
            style={[styles.summarySubtitle, { color: theme.textSecondary }]}
          >
            {params.subject}
            {"  ·  "}
            <Text
              style={{ color: getScoreColor(sessionScore), fontWeight: "700" }}
            >
              {getScoreLabel(sessionScore)}
            </Text>
          </Text>
        </Animated.View>

        {/* ===== HERO CARD ===== */}
        <Animated.View
          entering={FadeInUp.delay(100).duration(500)}
          style={styles.heroWrapper}
        >
          <LinearGradient
            colors={getScoreGradient(sessionScore)}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={styles.heroGradient}
          >
            <View style={styles.heroHighlight} />
            <View style={styles.heroContent}>
              <View style={styles.heroBadge}>
                <MaterialIcons name="emoji-events" size={34} color="#fff" />
              </View>
              <View style={styles.heroInfo}>
                <Text style={styles.heroEyebrow}>QUALITY SCORE</Text>
                <Text style={styles.heroTitle}>
                  {sessionScore}
                  <Text style={styles.heroTitleOutOf}> / 100</Text>
                </Text>
                <Text style={styles.heroSubtitle}>
                  {params.taskCompleted
                    ? "Full session complete"
                    : "Partial session logged"}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ===== PRODUCTIVITY RING ===== */}
        <Animated.View entering={FadeInUp.delay(180).duration(500)}>
          <View
            style={[
              styles.card,
              styles.ringCard,
              glassStyles.mediumCard(isDark),
              { backgroundColor: theme.card },
            ]}
          >
            <Text style={[styles.cardEyebrow, { color: theme.textSecondary }]}>
              PRODUCTIVITY
            </Text>
            <ProductivityScoreRing
              streak={tasksThisSession}
              focusProgress={sessionScore}
              tasksCompleted={tasksThisSession}
            />
          </View>
        </Animated.View>

        {/* ===== SCORE BREAKDOWN ===== */}
        <Animated.View entering={FadeInUp.delay(240).duration(500)}>
          <View
            style={[
              styles.card,
              glassStyles.subtleCard(isDark),
              { backgroundColor: theme.card },
            ]}
          >
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              Score Breakdown
            </Text>
            {scoreBreakdown.map((row, index) => (
              <StaggeredItem key={row.id} index={index} delay="fast">
                <View style={styles.statRow}>
                  <View
                    style={[
                      styles.statIcon,
                      { backgroundColor: theme.primary + "15" },
                    ]}
                  >
                    <MaterialIcons
                      name={row.icon}
                      size={18}
                      color={theme.primary}
                    />
                  </View>
                  <Text
                    style={[styles.statLabel, { color: theme.textSecondary }]}
                  >
                    {row.label}
                  </Text>
                  <Text style={[styles.statValue, { color: theme.text }]}>
                    {row.value}
                  </Text>
                </View>
              </StaggeredItem>
            ))}
          </View>
        </Animated.View>

        {/* ===== SESSION DETAILS ===== */}
        <Animated.View entering={FadeInUp.delay(300).duration(500)}>
          <View
            style={[
              styles.card,
              glassStyles.subtleCard(isDark),
              { backgroundColor: theme.card },
            ]}
          >
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              Session Details
            </Text>
            {sessionDetails.map((row, index) => (
              <StaggeredItem key={row.id} index={index} delay="fast">
                <View style={styles.statRow}>
                  <View
                    style={[
                      styles.statIcon,
                      { backgroundColor: theme.primary + "15" },
                    ]}
                  >
                    <MaterialIcons
                      name={row.icon}
                      size={18}
                      color={theme.primary}
                    />
                  </View>
                  <Text
                    style={[styles.statLabel, { color: theme.textSecondary }]}
                  >
                    {row.label}
                  </Text>
                  <Text
                    style={[styles.statValue, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    {row.value}
                    {row.id === "duration" && params.taskCompleted && (
                      <Text style={{ color: theme.primary }}> ✓</Text>
                    )}
                  </Text>
                </View>
              </StaggeredItem>
            ))}
          </View>
        </Animated.View>

        {/* ===== SUMMIT MODE: TASKS BREAKDOWN ===== */}
        {params.focusMode === "summit" &&
          params.completedTasksData &&
          params.completedTasksData.length > 0 && (
            <Animated.View entering={FadeInUp.delay(360).duration(500)}>
              <View
                style={[
                  styles.card,
                  glassStyles.subtleCard(isDark),
                  { backgroundColor: theme.card },
                ]}
              >
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  Tasks Completed ({params.completedTasksData.length})
                </Text>

                {params.completedTasksData.map((taskData, index) => (
                  <StaggeredItem key={index} index={index} delay="fast">
                    <View
                      style={[
                        styles.taskItem,
                        {
                          backgroundColor: theme.surface2,
                          borderColor: theme.border,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.taskNumber, { color: theme.primary }]}
                      >
                        TASK {index + 1}
                      </Text>
                      <Text style={[styles.taskTitle, { color: theme.text }]}>
                        {taskData.task}
                      </Text>

                      <View style={styles.taskMetaRow}>
                        <MaterialIcons
                          name="subject"
                          size={15}
                          color={theme.textSecondary}
                        />
                        <Text
                          style={[
                            styles.taskMetaLabel,
                            { color: theme.textSecondary },
                          ]}
                        >
                          {taskData.subject}
                        </Text>
                        <MaterialIcons
                          name="schedule"
                          size={15}
                          color={theme.textSecondary}
                          style={{ marginLeft: 12 }}
                        />
                        <Text
                          style={[
                            styles.taskMetaLabel,
                            { color: theme.textSecondary },
                          ]}
                        >
                          {taskData.duration} min
                        </Text>
                      </View>

                      <View style={styles.taskMetaRow}>
                        <Text
                          style={[
                            styles.taskMetaLabel,
                            { color: theme.textSecondary, width: 80 },
                          ]}
                        >
                          Focus
                        </Text>
                        <View style={styles.starsContainer}>
                          {renderStars(taskData.focusRating)}
                        </View>
                      </View>

                      <View style={styles.taskMetaRow}>
                        <Text
                          style={[
                            styles.taskMetaLabel,
                            { color: theme.textSecondary, width: 80 },
                          ]}
                        >
                          Productivity
                        </Text>
                        <View style={styles.starsContainer}>
                          {renderStars(taskData.productivityRating)}
                        </View>
                      </View>

                      {taskData.notes ? (
                        <Text
                          style={[
                            styles.taskNotes,
                            {
                              color: theme.textSecondary,
                              borderTopColor: theme.border,
                            },
                          ]}
                        >
                          "{taskData.notes}"
                        </Text>
                      ) : null}
                    </View>
                  </StaggeredItem>
                ))}
              </View>
            </Animated.View>
          )}

        {/* ===== YOUR RATINGS ===== */}
        <Animated.View entering={FadeInUp.delay(420).duration(500)}>
          <View
            style={[
              styles.card,
              glassStyles.subtleCard(isDark),
              { backgroundColor: theme.card },
            ]}
          >
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              Your Ratings
            </Text>

            <View style={styles.ratingRow}>
              <Text
                style={[styles.ratingLabel, { color: theme.textSecondary }]}
              >
                Focus Quality
              </Text>
              <View style={styles.starsContainer}>
                {renderStars(params.focusRating)}
              </View>
              <Text
                style={[styles.ratingNumber, { color: theme.textSecondary }]}
              >
                {params.focusRating}/5
              </Text>
            </View>

            <View style={styles.ratingRow}>
              <Text
                style={[styles.ratingLabel, { color: theme.textSecondary }]}
              >
                Productivity
              </Text>
              <View style={styles.starsContainer}>
                {renderStars(params.productivity)}
              </View>
              <Text
                style={[styles.ratingNumber, { color: theme.textSecondary }]}
              >
                {params.productivity}/5
              </Text>
            </View>

            {params.notes ? (
              <View
                style={[
                  styles.notesSection,
                  { backgroundColor: theme.surface2 },
                ]}
              >
                <Text style={[styles.notesTitle, { color: theme.text }]}>
                  Your Notes
                </Text>
                <Text
                  style={[styles.notesText, { color: theme.textSecondary }]}
                >
                  "{params.notes}"
                </Text>
              </View>
            ) : null}
          </View>
        </Animated.View>

        {/* ===== NEW ACHIEVEMENTS ===== */}
        {newAchievements.length > 0 && (
          <Animated.View entering={FadeInUp.delay(480).duration(500)}>
            <View
              style={[
                styles.card,
                glassStyles.subtleCard(isDark),
                { backgroundColor: theme.card },
              ]}
            >
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                New Achievements
              </Text>
              <View style={styles.chipWrap}>
                {newAchievements.map((achievement) => (
                  <View
                    key={achievement.id}
                    style={[
                      styles.achievementChip,
                      { backgroundColor: achievement.color + "22" },
                    ]}
                  >
                    <MaterialIcons
                      name={achievement.icon}
                      size={16}
                      color={achievement.color}
                    />
                    <Text
                      style={[
                        styles.achievementChipText,
                        { color: achievement.color },
                      ]}
                    >
                      {achievement.title}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </Animated.View>
        )}

        {/* ===== MUSIC STATUS ===== */}
        {currentTrack && isPlaying && !isPreviewMode && (
          <View
            style={[
              styles.card,
              styles.musicContinuing,
              glassStyles.subtleCard(isDark),
              { backgroundColor: theme.card },
            ]}
          >
            <MaterialIcons name="music-note" size={20} color={theme.primary} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.musicTitle, { color: theme.text }]}>
                Music Continuing
              </Text>
              <Text style={[styles.musicText, { color: theme.textSecondary }]}>
                ♪ {currentTrack.displayName}
              </Text>
            </View>
            <TouchableOpacity
              onPress={stopPlayback}
              style={styles.musicStopBtn}
            >
              <Ionicons
                name="stop-circle-outline"
                size={22}
                color={theme.error ?? "#EF4444"}
              />
            </TouchableOpacity>
          </View>
        )}

        {/* ===== ACTION BUTTONS ===== */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
            activeOpacity={0.85}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate("Main", { screen: "FocusPreparation" });
            }}
          >
            <MaterialIcons name="refresh" size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>Start Another Session</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: theme.border }]}
            activeOpacity={0.85}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate("Main", { screen: "Results" });
            }}
          >
            <MaterialIcons name="analytics" size={20} color={theme.primary} />
            <Text style={[styles.secondaryBtnText, { color: theme.text }]}>
              View Analytics
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tertiaryBtn}
            activeOpacity={0.7}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate("Main", { screen: "Home" });
            }}
          >
            <Text
              style={[styles.tertiaryBtnText, { color: theme.textSecondary }]}
            >
              Back to Home
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },

  // Header
  topNavBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 56,
  },
  topNavTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  backButton: {
    padding: 4,
  },
  backButtonCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerSpacer: {
    width: 44,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  // Summary header
  summarySection: {
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 18,
  },
  summaryEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  summaryTitle: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 30,
    fontVariant: ["tabular-nums"],
  },
  summarySubtitle: {
    fontSize: 13,
    marginTop: 4,
  },

  // Hero
  heroWrapper: {
    marginBottom: 16,
  },
  heroGradient: {
    borderRadius: 24,
    padding: 18,
    overflow: "hidden",
  },
  heroHighlight: {
    position: "absolute",
    top: "-30%",
    left: "-10%",
    width: "70%",
    height: "120%",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 200,
  },
  heroContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  heroBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  heroInfo: {
    flex: 1,
  },
  heroEyebrow: {
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    fontWeight: "800",
    color: "#fff",
    opacity: 0.9,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: 2,
    color: "#fff",
    fontVariant: ["tabular-nums"],
    textShadowColor: "rgba(0,0,0,0.18)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  heroTitleOutOf: {
    fontSize: 16,
    fontWeight: "700",
    opacity: 0.85,
  },
  heroSubtitle: {
    fontSize: 12,
    marginTop: 2,
    color: "#fff",
    opacity: 0.92,
    fontWeight: "500",
  },

  // Cards
  card: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
  },
  ringCard: {
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
    marginBottom: 12,
  },
  cardEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    alignSelf: "flex-start",
  },

  // Stat rows (breakdown + details)
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  statLabel: {
    fontSize: 14,
    flex: 1,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    textAlign: "right",
    marginLeft: 8,
  },

  // Summit tasks
  taskItem: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  taskNumber: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 4,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },
  taskMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 6,
  },
  taskMetaLabel: {
    fontSize: 13,
  },
  taskNotes: {
    fontSize: 13,
    fontStyle: "italic",
    lineHeight: 18,
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
  },

  // Ratings
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  ratingLabel: {
    fontSize: 14,
    width: 90,
  },
  starsContainer: {
    flexDirection: "row",
    gap: 2,
    flex: 1,
    marginLeft: 8,
  },
  ratingNumber: {
    fontSize: 14,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    marginLeft: 8,
  },
  notesSection: {
    marginTop: 8,
    padding: 14,
    borderRadius: 12,
  },
  notesTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
  },
  notesText: {
    fontSize: 14,
    fontStyle: "italic",
    lineHeight: 20,
  },

  // Achievement chips
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  achievementChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  achievementChipText: {
    fontSize: 13,
    fontWeight: "700",
  },

  // Music
  musicContinuing: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  musicTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  musicText: {
    fontSize: 13,
    marginTop: 2,
  },
  musicStopBtn: {
    marginLeft: 12,
  },

  // Actions
  actionsContainer: {
    marginTop: 4,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 12,
    gap: 8,
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: "transparent",
    borderWidth: 1,
    marginBottom: 12,
    gap: 8,
  },
  secondaryBtnText: {
    fontWeight: "700",
    fontSize: 16,
  },
  tertiaryBtn: {
    alignItems: "center",
    paddingVertical: 12,
  },
  tertiaryBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
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
});

export default SessionReportScreen;
