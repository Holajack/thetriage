import { v } from "convex/values";
import {
  query,
  mutation,
  internalMutation,
  internalQuery,
  MutationCtx,
} from "./_generated/server";
import { getCurrentUser, getCurrentUserOrNull } from "./users";
import { Id, Doc } from "./_generated/dataModel";

// ============================================================
// MEMORY EXTRACTION - Called after quiz completion
// ============================================================

/** Extract quiz insights as Nora memories (called after quiz completion) */
export const extractQuizMemories = internalMutation({
  args: {
    userId: v.id("users"),
    resultId: v.id("quizResults"),
  },
  handler: async (ctx, args) => {
    // Get the result
    const result = await ctx.db.get(args.resultId);
    if (!result) return;

    // Get category info
    const category = await ctx.db.get(result.categoryId);
    if (!category) return;

    // Get previous results for trend analysis
    const previousResults = await ctx.db
      .query("quizResults")
      .withIndex("by_userId_categoryId", (q) =>
        q.eq("userId", args.userId).eq("categoryId", result.categoryId),
      )
      .collect();

    // Filter to results before this one
    const olderResults = previousResults
      .filter((r) => r._id !== args.resultId)
      .sort(
        (a, b) =>
          new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
      );

    const previousResult = olderResults.length > 0 ? olderResults[0] : null;

    // Calculate trend
    const getTrend = (
      currentScore: number,
      previousScore: number | undefined,
    ): string | undefined => {
      if (previousScore === undefined) return undefined;
      const diff = currentScore - previousScore;
      if (diff > 5) return "improving";
      if (diff < -5) return "declining";
      return "stable";
    };

    // Extract memories
    const memories: Array<{
      memoryType: string;
      key: string;
      value: string;
      confidence: number;
      context: {
        score: number;
        percentile?: number;
        trend?: string;
        comparedToLast?: number;
      };
      actionableInsights: string[];
    }> = [];

    // 1. Extract trait profile memory
    memories.push({
      memoryType: "trait",
      key: `${category.slug}_primary_trait`,
      value: `Primary ${category.name} trait is ${result.traitProfile.primaryTrait} (score: ${Math.round(result.traitProfile.primaryScore)}%)`,
      confidence: result.traitProfile.primaryScore / 100,
      context: {
        score: result.traitProfile.primaryScore,
        percentile: result.percentileRank ?? undefined,
        trend: previousResult
          ? getTrend(result.overallScore, previousResult.overallScore)
          : undefined,
        comparedToLast: previousResult
          ? Math.round(
              (result.overallScore - previousResult.overallScore) * 100,
            ) / 100
          : undefined,
      },
      actionableInsights: [
        `Continue leveraging ${result.traitProfile.primaryTrait} as a strength`,
      ],
    });

    // 2. Extract strength memories
    for (const strength of result.strengths) {
      const prevSubDim = previousResult?.subDimensionScores.find(
        (s) => s.slug === strength.subDimensionSlug,
      );

      memories.push({
        memoryType: "strength",
        key: `${category.slug}_strength_${strength.subDimensionSlug}`,
        value: `Strong in ${strength.subDimensionSlug}: ${strength.description}`,
        confidence: strength.score / 100,
        context: {
          score: strength.score,
          trend: prevSubDim
            ? getTrend(strength.score, prevSubDim.normalizedScore)
            : undefined,
          comparedToLast: prevSubDim
            ? Math.round((strength.score - prevSubDim.normalizedScore) * 100) /
              100
            : undefined,
        },
        actionableInsights: [
          `Use ${strength.subDimensionSlug} skills as anchor for improvement`,
        ],
      });
    }

    // 3. Extract growth area memories with recommendations
    for (const growth of result.areasForGrowth) {
      const prevSubDim = previousResult?.subDimensionScores.find(
        (s) => s.slug === growth.subDimensionSlug,
      );

      memories.push({
        memoryType: "growth_area",
        key: `${category.slug}_growth_${growth.subDimensionSlug}`,
        value: `Area for growth: ${growth.subDimensionSlug} - ${growth.description}`,
        confidence: 0.8, // High confidence that this is an area for growth
        context: {
          score: growth.score,
          trend: prevSubDim
            ? getTrend(growth.score, prevSubDim.normalizedScore)
            : undefined,
          comparedToLast: prevSubDim
            ? Math.round((growth.score - prevSubDim.normalizedScore) * 100) /
              100
            : undefined,
        },
        actionableInsights: growth.recommendations,
      });
    }

    // 4. Extract low score alert
    if (result.overallScore < 50) {
      memories.push({
        memoryType: "recommendation",
        key: `${category.slug}_needs_attention`,
        value: `${category.name} assessment shows significant room for improvement (${Math.round(result.overallScore)}%)`,
        confidence: 0.9,
        context: {
          score: result.overallScore,
          percentile: result.percentileRank ?? undefined,
          trend: previousResult
            ? getTrend(result.overallScore, previousResult.overallScore)
            : undefined,
          comparedToLast: previousResult
            ? Math.round(
                (result.overallScore - previousResult.overallScore) * 100,
              ) / 100
            : undefined,
        },
        actionableInsights: [
          `Consider daily practice exercises for ${result.areasForGrowth[0]?.subDimensionSlug || "identified areas"}`,
          `Set small, achievable goals in ${category.name}`,
          `Review recommended resources and techniques`,
        ],
      });
    }

    // 5. Save memories to quizNoraMemories
    for (const memory of memories) {
      await ctx.db.insert("quizNoraMemories", {
        userId: args.userId,
        resultId: args.resultId,
        categoryId: result.categoryId,
        memoryType: memory.memoryType,
        key: memory.key,
        value: memory.value,
        confidence: memory.confidence,
        context: memory.context,
        actionableInsights: memory.actionableInsights,
        extractedAt: new Date().toISOString(),
      });
    }

    // 6. Sync key insights to main noraMemory table
    await syncToNoraMemory(ctx, {
      userId: args.userId,
      categorySlug: category.slug,
      overallScore: result.overallScore,
      primaryTrait: result.traitProfile.primaryTrait,
      strengths: result.strengths.map((s) => s.subDimensionSlug),
      growthAreas: result.areasForGrowth.map((g) => g.subDimensionSlug),
    });

    // 7. Create recommendation triggers
    await createTriggers(ctx, args.userId, result.categoryId, result);
  },
});

