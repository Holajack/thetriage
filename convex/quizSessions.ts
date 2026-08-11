import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrNull } from "./users";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

// ============================================================
// SESSION MANAGEMENT
// ============================================================

/** Start a new quiz session */
export const startSession = mutation({
  args: {
    categorySlug: v.string(),
    sessionType: v.string(), // 'full' | 'quick' | 'adaptive'
    educationLevel: v.string(), // 'high_school' | 'college' | 'graduate'
    questionsCount: v.number(),
    questionIds: v.array(v.id("quizQuestions")), // Pre-selected question IDs
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    // Get category
    const category = await ctx.db
      .query("quizCategories")
      .withIndex("by_slug", (q) => q.eq("slug", args.categorySlug))
      .unique();

    if (!category) throw new Error("Category not found");

    // Check for existing in-progress session for this category
    const existingSessions = await ctx.db
      .query("quizSessions")
      .withIndex("by_userId_categoryId", (q) =>
        q.eq("userId", user._id).eq("categoryId", category._id),
      )
      .collect();

    const inProgressSession = existingSessions.find(
      (s) => s.status === "in_progress",
    );

    if (inProgressSession) {
      // Return existing session instead of creating a new one
      return { sessionId: inProgressSession._id };
    }

    // Create new session
    const sessionId = await ctx.db.insert("quizSessions", {
      userId: user._id,
      categoryId: category._id,
      sessionType: args.sessionType,
      educationLevel: args.educationLevel,
      questionsCount: args.questionsCount,
      questionIds: args.questionIds,
      status: "in_progress",
      currentQuestionIndex: 0,
      startedAt: new Date().toISOString(),
    });

    return { sessionId };
  },
});

/** Get current session for a category */
export const getCurrentSession = query({
  args: { categorySlug: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;

    const category = await ctx.db
      .query("quizCategories")
      .withIndex("by_slug", (q) => q.eq("slug", args.categorySlug))
      .unique();

    if (!category) return null;

    const sessions = await ctx.db
      .query("quizSessions")
      .withIndex("by_userId_categoryId", (q) =>
        q.eq("userId", user._id).eq("categoryId", category._id),
      )
      .collect();

    return sessions.find((s) => s.status === "in_progress") || null;
  },
});

/** Get all in-progress sessions for the current user */
export const getAllInProgressSessions = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return [];

    const sessions = await ctx.db
      .query("quizSessions")
      .withIndex("by_userId_status", (q) =>
        q.eq("userId", user._id).eq("status", "in_progress"),
      )
      .collect();

    return Promise.all(
      sessions.map(async (session) => {
        const category = await ctx.db.get(session.categoryId);
        const responses = await ctx.db
          .query("quizResponses")
          .withIndex("by_sessionId", (q) => q.eq("sessionId", session._id))
          .collect();
        return {
          ...session,
          category,
          answeredCount: responses.length,
        };
      }),
    );
  },
});

/** Get session by ID with questions */
export const getSessionWithQuestions = query({
  args: { sessionId: v.id("quizSessions") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const session = await ctx.db.get(args.sessionId);

    if (!session || session.userId !== user._id) {
      throw new Error("Session not found");
    }

    // Get questions in session order
    const questions = await Promise.all(
      session.questionIds.map((qId) => ctx.db.get(qId)),
    );

    // Get responses for this session
    const responses = await ctx.db
      .query("quizResponses")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    const responseMap = new Map(responses.map((r) => [r.questionId, r]));

    // Get category info
    const category = await ctx.db.get(session.categoryId);

    return {
      session,
      category,
      questions: questions.filter(Boolean).map((q) => {
        // Apply education level adaptation if available
        const adapted = q!.adaptedVersions?.find(
          (v) => v.educationLevel === session.educationLevel,
        );

        return {
          _id: q!._id,
          questionId: q!.questionId,
          questionText: adapted?.questionText || q!.questionText,
          questionFormat: q!.questionFormat,
          options: adapted?.options || q!.options,
          weight: q!.weight,
          difficulty: q!.difficulty,
          subDimensionId: q!.subDimensionId,
          response: responseMap.get(q!._id) || null,
        };
      }),
      responses,
      progress: {
        answered: responses.length,
        total: session.questionsCount,
        percentage: Math.round(
          (responses.length / session.questionsCount) * 100,
        ),
      },
    };
  },
});

