import { v } from "convex/values";
import { query, mutation, QueryCtx } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrNull } from "./users";
import { Doc, Id } from "./_generated/dataModel";

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/** Shuffle array using Fisher-Yates algorithm */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ============================================================
// CATEGORY QUERIES
// ============================================================

/** Get all active quiz categories */
export const getCategories = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db
      .query("quizCategories")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();

    return categories.sort((a, b) => a.order - b.order);
  },
});

/** Get a single category by slug */
export const getCategoryBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("quizCategories")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

/** Get sub-dimensions for a category */
export const getSubDimensions = query({
  args: { categoryId: v.id("quizCategories") },
  handler: async (ctx, args) => {
    const subDimensions = await ctx.db
      .query("quizSubDimensions")
      .withIndex("by_categoryId", (q) => q.eq("categoryId", args.categoryId))
      .collect();

    return subDimensions.sort((a, b) => a.order - b.order);
  },
});

// ============================================================
// QUESTION SELECTION
// ============================================================

/** Get random questions for a quiz session with balanced sub-dimension coverage */
export const getRandomQuestionsForSession = query({
  args: {
    categorySlug: v.string(),
    educationLevel: v.string(), // 'high_school' | 'college' | 'graduate'
    questionsCount: v.number(), // e.g., 15, 30, 50
    sessionType: v.string(), // 'full' | 'quick' | 'adaptive'
    excludeRecentDays: v.optional(v.number()), // Don't repeat questions from last N days
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);

    // 1. Get the category
    const category = await ctx.db
      .query("quizCategories")
      .withIndex("by_slug", (q) => q.eq("slug", args.categorySlug))
      .unique();

    if (!category) throw new Error("Category not found");

    // 2. Get sub-dimensions for this category
    const subDimensions = await ctx.db
      .query("quizSubDimensions")
      .withIndex("by_categoryId", (q) => q.eq("categoryId", category._id))
      .collect();

    // 3. Get all active questions for this category
    const allQuestions = await ctx.db
      .query("quizQuestions")
      .withIndex("by_categoryId_isActive", (q) =>
        q.eq("categoryId", category._id).eq("isActive", true)
      )
      .collect();

    // Filter by education level
    const eligibleQuestions = allQuestions.filter((q) =>
      q.educationLevels.includes(args.educationLevel)
    );

    // 4. Get recently answered questions to exclude (if user is logged in)
    const excludedQuestionIds = new Set<string>();
    if (user && args.excludeRecentDays && args.excludeRecentDays > 0) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - args.excludeRecentDays);

      const recentResponses = await ctx.db
        .query("quizResponses")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .collect();

      const recentFiltered = recentResponses.filter(
        (r) => new Date(r.answeredAt) >= cutoffDate
      );

      for (const response of recentFiltered) {
        const question = await ctx.db.get(response.questionId);
        if (question) excludedQuestionIds.add(question.questionId);
      }
    }

    // Filter out excluded questions
    const availableQuestions = eligibleQuestions.filter(
      (q) => !excludedQuestionIds.has(q.questionId)
    );

    // 5. Balanced selection across sub-dimensions
    const selectedQuestions = selectBalancedQuestions(
      availableQuestions,
      subDimensions,
      args.questionsCount,
      args.sessionType
    );

    // 6. Shuffle final selection
    const shuffled = shuffleArray(selectedQuestions);

    // 7. Apply education-level adaptations if available
    return shuffled.map((q) => {
      const adapted = q.adaptedVersions?.find(
        (v) => v.educationLevel === args.educationLevel
      );

      return {
        _id: q._id,
        questionId: q.questionId,
        questionText: adapted?.questionText || q.questionText,
        questionFormat: q.questionFormat,
        options: adapted?.options || q.options,
        weight: q.weight,
        difficulty: q.difficulty,
        subDimensionId: q.subDimensionId,
        categoryId: q.categoryId,
      };
    });
  },
});