/** Sync key insights to main noraMemory table for immediate Nora access */
async function syncToNoraMemory(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    categorySlug: string;
    overallScore: number;
    primaryTrait: string;
    strengths: string[];
    growthAreas: string[];
  },
) {
  const memories = [
    {
      category: "academic",
      key: `quiz_${args.categorySlug}_score`,
      value: `Scored ${Math.round(args.overallScore)}% on ${args.categorySlug} assessment`,
      confidence: 0.95,
      source: "quiz",
    },
    {
      category: "preference",
      key: `quiz_${args.categorySlug}_strength`,
      value: `Learning strength: ${args.strengths.join(", ") || "balanced profile"}`,
      confidence: 0.9,
      source: "quiz",
    },
    {
      category: "struggle",
      key: `quiz_${args.categorySlug}_growth`,
      value: `Areas to improve: ${args.growthAreas.join(", ") || "well-rounded"}`,
      confidence: 0.85,
      source: "quiz",
    },
  ];

  for (const memory of memories) {
    // Check if exists
    const existing = await ctx.db
      .query("noraMemory")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    const match = existing.find(
      (m: any) => m.key === memory.key && m.category === memory.category,
    );

    if (match) {
      await ctx.db.patch(match._id, {
        value: memory.value,
        confidence: Math.min(1.0, match.confidence + 0.1),
        lastReferencedAt: new Date().toISOString(),
      });
    } else {
      await ctx.db.insert("noraMemory", {
        userId: args.userId,
        category: memory.category,
        key: memory.key,
        value: memory.value,
        confidence: memory.confidence,
        source: memory.source,
        lastReferencedAt: new Date().toISOString(),
      });
    }
  }
}

