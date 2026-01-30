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
    // Privacy visibility
    fullNameVisibility: v.optional(v.string()),
    universityVisibility: v.optional(v.string()),
    locationVisibility: v.optional(v.string()),
    classesVisibility: v.optional(v.string()),
    // Subscription
    subscriptionTier: v.optional(v.string()), // 'free' | 'premium' | 'pro'
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
    dailyGoalMinutes: v.optional(v.number()),
    preferredSessionLength: v.optional(v.number()),
    breakLength: v.optional(v.number()),
    theme: v.optional(v.string()), // 'light' | 'dark' | 'system'
    reminderFrequency: v.optional(v.string()),
    privacyMode: v.optional(v.boolean()),
    autoStartBreaks: v.optional(v.boolean()),
    showMotivationalQuotes: v.optional(v.boolean()),
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
    sessionType: v.optional(v.string()), // 'individual' | 'group'
    status: v.optional(v.string()), // 'active' | 'paused' | 'completed' | 'cancelled'
  })
    .index("by_userId", ["userId"])
    .index("by_userId_status", ["userId", "status"]),

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
  })
    .index("by_roomId", ["roomId"]),

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
    sessionsCompleted: v.optional(v.number()),
    totalSessions: v.optional(v.number()),
    achievementsEarned: v.optional(v.number()),
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

  noraChat: defineTable({
    userId: v.id("users"),
    role: v.string(), // 'user' | 'assistant' | 'system'
    content: v.string(),
    metadata: v.optional(v.any()),
  }).index("by_userId", ["userId"]),

  patrickChat: defineTable({
    userId: v.id("users"),
    role: v.string(), // 'user' | 'assistant' | 'system'
    content: v.string(),
    metadata: v.optional(v.any()),
  }).index("by_userId", ["userId"]),

  noraResponseIds: defineTable({
    userId: v.id("users"),
    responseId: v.string(), // OpenAI Responses API previous_response_id for conversation continuity
  }).index("by_userId", ["userId"]),
});
