/**
 * Hook for Convex-based quiz system
 *
 * This hook provides access to the new Convex quiz system while maintaining
 * backward compatibility with the legacy local quiz storage.
 */

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useAuth } from "../context/AuthContext";
import { useCallback, useMemo } from "react";

// Types matching Convex schema
export interface QuizCategory {
  _id: Id<"quizCategories">;
  slug: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  order: number;
  isActive: boolean;
  researchBasis?: string;
  questionsCount?: number;
}

export interface QuizSubDimension {
  _id: Id<"quizSubDimensions">;
  categoryId: Id<"quizCategories">;
  slug: string;
  name: string;
  description: string;
  weight: number;
  order: number;
}

export interface QuizQuestion {
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
}

export interface QuizSession {
  _id: Id<"quizSessions">;
  userId: Id<"users">;
  categoryId: Id<"quizCategories">;
  sessionType: string;
  educationLevel: string;
  questionsCount: number;
  questionIds: Id<"quizQuestions">[];
  status: string;
  currentQuestionIndex: number;
  startedAt: string;
  completedAt?: string;
  resultId?: Id<"quizResults">;
}

export interface SubDimensionScore {
  subDimensionId: Id<"quizSubDimensions">;
  slug: string;
  name: string;
  rawScore: number;
  normalizedScore: number;
  percentileRank?: number;
}

export interface QuizResult {
  _id: Id<"quizResults">;
  userId: Id<"users">;
  sessionId: Id<"quizSessions">;
  categoryId: Id<"quizCategories">;
  overallScore: number;
  percentileRank?: number;
  subDimensionScores: SubDimensionScore[];
  dominantTrait: string;
  traitProfile: {
    primaryTrait: string;
    primaryScore: number;
    secondaryTrait?: string;
    secondaryScore?: number;
    profileDescription: string;
  };
  strengths: Array<{
    subDimensionSlug: string;
    score: number;
    description: string;
  }>;
  areasForGrowth: Array<{
    subDimensionSlug: string;
    score: number;
    description: string;
    recommendations: string[];
  }>;
  completedAt: string;
  educationLevel: string;
  questionsAnswered: number;
  averageResponseTimeMs: number;
}

export interface RadarChartData {
  data: Array<{
    axis: string;
    slug: string;
    value: number;
    displayValue: number;
    percentile?: number;
    description: string;
    order: number;
  }>;
  overallScore: number;
  percentileRank?: number;
  dominantTrait: string;
  traitProfile: QuizResult["traitProfile"];
  completedAt: string;
  category: {
    name: string;
    slug: string;
    color: string;
    icon: string;
  } | null;
}

/**
 * Hook for accessing quiz categories and their completion status
 */
export function useQuizCategories() {
  const categories = useQuery(api.quizQuestions.getCategories);
  const latestResults = useQuery(api.quizSessions.getLatestResultPerCategory);

  const categoriesWithProgress = useMemo(() => {
    if (!categories) return null;

    return categories.map((category) => {
      const resultData = latestResults?.find(
        (r) => r.category._id === category._id,
      );

      return {
        ...category,
        hasResult: resultData?.hasResult ?? false,
        latestScore: resultData?.result?.overallScore ?? null,
        completionCount: resultData?.completionCount ?? 0,
        lastCompletedAt: resultData?.result?.completedAt ?? null,
      };
    });
  }, [categories, latestResults]);

  return {
    categories: categoriesWithProgress,
    isLoading: categories === undefined,
    error: null,
  };
}

/**
 * Hook for managing a quiz session
 */
