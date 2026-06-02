import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../../context/ThemeContext";
import * as Haptics from "expo-haptics";
import InteractiveQuiz from "../../components/InteractiveQuiz";
import QuizResults from "../../components/QuizResults";
import { QuizResult } from "../../data/quizData";
import { useAuth } from "../../context/AuthContext";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import { useFocusAnimationKey } from "../../utils/animationUtils";
import { ShimmerLoader } from "../../components/premium/ShimmerLoader";
import { AnimatedButton } from "../../components/premium/AnimatedButton";
import { StaggeredItem } from "../../components/premium/StaggeredList";
import { glassStyles } from "../../components/premium/LiquidGlass";
import { Typography, Spacing, PremiumColors } from "../../theme/premiumTheme";
import {
  useQuizCategories,
  useQuizHistory,
  QuizCategory,
} from "../../hooks/useConvexQuiz";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

interface Quiz {
  id: string;
  slug: string;
  name: string;
  description: string;
  detail: string;
  progress: number;
  icon: string;
  color: string;
  estimatedTime: string;
  questions: number;
  hasResult: boolean;
  latestScore: number | null;
  completionCount: number;
  categoryId?: Id<"quizCategories">;
  inProgressSessionId?: Id<"quizSessions">;
  inProgressAnswered?: number;
  inProgressTotal?: number;
  inProgressMode?: "quick" | "in_depth";
}

// Fallback data if Convex is not available
const FALLBACK_QUIZ_DATA: Quiz[] = [
  {
    id: "1",
    slug: "study_habits",
    name: "Study Habits Quiz",
    description: "Assess your current study methods",
    detail:
      "This comprehensive quiz will help you identify your best and worst study habits, providing personalized recommendations to improve your learning efficiency and academic performance.",
    progress: 0,
    icon: "book-outline",
    color: "#2196F3",
    estimatedTime: "5-7 min",
    questions: 15,
    hasResult: false,
    latestScore: null,
    completionCount: 0,
  },
  {
    id: "2",
    slug: "focus_attention",
    name: "Focus & Attention Quiz",
    description: "Identify your optimal focus style",
    detail:
      "Discover your unique focus patterns and learn what environmental factors, techniques, and strategies help you concentrate best during study sessions.",
    progress: 0,
    icon: "radio-button-on-outline",
    color: "#F44336",
    estimatedTime: "4-6 min",
    questions: 15,
    hasResult: false,
    latestScore: null,
    completionCount: 0,
  },
  {
    id: "3",
    slug: "motivation",
    name: "Motivation Profile",
    description: "Understand what drives you",
    detail:
      "Uncover your main sources of motivation and learn how to leverage them effectively to maintain consistent study habits and achieve your academic goals.",
    progress: 0,
    icon: "heart-outline",
    color: "#FF9800",
    estimatedTime: "6-8 min",
    questions: 15,
    hasResult: false,
    latestScore: null,
    completionCount: 0,
  },
  {
    id: "4",
    slug: "learning_style",
    name: "Learning Style Quiz",
    description: "Discover how you learn best",
    detail:
      "Determine whether you're a visual, auditory, or kinesthetic learner, and get tailored study strategies that match your preferred learning style.",
    progress: 0,
    icon: "bulb-outline",
    color: "#4CAF50",
    estimatedTime: "5-7 min",
    questions: 15,
    hasResult: false,
    latestScore: null,
    completionCount: 0,
  },
  {
    id: "5",
    slug: "goal_setting",
    name: "Goal Setting & Planning",
    description: "Master your goal achievement",
    detail:
      "Evaluate your goal-setting strategies, planning skills, and ability to track progress toward your academic objectives.",
    progress: 0,
    icon: "flag-outline",
    color: "#9C27B0",
    estimatedTime: "5-7 min",
    questions: 15,
    hasResult: false,
    latestScore: null,
    completionCount: 0,
  },
  {
    id: "6",
    slug: "stress_anxiety",
    name: "Stress & Academic Anxiety",
    description: "Understand your stress patterns",
    detail:
      "Assess your stress responses, anxiety triggers, and coping mechanisms to develop healthier approaches to academic challenges.",
    progress: 0,
    icon: "fitness-outline",
    color: "#00BCD4",
    estimatedTime: "5-7 min",
    questions: 15,
    hasResult: false,
    latestScore: null,
    completionCount: 0,
  },
];

const SelfDiscoveryQuizScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const isDark = theme.isDark;
  const { user } = useAuth();
  const focusKey = useFocusAnimationKey();

  // Convex quiz data
  const { categories: convexCategories, isLoading: isLoadingConvex } =
    useQuizCategories();
  const inProgressSessions = useQuery(
    api.quizSessions.getAllInProgressSessions,
  );
  const { history: quizHistory } = useQuizHistory(undefined, 10);
  const abandonSessionMutation = useMutation(api.quizSessions.abandonSession);

  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [quizMode, setQuizMode] = useState<"quick" | "in_depth">("quick");
  const [resumeSessionId, setResumeSessionId] =
    useState<Id<"quizSessions"> | null>(null);

  // Transform Convex categories to Quiz format
  const quizData = useMemo((): Quiz[] => {
    if (!convexCategories || convexCategories.length === 0) {
      return FALLBACK_QUIZ_DATA;
    }

    // Map of category slugs to additional UI info
    const categoryUIMap: Record<
      string,
      { detail: string; estimatedTime: string }
    > = {
      study_habits: {
        detail:
          "This comprehensive quiz will help you identify your best and worst study habits, providing personalized recommendations to improve your learning efficiency and academic performance.",
        estimatedTime: "5-7 min",
      },
      learning_style: {
        detail:
          "Determine whether you're a visual, auditory, or kinesthetic learner, and get tailored study strategies that match your preferred learning style.",
        estimatedTime: "5-7 min",
      },
      motivation: {
        detail:
          "Uncover your main sources of motivation and learn how to leverage them effectively to maintain consistent study habits and achieve your academic goals.",
        estimatedTime: "6-8 min",
      },
      focus_attention: {
        detail:
          "Discover your unique focus patterns and learn what environmental factors, techniques, and strategies help you concentrate best during study sessions.",
        estimatedTime: "4-6 min",
      },
      goal_setting: {
        detail:
          "Evaluate your goal-setting strategies, planning skills, and ability to track progress toward your academic objectives.",
        estimatedTime: "5-7 min",
      },
      stress_anxiety: {
        detail:
          "Assess your stress responses, anxiety triggers, and coping mechanisms to develop healthier approaches to academic challenges.",
        estimatedTime: "5-7 min",
      },
    };

    return convexCategories
      .filter((cat) => cat.isActive)
      .sort((a, b) => a.order - b.order)
      .map((cat) => {
        // Check for in-progress session for this category
        const inProgress = inProgressSessions?.find(
          (s) => s.categoryId === cat._id,
        );

        let progress = cat.hasResult ? 1.0 : 0.0;
        if (inProgress) {
          progress = inProgress.answeredCount / inProgress.questionsCount;
        }

        return {
          id: cat._id,
          slug: cat.slug,
          name: cat.name,
          description: cat.description,
          detail: categoryUIMap[cat.slug]?.detail || cat.description,
          progress,
          icon: cat.icon,
          color: cat.color,
          estimatedTime: categoryUIMap[cat.slug]?.estimatedTime || "5-7 min",
          questions: inProgress ? inProgress.questionsCount : 15,
          hasResult: cat.hasResult,
          latestScore: cat.latestScore,
          completionCount: cat.completionCount,
          categoryId: cat._id,
          inProgressSessionId: inProgress?._id,
          inProgressAnswered: inProgress?.answeredCount,
          inProgressTotal: inProgress?.questionsCount,
          inProgressMode: inProgress
            ? inProgress.questionsCount <= 15
              ? "quick"
              : "in_depth"
            : undefined,
        };
      });
  }, [convexCategories, inProgressSessions]);

  const isLoading = isLoadingConvex;

  const openQuizDetail = (quiz: Quiz) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedQuiz(quiz);
    // Auto-set mode if there's an in-progress session
    if (quiz.inProgressMode) {
      setQuizMode(quiz.inProgressMode);
    }
    setModalVisible(true);
  };

  const closeDetail = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setModalVisible(false);
    setSelectedQuiz(null);
  };

  const startQuiz = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selectedQuiz?.inProgressSessionId) {
      setResumeSessionId(selectedQuiz.inProgressSessionId);
      // Lock to original mode
      if (selectedQuiz.inProgressMode) {
        setQuizMode(selectedQuiz.inProgressMode);
      }
    } else {
      setResumeSessionId(null);
    }
    // Don't call closeDetail() - it clears selectedQuiz which breaks the quiz render condition
    setModalVisible(false);
    setShowQuiz(true);
  };

  const handleStartOver = async () => {
    if (selectedQuiz?.inProgressSessionId) {
      try {
        await abandonSessionMutation({
          sessionId: selectedQuiz.inProgressSessionId,
        });
      } catch (error) {
        // Error abandoning session
      }
    }
    setResumeSessionId(null);
    setModalVisible(false);
    setShowQuiz(true);
  };

  // Switch quiz length when an in-progress session exists. Confirms before discarding the
  // session so users aren't permanently locked into the mode they originally started.
  const handleSwitchMode = (target: "quick" | "in_depth") => {
    if (!selectedQuiz) return;
    if (target === quizMode) return;

    if (selectedQuiz.inProgressSessionId) {
      const { Alert } = require("react-native");
      Alert.alert(
        "Switch Quiz Length?",
        `Switching will discard your in-progress ${selectedQuiz.inProgressMode === "quick" ? "Quick" : "In-Depth"} session. Continue?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Switch",
            style: "destructive",
            onPress: async () => {
              try {
                await abandonSessionMutation({
                  sessionId: selectedQuiz.inProgressSessionId!,
                });
              } catch (error) {
                // Error abandoning session
              }
              setQuizMode(target);
            },
          },
        ],
      );
    } else {
      setQuizMode(target);
    }
  };

  const handleQuizComplete = (result: QuizResult) => {
    setQuizResult(result);
    setShowQuiz(false);
    setShowResults(true);
  };

  const handleCloseQuiz = () => {
    setShowQuiz(false);
    setSelectedQuiz(null);
  };

  const handleCloseResults = () => {
    setShowResults(false);
    setQuizResult(null);
    setSelectedQuiz(null);
    // Convex queries auto-refresh, no manual reload needed
  };

  const handleRetakeQuiz = () => {
    setShowResults(false);
    setQuizResult(null);
    setShowQuiz(true);
  };

  const handleViewHistoryResult = (historyItem: any) => {
    // Transform Convex history item to QuizResult format for viewing
    const categorySlug = historyItem.category?.slug || "study_habits";
    const result: QuizResult = {
      quizId: categorySlug,
      score: historyItem.overallScore ?? 0,
      category:
        historyItem.traitProfile?.primaryTrait ||
        historyItem.dominantTrait ||
        "",
      description: historyItem.traitProfile?.profileDescription || "",
      recommendations:
        historyItem.areasForGrowth?.flatMap((a: any) => a.recommendations) ||
        [],
      completedAt: new Date(historyItem.completedAt || Date.now()),
      convexResultId: historyItem._id,
      subDimensionScores: historyItem.subDimensionScores,
      strengths: historyItem.strengths,
      areasForGrowth: historyItem.areasForGrowth,
      traitProfile: historyItem.traitProfile,
      percentileRank: historyItem.percentileRank,
    };
    setQuizResult(result);
    setShowResults(true);
  };

  const getQuizType = (quiz: Quiz): string => {
    // If it's a Convex quiz, use the slug directly
    if (quiz.slug) {
      return quiz.slug;
    }
    // Fallback for legacy quiz IDs
    const legacyMap: Record<string, string> = {
      "1": "study_habits",
      "2": "focus_attention",
      "3": "motivation",
      "4": "learning_style",
      "5": "goal_setting",
      "6": "stress_anxiety",
    };
    return legacyMap[quiz.id] || "study_habits";
  };

  const getProgressColor = (progress: number) => {
    if (progress === 1.0) return "#4CAF50";
    if (progress > 0.5) return "#FF9800";
    return theme.primary;
  };

  // Show quiz interface if quiz is active
  if (showQuiz && selectedQuiz) {
    return (
      <InteractiveQuiz
        quizType={getQuizType(selectedQuiz)}
        categorySlug={selectedQuiz.slug}
        categoryId={selectedQuiz.categoryId}
        questionsCount={quizMode === "quick" ? 15 : 25}
        onComplete={handleQuizComplete}
        onClose={handleCloseQuiz}
        existingSessionId={resumeSessionId ?? undefined}
        isResuming={!!resumeSessionId}
      />
    );
  }

  // Show results if quiz is completed
  if (showResults && quizResult) {
    return (
      <QuizResults
        result={quizResult}
        onRetake={handleRetakeQuiz}
        onClose={handleCloseResults}
      />
    );
  }

  // Shimmer loading state
  if (isLoading) {
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
            Self-Discovery
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContent}>
          <ShimmerLoader
            variant="text"
            width={280}
            height={16}
            style={{ marginBottom: 8, marginHorizontal: 16 }}
          />
          <ShimmerLoader
            variant="text"
            width={200}
            height={16}
            style={{ marginBottom: 24, marginHorizontal: 16 }}
          />
          <ShimmerLoader
            variant="text"
            width={140}
            height={14}
            style={{ marginBottom: 16, marginHorizontal: 16 }}
          />
          <ShimmerLoader
            variant="card"
            height={180}
            style={{ marginBottom: 16, marginHorizontal: 16, borderRadius: 14 }}
          />
          <ShimmerLoader
            variant="card"
            height={180}
            style={{ marginBottom: 16, marginHorizontal: 16, borderRadius: 14 }}
          />
          <ShimmerLoader
            variant="card"
            height={180}
            style={{ marginBottom: 16, marginHorizontal: 16, borderRadius: 14 }}
          />
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
          Self-Discovery
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        key={focusKey}
        data={quizData}
        keyExtractor={(item) => item.id}
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* ===== SECTION LABEL ===== */}
            <Animated.View entering={FadeIn.delay(100).duration(400)}>
              <Text
                style={[styles.sectionLabel, { color: theme.textSecondary }]}
              >
                AVAILABLE QUIZZES
              </Text>
            </Animated.View>
          </>
        }
        ListFooterComponent={
          quizHistory && quizHistory.length > 0 ? (
            <Animated.View entering={FadeInUp.delay(300).duration(400)}>
              <Text
                style={[
                  styles.sectionLabel,
                  { color: theme.textSecondary, marginTop: 32 },
                ]}
              >
                QUIZ HISTORY
              </Text>
              {quizHistory.map((item: any, index: number) => {
                const categoryIcon =
                  quizData.find((q) => q.slug === item.categorySlug)?.icon ||
                  "document-outline";
                const categoryColor =
                  quizData.find((q) => q.slug === item.categorySlug)?.color ||
                  theme.primary;
                const categoryName =
                  quizData.find((q) => q.slug === item.categorySlug)?.name ||
                  item.categorySlug;
                const completedDate = item.completedAt
                  ? new Date(item.completedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "";
                const scorePercent =
                  item.overallScore != null
                    ? Math.round(item.overallScore)
                    : null;

                return (
                  <TouchableOpacity
                    key={item._id || index}
                    style={[
                      styles.historyItem,
                      { backgroundColor: theme.card },
                    ]}
                    onPress={() => handleViewHistoryResult(item)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.historyIcon,
                        { backgroundColor: categoryColor + "15" },
                      ]}
                    >
                      <Ionicons
                        name={categoryIcon as any}
                        size={22}
                        color={categoryColor}
                      />
                    </View>
                    <View style={styles.historyContent}>
                      <Text
                        style={[styles.historyTitle, { color: theme.text }]}
                      >
                        {categoryName}
                      </Text>
                      <Text
                        style={[
                          styles.historyDate,
                          { color: theme.textSecondary },
                        ]}
                      >
                        {completedDate}
                      </Text>
                    </View>
                    {scorePercent != null && (
                      <Text
                        style={[
                          styles.historyScore,
                          { color: getProgressColor(scorePercent / 100) },
                        ]}
                      >
                        {scorePercent}%
                      </Text>
                    )}
                    <Ionicons
                      name="chevron-forward-outline"
                      size={18}
                      color={theme.textSecondary}
                    />
                  </TouchableOpacity>
                );
              })}
            </Animated.View>
          ) : null
        }
        renderItem={({ item, index }) => (
          <StaggeredItem
            key={item.id}
            index={index}
            delay="normal"
            direction="up"
          >
            <TouchableOpacity
              style={[
                styles.quizCard,
                glassStyles.subtleCard(isDark),
                { backgroundColor: theme.card },
              ]}
              onPress={() => openQuizDetail(item)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: item.color + "15" },
                ]}
              >
                <Ionicons
                  name={item.icon as any}
                  size={32}
                  color={item.color}
                />
              </View>

              <View style={styles.quizContent}>
                <View style={styles.quizHeader}>
                  <Text style={[styles.quizTitle, { color: theme.text }]}>
                    {item.name}
                  </Text>
                  <Ionicons
                    name="chevron-forward-outline"
                    size={20}
                    color={theme.textSecondary}
                  />
                </View>

                <Text
                  style={[
                    styles.quizDescription,
                    { color: theme.textSecondary },
                  ]}
                >
                  {item.description}
                </Text>

                <View style={styles.quizMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons
                      name="time-outline"
                      size={14}
                      color={theme.textSecondary}
                    />
                    <Text
                      style={[styles.metaText, { color: theme.textSecondary }]}
                    >
                      {item.estimatedTime}
                    </Text>
                  </View>
                  {item.inProgressSessionId ? (
                    <View style={styles.metaItem}>
                      <Ionicons
                        name="play-circle-outline"
                        size={14}
                        color={theme.primary}
                      />
                      <Text
                        style={[
                          styles.metaText,
                          { color: theme.primary, fontWeight: "600" },
                        ]}
                      >
                        {item.inProgressAnswered}/{item.inProgressTotal}{" "}
                        answered
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.metaItem}>
                      <Ionicons
                        name="help-circle-outline"
                        size={14}
                        color={theme.textSecondary}
                      />
                      <Text
                        style={[
                          styles.metaText,
                          { color: theme.textSecondary },
                        ]}
                      >
                        {item.questions} questions
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.progressContainer}>
                  <View style={styles.progressInfo}>
                    <Text
                      style={[
                        styles.progressLabel,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Progress
                    </Text>
                    <Text
                      style={[
                        styles.progressValue,
                        { color: getProgressColor(item.progress) },
                      ]}
                    >
                      {Math.round(item.progress * 100)}%
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.progressBarBackground,
                      { backgroundColor: theme.text + "15" },
                    ]}
                  >
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${item.progress * 100}%`,
                          backgroundColor: getProgressColor(item.progress),
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </StaggeredItem>
        )}
      />

      {/* ===== QUIZ DETAIL MODAL ===== */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeDetail}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            {selectedQuiz && (
              <>
                <View style={styles.modalHeader}>
                  <View
                    style={[
                      styles.modalIcon,
                      { backgroundColor: selectedQuiz.color + "15" },
                    ]}
                  >
                    <Ionicons
                      name={selectedQuiz.icon as any}
                      size={40}
                      color={selectedQuiz.color}
                    />
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.closeButton,
                      { backgroundColor: theme.text + "15" },
                    ]}
                    onPress={closeDetail}
                  >
                    <Ionicons
                      name="close-outline"
                      size={24}
                      color={theme.text}
                    />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  {selectedQuiz.name}
                </Text>
                <Text
                  style={[
                    styles.modalDescription,
                    { color: theme.textSecondary },
                  ]}
                >
                  {selectedQuiz.detail}
                </Text>

                {/* Quiz Mode Selector */}
                <View style={styles.modeSelector}>
                  <Text
                    style={[styles.modeSelectorLabel, { color: theme.text }]}
                  >
                    Quiz Length
                  </Text>
                  <View style={styles.modeButtons}>
                    <TouchableOpacity
                      style={[
                        styles.modeButton,
                        quizMode === "quick" && {
                          backgroundColor: theme.primary + "20",
                          borderColor: theme.primary,
                        },
                      ]}
                      onPress={() => handleSwitchMode("quick")}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="flash-outline"
                        size={20}
                        color={
                          quizMode === "quick"
                            ? theme.primary
                            : theme.textSecondary
                        }
                      />
                      <Text
                        style={[
                          styles.modeButtonTitle,
                          {
                            color:
                              quizMode === "quick" ? theme.primary : theme.text,
                          },
                        ]}
                      >
                        Quick
                      </Text>
                      <Text
                        style={[
                          styles.modeButtonDetail,
                          { color: theme.textSecondary },
                        ]}
                      >
                        15 questions
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.modeButton,
                        quizMode === "in_depth" && {
                          backgroundColor: theme.primary + "20",
                          borderColor: theme.primary,
                        },
                      ]}
                      onPress={() => handleSwitchMode("in_depth")}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="analytics-outline"
                        size={20}
                        color={
                          quizMode === "in_depth"
                            ? theme.primary
                            : theme.textSecondary
                        }
                      />
                      <Text
                        style={[
                          styles.modeButtonTitle,
                          {
                            color:
                              quizMode === "in_depth"
                                ? theme.primary
                                : theme.text,
                          },
                        ]}
                      >
                        In-Depth
                      </Text>
                      <Text
                        style={[
                          styles.modeButtonDetail,
                          { color: theme.textSecondary },
                        ]}
                      >
                        25 questions
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.modalMeta}>
                  <View style={styles.modalMetaItem}>
                    <Ionicons
                      name="time-outline"
                      size={18}
                      color={theme.textSecondary}
                    />
                    <Text
                      style={[
                        styles.modalMetaText,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {quizMode === "quick" ? "5-7 min" : "10-12 min"}
                    </Text>
                  </View>
                  <View style={styles.modalMetaItem}>
                    <Ionicons
                      name="help-circle-outline"
                      size={18}
                      color={theme.textSecondary}
                    />
                    <Text
                      style={[
                        styles.modalMetaText,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {quizMode === "quick" ? 15 : 25} questions
                    </Text>
                  </View>
                </View>

                <View style={styles.modalProgress}>
                  <Text
                    style={[
                      styles.modalProgressLabel,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {selectedQuiz.inProgressSessionId
                      ? `${selectedQuiz.inProgressAnswered} of ${selectedQuiz.inProgressTotal} questions answered`
                      : selectedQuiz.hasResult
                        ? `Completed ${selectedQuiz.completionCount} time${selectedQuiz.completionCount !== 1 ? "s" : ""}`
                        : "Not started yet"}
                  </Text>
                  {(selectedQuiz.inProgressSessionId ||
                    selectedQuiz.hasResult) && (
                    <View
                      style={[
                        styles.modalProgressBar,
                        { backgroundColor: theme.text + "20" },
                      ]}
                    >
                      <View
                        style={[
                          styles.modalProgressFill,
                          {
                            width: `${selectedQuiz.progress * 100}%`,
                            backgroundColor: getProgressColor(
                              selectedQuiz.progress,
                            ),
                          },
                        ]}
                      />
                    </View>
                  )}
                </View>

                <AnimatedButton
                  title={
                    selectedQuiz.inProgressSessionId
                      ? "Continue Quiz"
                      : selectedQuiz.hasResult
                        ? "Retake Quiz"
                        : "Start Quiz"
                  }
                  onPress={startQuiz}
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
                />

                {selectedQuiz.inProgressSessionId && (
                  <TouchableOpacity
                    style={styles.startOverButton}
                    onPress={handleStartOver}
                  >
                    <Text
                      style={[
                        styles.startOverText,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Start Over Instead
                    </Text>
                  </TouchableOpacity>
                )}
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
    paddingTop: 16,
  },

  // ===== SCROLL =====
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },

  // ===== SECTION LABEL =====
  sectionLabel: {
    ...Typography.label,
    marginTop: 24,
    marginBottom: 14,
  },

  // ===== QUIZ CARDS =====
  quizCard: {
    borderRadius: 14,
    padding: 20,
    marginBottom: 14,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  quizContent: {
    flex: 1,
  },
  quizHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  quizTitle: {
    fontSize: 17,
    fontWeight: "700",
    flex: 1,
  },
  quizDescription: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  quizMeta: {
    flexDirection: "row",
    marginBottom: 14,
    gap: 16,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: "500",
  },
  progressContainer: {
    marginTop: 4,
  },
  progressInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  progressValue: {
    fontSize: 12,
    fontWeight: "700",
  },
  progressBarBackground: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },

  // ===== MODAL =====
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 10,
    textAlign: "center",
  },
  modalDescription: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 24,
  },
  // Mode Selector
  modeSelector: {
    marginBottom: 20,
  },
  modeSelectorLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  modeButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modeButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "transparent",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.03)",
  },
  modeButtonTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 6,
  },
  modeButtonDetail: {
    fontSize: 12,
    marginTop: 2,
  },
  modalMeta: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 24,
    gap: 24,
  },
  modalMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  modalMetaText: {
    fontSize: 14,
  },
  modalProgress: {
    marginBottom: 28,
  },
  modalProgressLabel: {
    fontSize: 13,
    marginBottom: 8,
    textAlign: "center",
  },
  modalProgressBar: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  modalProgressFill: {
    height: "100%",
    borderRadius: 4,
  },

  // ===== START OVER =====
  startOverButton: {
    alignItems: "center",
    marginTop: 14,
    paddingVertical: 8,
  },
  startOverText: {
    fontSize: 14,
    fontWeight: "500",
    textDecorationLine: "underline",
  },

  // ===== QUIZ HISTORY =====
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  historyContent: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  historyDate: {
    fontSize: 12,
    marginTop: 2,
  },
  historyScore: {
    fontSize: 16,
    fontWeight: "700",
    marginRight: 8,
  },
});

export default SelfDiscoveryQuizScreen;
