import { v } from "convex/values";
import { mutation, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ============================================================
// SEED DATA - Quiz Categories and Sub-Dimensions
// ============================================================

/** Seed all quiz categories */
export const seedCategories = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if categories already exist
    const existing = await ctx.db.query("quizCategories").collect();
    if (existing.length > 0) {
      return { message: "Categories already seeded", count: existing.length };
    }

    const categories = [
      {
        slug: "study_habits",
        name: "Study Habits",
        description:
          "Discover your study patterns, environment preferences, and learning strategies to optimize your academic performance.",
        icon: "book-outline",
        color: "#4CAF50",
        order: 1,
        isActive: true,
        researchBasis: "MSLQ, Metacognitive Awareness Inventory",
      },
      {
        slug: "learning_style",
        name: "Learning Style",
        description:
          "Understand how you best absorb and process information - whether visual, auditory, kinesthetic, or reading/writing.",
        icon: "bulb-outline",
        color: "#2196F3",
        order: 2,
        isActive: true,
        researchBasis: "VARK Model, Kolb's Experiential Learning",
      },
      {
        slug: "motivation",
        name: "Motivation Profile",
        description:
          "Uncover what drives your academic success - intrinsic curiosity, achievement goals, or future aspirations.",
        icon: "flame",
        color: "#FF9800",
        order: 3,
        isActive: true,
        researchBasis: "Self-Determination Theory, MSLQ Motivation Scales",
      },
      {
        slug: "focus_attention",
        name: "Focus & Attention",
        description:
          "Assess your concentration abilities, attention span, and susceptibility to distractions during study sessions.",
        icon: "radio-button-on-outline",
        color: "#9C27B0",
        order: 4,
        isActive: true,
        researchBasis: "Attention Research, Flow State Psychology",
      },
      {
        slug: "goal_setting",
        name: "Goal Setting & Planning",
        description:
          "Evaluate your ability to set effective goals, create action plans, and monitor progress toward academic objectives.",
        icon: "flag",
        color: "#00BCD4",
        order: 5,
        isActive: true,
        researchBasis: "Locke & Latham Goal Setting Theory, Implementation Intentions",
      },
      {
        slug: "stress_anxiety",
        name: "Stress & Academic Anxiety",
        description:
          "Understand your stress responses, test anxiety levels, and coping mechanisms for academic pressure.",
        icon: "fitness-outline",
        color: "#E91E63",
        order: 6,
        isActive: true,
        researchBasis: "Test Anxiety Inventory, STAI, Academic Buoyancy Research",
      },
    ];

    const categoryIds: Record<string, Id<"quizCategories">> = {};

    for (const category of categories) {
      const id = await ctx.db.insert("quizCategories", category);
      categoryIds[category.slug] = id;
    }

    // Now seed sub-dimensions
    await seedSubDimensions(ctx, categoryIds);

    return {
      message: "Categories and sub-dimensions seeded successfully",
      count: categories.length,
    };
  },
});