/** Submit an answer to a question */
export const submitAnswer = mutation({
  args: {
    sessionId: v.id("quizSessions"),
    questionId: v.id("quizQuestions"),
    selectedValue: v.number(),
    responseTimeMs: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const session = await ctx.db.get(args.sessionId);

    if (!session || session.userId !== user._id) {
      throw new Error("Session not found");
    }

    if (session.status !== "in_progress") {
      throw new Error("Session is not active");
    }

    // Get the question for scoring
    const question = await ctx.db.get(args.questionId);
    if (!question) throw new Error("Question not found");

    // Calculate scores
    let rawScore = args.selectedValue;

    // Handle reverse-coded items
    if (question.isReversed) {
      const maxValue = Math.max(...question.options.map((o) => o.value));
      rawScore = maxValue - rawScore;
    }

    // Check for custom scoring weight
    const option = question.options.find((o) => o.value === args.selectedValue);
    if (option?.scoringWeight !== undefined) {
      rawScore = option.scoringWeight;
    }

    // Apply question weight
    const weightedScore = rawScore * question.weight;

    // Check if answer already exists
    const existingResponses = await ctx.db
      .query("quizResponses")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    const existingResponse = existingResponses.find(
      (r) => r.questionId === args.questionId,
    );

    if (existingResponse) {
      // Update existing response
      await ctx.db.patch(existingResponse._id, {
        selectedValue: args.selectedValue,
        responseTimeMs: args.responseTimeMs,
        rawScore,
        weightedScore,
        answeredAt: new Date().toISOString(),
      });
    } else {
      // Create new response
      await ctx.db.insert("quizResponses", {
        sessionId: args.sessionId,
        userId: user._id,
        questionId: args.questionId,
        selectedValue: args.selectedValue,
        responseTimeMs: args.responseTimeMs,
        rawScore,
        weightedScore,
        answeredAt: new Date().toISOString(),
      });

      // Update session progress
      const newIndex = Math.min(
        session.currentQuestionIndex + 1,
        session.questionsCount - 1,
      );
      await ctx.db.patch(args.sessionId, {
        currentQuestionIndex: newIndex,
      });
    }

    // Check if all questions answered
    const totalResponses = existingResponse
      ? existingResponses.length
      : existingResponses.length + 1;

    return {
      isComplete: totalResponses >= session.questionsCount,
      answeredCount: totalResponses,
      totalQuestions: session.questionsCount,
    };
  },
});