/** Create recommendation triggers for proactive Nora suggestions */
async function createTriggers(
  ctx: MutationCtx,
  userId: Id<"users">,
  categoryId: Id<"quizCategories">,
  result: Doc<"quizResults">,
) {
  // Check if low score trigger should be created
  if (result.overallScore < 50) {
    const existingTrigger = await ctx.db
      .query("quizRecommendationTriggers")
      .withIndex("by_userId_triggerType", (q) =>
        q.eq("userId", userId).eq("triggerType", "low_score"),
      )
      .first();

    if (!existingTrigger) {
      await ctx.db.insert("quizRecommendationTriggers", {
        userId,
        triggerType: "low_score",
        categoryId,
        threshold: 50,
        isActive: true,
        recommendedAction: "offer_tip",
        messageTemplate: `I noticed your ${result.dominantTrait} assessment showed some areas for growth. Would you like some personalized tips to improve?`,
      });
    }
  }

  // Periodic retake trigger (30 days)
  const existingPeriodicTrigger = await ctx.db
    .query("quizRecommendationTriggers")
    .withIndex("by_userId_triggerType", (q) =>
      q.eq("userId", userId).eq("triggerType", "periodic"),
    )
    .first();

  if (!existingPeriodicTrigger) {
    await ctx.db.insert("quizRecommendationTriggers", {
      userId,
      triggerType: "periodic",
      categoryId,
      isActive: true,
      recommendedAction: "suggest_retake",
      messageTemplate:
        "It's been a while since your last self-discovery quiz. Want to see how you've grown?",
    });
  }
}

// ============================================================
// QUERIES FOR NORA CONTEXT
// ============================================================

/** Get quiz insights for Nora's system prompt */
export const getQuizInsightsForNora = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Get all quiz memories for this user
    const quizMemories = await ctx.db
      .query("quizNoraMemories")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    if (quizMemories.length === 0) return null;

    // Group by category and get latest per category
    const categoryMap = new Map<string, any[]>();
    for (const memory of quizMemories) {
      const key = memory.categoryId.toString();
      if (!categoryMap.has(key)) {
        categoryMap.set(key, []);
      }
      categoryMap.get(key)!.push(memory);
    }

    // Get latest memories per category
    const insights: any[] = [];

    for (const [categoryId, memories] of categoryMap) {
      // Sort by extractedAt and get latest
      const sorted = memories.sort(
        (a, b) =>
          new Date(b.extractedAt).getTime() - new Date(a.extractedAt).getTime(),
      );

      // Get category name - cast to proper type
      const category = (await ctx.db.get(
        memories[0].categoryId,
      )) as Doc<"quizCategories"> | null;
      const categoryName = category?.name || "Unknown";

      // Extract relevant insights
      const traitMemory = sorted.find((m) => m.memoryType === "trait");
      const strengthMemories = sorted.filter(
        (m) => m.memoryType === "strength",
      );
      const growthMemories = sorted.filter(
        (m) => m.memoryType === "growth_area",
      );

      if (traitMemory) {
        insights.push({
          type: "quiz_profile",
          category: categoryName,
          content: traitMemory.value,
          confidence: traitMemory.confidence,
          trend: traitMemory.context.trend,
        });
      }

      // Add top strengths
      for (const strength of strengthMemories.slice(0, 2)) {
        insights.push({
          type: "quiz_strength",
          category: categoryName,
          content: strength.value,
          actionable: strength.actionableInsights,
        });
      }

      // Add growth areas with recommendations
      for (const growth of growthMemories.slice(0, 2)) {
        insights.push({
          type: "quiz_growth",
          category: categoryName,
          content: growth.value,
          recommendations: growth.actionableInsights,
          trend: growth.context.trend,
        });
      }
    }

    return insights;
  },
});