/** Helper to seed sub-dimensions for all categories */
async function seedSubDimensions(
  ctx: any,
  categoryIds: Record<string, Id<"quizCategories">>
) {
  const subDimensions = [
    // STUDY HABITS
    {
      categoryId: categoryIds.study_habits,
      slug: "environment",
      name: "Study Environment",
      description:
        "Your physical study space preferences and ability to optimize your surroundings for learning.",
      weight: 0.15,
      order: 1,
    },
    {
      categoryId: categoryIds.study_habits,
      slug: "information_processing",
      name: "Information Processing",
      description:
        "How you take in, organize, and retain new information during study sessions.",
      weight: 0.2,
      order: 2,
    },
    {
      categoryId: categoryIds.study_habits,
      slug: "technology_use",
      name: "Technology Use",
      description:
        "How effectively you leverage digital tools and manage technology distractions.",
      weight: 0.15,
      order: 3,
    },
    {
      categoryId: categoryIds.study_habits,
      slug: "learning_strategies",
      name: "Learning Strategies",
      description:
        "Your use of active recall, spaced repetition, and other evidence-based study techniques.",
      weight: 0.25,
      order: 4,
    },
    {
      categoryId: categoryIds.study_habits,
      slug: "self_assessment",
      name: "Self-Assessment",
      description:
        "Your ability to accurately evaluate your own learning and adjust strategies accordingly.",
      weight: 0.15,
      order: 5,
    },
    {
      categoryId: categoryIds.study_habits,
      slug: "note_taking",
      name: "Note-Taking",
      description:
        "Your methods and effectiveness at capturing and organizing information from lectures and readings.",
      weight: 0.1,
      order: 6,
    },

    // LEARNING STYLE
    {
      categoryId: categoryIds.learning_style,
      slug: "visual",
      name: "Visual Learning",
      description:
        "Preference for diagrams, charts, maps, and visual representations of information.",
      weight: 0.2,
      order: 1,
    },
    {
      categoryId: categoryIds.learning_style,
      slug: "auditory",
      name: "Auditory Learning",
      description:
        "Preference for listening, discussion, and verbal explanations.",
      weight: 0.2,
      order: 2,
    },
    {
      categoryId: categoryIds.learning_style,
      slug: "kinesthetic",
      name: "Kinesthetic Learning",
      description:
        "Preference for hands-on activities, movement, and physical engagement with material.",
      weight: 0.2,
      order: 3,
    },
    {
      categoryId: categoryIds.learning_style,
      slug: "reading_writing",
      name: "Reading/Writing",
      description:
        "Preference for text-based learning through reading and written expression.",
      weight: 0.2,
      order: 4,
    },
    {
      categoryId: categoryIds.learning_style,
      slug: "social",
      name: "Social Learning",
      description:
        "Preference for collaborative learning, study groups, and peer discussion.",
      weight: 0.2,
      order: 5,
    },

    // MOTIVATION
    {
      categoryId: categoryIds.motivation,
      slug: "intrinsic",
      name: "Intrinsic Motivation",
      description:
        "Learning driven by curiosity, interest, and personal satisfaction.",
      weight: 0.2,
      order: 1,
    },
    {
      categoryId: categoryIds.motivation,
      slug: "achievement",
      name: "Achievement Drive",
      description:
        "Motivation from grades, recognition, and demonstrating competence.",
      weight: 0.2,
      order: 2,
    },
    {
      categoryId: categoryIds.motivation,
      slug: "social_motivation",
      name: "Social Motivation",
      description:
        "Motivation from family expectations, peer influence, and social connections.",
      weight: 0.15,
      order: 3,
    },
    {
      categoryId: categoryIds.motivation,
      slug: "future_goals",
      name: "Future Goals",
      description:
        "Motivation connected to career aspirations and long-term objectives.",
      weight: 0.2,
      order: 4,
    },
    {
      categoryId: categoryIds.motivation,
      slug: "autonomy",
      name: "Autonomy",
      description:
        "Need for independence and control over your learning experience.",
      weight: 0.15,
      order: 5,
    },
    {
      categoryId: categoryIds.motivation,
      slug: "competence",
      name: "Competence",
      description:
        "Drive to master skills and develop expertise in your field.",
      weight: 0.1,
      order: 6,
    },

    // FOCUS & ATTENTION
    {
      categoryId: categoryIds.focus_attention,
      slug: "sustained",
      name: "Sustained Attention",
      description:
        "Ability to maintain focus over extended periods without mental fatigue.",
      weight: 0.25,
      order: 1,
    },
    {
      categoryId: categoryIds.focus_attention,
      slug: "selective",
      name: "Selective Attention",
      description:
        "Ability to filter out distractions and focus on relevant information.",
      weight: 0.2,
      order: 2,
    },
    {
      categoryId: categoryIds.focus_attention,
      slug: "divided",
      name: "Divided Attention",
      description:
        "Ability to handle multiple tasks or information streams simultaneously.",
      weight: 0.15,
      order: 3,
    },
    {
      categoryId: categoryIds.focus_attention,
      slug: "alternating",
      name: "Alternating Attention",
      description:
        "Ability to switch focus between different tasks or topics efficiently.",
      weight: 0.15,
      order: 4,
    },
    {
      categoryId: categoryIds.focus_attention,
      slug: "deep_focus",
      name: "Deep Focus (Flow)",
      description:
        "Capacity to enter and maintain states of deep, immersive concentration.",
      weight: 0.15,
      order: 5,
    },
    {
      categoryId: categoryIds.focus_attention,
      slug: "environmental_sensitivity",
      name: "Environmental Sensitivity",
      description:
        "How much your focus is affected by environmental factors like noise and lighting.",
      weight: 0.1,
      order: 6,
    },

    // GOAL SETTING & PLANNING
    {
      categoryId: categoryIds.goal_setting,
      slug: "specificity",
      name: "Goal Specificity",
      description:
        "Ability to define clear, specific, and measurable academic goals.",
      weight: 0.2,
      order: 1,
    },
    {
      categoryId: categoryIds.goal_setting,
      slug: "challenge_level",
      name: "Challenge Level",
      description:
        "Tendency to set appropriately challenging vs. easy or overwhelming goals.",
      weight: 0.2,
      order: 2,
    },
    {
      categoryId: categoryIds.goal_setting,
      slug: "progress_monitoring",
      name: "Progress Monitoring",
      description:
        "Habits around tracking and reviewing progress toward goals.",
      weight: 0.2,
      order: 3,
    },
    {
      categoryId: categoryIds.goal_setting,
      slug: "implementation_intentions",
      name: "Implementation Intentions",
      description:
        "Use of if-then planning and specific action triggers for goal pursuit.",
      weight: 0.2,
      order: 4,
    },
    {
      categoryId: categoryIds.goal_setting,
      slug: "adjustment",
      name: "Goal Adjustment",
      description:
        "Flexibility in modifying goals based on feedback and changing circumstances.",
      weight: 0.2,
      order: 5,
    },

    // STRESS & ACADEMIC ANXIETY
    {
      categoryId: categoryIds.stress_anxiety,
      slug: "test_worry",
      name: "Test Worry",
      description:
        "Cognitive anxiety - intrusive thoughts and concerns about performance during exams.",
      weight: 0.2,
      order: 1,
    },
    {
      categoryId: categoryIds.stress_anxiety,
      slug: "emotionality",
      name: "Emotionality",
      description:
        "Physical symptoms of anxiety - racing heart, sweating, tension during academic stress.",
      weight: 0.2,
      order: 2,
    },
    {
      categoryId: categoryIds.stress_anxiety,
      slug: "coping_mechanisms",
      name: "Coping Mechanisms",
      description:
        "Strategies used to manage and reduce academic stress and anxiety.",
      weight: 0.2,
      order: 3,
    },
    {
      categoryId: categoryIds.stress_anxiety,
      slug: "resilience",
      name: "Resilience",
      description:
        "Ability to recover from academic setbacks and maintain perspective.",
      weight: 0.2,
      order: 4,
    },
    {
      categoryId: categoryIds.stress_anxiety,
      slug: "academic_buoyancy",
      name: "Academic Buoyancy",
      description:
        "Everyday resilience in handling typical academic challenges and pressures.",
      weight: 0.2,
      order: 5,
    },
  ];

  for (const subDim of subDimensions) {
    await ctx.db.insert("quizSubDimensions", subDim);
  }
}