function useQuizSession(categorySlug: string) {
  const { user } = useAuth();

  // Mutations
  const startSessionMutation = useMutation(api.quizSessions.startSession);
  const submitAnswerMutation = useMutation(api.quizSessions.submitAnswer);
  const completeSessionMutation = useMutation(api.quizSessions.completeSession);
  const abandonSessionMutation = useMutation(api.quizSessions.abandonSession);

  // Get current session if exists
  const currentSession = useQuery(api.quizSessions.getCurrentSession, {
    categorySlug,
  });

  // Start a new session
  const startSession = useCallback(
    async (educationLevel: string, questionsCount: number = 15) => {
      // First get random questions
      const questions = await fetch("/api/quiz/questions", {
        method: "POST",
        body: JSON.stringify({ categorySlug, educationLevel, questionsCount }),
      });

      // For now, we'll use the mutation directly
      // In production, you'd want to handle this more elegantly
      return startSessionMutation({
        categorySlug,
        sessionType: "full",
        educationLevel,
        questionsCount,
        questionIds: [], // Will be populated by the query
      });
    },
    [categorySlug, startSessionMutation],
  );

  // Submit an answer
  const submitAnswer = useCallback(
    async (
      sessionId: Id<"quizSessions">,
      questionId: Id<"quizQuestions">,
      selectedValue: number,
      responseTimeMs: number,
    ) => {
      return submitAnswerMutation({
        sessionId,
        questionId,
        selectedValue,
        responseTimeMs,
      });
    },
    [submitAnswerMutation],
  );

  // Complete the session
  const completeSession = useCallback(
    async (sessionId: Id<"quizSessions">) => {
      return completeSessionMutation({ sessionId });
    },
    [completeSessionMutation],
  );

  // Abandon the session
  const abandonSession = useCallback(
    async (sessionId: Id<"quizSessions">) => {
      return abandonSessionMutation({ sessionId });
    },
    [abandonSessionMutation],
  );

  return {
    currentSession,
    startSession,
    submitAnswer,
    completeSession,
    abandonSession,
    isLoading: currentSession === undefined,
  };
}

/**
 * Hook for getting quiz results and visualization data
 */
function useQuizResults(resultId: Id<"quizResults"> | null) {
  const radarData = useQuery(
    api.quizVisualization.getRadarChartData,
    resultId ? { resultId } : "skip",
  );

  return {
    radarData,
    isLoading: radarData === undefined,
  };
}

/**
 * Hook for getting improvement trajectory
 */
function useImprovementTrajectory(categorySlug: string) {
  const trajectory = useQuery(api.quizVisualization.getImprovementTrajectory, {
    categorySlug,
  });

  return {
    trajectory,
    isLoading: trajectory === undefined,
  };
}

/**
 * Hook for getting overall profile across all quizzes
 */
function useOverallProfile() {
  const profile = useQuery(api.quizVisualization.getOverallProfile);

  return {
    profile,
    isLoading: profile === undefined,
  };
}

/**
 * Hook for category comparison
 */
function useCategoryComparison() {
  const comparison = useQuery(api.quizVisualization.getCategoryComparison);

  return {
    comparison,
    isLoading: comparison === undefined,
  };
}

/**
 * Hook for quiz history
 */
export function useQuizHistory(categorySlug?: string, limit?: number) {
  const history = useQuery(api.quizSessions.getQuizHistory, {
    categorySlug,
    limit,
  });

  return {
    history,
    isLoading: history === undefined,
  };
}

/**
 * Utility to convert legacy quiz type to Convex category slug
 */
function legacyTypeToSlug(
  legacyType:
    | "study_habits"
    | "learning_style"
    | "motivation_profile"
    | "focus_type",
): string {
  const mapping: Record<string, string> = {
    study_habits: "study_habits",
    learning_style: "learning_style",
    motivation_profile: "motivation",
    focus_type: "focus_attention",
  };
  return mapping[legacyType] || legacyType;
}

/**
 * Check if Convex quiz system is available
 */
function useConvexQuizAvailable() {
  const categories = useQuery(api.quizQuestions.getCategories);

  return {
    isAvailable: categories !== undefined && categories.length > 0,
    isLoading: categories === undefined,
  };
}
