/**
 * Bulk load questions from quizQuestionData.ts into the Convex database.
 *
 * Run with: npx convex run quizBulkLoad:loadAllQuestions
 */

import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { ALL_QUESTION_SETS, getOptionsForFormat } from "./quizQuestionData";

// Mapping from question set keys to category slugs
const CATEGORY_SLUG_MAP: Record<string, string> = {
  study_habits: "study_habits",
  learning_style: "learning_style",
  motivation: "motivation",
  focus_attention: "focus_attention",
  goal_setting: "goal_setting",
  stress_anxiety: "stress_anxiety",
};

// Mapping from sub-dimension keys to slugs (matching quizSeed.ts)
const SUB_DIMENSION_MAP: Record<string, Record<string, string>> = {
  study_habits: {
    environment: "environment",
    information_processing: "information_processing",
    technology_use: "technology_use",
    learning_strategies: "learning_strategies",
    self_assessment: "self_assessment",
    note_taking: "note_taking",
  },
  learning_style: {
    visual: "visual",
    auditory: "auditory",
    kinesthetic: "kinesthetic",
    reading_writing: "reading_writing",
    social: "social",
  },
  motivation: {
    intrinsic: "intrinsic",
    achievement: "achievement",
    social_motivation: "social_motivation",
    future_goals: "future_goals",
    autonomy: "autonomy",
    competence: "competence",
  },
  focus_attention: {
    sustained: "sustained",
    selective: "selective",
    divided: "divided",
    alternating: "alternating",
    deep_focus: "deep_focus",
    environmental_sensitivity: "environmental_sensitivity",
  },
  goal_setting: {
    specificity: "specificity",
    challenge_level: "challenge_level",
    progress_monitoring: "progress_monitoring",
    implementation_intentions: "implementation_intentions",
    adjustment: "adjustment",
  },
  stress_anxiety: {
    test_worry: "test_worry",
    emotionality: "emotionality",
    coping_mechanisms: "coping_mechanisms",
    resilience: "resilience",
    academic_buoyancy: "academic_buoyancy",
  },
};

/** Load all questions for all categories */
export const loadAllQuestions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const results: Record<string, number> = {};
    let totalLoaded = 0;

    for (const [categoryKey, questionSets] of Object.entries(
      ALL_QUESTION_SETS,
    )) {
      const categorySlug = CATEGORY_SLUG_MAP[categoryKey];

      // Get category ID
      const category = await ctx.db
        .query("quizCategories")
        .withIndex("by_slug", (q) => q.eq("slug", categorySlug))
        .unique();

      if (!category) {
        // Category not found, skip
        continue;
      }

      let categoryCount = 0;

      for (const [subDimKey, questions] of Object.entries(questionSets)) {
        const subDimSlug =
          SUB_DIMENSION_MAP[categoryKey]?.[subDimKey] || subDimKey;

        // Get sub-dimension ID
        const subDimensions = await ctx.db
          .query("quizSubDimensions")
          .withIndex("by_categoryId", (q) => q.eq("categoryId", category._id))
          .collect();

        const subDim = subDimensions.find((sd) => sd.slug === subDimSlug);

        if (!subDim) {
          // Sub-dimension not found, skip
          continue;
        }

        const now = new Date().toISOString();

        for (let i = 0; i < (questions as any[]).length; i++) {
          const q = (questions as any[])[i];
          const questionId = `${categorySlug.toUpperCase()}_${subDimSlug.toUpperCase()}_${String(i + 1).padStart(3, "0")}`;

          // Check if question already exists
          const existing = await ctx.db
            .query("quizQuestions")
            .withIndex("by_questionId", (qb) => qb.eq("questionId", questionId))
            .unique();

          if (existing) {
            continue; // Skip existing questions
          }

          // Insert question
          await ctx.db.insert("quizQuestions", {
            questionId,
            categoryId: category._id,
            subDimensionId: subDim._id,
            questionText: q.text,
            questionFormat: q.format,
            options: getOptionsForFormat(q.format),
            weight: q.weight || 3,
            difficulty: 3, // Default difficulty
            isReversed: q.isReversed || false,
            educationLevels: ["high_school", "college", "graduate"],
            version: 1,
            createdAt: now,
            updatedAt: now,
            isActive: true,
          });

          categoryCount++;
          totalLoaded++;
        }
      }

      results[categorySlug] = categoryCount;
    }

    // Update question counts on categories
    for (const [categorySlug, count] of Object.entries(results)) {
      const category = await ctx.db
        .query("quizCategories")
        .withIndex("by_slug", (q) => q.eq("slug", categorySlug))
        .unique();

      if (category) {
        const allQuestions = await ctx.db
          .query("quizQuestions")
          .withIndex("by_categoryId_isActive", (q) =>
            q.eq("categoryId", category._id).eq("isActive", true),
          )
          .collect();

        await ctx.db.patch(category._id, {
          questionsCount: allQuestions.length,
        });
      }
    }

    return {
      message: `Loaded ${totalLoaded} new questions across ${Object.keys(results).length} categories`,
      breakdown: results,
      total: totalLoaded,
    };
  },
});