/** Complete a quiz session and calculate results */
export const completeSession = mutation({
  args: {
    sessionId: v.id("quizSessions"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const session = await ctx.db.get(args.sessionId);

    if (!session || session.userId !== user._id) {
      throw new Error("Session not found");
    }

    if (session.status === "completed") {
      // Already completed, return existing result
      const existingResult = session.resultId
        ? await ctx.db.get(session.resultId)
        : null;
      return { result: existingResult, sessionId: args.sessionId };
    }

    // Get all responses
    const responses = await ctx.db
      .query("quizResponses")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    if (responses.length < session.questionsCount * 0.5) {
      throw new Error("Not enough questions answered to complete");
    }

    // Get sub-dimensions for scoring
    const subDimensions = await ctx.db
      .query("quizSubDimensions")
      .withIndex("by_categoryId", (q) => q.eq("categoryId", session.categoryId))
      .collect();

    // Calculate sub-dimension scores
    const subDimensionScores = await calculateSubDimensionScores(
      ctx,
      responses,
      subDimensions,
    );

    // Calculate overall score
    const overallScore = calculateOverallScore(
      subDimensionScores,
      subDimensions,
    );

    // Determine trait profile
    const traitProfile = determineTraitProfile(subDimensionScores);

    // Identify strengths and areas for growth
    const { strengths, areasForGrowth } =
      identifyStrengthsAndGrowth(subDimensionScores);

    // Calculate average response time
    const averageResponseTimeMs =
      responses.reduce((sum, r) => sum + r.responseTimeMs, 0) /
      responses.length;

    // Calculate time spent
    const startTime = new Date(session.startedAt).getTime();
    const endTime = Date.now();
    const timeSpentSeconds = Math.round((endTime - startTime) / 1000);

    // Create result record
    const resultId = await ctx.db.insert("quizResults", {
      userId: user._id,
      sessionId: args.sessionId,
      categoryId: session.categoryId,
      overallScore: Math.round(overallScore * 100) / 100,
      subDimensionScores,
      dominantTrait: traitProfile.primaryTrait,
      traitProfile,
      strengths,
      areasForGrowth,
      completedAt: new Date().toISOString(),
      educationLevel: session.educationLevel,
      questionsAnswered: responses.length,
      averageResponseTimeMs: Math.round(averageResponseTimeMs),
    });

    // Update session
    await ctx.db.patch(args.sessionId, {
      status: "completed",
      completedAt: new Date().toISOString(),
      timeSpentSeconds,
      resultId,
    });

    // Record in progress history
    await ctx.db.insert("quizProgressHistory", {
      userId: user._id,
      categoryId: session.categoryId,
      resultId,
      overallScore: Math.round(overallScore * 100) / 100,
      subDimensionScores: subDimensionScores.map((s) => ({
        slug: s.slug,
        score: s.normalizedScore,
      })),
      recordedAt: new Date().toISOString(),
    });

    // Fetch full result for frontend
    const fullResult = await ctx.db.get(resultId);

    return { result: fullResult, sessionId: args.sessionId };
  },
});

/** Abandon a session */
export const abandonSession = mutation({
  args: { sessionId: v.id("quizSessions") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const session = await ctx.db.get(args.sessionId);

    if (!session || session.userId !== user._id) {
      throw new Error("Session not found");
    }

    await ctx.db.patch(args.sessionId, {
      status: "abandoned",
      completedAt: new Date().toISOString(),
    });
  },
});

/** Get user's quiz history for a category */
export const getQuizHistory = query({
  args: {
    categorySlug: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return [];

    let results;

    if (args.categorySlug) {
      const categorySlug = args.categorySlug; // TypeScript narrowing helper
      const category = await ctx.db
        .query("quizCategories")
        .withIndex("by_slug", (q) => q.eq("slug", categorySlug))
        .unique();

      if (!category) return [];

      results = await ctx.db
        .query("quizResults")
        .withIndex("by_userId_categoryId", (q) =>
          q.eq("userId", user._id).eq("categoryId", category._id),
        )
        .collect();
    } else {
      results = await ctx.db
        .query("quizResults")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .collect();
    }

    // Sort by completion date (newest first)
    results.sort(
      (a, b) =>
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
    );

    // Apply limit
    if (args.limit) {
      results = results.slice(0, args.limit);
    }

    // Attach category info
    const resultsWithCategory = await Promise.all(
      results.map(async (r) => {
        const category = await ctx.db.get(r.categoryId);
        return { ...r, category };
      }),
    );

    return resultsWithCategory;
  },
});

/** Get latest result for each category */
export const getLatestResultPerCategory = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return [];

    const categories = await ctx.db
      .query("quizCategories")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();

    const latestResults = await Promise.all(
      categories.map(async (category) => {
        const results = await ctx.db
          .query("quizResults")
          .withIndex("by_userId_categoryId", (q) =>
            q.eq("userId", user._id).eq("categoryId", category._id),
          )
          .collect();

        if (results.length === 0) {
          return {
            category,
            result: null,
            completionCount: 0,
            hasResult: false,
          };
        }

        // Sort and get latest
        results.sort(
          (a, b) =>
            new Date(b.completedAt).getTime() -
            new Date(a.completedAt).getTime(),
        );

        return {
          category,
          result: results[0],
          completionCount: results.length,
          hasResult: true,
        };
      }),
    );

    return latestResults.sort((a, b) => a.category.order - b.category.order);
  },
});

// ============================================================
// SCORING HELPERS
// ============================================================

async function calculateSubDimensionScores(
  ctx: any,
  responses: any[],
  subDimensions: any[],
): Promise<any[]> {
  const subDimScores = [];

  for (const subDim of subDimensions) {
    // Get responses for questions in this sub-dimension
    const subDimResponses = [];
    for (const response of responses) {
      const question = await ctx.db.get(response.questionId);
      if (
        question &&
        question.subDimensionId.toString() === subDim._id.toString()
      ) {
        subDimResponses.push({ response, question });
      }
    }

    if (subDimResponses.length === 0) {
      // No questions answered for this sub-dimension
      subDimScores.push({
        subDimensionId: subDim._id,
        slug: subDim.slug,
        name: subDim.name,
        rawScore: 0,
        normalizedScore: 50, // Default to middle
        // percentileRank omitted - v.optional() requires undefined, not null
      });
      continue;
    }

    // Calculate weighted score
    let weightedSum = 0;
    let totalWeight = 0;

    for (const { response, question } of subDimResponses) {
      const effectiveWeight =
        question.weight * (1 + (question.difficulty - 3) * 0.1);
      weightedSum += response.rawScore * effectiveWeight;
      totalWeight += effectiveWeight;
    }

    const rawScore = weightedSum / totalWeight;

    // Normalize to 0-100 scale (assuming Likert 0-4 after processing)
    const normalizedScore = (rawScore / 4) * 100;

    subDimScores.push({
      subDimensionId: subDim._id,
      slug: subDim.slug,
      name: subDim.name,
      rawScore: Math.round(rawScore * 100) / 100,
      normalizedScore: Math.round(normalizedScore * 100) / 100,
      // percentileRank omitted - calculated later if benchmarks exist
    });
  }

  return subDimScores;
}

