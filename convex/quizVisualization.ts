import { v } from "convex/values";
import { query } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrNull } from "./users";

// ============================================================
// RADAR CHART DATA
// ============================================================

/** Get data formatted for radar chart visualization */
export const getRadarChartData = query({
  args: { resultId: v.id("quizResults") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    const result = await ctx.db.get(args.resultId);
    // Psychometric results are private to the person who took the quiz.
    if (!result || !user || result.userId !== user._id) {
      throw new Error("Result not found");
    }

    // Get sub-dimension metadata for labels and order
    const subDimensions = await ctx.db
      .query("quizSubDimensions")
      .withIndex("by_categoryId", (q) => q.eq("categoryId", result.categoryId))
      .collect();

    // Build radar chart data
    const radarData = result.subDimensionScores.map((score) => {
      const subDim = subDimensions.find(
        (sd) => sd._id.toString() === score.subDimensionId.toString(),
      );

      return {
        axis: score.name,
        slug: score.slug,
        value: score.normalizedScore / 100, // 0-1 for chart
        displayValue: Math.round(score.normalizedScore),
        percentile: score.percentileRank,
        description: subDim?.description || "",
        order: subDim?.order || 0,
      };
    });

    // Sort by sub-dimension order for consistent display
    radarData.sort((a, b) => a.order - b.order);

    // Get category info
    const category = await ctx.db.get(result.categoryId);

    return {
      data: radarData,
      overallScore: result.overallScore,
      percentileRank: result.percentileRank,
      dominantTrait: result.dominantTrait,
      traitProfile: result.traitProfile,
      completedAt: result.completedAt,
      category: category
        ? {
            name: category.name,
            slug: category.slug,
            color: category.color,
            icon: category.icon,
          }
        : null,
    };
  },
});

/** Get historical comparison data for radar overlay */
export const getHistoricalRadarData = query({
  args: {
    categorySlug: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return [];

    // Get category
    const category = await ctx.db
      .query("quizCategories")
      .withIndex("by_slug", (q) => q.eq("slug", args.categorySlug))
      .unique();

    if (!category) return [];

    // Get historical records
    const history = await ctx.db
      .query("quizProgressHistory")
      .withIndex("by_userId_categoryId", (q) =>
        q.eq("userId", user._id).eq("categoryId", category._id),
      )
      .collect();

    // Sort by recorded date (newest first)
    history.sort(
      (a, b) =>
        new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
    );

    // Apply limit
    const limited = history.slice(0, args.limit || 5);

    return limited.map((h) => ({
      recordedAt: h.recordedAt,
      overallScore: h.overallScore,
      subDimensionScores: h.subDimensionScores,
      percentileRank: h.percentileRank,
    }));
  },
});

// ============================================================
// PROGRESS & IMPROVEMENT TRACKING
// ============================================================