/** Helper: Select questions with balanced sub-dimension coverage */
function selectBalancedQuestions(
  questions: Doc<"quizQuestions">[],
  subDimensions: Doc<"quizSubDimensions">[],
  targetCount: number,
  sessionType: string
): Doc<"quizQuestions">[] {
  const selected: Doc<"quizQuestions">[] = [];
  const subDimMap = new Map<string, Doc<"quizQuestions">[]>();

  // Group questions by sub-dimension
  for (const q of questions) {
    const subDimId = q.subDimensionId.toString();
    if (!subDimMap.has(subDimId)) {
      subDimMap.set(subDimId, []);
    }
    subDimMap.get(subDimId)!.push(q);
  }

  // Calculate questions per sub-dimension (weighted by sub-dimension weight)
  const totalWeight = subDimensions.reduce((sum, sd) => sum + sd.weight, 0);
  const subDimTargets = subDimensions.map((sd) => ({
    id: sd._id.toString(),
    target: Math.max(1, Math.round((sd.weight / totalWeight) * targetCount)),
    selected: 0,
  }));

  // Adjust targets to match total count
  let totalTargets = subDimTargets.reduce((sum, t) => sum + t.target, 0);
  while (totalTargets !== targetCount) {
    if (totalTargets > targetCount) {
      // Reduce from highest target
      const highest = subDimTargets.reduce((max, t) =>
        t.target > max.target ? t : max
      );
      highest.target--;
      totalTargets--;
    } else {
      // Increase lowest target
      const lowest = subDimTargets.reduce((min, t) =>
        t.target < min.target ? t : min
      );
      lowest.target++;
      totalTargets++;
    }
  }

  // Select questions for each sub-dimension
  for (const target of subDimTargets) {
    const subDimQuestions = subDimMap.get(target.id) || [];
    let shuffled = shuffleArray([...subDimQuestions]);

    // For adaptive sessions, prefer higher weight questions
    if (sessionType === "adaptive") {
      shuffled.sort((a, b) => b.weight - a.weight);
    }

    const toSelect = shuffled.slice(0, target.target);
    selected.push(...toSelect);
  }

  return selected;
}

// ============================================================
// QUESTION MANAGEMENT (Admin)
// ============================================================

/** Add a new question to the database */
export const addQuestion = mutation({
  args: {
    questionId: v.string(),
    categoryId: v.id("quizCategories"),
    subDimensionId: v.id("quizSubDimensions"),
    questionText: v.string(),
    questionFormat: v.string(),
    options: v.array(
      v.object({
        value: v.number(),
        label: v.string(),
        scoringWeight: v.optional(v.number()),
      })
    ),
    weight: v.number(),
    difficulty: v.number(),
    isReversed: v.boolean(),
    educationLevels: v.array(v.string()),
    adaptedVersions: v.optional(
      v.array(
        v.object({
          educationLevel: v.string(),
          questionText: v.string(),
          options: v.array(
            v.object({
              value: v.number(),
              label: v.string(),
            })
          ),
        })
      )
    ),
    researchCitations: v.optional(
      v.array(
        v.object({
          authors: v.string(),
          year: v.number(),
          title: v.string(),
          journal: v.optional(v.string()),
          doi: v.optional(v.string()),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();

    return await ctx.db.insert("quizQuestions", {
      ...args,
      version: 1,
      createdAt: now,
      updatedAt: now,
      isActive: true,
    });
  },
});

/** Bulk add questions */
export const bulkAddQuestions = mutation({
  args: {
    questions: v.array(
      v.object({
        questionId: v.string(),
        categoryId: v.id("quizCategories"),
        subDimensionId: v.id("quizSubDimensions"),
        questionText: v.string(),
        questionFormat: v.string(),
        options: v.array(
          v.object({
            value: v.number(),
            label: v.string(),
            scoringWeight: v.optional(v.number()),
          })
        ),
        weight: v.number(),
        difficulty: v.number(),
        isReversed: v.boolean(),
        educationLevels: v.array(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const insertedIds: Id<"quizQuestions">[] = [];

    for (const q of args.questions) {
      const id = await ctx.db.insert("quizQuestions", {
        ...q,
        version: 1,
        createdAt: now,
        updatedAt: now,
        isActive: true,
      });
      insertedIds.push(id);
    }

    return insertedIds;
  },
});

/** Update a question */
export const updateQuestion = mutation({
  args: {
    questionId: v.id("quizQuestions"),
    questionText: v.optional(v.string()),
    options: v.optional(
      v.array(
        v.object({
          value: v.number(),
          label: v.string(),
          scoringWeight: v.optional(v.number()),
        })
      )
    ),
    weight: v.optional(v.number()),
    difficulty: v.optional(v.number()),
    isReversed: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { questionId, ...updates } = args;
    const question = await ctx.db.get(questionId);
    if (!question) throw new Error("Question not found");

    const cleanUpdates: Record<string, any> = {
      updatedAt: new Date().toISOString(),
      version: question.version + 1,
    };

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) cleanUpdates[key] = value;
    }

    await ctx.db.patch(questionId, cleanUpdates);
  },
});

/** Deprecate a question (soft delete) */
export const deprecateQuestion = mutation({
  args: {
    questionId: v.id("quizQuestions"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.questionId, {
      isActive: false,
      deprecatedAt: new Date().toISOString(),
      deprecationReason: args.reason,
    });
  },
});

/** Get question count per category */
export const getQuestionCounts = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db
      .query("quizCategories")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();

    const counts: Record<string, number> = {};

    for (const category of categories) {
      const questions = await ctx.db
        .query("quizQuestions")
        .withIndex("by_categoryId_isActive", (q) =>
          q.eq("categoryId", category._id).eq("isActive", true)
        )
        .collect();
      counts[category.slug] = questions.length;
    }

    return counts;
  },
});
