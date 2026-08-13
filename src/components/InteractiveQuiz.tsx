import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import {
  QuizQuestion as LegacyQuizQuestion,
  QuizResult,
  STUDY_HABITS_QUESTIONS,
  LEARNING_STYLE_QUESTIONS,
  MOTIVATION_PROFILE_QUESTIONS,
  FOCUS_TYPE_QUESTIONS,
  STUDY_HABITS_RESULTS,
  LEARNING_STYLE_RESULTS,
  MOTIVATION_PROFILE_RESULTS,
  FOCUS_TYPE_RESULTS,
} from "../data/quizData";
import {
  saveQuizResultLocally,
  saveQuizResultToDatabase,
} from "../utils/quizStorage";
import { recordQuizCompletion } from "../utils/achievementManager";
import { useAuth } from "../context/AuthContext";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

// Convex question type
interface ConvexQuizQuestion {
  _id: Id<"quizQuestions">;
  questionId: string;
  questionText: string;
  questionFormat: string;
  options: Array<{
    value: number;
    label: string;
    scoringWeight?: number;
  }>;
  weight: number;
  difficulty: number;
  subDimensionId: Id<"quizSubDimensions">;
  categoryId: Id<"quizCategories">;
  isReversed?: boolean;
}

interface FailedAnswer {
  sessionId: Id<"quizSessions">;
  questionId: Id<"quizQuestions">;
  selectedValue: number;
  responseTimeMs: number;
}

interface InteractiveQuizProps {
  quizType: string;
  categorySlug?: string;
  categoryId?: Id<"quizCategories">;
  questionsCount?: number; // 15 for quick, 25 for in-depth
  onComplete: (result: QuizResult) => void;
  onClose: () => void;
  existingSessionId?: Id<"quizSessions">; // Pass to resume an in-progress session
  isResuming?: boolean;
}

