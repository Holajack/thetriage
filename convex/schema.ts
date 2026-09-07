import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ============================================================
  // CORE USER TABLES
  // ============================================================

  users: defineTable({
    // Clerk identity
    clerkId: v.string(),
    email: v.string(),
    username: v.optional(v.string()),
    fullName: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    // Profile fields
    bio: v.optional(v.string()),
    university: v.optional(v.string()),
    major: v.optional(v.string()),
    location: v.optional(v.string()),
    classes: v.optional(v.string()),
    website: v.optional(v.string()),
    timeZone: v.optional(v.string()),
    status: v.optional(v.string()), // 'active' | 'inactive'
    soundPreference: v.optional(v.string()),
    // Focus settings
    weeklyFocusGoal: v.optional(v.number()),
    focusDuration: v.optional(v.number()),
    breakDuration: v.optional(v.number()),
    workStyle: v.optional(v.string()), // 'balanced' | 'sprint' | 'deepwork'
    // Privacy visibility
    fullNameVisibility: v.optional(v.string()),
    universityVisibility: v.optional(v.string()),
    locationVisibility: v.optional(v.string()),
    classesVisibility: v.optional(v.string()),
    // Subscription
    subscriptionTier: v.optional(v.string()), // 'free' | 'basic' | 'pro' | 'elite' (legacy rows: 'trial'→free, 'premium'→pro — see tiers.ts)
    subscriptionOverride: v.optional(v.boolean()), // true = manual override, skip RevenueCat sync
    subscriptionStatus: v.optional(v.string()),
    trialStartedAt: v.optional(v.string()),
    trialEndsAt: v.optional(v.string()),
    subscriptionStartedAt: v.optional(v.string()),
    subscriptionEndsAt: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    // Environment theme
    environmentTheme: v.optional(v.string()), // 'home' | 'office' | 'library' | 'coffee' | 'park'
    // Trail buddy / gamification
    dailyReminder: v.optional(v.string()), // HH:MM format
    trailBuddyType: v.optional(v.string()), // 'fox' | 'bear' | 'deer' | 'nora' | 'wolf'
    trailBuddyName: v.optional(v.string()),
    flintCurrency: v.optional(v.number()),
    firstSessionBonusClaimed: v.optional(v.boolean()),
    // Presence tracking
    lastSeen: v.optional(v.number()), // Unix timestamp
    isOnline: v.optional(v.boolean()),
    // Acquisition attribution, captured once. Without this we cannot tell an
    // invited user from an organic one.
    signupSource: v.optional(v.string()), // "invite" | "qr" | "organic" | campaign tag
    referredByUserId: v.optional(v.id("users")),
    // Age policy (see age.ts): month and year only, written once at signup.
    birthYear: v.optional(v.number()),
    birthMonth: v.optional(v.number()),
    ageConfirmedAt: v.optional(v.string()),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_email", ["email"])
    .index("by_username", ["username"]),

  // ============================================================
  // ONBOARDING
  // ============================================================

  onboardingPreferences: defineTable({
    userId: v.id("users"),
    isOnboardingComplete: v.optional(v.boolean()),
    weeklyFocusGoal: v.optional(v.number()),
    welcomeCompleted: v.optional(v.boolean()),
    goalsSet: v.optional(v.boolean()),
    firstSessionCompleted: v.optional(v.boolean()),
    profileCustomized: v.optional(v.boolean()),
    bio: v.optional(v.string()),
    allowDirectMessages: v.optional(v.boolean()),
    avatarUrl: v.optional(v.string()),
    focusMethod: v.optional(v.string()),
    educationLevel: v.optional(v.string()),
    university: v.optional(v.string()),
    major: v.optional(v.string()),
    location: v.optional(v.string()),
    timezone: v.optional(v.string()),
    // Preferences screen fields
    userGoal: v.optional(v.string()),
    workStyle: v.optional(v.string()),
    learningEnvironment: v.optional(v.string()),
    soundPreference: v.optional(v.string()),
    // Privacy preferences
    dataCollectionConsent: v.optional(v.boolean()),
    personalizedRecommendations: v.optional(v.boolean()),
    usageAnalytics: v.optional(v.boolean()),
    marketingCommunications: v.optional(v.boolean()),
    profileVisibility: v.optional(v.string()), // 'friends' | 'public' | 'private'
    studyDataSharing: v.optional(v.boolean()),
    showStudyProgress: v.optional(v.boolean()),
    appearOnLeaderboards: v.optional(v.boolean()),
    studySessionVisibility: v.optional(v.string()),
    publicStudyRooms: v.optional(v.boolean()),
    locationSharingPreference: v.optional(v.string()),
    receiveStudyInvitations: v.optional(v.boolean()),
    emailNotificationPreference: v.optional(v.boolean()),
    shareAnonymousAnalytics: v.optional(v.boolean()),
    personalizedRecommendationsPreference: v.optional(v.boolean()),
    completedAt: v.optional(v.string()),
  }).index("by_userId", ["userId"]),

  // ============================================================
  // USER SETTINGS
  // ============================================================

  userSettings: defineTable({
    userId: v.id("users"),
    notificationsEnabled: v.optional(v.boolean()),
    autoPlaySound: v.optional(v.boolean()),
    soundEnabled: v.optional(v.boolean()),
    musicVolume: v.optional(v.number()),
    autoStartFocus: v.optional(v.boolean()),
    autoDndFocus: v.optional(v.boolean()),
    ttsEnabled: v.optional(v.boolean()),
    highContrast: v.optional(v.boolean()),
    reduceMotion: v.optional(v.boolean()),
    dailyReminder: v.optional(v.string()), // HH:MM
    sessionEndReminder: v.optional(v.boolean()),
    // Per-category notification toggles
    notifFriendRequests: v.optional(v.boolean()),
    notifFriendMessages: v.optional(v.boolean()),
    notifStudyRoomInvites: v.optional(v.boolean()),
    notifQrScans: v.optional(v.boolean()),
    studyRemindersEnabled: v.optional(v.boolean()),
    weeklyGoalRemindersEnabled: v.optional(v.boolean()),
    weeklyGoalReminderDays: v.optional(v.array(v.string())),
    focusSessionWarningsEnabled: v.optional(v.boolean()),
    appUpdatesEnabled: v.optional(v.boolean()),
    // AI feature toggles (noraEnabled/patrickEnabled/insightsEnabled/
    // personalizedResponses are legacy — superseded by the two Nora toggles below)
    noraEnabled: v.optional(v.boolean()),
    patrickEnabled: v.optional(v.boolean()),
    insightsEnabled: v.optional(v.boolean()),
    personalizedResponses: v.optional(v.boolean()),
    // Nora privacy toggles (Elite): app access & memory (default ON),
    // training consent (default OFF, opt-in)
    noraAppAccess: v.optional(v.boolean()),
    noraTrainingConsent: v.optional(v.boolean()),
    dailyGoalMinutes: v.optional(v.number()),
    preferredSessionLength: v.optional(v.number()),
    breakLength: v.optional(v.number()),
    theme: v.optional(v.string()), // 'light' | 'dark' | 'system'
    reminderFrequency: v.optional(v.string()),
    privacyMode: v.optional(v.boolean()),
    autoStartBreaks: v.optional(v.boolean()),
    showMotivationalQuotes: v.optional(v.boolean()),
    // Ambient sound layer toggles
    ambientEnvironmentEnabled: v.optional(v.boolean()),
    ambientWhiteNoiseEnabled: v.optional(v.boolean()),
    ambientCrittersEnabled: v.optional(v.boolean()),
    ambientVolume: v.optional(v.number()),
    // Music service preferences
    preferredMusicService: v.optional(v.string()), // 'local' | 'spotify' | 'apple-music'
    spotifyConnected: v.optional(v.boolean()),
    appleMusicConnected: v.optional(v.boolean()),
  }).index("by_userId", ["userId"]),

  // ============================================================
  // TASKS & SUBTASKS
  // ============================================================

  tasks: defineTable({
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    priority: v.optional(v.string()), // 'low' | 'medium' | 'high'
    status: v.optional(v.string()), // 'pending' | 'in_progress' | 'completed' | 'cancelled'
    // The client has always called this "subject" (it drives the brain map and
    // the pre-session subject picker); `category` is the legacy column name.
    subject: v.optional(v.string()),
    category: v.optional(v.string()),
    estimatedMinutes: v.optional(v.number()),
    actualMinutes: v.optional(v.number()),
    dueDate: v.optional(v.string()),
    completedAt: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_status", ["userId", "status"]),

  subtasks: defineTable({
    taskId: v.id("tasks"),
    userId: v.id("users"),
    title: v.optional(v.string()),
    text: v.optional(v.string()),
    completed: v.optional(v.boolean()),
  })
    .index("by_taskId", ["taskId"])
    .index("by_userId", ["userId"]),

  // ============================================================
  // SUBJECTS
  // ============================================================

  subjects: defineTable({
    userId: v.id("users"),
    name: v.string(),
    color: v.optional(v.string()),
  }).index("by_userId", ["userId"]),

  // ============================================================
  // FOCUS SESSIONS
  // ============================================================

  focusSessions: defineTable({
    userId: v.id("users"),
    roomId: v.optional(v.id("studyRooms")),
    startTime: v.string(),
    endTime: v.optional(v.string()),
    durationSeconds: v.optional(v.number()),
    sessionType: v.optional(v.string()), // 'individual' | 'group' | 'deep_work' | 'balanced' | 'sprint'
    status: v.optional(v.string()), // 'active' | 'paused' | 'completed' | 'cancelled'
    subject: v.optional(v.string()), // Topic/subject for analytics tracking
    taskId: v.optional(v.id("tasks")), // Associated task if any

    // Paused time must be excluded from the credited duration, or a user who
    // pauses for two hours is paid for two hours of focus.
    pausedAt: v.optional(v.number()), // epoch ms of the current pause, if paused
    totalPausedSeconds: v.optional(v.number()), // accumulated across all pauses

    /** One break may be banked per session (drives the break achievements). */
    breakRecorded: v.optional(v.boolean()),

    // Post-session reflection, captured on the session report.
    rating: v.optional(v.number()), // 1-5 focus rating
    productivityRating: v.optional(v.number()), // 1-5
    notes: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_status", ["userId", "status"])
    .index("by_status", ["status"]),

  // ============================================================
  // STUDY ROOMS
  // ============================================================

  studyRooms: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    ownerId: v.id("users"),
    isPublic: v.optional(v.boolean()),
    maxParticipants: v.optional(v.number()),
    currentParticipants: v.optional(v.number()),
    roomCode: v.string(),
    subject: v.optional(v.string()),
    sessionDuration: v.optional(v.number()),
    breakDuration: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    // Public rooms are browsed by age group: teens see teen rooms, adults see
    // adult rooms. Missing = adult (rooms created before the age policy).
    audience: v.optional(v.union(v.literal("teen"), v.literal("adult"))),
  })
    .index("by_ownerId", ["ownerId"])
    .index("by_roomCode", ["roomCode"])
    .index("by_isActive", ["isActive"]),

  studyRoomParticipants: defineTable({
    roomId: v.id("studyRooms"),
    userId: v.id("users"),
    joinedAt: v.string(),
    leftAt: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    role: v.optional(v.string()), // 'owner' | 'moderator' | 'participant'
  })
    .index("by_roomId", ["roomId"])
    .index("by_userId", ["userId"])
    .index("by_roomId_userId", ["roomId", "userId"]),

  studyRoomMessages: defineTable({
    roomId: v.id("studyRooms"),
    senderId: v.id("users"),
    content: v.string(),
    messageType: v.optional(v.string()), // 'text' | 'system' | 'join' | 'leave'
  }).index("by_roomId", ["roomId"]),

  studyRoomInvitations: defineTable({
    roomId: v.id("studyRooms"),
    senderId: v.id("users"),
    recipientId: v.id("users"),
    status: v.optional(v.string()), // 'pending' | 'accepted' | 'declined'
    message: v.optional(v.string()),
    respondedAt: v.optional(v.string()),
  })
    .index("by_roomId", ["roomId"])
    .index("by_recipientId", ["recipientId"])
    .index("by_roomId_recipientId", ["roomId", "recipientId"]),

  // ============================================================
  // FRIENDS & SOCIAL
  // ============================================================

  friends: defineTable({
    userId: v.id("users"),
    friendId: v.id("users"),
  })
    .index("by_userId", ["userId"])
    .index("by_friendId", ["friendId"]),

  friendRequests: defineTable({
    senderId: v.id("users"),
    recipientId: v.id("users"),
    status: v.optional(v.string()), // 'pending' | 'accepted' | 'declined'
    message: v.optional(v.string()),
    respondedAt: v.optional(v.string()),
  })
    .index("by_senderId", ["senderId"])
    .index("by_recipientId", ["recipientId"])
    .index("by_recipientId_status", ["recipientId", "status"]),

  // Bearer codes a user hands out (QR code, invite link) so an adult may send
  // them a friend request. Teens never appear in search, so this is the one
  // door in, and the teen is the one who opens it.
  friendInviteCodes: defineTable({
    userId: v.id("users"),
    code: v.string(),
    expiresAt: v.number(), // Unix ms
  })
    .index("by_code", ["code"])
    .index("by_userId", ["userId"]),

  // ============================================================
  // DIRECT MESSAGES
  // ============================================================

  messages: defineTable({
    senderId: v.id("users"),
    recipientId: v.id("users"),
    content: v.string(),
    messageType: v.optional(v.string()), // 'text' | 'image' | 'file'
    isRead: v.optional(v.boolean()),
  })
    .index("by_senderId", ["senderId"])
    .index("by_recipientId", ["recipientId"]),

  // ============================================================
  // ACHIEVEMENTS & LEADERBOARD
  // ============================================================

  achievements: defineTable({
    userId: v.id("users"),
    achievementType: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    pointsAwarded: v.optional(v.number()),
    category: v.optional(v.string()),
    earnedAt: v.optional(v.string()),
  }).index("by_userId", ["userId"]),

  leaderboardStats: defineTable({
    userId: v.id("users"),
    totalFocusTime: v.optional(v.number()),
    weeklyFocusTime: v.optional(v.number()),
    monthlyFocusTime: v.optional(v.number()),
    level: v.optional(v.number()),
    points: v.optional(v.number()),
    currentStreak: v.optional(v.number()),
    longestStreak: v.optional(v.number()),
    lastSessionDate: v.optional(v.string()), // YYYY-MM-DD format for streak tracking
    sessionsCompleted: v.optional(v.number()),
    totalSessions: v.optional(v.number()),
    achievementsEarned: v.optional(v.number()),
    // Anchors for the rolling windows. Without these, weeklyFocusTime and
    // monthlyFocusTime only ever grow, so "this week" silently means "all time".
    weekStartDate: v.optional(v.string()), // YYYY-MM-DD (Monday of the current week)
    monthStartDate: v.optional(v.string()), // YYYY-MM (current month)
    breaksTaken: v.optional(v.number()), // drives the "breaks" achievements
  }).index("by_userId", ["userId"]),

  // ============================================================
  // AI & INSIGHTS
  // ============================================================

  aiInsights: defineTable({
    userId: v.id("users"),
    insightType: v.string(), // 'tip' | 'recommendation' | 'achievement' | 'warning' | 'suggestion'
    title: v.string(),
    content: v.string(),
    priority: v.optional(v.string()), // 'low' | 'medium' | 'high'
    category: v.optional(v.string()),
    readAt: v.optional(v.string()),
  }).index("by_userId", ["userId"]),

  aiUsageTracking: defineTable({
    userId: v.id("users"),
    aiType: v.string(), // 'nora' | 'patrick' | 'ai_insights'
    date: v.string(), // YYYY-MM-DD
    messagesSent: v.optional(v.number()),
    tokensUsed: v.optional(v.number()),
    costEstimate: v.optional(v.number()),
    lastMessageAt: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_aiType_date", ["userId", "aiType", "date"]),

  aiMessageCooldowns: defineTable({
    userId: v.id("users"),
    aiType: v.string(), // 'nora' | 'patrick' | 'ai_insights'
    lastMessageAt: v.string(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_aiType", ["userId", "aiType"]),

  // ============================================================
  // INVENTORY & GAMIFICATION
  // ============================================================

  userInventory: defineTable({
    userId: v.id("users"),
    itemId: v.string(),
    itemName: v.string(),
    itemCategory: v.string(), // 'gear' | 'shelter' | 'trail'
    itemIcon: v.string(),
    purchasedAt: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_itemId", ["userId", "itemId"]),

  equippedItems: defineTable({
    userId: v.id("users"),
    itemCategory: v.string(), // 'gear' | 'shelter' | 'trail'
    itemId: v.string(),
    itemName: v.string(),
    itemIcon: v.string(),
    equippedAt: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_itemCategory", ["userId", "itemCategory"]),

  // ============================================================
  // LEARNING METRICS
  // ============================================================

  learningMetrics: defineTable({
    userId: v.id("users"),
    totalStudyTime: v.optional(v.number()),
    averageSessionLength: v.optional(v.number()),
    focusScore: v.optional(v.number()),
    productivityRating: v.optional(v.number()),
    subjectsStudied: v.optional(v.number()),
    goalsCompleted: v.optional(v.number()),
    weekStart: v.optional(v.string()),
  }).index("by_userId", ["userId"]),

  // ============================================================
  // AI CHAT HISTORY
  // ============================================================

  noraChatSessions: defineTable({
    userId: v.id("users"),
    title: v.string(),
    thinkingMode: v.optional(v.string()), // 'quick' | 'deep' | 'research'
    lastMessageAt: v.string(), // ISO string
    messageCount: v.optional(v.number()),
    isArchived: v.optional(v.boolean()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_lastMessageAt", ["userId", "lastMessageAt"]),

  noraChat: defineTable({
    userId: v.id("users"),
    sessionId: v.optional(v.id("noraChatSessions")),
    role: v.string(), // 'user' | 'assistant' | 'system'
    content: v.string(),
    metadata: v.optional(v.any()),
  })
    .index("by_userId", ["userId"])
    .index("by_sessionId", ["sessionId"]),

  patrickChat: defineTable({
    userId: v.id("users"),
    role: v.string(), // 'user' | 'assistant' | 'system'
    content: v.string(),
    metadata: v.optional(v.any()),
  }).index("by_userId", ["userId"]),

  noraResponseIds: defineTable({
    userId: v.id("users"),
    sessionId: v.optional(v.id("noraChatSessions")),
    responseId: v.string(), // OpenAI Responses API previous_response_id for conversation continuity
  })
    .index("by_userId", ["userId"])
    .index("by_userId_sessionId", ["userId", "sessionId"]),

  // ============================================================
  // NORA MEMORY (Long-term learned facts)
  // ============================================================

  noraMemory: defineTable({
    userId: v.id("users"),
    category: v.string(), // 'academic' | 'preference' | 'struggle' | 'goal' | 'personal'
    key: v.string(), // e.g. "favorite_study_time", "weak_subject"
    value: v.string(),
    confidence: v.number(), // 0.0-1.0
    source: v.string(), // 'explicit' | 'inferred'
    lastReferencedAt: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_category", ["userId", "category"]),

  // ============================================================
  // NORA NOTIFICATIONS (Proactive messages)
  // ============================================================

  noraNotifications: defineTable({
    userId: v.id("users"),
    type: v.string(), // 'study_reminder' | 'streak_encouragement' | 'weekly_summary' | 'tip' | 'upgrade_nudge'
    title: v.string(),
    body: v.string(),
    scheduledFor: v.string(), // ISO string
    sentAt: v.optional(v.string()),
    readAt: v.optional(v.string()),
    metadata: v.optional(v.any()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_type", ["userId", "type"])
    .index("by_scheduledFor", ["scheduledFor"]),

  // ============================================================
  // NORA ONBOARDING STATUS (Replaces AsyncStorage)
  // ============================================================

  noraOnboardingStatus: defineTable({
    userId: v.id("users"),
    completedAt: v.optional(v.string()),
    acceptedPoliciesAt: v.optional(v.string()),
    version: v.optional(v.number()), // For re-triggering if onboarding changes
  }).index("by_userId", ["userId"]),

  // ============================================================
  // SELF-DISCOVERY QUIZ SYSTEM
  // ============================================================

  // Quiz category definitions (Study Habits, Learning Style, etc.)
  quizCategories: defineTable({
    slug: v.string(), // 'study_habits', 'learning_style', 'motivation', etc.
    name: v.string(),
    description: v.string(),
    icon: v.string(), // Icon name for display
    color: v.string(), // Theme color for category
    order: v.number(), // Display order
    isActive: v.boolean(),
    researchBasis: v.optional(v.string()), // Research framework reference (e.g., "MSLQ", "MAI")
    questionsCount: v.optional(v.number()), // Cached count for display
  })
    .index("by_slug", ["slug"])
    .index("by_order", ["order"])
    .index("by_isActive", ["isActive"]),

  // Sub-dimensions within each category (e.g., Time Management -> Planning, Prioritization)
  quizSubDimensions: defineTable({
    categoryId: v.id("quizCategories"),
    slug: v.string(), // 'planning', 'prioritization', 'estimation'
    name: v.string(),
    description: v.string(),
    weight: v.number(), // Relative weight within category (0.0-1.0)
    order: v.number(), // Display order for radar chart
  })
    .index("by_categoryId", ["categoryId"])
    .index("by_slug", ["slug"]),

  // Question bank (500+ per category)
  quizQuestions: defineTable({
    // Core identifiers
    questionId: v.string(), // Human-readable ID like 'TM_PLAN_001'
    categoryId: v.id("quizCategories"),
    subDimensionId: v.id("quizSubDimensions"),

    // Question content
    questionText: v.string(),
    questionFormat: v.string(), // 'likert_5' | 'likert_7' | 'behavioral' | 'frequency' | 'scenario'

    // Options (array of value/label pairs with optional scoring weight)
    options: v.array(
      v.object({
        value: v.number(),
        label: v.string(),
        scoringWeight: v.optional(v.number()), // For non-linear scoring
      }),
    ),

    // Scoring metadata
    weight: v.number(), // 1-5 importance scale
    difficulty: v.number(), // 1-5 difficulty scale
    isReversed: v.boolean(), // For reverse-coded items

    // Age/education adaptation
    educationLevels: v.array(v.string()), // ['high_school', 'college', 'graduate']
    adaptedVersions: v.optional(
      v.array(
        v.object({
          educationLevel: v.string(),
          questionText: v.string(),
          options: v.array(
            v.object({
              value: v.number(),
              label: v.string(),
            }),
          ),
        }),
      ),
    ),

    // Research backing
    researchCitations: v.optional(
      v.array(
        v.object({
          authors: v.string(),
          year: v.number(),
          title: v.string(),
          journal: v.optional(v.string()),
          doi: v.optional(v.string()),
        }),
      ),
    ),

    // Deduplication
    semanticHash: v.optional(v.string()), // For similarity detection
    similarQuestionIds: v.optional(v.array(v.string())), // Related questions

    // Version control
    version: v.number(),
    createdAt: v.string(),
    updatedAt: v.string(),
    isActive: v.boolean(),
    deprecatedAt: v.optional(v.string()),
    deprecationReason: v.optional(v.string()),
  })
    .index("by_questionId", ["questionId"])
    .index("by_categoryId", ["categoryId"])
    .index("by_subDimensionId", ["subDimensionId"])
    .index("by_isActive", ["isActive"])
    .index("by_categoryId_isActive", ["categoryId", "isActive"]),

  // User quiz sessions (progress tracking)
  quizSessions: defineTable({
    userId: v.id("users"),
    categoryId: v.id("quizCategories"),

    // Session metadata
    sessionType: v.string(), // 'full' | 'quick' | 'adaptive' | 'retest'
    educationLevel: v.string(), // 'high_school' | 'college' | 'graduate'
    questionsCount: v.number(), // Number of questions in this session

    // Selected questions for this session (stored to ensure consistency)
    questionIds: v.array(v.id("quizQuestions")),

    // Progress tracking
    status: v.string(), // 'in_progress' | 'completed' | 'abandoned'
    currentQuestionIndex: v.number(),
    startedAt: v.string(),
    completedAt: v.optional(v.string()),
    timeSpentSeconds: v.optional(v.number()),

    // Results (populated on completion)
    resultId: v.optional(v.id("quizResults")),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_categoryId", ["userId", "categoryId"])
    .index("by_userId_status", ["userId", "status"]),

  // Individual question responses
  quizResponses: defineTable({
    sessionId: v.id("quizSessions"),
    userId: v.id("users"),
    questionId: v.id("quizQuestions"),

    // Response data
    selectedValue: v.number(),
    responseTimeMs: v.number(), // Time to answer in milliseconds

    // Scoring (computed)
    rawScore: v.number(),
    weightedScore: v.number(),

    answeredAt: v.string(),
  })
    .index("by_sessionId", ["sessionId"])
    .index("by_userId", ["userId"])
    .index("by_questionId", ["questionId"]),

  // Completed quiz results with trait profiles
  quizResults: defineTable({
    userId: v.id("users"),
    sessionId: v.id("quizSessions"),
    categoryId: v.id("quizCategories"),

    // Overall scores
    overallScore: v.number(), // 0-100 normalized
    percentileRank: v.optional(v.number()), // 0-100 percentile

    // Sub-dimension scores (for radar chart)
    subDimensionScores: v.array(
      v.object({
        subDimensionId: v.id("quizSubDimensions"),
        slug: v.string(),
        name: v.string(),
        rawScore: v.number(),
        normalizedScore: v.number(), // 0-100
        percentileRank: v.optional(v.number()),
      }),
    ),

    // Trait profile identification
    dominantTrait: v.string(),
    traitProfile: v.object({
      primaryTrait: v.string(),
      primaryScore: v.number(),
      secondaryTrait: v.optional(v.string()),
      secondaryScore: v.optional(v.number()),
      profileDescription: v.string(),
    }),

    // Strengths and areas for growth
    strengths: v.array(
      v.object({
        subDimensionSlug: v.string(),
        score: v.number(),
        description: v.string(),
      }),
    ),
    areasForGrowth: v.array(
      v.object({
        subDimensionSlug: v.string(),
        score: v.number(),
        description: v.string(),
        recommendations: v.array(v.string()),
      }),
    ),

    // Metadata
    completedAt: v.string(),
    educationLevel: v.string(),
    questionsAnswered: v.number(),
    averageResponseTimeMs: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_categoryId", ["userId", "categoryId"])
    .index("by_sessionId", ["sessionId"])
    .index("by_categoryId_score", ["categoryId", "overallScore"]),

  // Historical tracking for improvement over time
  quizProgressHistory: defineTable({
    userId: v.id("users"),
    categoryId: v.id("quizCategories"),
    resultId: v.id("quizResults"),

    // Snapshot data for historical comparison
    overallScore: v.number(),
    subDimensionScores: v.array(
      v.object({
        slug: v.string(),
        score: v.number(),
      }),
    ),
    percentileRank: v.optional(v.number()),

    recordedAt: v.string(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_categoryId", ["userId", "categoryId"])
    .index("by_userId_recordedAt", ["userId", "recordedAt"]),

  // Aggregated stats for percentile calculations
  quizBenchmarkStats: defineTable({
    categoryId: v.id("quizCategories"),
    educationLevel: v.string(),

    // Distribution data (updated periodically)
    sampleSize: v.number(),
    mean: v.number(),
    median: v.number(),
    stdDev: v.number(),

    // Percentile lookup table (5th, 10th, 25th, 50th, 75th, 90th, 95th)
    percentiles: v.array(
      v.object({
        percentile: v.number(),
        scoreThreshold: v.number(),
      }),
    ),

    // Sub-dimension benchmarks
    subDimensionBenchmarks: v.array(
      v.object({
        subDimensionSlug: v.string(),
        mean: v.number(),
        stdDev: v.number(),
        percentiles: v.array(
          v.object({
            percentile: v.number(),
            scoreThreshold: v.number(),
          }),
        ),
      }),
    ),

    lastUpdatedAt: v.string(),
  })
    .index("by_categoryId", ["categoryId"])
    .index("by_categoryId_educationLevel", ["categoryId", "educationLevel"]),

  // Extracted quiz insights for Nora AI personalization
  quizNoraMemories: defineTable({
    userId: v.id("users"),
    resultId: v.id("quizResults"),
    categoryId: v.id("quizCategories"),

    // Extracted insights for Nora
    memoryType: v.string(), // 'strength' | 'growth_area' | 'trait' | 'recommendation'
    key: v.string(), // e.g., 'time_management_strength', 'procrastination_tendency'
    value: v.string(),
    confidence: v.number(), // 0.0-1.0

    // Context
    context: v.object({
      score: v.number(),
      percentile: v.optional(v.number()),
      trend: v.optional(v.string()), // 'improving' | 'declining' | 'stable'
      comparedToLast: v.optional(v.number()), // Score change
    }),

    // Recommendations for Nora to suggest
    actionableInsights: v.array(v.string()),

    extractedAt: v.string(),
    expiresAt: v.optional(v.string()), // For time-sensitive insights
  })
    .index("by_userId", ["userId"])
    .index("by_userId_categoryId", ["userId", "categoryId"])
    .index("by_resultId", ["resultId"]),

  // Nora recommendation triggers for proactive suggestions
  quizRecommendationTriggers: defineTable({
    userId: v.id("users"),

    // Trigger conditions
    triggerType: v.string(), // 'low_score' | 'declining_trend' | 'milestone' | 'periodic'
    categoryId: v.optional(v.id("quizCategories")),
    subDimensionSlug: v.optional(v.string()),

    // Trigger data
    threshold: v.optional(v.number()),
    lastTriggeredAt: v.optional(v.string()),
    isActive: v.boolean(),

    // Action
    recommendedAction: v.string(), // 'suggest_retake' | 'offer_tip' | 'celebrate_improvement'
    messageTemplate: v.string(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_triggerType", ["userId", "triggerType"]),

  // App-level key/value config (feature flags, environment settings, etc.)
  appConfig: defineTable({
    key: v.string(),
    value: v.string(),
  }).index("by_key", ["key"]),

  // Promo code definitions (admin-seeded via CLI)
  promoCodes: defineTable({
    code: v.string(),
    description: v.string(),
    tier: v.string(),
    flintAmount: v.number(),
    grantAllTrails: v.boolean(),
    maxRedemptions: v.optional(v.number()),
    currentRedemptions: v.number(),
    isActive: v.boolean(),
    expiresAt: v.optional(v.string()),
  }).index("by_code", ["code"]),

  // Per-user promo code redemption records
  promoRedemptions: defineTable({
    userId: v.id("users"),
    promoCodeId: v.optional(v.id("promoCodes")),
    code: v.string(),
    redeemedAt: v.string(),
  }).index("by_userId", ["userId"]),

  // User-uploaded ebooks for Nora to reference. The PDF bytes live in Convex
  // file storage; OpenAI ingestion creates a vector store the file_search tool
  // can query during a Nora chat.
  ebooks: defineTable({
    userId: v.id("users"),
    title: v.string(),
    fileSize: v.number(),
    storageId: v.string(), // Convex storage ID of the raw PDF
    openaiFileId: v.optional(v.string()), // /v1/files id once uploaded
    vectorStoreId: v.optional(v.string()), // /v1/vector_stores id, attached to Nora's file_search
    status: v.string(), // 'uploading' | 'processing' | 'ready' | 'failed'
    errorMessage: v.optional(v.string()),
    uploadedAt: v.string(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_status", ["userId", "status"]),

  // ============================================================
  // PRODUCT ANALYTICS
  // ============================================================

  // First-party product events. Deliberately a Convex table rather than a
  // third-party SDK: the data we need for beta (funnel, activation, retention)
  // is all first-party, it ships no extra binary, and it needs no ATT prompt.
  events: defineTable({
    userId: v.optional(v.id("users")), // absent for pre-signup events
    name: v.string(), // e.g. "session_completed" — see src/analytics/events.ts
    // Small, non-PII payload: ids, durations, enum-ish strings.
    props: v.optional(v.any()),
    // Acquisition attribution, captured once at signup and stamped on events.
    source: v.optional(v.string()), // e.g. "invite", "qr", "organic"
    platform: v.optional(v.string()), // "ios" | "android"
    appVersion: v.optional(v.string()),
    sessionId: v.optional(v.string()), // client-generated app-open id
    ts: v.number(), // epoch ms (server-stamped)
  })
    .index("by_userId", ["userId"])
    .index("by_name", ["name"])
    .index("by_ts", ["ts"]),
});