/** Get active recommendation triggers */
export const getActiveRecommendationTriggers = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return [];

    const triggers = await ctx.db
      .query("quizRecommendationTriggers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    return triggers.filter((t) => t.isActive);
  },
});

/** Check if user should be prompted to retake a quiz */
export const shouldSuggestRetake = query({
  args: { categorySlug: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return false;

    const category = await ctx.db
      .query("quizCategories")
      .withIndex("by_slug", (q) => q.eq("slug", args.categorySlug))
      .unique();

    if (!category) return false;

    // Get latest result
    const results = await ctx.db
      .query("quizResults")
      .withIndex("by_userId_categoryId", (q) =>
        q.eq("userId", user._id).eq("categoryId", category._id),
      )
      .collect();

    if (results.length === 0) return true; // Never taken

    const latest = results.sort(
      (a, b) =>
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
    )[0];

    // Suggest retake if more than 30 days old
    const daysSinceCompletion =
      (Date.now() - new Date(latest.completedAt).getTime()) /
      (1000 * 60 * 60 * 24);

    return daysSinceCompletion > 30;
  },
});

// ============================================================
// NORA PROMPT BUILDER HELPER
// ============================================================

/** Format quiz insights for injection into Nora's system prompt */
/**
 * Internal only. As a public query taking an arbitrary userId, this handed any
 * caller another user's full psychometric profile. It has no client callers —
 * it exists to build Nora's prompt context server-side.
 */
export const formatQuizContextForPrompt = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const insights = await ctx.db
      .query("quizNoraMemories")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    if (insights.length === 0) return null;

    // Group by category
    const categoryInsights = new Map<string, any[]>();
    for (const insight of insights) {
      const category = await ctx.db.get(insight.categoryId);
      const categoryName = category?.name || "Unknown";
      if (!categoryInsights.has(categoryName)) {
        categoryInsights.set(categoryName, []);
      }
      categoryInsights.get(categoryName)!.push(insight);
    }

    // Build formatted string
    let promptContext = "\n\n**Self-Discovery Quiz Insights:**";

    for (const [categoryName, catInsights] of categoryInsights) {
      // Get latest trait insight
      const traitInsight = catInsights
        .filter((i) => i.memoryType === "trait")
        .sort(
          (a, b) =>
            new Date(b.extractedAt).getTime() -
            new Date(a.extractedAt).getTime(),
        )[0];

      if (traitInsight) {
        promptContext += `\n*${categoryName}:*`;
        promptContext += `\n- ${traitInsight.value}`;

        if (traitInsight.context.trend === "improving") {
          promptContext += " (showing improvement!)";
        } else if (traitInsight.context.trend === "declining") {
          promptContext += " (needs attention)";
        }
      }

      // Get growth areas
      const growthInsights = catInsights
        .filter((i) => i.memoryType === "growth_area")
        .slice(0, 2);

      if (growthInsights.length > 0) {
        promptContext += "\n*Areas for Development:*";
        for (const growth of growthInsights) {
          promptContext += `\n- ${growth.value}`;
        }
      }
    }

    promptContext +=
      "\n\nUse these insights to personalize study recommendations, acknowledge progress, and gently guide improvement in growth areas without being preachy.";

    return promptContext;
  },
});

// ============================================================
// TRIGGER MANAGEMENT
// ============================================================

/** Mark a trigger as triggered (to avoid repeated messages) */
export const markTriggerTriggered = mutation({
  args: { triggerId: v.id("quizRecommendationTriggers") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.triggerId, {
      lastTriggeredAt: new Date().toISOString(),
    });
  },
});

/** Deactivate a trigger */
export const deactivateTrigger = mutation({
  args: { triggerId: v.id("quizRecommendationTriggers") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.triggerId, {
      isActive: false,
    });
  },
});