function calculateOverallScore(
  subDimensionScores: any[],
  subDimensions: any[],
): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const score of subDimensionScores) {
    const subDim = subDimensions.find(
      (sd) => sd._id.toString() === score.subDimensionId.toString(),
    );
    if (subDim) {
      weightedSum += score.normalizedScore * subDim.weight;
      totalWeight += subDim.weight;
    }
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 50;
}

function determineTraitProfile(subDimensionScores: any[]): any {
  // Sort by normalized score descending
  const sorted = [...subDimensionScores].sort(
    (a, b) => b.normalizedScore - a.normalizedScore,
  );

  const primary = sorted[0];
  const secondary = sorted.length > 1 ? sorted[1] : null;

  // Generate profile description
  const avgScore =
    sorted.reduce((sum, s) => sum + s.normalizedScore, 0) / sorted.length;

  let profileDescription = `Your strongest area is ${primary.name} `;

  if (primary.normalizedScore > 80) {
    profileDescription += "(excellent). ";
  } else if (primary.normalizedScore > 60) {
    profileDescription += "(good). ";
  } else {
    profileDescription += "(developing). ";
  }

  if (secondary && secondary.normalizedScore > avgScore) {
    profileDescription += `You also show strength in ${secondary.name}. `;
  }

  const lowest = sorted[sorted.length - 1];
  if (lowest.normalizedScore < 50) {
    profileDescription += `${lowest.name} is an area where targeted practice could significantly improve your overall effectiveness.`;
  }

  return {
    primaryTrait: primary.slug,
    primaryScore: primary.normalizedScore,
    secondaryTrait: secondary?.slug,
    secondaryScore: secondary?.normalizedScore,
    profileDescription,
  };
}

function identifyStrengthsAndGrowth(subDimensionScores: any[]): {
  strengths: any[];
  areasForGrowth: any[];
} {
  const sorted = [...subDimensionScores].sort(
    (a, b) => b.normalizedScore - a.normalizedScore,
  );

  // Top 2-3 as strengths (scores above 60)
  const strengths = sorted
    .filter((s) => s.normalizedScore >= 60)
    .slice(0, 3)
    .map((s) => ({
      subDimensionSlug: s.slug,
      score: s.normalizedScore,
      description: generateStrengthDescription(s),
    }));

  // Bottom 2-3 as areas for growth (scores below 70)
  const areasForGrowth = sorted
    .filter((s) => s.normalizedScore < 70)
    .slice(-3)
    .reverse()
    .map((s) => ({
      subDimensionSlug: s.slug,
      score: s.normalizedScore,
      description: generateGrowthDescription(s),
      recommendations: generateRecommendations(s.slug),
    }));

  return { strengths, areasForGrowth };
}

function generateStrengthDescription(score: any): string {
  if (score.normalizedScore >= 80) {
    return `Excellent ${score.name} skills - this is a core strength you can rely on.`;
  } else if (score.normalizedScore >= 70) {
    return `Strong ${score.name} abilities - continue building on this foundation.`;
  } else {
    return `Developing ${score.name} skills with potential for growth.`;
  }
}

function generateGrowthDescription(score: any): string {
  if (score.normalizedScore < 40) {
    return `${score.name} needs significant attention - focused practice will yield quick improvements.`;
  } else if (score.normalizedScore < 55) {
    return `${score.name} shows room for improvement - small consistent efforts will help.`;
  } else {
    return `${score.name} is adequate but could be strengthened further.`;
  }
}

function generateRecommendations(slug: string): string[] {
  // Generic recommendations - can be expanded per sub-dimension
  const recommendationMap: Record<string, string[]> = {
    planning: [
      "Try using a weekly planning template every Sunday evening",
      "Break large tasks into smaller, actionable steps",
      "Set specific times for study sessions in your calendar",
    ],
    prioritization: [
      "Use the Eisenhower Matrix to categorize tasks by urgency and importance",
      "Identify your top 3 priorities each morning",
      "Learn to say no to low-priority requests",
    ],
    time_estimation: [
      "Track how long tasks actually take for a week",
      "Add a 25% buffer to your time estimates",
      "Review estimates vs actuals weekly to improve accuracy",
    ],
    focus: [
      "Use the Pomodoro Technique (25 min focus, 5 min break)",
      "Remove phone from your study space",
      "Find your optimal focus hours and protect that time",
    ],
    environment: [
      "Create a dedicated study space with minimal distractions",
      "Experiment with background music or silence",
      "Ensure good lighting and comfortable temperature",
    ],
    default: [
      "Set specific, measurable goals for improvement",
      "Track your progress weekly",
      "Seek feedback from mentors or study partners",
    ],
  };

  return recommendationMap[slug] || recommendationMap.default;
}