/** Seed sample questions for testing */
export const seedTestQuestions = mutation({
  args: { categorySlug: v.string() },
  handler: async (ctx, args) => {
    // Get category
    const category = await ctx.db
      .query("quizCategories")
      .withIndex("by_slug", (q) => q.eq("slug", args.categorySlug))
      .unique();

    if (!category) {
      throw new Error("Category not found. Run seedCategories first.");
    }

    // Get sub-dimensions
    const subDimensions = await ctx.db
      .query("quizSubDimensions")
      .withIndex("by_categoryId", (q) => q.eq("categoryId", category._id))
      .collect();

    if (subDimensions.length === 0) {
      throw new Error("No sub-dimensions found. Run seedCategories first.");
    }

    // Check if questions already exist
    const existingQuestions = await ctx.db
      .query("quizQuestions")
      .withIndex("by_categoryId", (q) => q.eq("categoryId", category._id))
      .take(1);

    if (existingQuestions.length > 0) {
      return { message: "Questions already exist for this category" };
    }

    const now = new Date().toISOString();

    // Generate sample questions for each sub-dimension
    let questionCount = 0;
    for (const subDim of subDimensions) {
      const questions = generateSampleQuestions(
        category.slug,
        subDim.slug,
        category._id,
        subDim._id
      );

      for (const q of questions) {
        await ctx.db.insert("quizQuestions", {
          ...q,
          version: 1,
          createdAt: now,
          updatedAt: now,
          isActive: true,
        });
        questionCount++;
      }
    }

    return {
      message: `Seeded ${questionCount} questions for ${category.name}`,
      count: questionCount,
    };
  },
});