const InteractiveQuiz: React.FC<InteractiveQuizProps> = ({
  quizType,
  categorySlug,
  categoryId,
  questionsCount = 15,
  onComplete,
  onClose,
  existingSessionId,
  isResuming,
}) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: number }>({});
  const [quizQuestions, setQuizQuestions] = useState<
    (LegacyQuizQuestion | ConvexQuizQuestion)[]
  >([]);
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [questionStartTime, setQuestionStartTime] = useState<Date>(new Date());
  const [showExitModal, setShowExitModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [sessionId, setSessionId] = useState<Id<"quizSessions"> | null>(null);
  const [useConvex, setUseConvex] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [failedAnswers, setFailedAnswers] = useState<FailedAnswer[]>([]);
  const [isRetryingAnswers, setIsRetryingAnswers] = useState(false);

  // Convex mutations
  const startSessionMutation = useMutation(api.quizSessions.startSession);
  const submitAnswerMutation = useMutation(api.quizSessions.submitAnswer);
  const completeSessionMutation = useMutation(api.quizSessions.completeSession);
  const abandonSessionMutation = useMutation(api.quizSessions.abandonSession);

  // Query for existing session data (only when resuming)
  const existingSessionData = useQuery(
    api.quizSessions.getSessionWithQuestions,
    existingSessionId ? { sessionId: existingSessionId } : "skip",
  );

  // Query for random questions from Convex (skip when resuming — use stored questions instead)
  const convexQuestions = useQuery(
    api.quizQuestions.getRandomQuestionsForSession,
    categorySlug && !existingSessionId
      ? {
          categorySlug,
          educationLevel: "college",
          questionsCount,
          sessionType: "full",
        }
      : "skip",
  );

  // Initialize quiz — resume path or fresh path
  useEffect(() => {
    // RESUME PATH: Restore from existing session
    if (existingSessionId && existingSessionData) {
      setUseConvex(true);
      setSessionId(existingSessionId);
      setQuizQuestions(existingSessionData.questions as any[]);
      setStartTime(new Date(existingSessionData.session.startedAt));
      setQuestionStartTime(new Date());

      // Restore answers from existing responses
      const restoredAnswers: { [key: string]: number } = {};
      let firstUnansweredIndex = existingSessionData.questions.length;

      existingSessionData.questions.forEach((q: any, index: number) => {
        if (q.response) {
          restoredAnswers[q._id] = q.response.selectedValue;
        } else if (index < firstUnansweredIndex) {
          firstUnansweredIndex = index;
        }
      });

      setAnswers(restoredAnswers);
      setCurrentQuestionIndex(firstUnansweredIndex);
      setIsInitializing(false);
      return;
    }

    // Still waiting for resume data to load
    if (existingSessionId && existingSessionData === undefined) {
      return;
    }

    // FRESH PATH: Don't initialize until Convex query is resolved
    if (categorySlug && !existingSessionId && convexQuestions === undefined) {
      return;
    }

    const initializeLegacyQuiz = () => {
      let allQuestions: LegacyQuizQuestion[] = [];
      switch (quizType) {
        case "study_habits":
          allQuestions = STUDY_HABITS_QUESTIONS;
          break;
        case "learning_style":
          allQuestions = LEARNING_STYLE_QUESTIONS;
          break;
        case "motivation_profile":
        case "motivation":
          allQuestions = MOTIVATION_PROFILE_QUESTIONS;
          break;
        case "focus_type":
        case "focus_attention":
          allQuestions = FOCUS_TYPE_QUESTIONS;
          break;
        default:
          allQuestions = STUDY_HABITS_QUESTIONS;
      }
      const shuffled = [...allQuestions].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, questionsCount);
      setQuizQuestions(selected);
    };

    const initializeQuiz = async () => {
      setIsInitializing(true);
      setStartTime(new Date());
      setQuestionStartTime(new Date());

      // Check if we can use Convex
      if (categorySlug && convexQuestions && convexQuestions.length > 0) {
        setUseConvex(true);
        setQuizQuestions(convexQuestions);

        // Start Convex session
        try {
          const session = await startSessionMutation({
            categorySlug,
            sessionType: "full",
            educationLevel: "college",
            questionsCount: convexQuestions.length,
            questionIds: convexQuestions.map((q) => q._id),
          });
          setSessionId(session.sessionId);
        } catch (error) {
          // Fall back to legacy mode on session start failure
          // Fall back to legacy mode
          setUseConvex(false);
          initializeLegacyQuiz();
        }
      } else {
        // Use legacy mode
        setUseConvex(false);
        initializeLegacyQuiz();
      }

      setIsInitializing(false);
    };

    initializeQuiz();
  }, [
    quizType,
    categorySlug,
    convexQuestions,
    existingSessionId,
    existingSessionData,
  ]);

  const currentQuestion = quizQuestions[currentQuestionIndex];
  // Progress based on ANSWERED questions, not current index
  const progress =
    quizQuestions.length > 0
      ? (Object.keys(answers).length / quizQuestions.length) * 100
      : 0;

  // Get question ID (works for both legacy and Convex questions)
  const getQuestionId = (
    question: LegacyQuizQuestion | ConvexQuizQuestion,
  ): string => {
    if ("_id" in question) {
      return question._id;
    }
    return question.id;
  };

  // Get question text
  const getQuestionText = (
    question: LegacyQuizQuestion | ConvexQuizQuestion,
  ): string => {
    if ("questionText" in question) {
      return question.questionText;
    }
    return question.question;
  };

  // Get options for the question
  const getOptions = (
    question: LegacyQuizQuestion | ConvexQuizQuestion,
  ): string[] => {
    if ("questionFormat" in question && question.options) {
      return question.options.map((opt) => opt.label);
    }
    return (question as LegacyQuizQuestion).options;
  };

  // Submits an answer to Convex, retrying once automatically. If the retry
  // also fails, the answer is tracked in `failedAnswers` so the UI can show
  // a visible banner and let the user retry manually — a `quizResponses`
  // row that never gets written otherwise makes `completeSession` silently
  // default that sub-dimension's score to 50 with no indication to the user.
  const submitAnswerToConvex = useCallback(
    async (answer: FailedAnswer, isRetryAttempt = false) => {
      try {
        await submitAnswerMutation(answer);
        if (isRetryAttempt) {
          setFailedAnswers((prev) =>
            prev.filter((a) => a.questionId !== answer.questionId),
          );
        }
      } catch (error) {
        if (!isRetryAttempt) {
          await submitAnswerToConvex(answer, true);
          return;
        }
        setFailedAnswers((prev) => [
          ...prev.filter((a) => a.questionId !== answer.questionId),
          answer,
        ]);
      }
    },
    [submitAnswerMutation],
  );

  const retryFailedAnswers = useCallback(async () => {
    if (failedAnswers.length === 0 || isRetryingAnswers) return;
    setIsRetryingAnswers(true);
    await Promise.all(
      failedAnswers.map((answer) => submitAnswerToConvex(answer, true)),
    );
    setIsRetryingAnswers(false);
  }, [failedAnswers, isRetryingAnswers, submitAnswerToConvex]);

  const handleAnswer = (optionIndex: number) => {
    if (!currentQuestion) return;

    const questionId = getQuestionId(currentQuestion);
    const responseTimeMs = Date.now() - questionStartTime.getTime();

    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));

    // Submit to Convex in the background — don't block UI advancement.
    // Failures are retried once and, if still failing, surfaced via the
    // failedAnswers banner instead of being swallowed.
    if (useConvex && sessionId && "_id" in currentQuestion) {
      submitAnswerToConvex({
        sessionId,
        questionId: currentQuestion._id,
        selectedValue: optionIndex,
        responseTimeMs,
      });
    }

    // Auto-advance after brief selection feedback
    setTimeout(() => {
      if (currentQuestionIndex < quizQuestions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
        setQuestionStartTime(new Date());
      } else {
        completeQuiz();
      }
    }, 300);
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const completeQuiz = async () => {
    if (isSaving) return;

    // Don't let the quiz silently finish with answers that never made it to
    // Convex — those sub-dimensions would score as a default "middle" (50)
    // with no indication anything went wrong. Give the user a chance to
    // retry before we score around the gap.
    if (useConvex && failedAnswers.length > 0) {
      Alert.alert(
        "Some answers didn't save",
        `${failedAnswers.length} of your answers failed to save and would be scored as neutral if you finish now. Retry saving them first?`,
        [
          { text: "Finish Anyway", style: "destructive", onPress: finishQuiz },
          { text: "Retry Saving", onPress: retryFailedAnswers },
        ],
      );
      return;
    }

    await finishQuiz();
  };

  const finishQuiz = async () => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      let result: QuizResult;

      if (useConvex && sessionId) {
        // Complete Convex session and get results
        const convexResult = await completeSessionMutation({ sessionId });

        // Transform Convex result to QuizResult format
        if (!convexResult.result) {
          throw new Error("Quiz result was null");
        }
        const convexRes = convexResult.result;
        result = {
          quizId: categorySlug || quizType,
          score: Math.round(convexRes.overallScore),
          category: convexRes.dominantTrait,
          description: convexRes.traitProfile.profileDescription,
          recommendations: convexRes.areasForGrowth.flatMap(
            (area) => area.recommendations,
          ),
          completedAt: new Date(convexRes.completedAt),
          // Extended data from Convex
          convexResultId: convexRes._id,
          subDimensionScores: convexRes.subDimensionScores,
          strengths: convexRes.strengths,
          areasForGrowth: convexRes.areasForGrowth,
          traitProfile: convexRes.traitProfile,
          percentileRank: convexRes.percentileRank,
        };
      } else {
        // Legacy mode
        result = calculateResults();

        // Save quiz result locally and to database
        if (user?.id) {
          await saveQuizResultLocally(result, user.id);
          await saveQuizResultToDatabase(result, user.id);

          // Record achievement progress
          const newBadges = await recordQuizCompletion(user.id);

          // Log achievement notifications (they're handled by the achievement manager)
          // Achievement notifications are handled by the achievement manager
        }
      }

      onComplete(result);
    } catch (error) {
      // Error completing quiz
      Alert.alert("Error", "Failed to save quiz results. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const calculateResults = (): QuizResult => {
    const categoryScores: {
      [key: string]: { total: number; count: number; weighted: number };
    } = {};

    // Initialize categories based on quiz type
    let categories;
    switch (quizType) {
      case "study_habits":
        categories = STUDY_HABITS_RESULTS.categories;
        break;
      case "learning_style":
        categories = LEARNING_STYLE_RESULTS.categories;
        break;
      case "motivation_profile":
        categories = MOTIVATION_PROFILE_RESULTS.categories;
        break;
      case "focus_type":
        categories = FOCUS_TYPE_RESULTS.categories;
        break;
      default:
        categories = STUDY_HABITS_RESULTS.categories;
    }

    Object.keys(categories).forEach((cat) => {
      categoryScores[cat] = { total: 0, count: 0, weighted: 0 };
    });

    // Calculate scores for each category
    quizQuestions.forEach((question) => {
      const q = question as any;
      const answer = answers[q.id];
      if (answer !== undefined) {
        const score = answer; // 0-4 scale
        const weightedScore = score * q.weight;

        if (categoryScores[q.category]) {
          categoryScores[q.category].total += score;
          categoryScores[q.category].count += 1;
          categoryScores[q.category].weighted += weightedScore;
        }
      }
    });

    // Find dominant category and calculate overall score
    let dominantCategory = "";
    let highestScore = 0;
    let totalWeightedScore = 0;
    let totalPossibleScore = 0;

    Object.entries(categoryScores).forEach(([category, scores]) => {
      if (scores.count > 0) {
        const avgScore = scores.total / scores.count;
        if (avgScore > highestScore) {
          highestScore = avgScore;
          dominantCategory = category;
        }
        totalWeightedScore += scores.weighted;
        totalPossibleScore +=
          scores.count *
            4 *
            (quizQuestions.find((q) => (q as any).category === category) as any)
              ?.weight || 1;
      }
    });

    const overallScore = Math.round(
      (totalWeightedScore / totalPossibleScore) * 100,
    );

    return {
      quizId: quizType,
      score: overallScore,
      category: dominantCategory,
      description: generateDescription(
        dominantCategory,
        overallScore,
        quizType,
      ),
      recommendations: generateRecommendations(
        dominantCategory,
        categoryScores,
        quizType,
      ),
      completedAt: new Date(),
    };
  };

  const generateDescription = (
    category: string,
    score: number,
    type: string,
  ): string => {
    if (type === "study_habits") {
      const descriptions = {
        time_management:
          score > 75
            ? "You excel at managing your study time effectively!"
            : score > 50
              ? "You have good time management skills with room for improvement."
              : "Time management is an area where you can significantly improve.",
        environment:
          score > 75
            ? "You've mastered creating optimal study environments!"
            : score > 50
              ? "You understand the importance of your study environment."
              : "Your study environment could be optimized for better focus.",
        information_processing:
          score > 75
            ? "You're excellent at processing and retaining information!"
            : score > 50
              ? "You have solid information processing skills."
              : "There are opportunities to improve how you process information.",
        motivation:
          score > 75
            ? "You have strong motivation and focus habits!"
            : score > 50
              ? "Your motivation is good but could be more consistent."
              : "Building better motivation strategies could transform your studying.",
        technology:
          score > 75
            ? "You effectively integrate technology into your learning!"
            : score > 50
              ? "You use technology reasonably well for studying."
              : "You could benefit from better technology integration.",
        learning_strategies:
          score > 75
            ? "You employ highly effective learning strategies!"
            : score > 50
              ? "You use some good learning strategies."
              : "Learning new study strategies could greatly help you.",
        self_assessment:
          score > 75
            ? "You're excellent at self-reflection and improvement!"
            : score > 50
              ? "You have decent self-awareness about your learning."
              : "Developing better self-assessment skills could accelerate your growth.",
      };
      return (
        descriptions[category as keyof typeof descriptions] ||
        "Results calculated successfully."
      );
    } else {
      const descriptions = {
        visual:
          "You learn best through visual information - charts, diagrams, and seeing concepts in action!",
        auditory:
          "You're an auditory learner - you process information best through listening and verbal discussion!",
        kinesthetic:
          "You're a kinesthetic learner - hands-on experience and movement help you learn best!",
        reading_writing:
          "You learn best through reading and writing - text-based learning is your strength!",
        social:
          "You're a social learner - you thrive when learning with and from others!",
      };
      return (
        descriptions[category as keyof typeof descriptions] ||
        "Your learning style profile has been calculated."
      );
    }
  };

  const generateRecommendations = (
    category: string,
    scores: any,
    type: string,
  ): string[] => {
    if (type === "study_habits") {
      const recommendations = {
        time_management: [
          "Use time-blocking techniques to schedule specific study periods",
          "Try the Balanced Technique: 25 minutes focused study + 5 minute breaks",
          "Create weekly and daily study schedules",
          "Start assignments and exam prep earlier",
          "Use calendar apps to track deadlines and study goals",
        ],
        environment: [
          "Find and stick to 2-3 consistent study locations",
          "Minimize distractions by using phone focus modes",
          "Ensure good lighting and comfortable seating",
          "Experiment with background music or white noise",
          "Keep your study space organized and clutter-free",
        ],
        information_processing: [
          "Practice active reading with highlighting and note-taking",
          "Use the Feynman Technique: explain concepts in simple terms",
          "Create visual aids like mind maps and flowcharts",
          "Review notes within 24 hours of taking them",
          "Test yourself regularly instead of just re-reading",
        ],
        motivation: [
          "Set specific, achievable daily study goals",
          "Reward yourself for completing study sessions",
          "Find study accountability partners",
          "Connect your studies to long-term career goals",
          "Take regular breaks to prevent burnout",
        ],
        technology: [
          "Try apps like Notion or Obsidian for note organization",
          "Use flashcard apps like Anki for spaced repetition",
          "Experiment with focus apps like Forest or Freedom",
          "Backup your study materials to cloud storage",
          "Watch educational videos to supplement reading",
        ],
        learning_strategies: [
          "Practice spaced repetition for long-term retention",
          "Use active recall instead of passive reading",
          "Teach concepts to others to test understanding",
          "Create practice tests and quizzes for yourself",
          "Connect new information to things you already know",
        ],
        self_assessment: [
          "Keep a learning journal to track what works",
          "Regular reflect on your study effectiveness",
          "Ask for feedback from teachers and peers",
          "Set aside time each week to review your progress",
          "Be honest about areas that need improvement",
        ],
      };
      return recommendations[category as keyof typeof recommendations] || [];
    } else {
      const recommendations = {
        visual: [
          "Use mind maps, charts, and diagrams to organize information",
          "Color-code your notes and study materials",
          "Watch educational videos and visual demonstrations",
          "Create visual aids like flashcards with images",
          "Use highlighters to emphasize key points in text",
        ],
        auditory: [
          "Read your notes aloud when reviewing",
          "Join study groups for discussion-based learning",
          "Listen to educational podcasts and audiobooks",
          "Explain concepts verbally to yourself or others",
          "Use background music or sounds while studying",
        ],
        kinesthetic: [
          "Take frequent movement breaks during study sessions",
          "Use manipulatives and hands-on activities when possible",
          "Study while walking or in different positions",
          "Create physical flashcards you can sort and arrange",
          "Act out scenarios or role-play concepts",
        ],
        reading_writing: [
          "Take detailed written notes during lectures",
          "Rewrite information in your own words",
          "Create written summaries and outlines",
          "Use lists and bullet points to organize thoughts",
          "Write practice essays and reflection papers",
        ],
        social: [
          "Form or join study groups regularly",
          "Teach concepts to classmates or friends",
          "Participate actively in class discussions",
          "Use peer editing and feedback on assignments",
          "Find study partners for accountability",
        ],
      };
      return recommendations[category as keyof typeof recommendations] || [];
    }
  };

  const handleExit = () => {
    if (Object.keys(answers).length > 0) {
      setShowExitModal(true);
    } else {
      onClose();
    }
  };

  const confirmExit = async () => {
    // Keep session in_progress so user can resume later
    // Session will stay in Convex as in_progress — no abandon call
    setShowExitModal(false);
    onClose();
  };

  if (isInitializing || quizQuestions.length === 0) {
    return (
      <View
        style={[styles.loadingContainer, { backgroundColor: theme.background }]}
      >
        <Ionicons name="hourglass-outline" size={40} color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.text }]}>
          Preparing your quiz...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["top"]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleExit} style={styles.exitButton}>
          <Ionicons name="close-outline" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.questionCounter, { color: theme.text }]}>
            {currentQuestionIndex + 1} of {quizQuestions.length}
          </Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { backgroundColor: theme.card }]}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: theme.primary, width: `${progress}%` },
            ]}
          />
        </View>
        <Text style={[styles.progressText, { color: theme.text }]}>
          {Math.round(progress)}% Complete
        </Text>
      </View>

      {/* Answer Save Error Banner */}
      {failedAnswers.length > 0 && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning-outline" size={18} color="#B71C1C" />
          <Text style={styles.errorBannerText}>
            {failedAnswers.length === 1
              ? "1 answer didn't save."
              : `${failedAnswers.length} answers didn't save.`}
          </Text>
          <TouchableOpacity
            onPress={retryFailedAnswers}
            disabled={isRetryingAnswers}
          >
            <Text style={styles.errorBannerRetry}>
              {isRetryingAnswers ? "Retrying..." : "Retry"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Question */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.questionCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.questionText, { color: theme.text }]}>
            {getQuestionText(currentQuestion)}
          </Text>
        </View>

        {/* Answer Options */}
        <View style={styles.optionsContainer}>
          {getOptions(currentQuestion).map((option, index) => {
            const questionId = getQuestionId(currentQuestion);
            const isSelected = answers[questionId] === index;
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.optionButton,
                  {
                    backgroundColor: isSelected
                      ? theme.primary + "20"
                      : theme.card,
                    borderColor: isSelected ? theme.primary : "transparent",
                  },
                ]}
                onPress={() => handleAnswer(index)}
                activeOpacity={0.7}
              >
                <View style={styles.optionContent}>
                  <View
                    style={[
                      styles.optionIndicator,
                      {
                        backgroundColor: isSelected
                          ? theme.primary
                          : "transparent",
                        borderColor: isSelected ? theme.primary : "#DDD",
                      },
                    ]}
                  >
                    {isSelected && (
                      <Ionicons
                        name="checkmark-outline"
                        size={16}
                        color="#FFF"
                      />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.optionText,
                      { color: isSelected ? theme.primary : theme.text },
                    ]}
                  >
                    {option}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Navigation */}
      <View style={styles.navigation}>
        <TouchableOpacity
          style={[
            styles.navButton,
            {
              backgroundColor:
                currentQuestionIndex > 0 ? theme.card : "transparent",
              opacity: currentQuestionIndex > 0 ? 1 : 0.5,
            },
          ]}
          onPress={goToPreviousQuestion}
          disabled={currentQuestionIndex === 0}
        >
          <Ionicons name="chevron-back-outline" size={20} color={theme.text} />
          <Text style={[styles.navButtonText, { color: theme.text }]}>
            Previous
          </Text>
        </TouchableOpacity>

        <View style={styles.navSpacer} />

        {currentQuestionIndex === quizQuestions.length - 1 &&
          answers[getQuestionId(currentQuestion)] !== undefined && (
            <TouchableOpacity
              style={[
                styles.completeButton,
                {
                  backgroundColor: isSaving
                    ? theme.primary + "80"
                    : theme.primary,
                  opacity: isSaving ? 0.7 : 1,
                },
              ]}
              onPress={completeQuiz}
              disabled={isSaving}
            >
              <Text style={styles.completeButtonText}>
                {isSaving ? "Saving..." : "Complete Quiz"}
              </Text>
              {isSaving ? (
                <Ionicons name="hourglass-outline" size={20} color="#FFF" />
              ) : (
                <Ionicons name="checkmark-outline" size={20} color="#FFF" />
              )}
            </TouchableOpacity>
          )}
      </View>

      {/* Exit Confirmation Modal */}
      <Modal
        visible={showExitModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExitModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Ionicons name="alert-circle-outline" size={48} color="#FF9800" />
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {useConvex ? "Save & Exit?" : "Exit Quiz?"}
            </Text>
            <Text style={[styles.modalDescription, { color: theme.text }]}>
              {useConvex
                ? `You've answered ${Object.keys(answers).length} of ${quizQuestions.length} questions. Your progress will be saved and you can continue later.`
                : `You've answered ${Object.keys(answers).length} questions. Your progress will be lost if you exit now.`}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowExitModal(false)}
              >
                <Text style={styles.cancelButtonText}>Continue Quiz</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmExit}
              >
                <Text style={styles.confirmButtonText}>Exit</Text>
              </TouchableOpacity>
            </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  exitButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  headerInfo: {
    alignItems: "center",
  },
  questionCounter: {
    fontSize: 16,
    fontWeight: "bold",
  },
  placeholder: {
    width: 40,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    textAlign: "center",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#FFEBEE",
    borderWidth: 1,
    borderColor: "#FFCDD2",
  },
  errorBannerText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: "#B71C1C",
  },
  errorBannerRetry: {
    fontSize: 13,
    fontWeight: "700",
    color: "#B71C1C",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  questionCard: {
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  questionText: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "500",
  },
  optionsContainer: {
    marginBottom: 24,
  },
  optionButton: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  optionIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  optionText: {
    fontSize: 16,
    flex: 1,
    lineHeight: 20,
  },
  navigation: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  navButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  navButtonText: {
    fontSize: 16,
    marginLeft: 4,
  },
  navSpacer: {
    flex: 1,
  },
  completeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFF",
    marginRight: 8,
  },
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
    alignItems: "center",
    width: "100%",
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
  },
  cancelButton: {
    backgroundColor: "#F0F0F0",
  },
  cancelButtonText: {
    textAlign: "center",
    fontWeight: "600",
    color: "#333",
  },
  confirmButton: {
    backgroundColor: "#FF5252",
  },
  confirmButtonText: {
    textAlign: "center",
    fontWeight: "600",
    color: "#FFF",
  },
});

export default InteractiveQuiz;