/** Get improvement trajectory for a category */
export const getImprovementTrajectory = query({
  args: { categorySlug: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;

    // Get category
    const category = await ctx.db
      .query("quizCategories")
      .withIndex("by_slug", (q) => q.eq("slug", args.categorySlug))
      .unique();

    if (!category) return null;

    // Get all results for this category
    const results = await ctx.db
      .query("quizResults")
      .withIndex("by_userId_categoryId", (q) =>
        q.eq("userId", user._id).eq("categoryId", category._id),
      )
      .collect();

    if (results.length < 2) {
      return {
        hasEnoughData: false,
        message:
          "Complete the quiz at least twice to see your improvement trajectory",
      };
    }

    // Sort by completion date (oldest first)
    results.sort(
      (a, b) =>
        new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime(),
    );

    const first = results[0];
    const latest = results[results.length - 1];

    // Calculate overall improvement
    const overallImprovement = latest.overallScore - first.overallScore;

    // Calculate sub-dimension improvements
    const subDimensionImprovements = latest.subDimensionScores.map(
      (latestScore) => {
        const firstScore = first.subDimensionScores.find(
          (s) => s.slug === latestScore.slug,
        );

        return {
          slug: latestScore.slug,
          name: latestScore.name,
          firstScore: firstScore?.normalizedScore || 0,
          latestScore: latestScore.normalizedScore,
          improvement:
            latestScore.normalizedScore - (firstScore?.normalizedScore || 0),
        };
      },
    );

    // Sort by improvement (biggest gains first)
    subDimensionImprovements.sort((a, b) => b.improvement - a.improvement);

    // Determine overall trend
    let trend: "improving" | "declining" | "stable";
    if (overallImprovement > 5) {
      trend = "improving";
    } else if (overallImprovement < -5) {
      trend = "declining";
    } else {
      trend = "stable";
    }

    return {
      hasEnoughData: true,
      attemptCount: results.length,
      firstAttempt: {
        date: first.completedAt,
        score: first.overallScore,
      },
      latestAttempt: {
        date: latest.completedAt,
        score: latest.overallScore,
      },
      overallImprovement: Math.round(overallImprovement * 100) / 100,
      trend,
      subDimensionImprovements,
      biggestGain: subDimensionImprovements[0],
      biggestDecline:
        subDimensionImprovements[subDimensionImprovements.length - 1],
      dataPoints: results.map((r) => ({
        date: r.completedAt,
        score: r.overallScore,
      })),
    };
  },
});

/** Get comparative stats across all categories */
export const getCategoryComparison = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return [];

    // Get all categories
    const categories = await ctx.db
      .query("quizCategories")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();

    const comparison = await Promise.all(
      categories.map(async (category) => {
        // Get latest result for this category
        const results = await ctx.db
          .query("quizResults")
          .withIndex("by_userId_categoryId", (q) =>
            q.eq("userId", user._id).eq("categoryId", category._id),
          )
          .collect();

        if (results.length === 0) {
          return {
            category: {
              name: category.name,
              slug: category.slug,
              color: category.color,
              icon: category.icon,
              order: category.order,
            },
            hasResult: false,
            latestScore: null,
            attemptCount: 0,
          };
        }

        // Get latest
        results.sort(
          (a, b) =>
            new Date(b.completedAt).getTime() -
            new Date(a.completedAt).getTime(),
        );

        const latest = results[0];

        return {
          category: {
            name: category.name,
            slug: category.slug,
            color: category.color,
            icon: category.icon,
            order: category.order,
          },
          hasResult: true,
          latestScore: latest.overallScore,
          dominantTrait: latest.dominantTrait,
          percentileRank: latest.percentileRank,
          completedAt: latest.completedAt,
          attemptCount: results.length,
        };
      }),
    );

    // Sort by category order
    comparison.sort((a, b) => a.category.order - b.category.order);

    return comparison;
  },
});

// ============================================================
// STRENGTHS & WEAKNESSES OVERVIEW
// ============================================================

/** Get aggregated strengths and weaknesses across all quizzes */
export const getOverallProfile = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;

    // Get latest result from each category
    const categories = await ctx.db
      .query("quizCategories")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();

    const allStrengths: Array<{
      category: string;
      slug: string;
      score: number;
      description: string;
    }> = [];

    const allGrowthAreas: Array<{
      category: string;
      slug: string;
      score: number;
      description: string;
      recommendations: string[];
    }> = [];

    for (const category of categories) {
      const results = await ctx.db
        .query("quizResults")
        .withIndex("by_userId_categoryId", (q) =>
          q.eq("userId", user._id).eq("categoryId", category._id),
        )
        .collect();

      if (results.length === 0) continue;

      // Get latest
      results.sort(
        (a, b) =>
          new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
      );

      const latest = results[0];

      // Add strengths
      for (const strength of latest.strengths) {
        allStrengths.push({
          category: category.name,
          slug: strength.subDimensionSlug,
          score: strength.score,
          description: strength.description,
        });
      }

      // Add growth areas
      for (const growth of latest.areasForGrowth) {
        allGrowthAreas.push({
          category: category.name,
          slug: growth.subDimensionSlug,
          score: growth.score,
          description: growth.description,
          recommendations: growth.recommendations,
        });
      }
    }

    // Sort by score
    allStrengths.sort((a, b) => b.score - a.score);
    allGrowthAreas.sort((a, b) => a.score - b.score);

    return {
      topStrengths: allStrengths.slice(0, 5),
      topGrowthAreas: allGrowthAreas.slice(0, 5),
      totalCategoriesCompleted: new Set(allStrengths.map((s) => s.category))
        .size,
      overallBalance:
        allStrengths.length > 0 && allGrowthAreas.length > 0
          ? "balanced"
          : allStrengths.length > allGrowthAreas.length
            ? "strength-heavy"
            : "growth-focused",
    };
  },
});