/** Generate sample questions for a sub-dimension */
function generateSampleQuestions(
  categorySlug: string,
  subDimSlug: string,
  categoryId: Id<"quizCategories">,
  subDimensionId: Id<"quizSubDimensions">
): any[] {
  // Likert 5-point options
  const likertOptions = [
    { value: 0, label: "Strongly Disagree" },
    { value: 1, label: "Disagree" },
    { value: 2, label: "Neutral" },
    { value: 3, label: "Agree" },
    { value: 4, label: "Strongly Agree" },
  ];

  const frequencyOptions = [
    { value: 0, label: "Never" },
    { value: 1, label: "Rarely" },
    { value: 2, label: "Sometimes" },
    { value: 3, label: "Often" },
    { value: 4, label: "Always" },
  ];

  // Sample question templates by sub-dimension
  const questionTemplates: Record<string, any[]> = {
    // Study Habits - Environment
    environment: [
      {
        text: "I have a dedicated space specifically for studying.",
        format: "likert_5",
        options: likertOptions,
      },
      {
        text: "My study area is free from distractions like TV and excessive noise.",
        format: "likert_5",
        options: likertOptions,
      },
      {
        text: "I keep my study materials organized and easily accessible.",
        format: "likert_5",
        options: likertOptions,
      },
      {
        text: "How often do you study in the same location?",
        format: "frequency",
        options: frequencyOptions,
      },
      {
        text: "I adjust my environment (lighting, temperature, etc.) to optimize my focus.",
        format: "likert_5",
        options: likertOptions,
      },
    ],

    // Study Habits - Information Processing
    information_processing: [
      {
        text: "I actively summarize information in my own words while studying.",
        format: "likert_5",
        options: likertOptions,
      },
      {
        text: "I create connections between new material and what I already know.",
        format: "likert_5",
        options: likertOptions,
      },
      {
        text: "I break down complex topics into smaller, manageable parts.",
        format: "likert_5",
        options: likertOptions,
      },
      {
        text: "How often do you review material within 24 hours of first learning it?",
        format: "frequency",
        options: frequencyOptions,
      },
      {
        text: "I ask myself questions about the material to test my understanding.",
        format: "likert_5",
        options: likertOptions,
      },
    ],

    // Study Habits - Learning Strategies
    learning_strategies: [
      {
        text: "I use spaced repetition (reviewing at increasing intervals) for memorization.",
        format: "likert_5",
        options: likertOptions,
      },
      {
        text: "I practice active recall by testing myself rather than just re-reading.",
        format: "likert_5",
        options: likertOptions,
      },
      {
        text: "I vary my study techniques based on the type of material.",
        format: "likert_5",
        options: likertOptions,
      },
      {
        text: "How often do you teach or explain concepts to others as a study method?",
        format: "frequency",
        options: frequencyOptions,
      },
      {
        text: "I use practice problems or past exams to prepare for tests.",
        format: "likert_5",
        options: likertOptions,
      },
    ],

    // Focus - Sustained Attention
    sustained: [
      {
        text: "I can study for long periods without feeling mentally exhausted.",
        format: "likert_5",
        options: likertOptions,
      },
      {
        text: "I maintain focus throughout an entire lecture or study session.",
        format: "likert_5",
        options: likertOptions,
      },
      {
        text: "My mind wanders frequently during study sessions.",
        format: "likert_5",
        options: likertOptions,
        isReversed: true,
      },
      {
        text: "How often do you complete study sessions without taking unplanned breaks?",
        format: "frequency",
        options: frequencyOptions,
      },
      {
        text: "I can maintain concentration on monotonous or repetitive study tasks.",
        format: "likert_5",
        options: likertOptions,
      },
    ],

    // Motivation - Intrinsic
    intrinsic: [
      {
        text: "I study subjects because I find them genuinely interesting.",
        format: "likert_5",
        options: likertOptions,
      },
      {
        text: "Learning new things gives me a sense of personal satisfaction.",
        format: "likert_5",
        options: likertOptions,
      },
      {
        text: "I pursue topics beyond what's required because I'm curious.",
        format: "likert_5",
        options: likertOptions,
      },
      {
        text: "I would study this subject even if it weren't required for my degree.",
        format: "likert_5",
        options: likertOptions,
      },
      {
        text: "The joy of learning motivates me more than grades or recognition.",
        format: "likert_5",
        options: likertOptions,
      },
    ],

    // Stress - Test Worry
    test_worry: [
      {
        text: "I worry about failing exams even when I've prepared well.",
        format: "likert_5",
        options: likertOptions,
      },
      {
        text: "During tests, I think about the consequences of doing poorly.",
        format: "likert_5",
        options: likertOptions,
      },
      {
        text: "I compare my performance to others during exams.",
        format: "likert_5",
        options: likertOptions,
      },
      {
        text: "My mind goes blank during tests even when I know the material.",
        format: "likert_5",
        options: likertOptions,
      },
      {
        text: "I have intrusive thoughts about failure during important exams.",
        format: "likert_5",
        options: likertOptions,
      },
    ],

    // Goal Setting - Specificity
    specificity: [
      {
        text: "I set specific, measurable academic goals (e.g., 'Achieve 85% in Chemistry').",
        format: "likert_5",
        options: likertOptions,
      },
      {
        text: "My study goals have clear deadlines and milestones.",
        format: "likert_5",
        options: likertOptions,
      },
      {
        text: "I know exactly what I need to accomplish in each study session.",
        format: "likert_5",
        options: likertOptions,
      },
      {
        text: "I write down my academic goals rather than just keeping them in my head.",
        format: "likert_5",
        options: likertOptions,
      },
      {
        text: "My goals are concrete enough that I can tell when I've achieved them.",
        format: "likert_5",
        options: likertOptions,
      },
    ],
  };

  // Get templates for this sub-dimension (or use default)
  const templates = questionTemplates[subDimSlug] || [
    {
      text: `I am effective at ${subDimSlug.replace(/_/g, " ")}.`,
      format: "likert_5",
      options: likertOptions,
    },
    {
      text: `How often do you practice ${subDimSlug.replace(/_/g, " ")} skills?`,
      format: "frequency",
      options: frequencyOptions,
    },
    {
      text: `I actively work to improve my ${subDimSlug.replace(/_/g, " ")}.`,
      format: "likert_5",
      options: likertOptions,
    },
    {
      text: `${subDimSlug.replace(/_/g, " ")} comes naturally to me.`,
      format: "likert_5",
      options: likertOptions,
    },
    {
      text: `I struggle with ${subDimSlug.replace(/_/g, " ")}.`,
      format: "likert_5",
      options: likertOptions,
      isReversed: true,
    },
  ];

  // Convert templates to question objects
  return templates.map((template, index) => ({
    questionId: `${categorySlug.toUpperCase()}_${subDimSlug.toUpperCase()}_${String(index + 1).padStart(3, "0")}`,
    categoryId,
    subDimensionId,
    questionText: template.text,
    questionFormat: template.format,
    options: template.options,
    weight: 3, // Default weight
    difficulty: 3, // Default difficulty
    isReversed: template.isReversed || false,
    educationLevels: ["high_school", "college", "graduate"],
  }));
}