/** Load questions for a specific category */
export const loadQuestionsForCategory = internalMutation({
  args: { categorySlug: v.string() },
  handler: async (ctx, args) => {
    const categoryKey = Object.entries(CATEGORY_SLUG_MAP).find(
      ([_, slug]) => slug === args.categorySlug,
    )?.[0];

    if (!categoryKey) {
      throw new Error(`Unknown category slug: ${args.categorySlug}`);
    }

    const questionSets = (ALL_QUESTION_SETS as any)[categoryKey];
    if (!questionSets) {
      throw new Error(`No questions found for category: ${args.categorySlug}`);
    }

    // Get category ID
    const category = await ctx.db
      .query("quizCategories")
      .withIndex("by_slug", (q) => q.eq("slug", args.categorySlug))
      .unique();

    if (!category) {
      throw new Error(`Category not found: ${args.categorySlug}`);
    }

    let totalLoaded = 0;
    const now = new Date().toISOString();

    for (const [subDimKey, questions] of Object.entries(questionSets)) {
      const subDimSlug =
        SUB_DIMENSION_MAP[categoryKey]?.[subDimKey] || subDimKey;

      // Get sub-dimension ID
      const subDimensions = await ctx.db
        .query("quizSubDimensions")
        .withIndex("by_categoryId", (q) => q.eq("categoryId", category._id))
        .collect();

      const subDim = subDimensions.find((sd) => sd.slug === subDimSlug);

      if (!subDim) {
        // Sub-dimension not found, skip
        continue;
      }

      for (let i = 0; i < (questions as any[]).length; i++) {
        const q = (questions as any[])[i];
        const questionId = `${args.categorySlug.toUpperCase()}_${subDimSlug.toUpperCase()}_${String(i + 1).padStart(3, "0")}`;

        // Check if question already exists
        const existing = await ctx.db
          .query("quizQuestions")
          .withIndex("by_questionId", (qb) => qb.eq("questionId", questionId))
          .unique();

        if (existing) {
          continue;
        }

        // Insert question
        await ctx.db.insert("quizQuestions", {
          questionId,
          categoryId: category._id,
          subDimensionId: subDim._id,
          questionText: q.text,
          questionFormat: q.format,
          options: getOptionsForFormat(q.format),
          weight: q.weight || 3,
          difficulty: 3,
          isReversed: q.isReversed || false,
          educationLevels: ["high_school", "college", "graduate"],
          version: 1,
          createdAt: now,
          updatedAt: now,
          isActive: true,
        });

        totalLoaded++;
      }
    }

    // Update question count on category
    const allQuestions = await ctx.db
      .query("quizQuestions")
      .withIndex("by_categoryId_isActive", (q) =>
        q.eq("categoryId", category._id).eq("isActive", true),
      )
      .collect();

    await ctx.db.patch(category._id, {
      questionsCount: allQuestions.length,
    });

    return {
      message: `Loaded ${totalLoaded} new questions for ${args.categorySlug}`,
      count: totalLoaded,
      totalInCategory: allQuestions.length,
    };
  },
});

/** Get question counts per category */
export const getQuestionStats = internalMutation({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db
      .query("quizCategories")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();

    const stats: Record<
      string,
      { total: number; bySubDimension: Record<string, number> }
    > = {};

    for (const category of categories) {
      const questions = await ctx.db
        .query("quizQuestions")
        .withIndex("by_categoryId_isActive", (q) =>
          q.eq("categoryId", category._id).eq("isActive", true),
        )
        .collect();

      const subDimensions = await ctx.db
        .query("quizSubDimensions")
        .withIndex("by_categoryId", (q) => q.eq("categoryId", category._id))
        .collect();

      const bySubDim: Record<string, number> = {};
      for (const subDim of subDimensions) {
        bySubDim[subDim.slug] = questions.filter(
          (q) => q.subDimensionId.toString() === subDim._id.toString(),
        ).length;
      }

      stats[category.slug] = {
        total: questions.length,
        bySubDimension: bySubDim,
      };
    }

    return stats;
  },
});