// ============================================================
// BENCHMARK COMPARISON
// ============================================================

/** Get user's percentile compared to others */
export const getPercentileComparison = query({
  args: {
    resultId: v.id("quizResults"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    const result = await ctx.db.get(args.resultId);
    if (!result || !user || result.userId !== user._id) return null;

    // Get benchmark stats
    const benchmark = await ctx.db
      .query("quizBenchmarkStats")
      .withIndex("by_categoryId_educationLevel", (q) =>
        q
          .eq("categoryId", result.categoryId)
          .eq("educationLevel", result.educationLevel),
      )
      .unique();

    if (!benchmark) {
      return {
        hasData: false,
        message: "Not enough data for comparison yet",
      };
    }

    // Calculate percentile
    const percentile = calculatePercentile(
      result.overallScore,
      benchmark.percentiles,
    );

    // Get sub-dimension percentiles
    const subDimensionPercentiles = result.subDimensionScores.map((score) => {
      const subDimBenchmark = benchmark.subDimensionBenchmarks.find(
        (b) => b.subDimensionSlug === score.slug,
      );

      return {
        slug: score.slug,
        name: score.name,
        score: score.normalizedScore,
        percentile: subDimBenchmark
          ? calculatePercentile(
              score.normalizedScore,
              subDimBenchmark.percentiles,
            )
          : null,
      };
    });

    return {
      hasData: true,
      overallPercentile: percentile,
      sampleSize: benchmark.sampleSize,
      mean: benchmark.mean,
      subDimensionPercentiles,
      interpretation: interpretPercentile(percentile),
    };
  },
});

function calculatePercentile(
  score: number,
  percentiles: Array<{ percentile: number; scoreThreshold: number }>,
): number {
  const sorted = [...percentiles].sort(
    (a, b) => a.scoreThreshold - b.scoreThreshold,
  );

  if (score <= sorted[0].scoreThreshold) {
    return sorted[0].percentile;
  }

  if (score >= sorted[sorted.length - 1].scoreThreshold) {
    return sorted[sorted.length - 1].percentile;
  }

  // Linear interpolation
  for (let i = 1; i < sorted.length; i++) {
    if (score <= sorted[i].scoreThreshold) {
      const lower = sorted[i - 1];
      const upper = sorted[i];
      const ratio =
        (score - lower.scoreThreshold) /
        (upper.scoreThreshold - lower.scoreThreshold);
      return Math.round(
        lower.percentile + ratio * (upper.percentile - lower.percentile),
      );
    }
  }

  return 50; // Default to median
}

function interpretPercentile(percentile: number): string {
  if (percentile >= 90) {
    return "Outstanding - You're in the top 10%!";
  } else if (percentile >= 75) {
    return "Excellent - You're performing above 75% of users";
  } else if (percentile >= 50) {
    return "Good - You're performing above average";
  } else if (percentile >= 25) {
    return "Developing - Room for growth with targeted practice";
  } else {
    return "Beginning - Great potential for improvement ahead";
  }
}