/** Seed all test questions for all categories */
export const seedAllTestQuestions = mutation({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db
      .query("quizCategories")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();

    if (categories.length === 0) {
      throw new Error("No categories found. Run seedCategories first.");
    }

    let totalQuestions = 0;

    for (const category of categories) {
      // Get sub-dimensions
      const subDimensions = await ctx.db
        .query("quizSubDimensions")
        .withIndex("by_categoryId", (q) => q.eq("categoryId", category._id))
        .collect();

      // Check if questions already exist
      const existingQuestions = await ctx.db
        .query("quizQuestions")
        .withIndex("by_categoryId", (q) => q.eq("categoryId", category._id))
        .take(1);

      if (existingQuestions.length > 0) {
        continue; // Skip if already seeded
      }

      const now = new Date().toISOString();

      // Generate questions for each sub-dimension
      for (const subDim of subDimensions) {
        const questions = generateSampleQuestions(
          category.slug,
          subDim.slug,
          category._id,
          subDim._id
        );

        for (const q of questions) {
          await ctx.db.insert("quizQuestions", {
            ...q,
            version: 1,
            createdAt: now,
            updatedAt: now,
            isActive: true,
          });
          totalQuestions++;
        }
      }
    }

    return {
      message: `Seeded ${totalQuestions} questions across ${categories.length} categories`,
      count: totalQuestions,
    };
  },
});

/** Update category icons to valid Ionicons */
export const updateCategoryIcons = mutation({
  args: {},
  handler: async (ctx) => {
    const iconMap: Record<string, string> = {
      study_habits: "book-outline",
      learning_style: "bulb-outline",
      motivation: "flame",
      focus_attention: "radio-button-on-outline",
      goal_setting: "flag",
      stress_anxiety: "fitness-outline",
    };

    const categories = await ctx.db.query("quizCategories").collect();
    let updated = 0;

    for (const category of categories) {
      const newIcon = iconMap[category.slug];
      if (newIcon && category.icon !== newIcon) {
        await ctx.db.patch(category._id, { icon: newIcon });
        updated++;
      }
    }

    return {
      message: `Updated ${updated} category icons`,
      count: updated,
    };
  },
});

/** Reset all quiz data (for development) */
export const resetQuizData = mutation({
  args: { confirmReset: v.boolean() },
  handler: async (ctx, args) => {
    if (!args.confirmReset) {
      return { message: "Reset cancelled. Pass confirmReset: true to proceed." };
    }

    // Delete in order to respect foreign keys
    const tables = [
      "quizNoraMemories",
      "quizRecommendationTriggers",
      "quizProgressHistory",
      "quizBenchmarkStats",
      "quizResponses",
      "quizResults",
      "quizSessions",
      "quizQuestions",
      "quizSubDimensions",
      "quizCategories",
    ];

    let totalDeleted = 0;

    for (const tableName of tables) {
      const records = await ctx.db.query(tableName as any).collect();
      for (const record of records) {
        await ctx.db.delete(record._id);
        totalDeleted++;
      }
    }

    return {
      message: `Reset complete. Deleted ${totalDeleted} records.`,
      count: totalDeleted,
    };
  },
});
