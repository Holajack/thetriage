/**
 * Convex action for Nora AI chat — uses the OpenAI Responses API.
 *
 * Built-in tools:
 *   - web_search: real-time web research with cited sources
 *   - file_search: PDF/document comprehension via vector stores
 *   - code_interpreter: math, science, data analysis
 *
 * Conversation continuity via `previous_response_id` chaining.
 */
import { v } from "convex/values";
import { action, query, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// ────────────────────────────────────────────────────
// Internal helpers (run inside the Convex DB)
// ────────────────────────────────────────────────────

/** Look up the current user by Clerk identity */
export const _getCurrentUser = internalQuery({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
  },
});

/** Get user profile + onboarding + leaderboard data for system instructions */
export const _getUserContext = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    const onboarding = await ctx.db
      .query("onboardingPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    const leaderboard = await ctx.db
      .query("leaderboardStats")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    const sessions = await ctx.db
      .query("focusSessions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(10);
    return { user, onboarding, leaderboard, sessions };
  },
});

/** DEV: Debug rate limit check by clerkId (remove before production) */
export const debugRateLimit = query({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .unique();
    if (!user) return { error: "User not found" };

    const tier = user.subscriptionTier || "free";
    const today = new Date().toISOString().slice(0, 10);
    const usage = await ctx.db
      .query("aiUsageTracking")
      .withIndex("by_userId_aiType_date", (q) =>
        q.eq("userId", user._id).eq("aiType", "nora").eq("date", today)
      )
      .unique();

    const noraStatus = await ctx.db
      .query("noraOnboardingStatus")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    return {
      userId: user._id,
      tier,
      subscriptionTier: user.subscriptionTier,
      messagesSentToday: usage?.messagesSent ?? 0,
      date: today,
      noraOnboarding: noraStatus ? {
        completedAt: noraStatus.completedAt,
        acceptedPoliciesAt: noraStatus.acceptedPoliciesAt,
        version: noraStatus.version,
      } : null,
    };
  },
});

/** Check rate limit for the user */
export const _checkRateLimit = internalQuery({
  args: { userId: v.id("users"), aiType: v.string() },
  handler: async (ctx, { userId, aiType }) => {
    const user = await ctx.db.get(userId);
    const tier = user?.subscriptionTier || "free";

    // Nora is available for trial (limited) and Elite tiers
    // Trial users get a taste of Nora, then must upgrade when trial ends
    const limits: Record<string, { enabled: boolean; perDay: number; maxLen: number }> = {
      free: { enabled: false, perDay: 0, maxLen: 500 },
      trial: { enabled: true, perDay: 10, maxLen: 2000 },
      premium: { enabled: false, perDay: 0, maxLen: 500 },
      pro: { enabled: true, perDay: 100, maxLen: 5000 },
      elite: { enabled: true, perDay: 100, maxLen: 5000 },
    };
    const tierLimits = limits[tier] || limits.free;

    if (!tierLimits.enabled) {
      const reason = tier === "premium"
        ? "Nora AI is an Elite-exclusive feature. You're already on Premium — upgrade to Elite to unlock web research, document analysis, and advanced study support!"
        : "Nora AI is available for Elite members. Upgrade to Elite to unlock web research, document analysis, and advanced study support!";
      return {
        allowed: false,
        tier,
        reason,
        remaining: 0,
        maxLen: tierLimits.maxLen,
      };
    }

    const today = new Date().toISOString().slice(0, 10);
    const usage = await ctx.db
      .query("aiUsageTracking")
      .withIndex("by_userId_aiType_date", (q) =>
        q.eq("userId", userId).eq("aiType", aiType).eq("date", today)
      )
      .unique();

    const sent = usage?.messagesSent ?? 0;
    if (sent >= tierLimits.perDay) {
      return {
        allowed: false,
        tier,
        reason: `You've reached your daily Nora message limit (${tierLimits.perDay}). ${tier === "trial" ? "Upgrade to Elite for 100 messages per day!" : "Come back tomorrow!"}`,
        remaining: 0,
        maxLen: tierLimits.maxLen,
      };
    }

    return {
      allowed: true,
      tier,
      reason: "",
      remaining: tierLimits.perDay - sent,
      maxLen: tierLimits.maxLen,
    };
  },
});

/** Log usage after a successful response */
export const _logUsage = internalMutation({
  args: {
    userId: v.id("users"),
    aiType: v.string(),
    tokensUsed: v.number(),
    costEstimate: v.number(),
  },
  handler: async (ctx, { userId, aiType, tokensUsed, costEstimate }) => {
    const today = new Date().toISOString().slice(0, 10);
    const existing = await ctx.db
      .query("aiUsageTracking")
      .withIndex("by_userId_aiType_date", (q) =>
        q.eq("userId", userId).eq("aiType", aiType).eq("date", today)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        messagesSent: (existing.messagesSent ?? 0) + 1,
        tokensUsed: (existing.tokensUsed ?? 0) + tokensUsed,
        costEstimate: (existing.costEstimate ?? 0) + costEstimate,
        lastMessageAt: new Date().toISOString(),
      });
    } else {
      await ctx.db.insert("aiUsageTracking", {
        userId,
        aiType,
        date: today,
        messagesSent: 1,
        tokensUsed,
        costEstimate,
        lastMessageAt: new Date().toISOString(),
      });
    }
  },
});

/** Save a chat message to noraChat (with optional session tagging) */
export const _saveMessage = internalMutation({
  args: {
    userId: v.id("users"),
    sessionId: v.optional(v.id("noraChatSessions")),
    role: v.string(),
    content: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, { userId, sessionId, role, content, metadata }) => {
    await ctx.db.insert("noraChat", { userId, sessionId, role, content, metadata });
  },
});

/** Get the last OpenAI response ID for conversation continuity (per session) */
export const _getLastResponseId = internalQuery({
  args: {
    userId: v.id("users"),
    sessionId: v.optional(v.id("noraChatSessions")),
  },
  handler: async (ctx, { userId, sessionId }) => {
    if (sessionId) {
      const record = await ctx.db
        .query("noraResponseIds")
        .withIndex("by_userId_sessionId", (q) =>
          q.eq("userId", userId).eq("sessionId", sessionId)
        )
        .unique();
      return record?.responseId ?? null;
    }
    // Fallback to user-level lookup for backward compatibility
    const record = await ctx.db
      .query("noraResponseIds")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    return record?.responseId ?? null;
  },
});

/** Save/update the last OpenAI response ID (per session) */
export const _saveResponseId = internalMutation({
  args: {
    userId: v.id("users"),
    sessionId: v.optional(v.id("noraChatSessions")),
    responseId: v.string(),
  },
  handler: async (ctx, { userId, sessionId, responseId }) => {
    if (sessionId) {
      const existing = await ctx.db
        .query("noraResponseIds")
        .withIndex("by_userId_sessionId", (q) =>
          q.eq("userId", userId).eq("sessionId", sessionId)
        )
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, { responseId });
      } else {
        await ctx.db.insert("noraResponseIds", { userId, sessionId, responseId });
      }
    } else {
      // Fallback for backward compatibility
      const existing = await ctx.db
        .query("noraResponseIds")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, { responseId });
      } else {
        await ctx.db.insert("noraResponseIds", { userId, responseId });
      }
    }
  },
});

// ────────────────────────────────────────────────────
// Pure helpers
// ────────────────────────────────────────────────────

function sanitizeInput(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/[<>]/g, "")
    .trim();
}

/**
 * Resolve "auto" thinking mode to a concrete mode based on message content.
 * Simple keyword heuristic — no LLM call, zero latency overhead.
 */
function resolveAutoMode(message: string): "quick" | "deep" | "research" {
  const lower = message.toLowerCase().trim();

  // Quick signals: very short greetings and simple conversational messages
  const quickSignals = [
    "hi", "hey", "hello", "thanks", "thank you", "ok", "okay",
    "yes", "no", "sure", "got it", "cool", "nice", "good",
    "bye", "goodbye", "see you", "gm", "gn", "sup", "yo",
  ];
  // If the entire message (trimmed) is just a greeting/conversational phrase
  if (lower.length < 30 && quickSignals.some(kw => lower === kw || lower === kw + "!" || lower === kw + ".")) {
    return "quick";
  }

  // Research signals: user wants web info, current events, sources, resources
  const researchSignals = [
    "research", "find", "search", "look up", "what is", "who is",
    "sources", "latest", "news", "recent", "current", "trending",
    "statistics", "data on", "studies show", "according to",
    "website", "resource", "tutorial", "guide", "course",
    "recommend", "suggestion", "where can i", "best way to learn",
    "link", "url", "article", "blog", "video", "youtube",
    "study material", "practice problem", "cheat sheet",
    "show me", "give me", "list", "top", "best",
    "help me find", "help me study", "how to", "what are",
  ];
  for (const kw of researchSignals) {
    if (lower.includes(kw)) return "research";
  }

  // Deep analysis signals: user wants thorough reasoning or code
  const deepSignals = [
    "analyze", "explain in detail", "compare", "contrast",
    "calculate", "step by step", "break down", "why does",
    "how does", "code", "implement", "debug", "solve",
    "in depth", "thoroughly", "comprehensive", "explain",
    "understand", "elaborate", "teach me", "walk me through",
  ];
  for (const kw of deepSignals) {
    if (lower.includes(kw)) return "deep";
  }

  // Long messages are likely detailed questions
  if (lower.length > 150) return "deep";

  // Medium-length messages with a question mark → research (search for answers)
  if (lower.includes("?") && lower.length > 15) return "research";

  // Default for non-trivial messages: research (provides sourced answers)
  if (lower.length > 40) return "research";

  // Very short non-greeting messages: quick
  return "quick";
}

function buildInstructions(userCtx: any, pdfContext: any, memories?: any[], thinkingMode?: string, quizInsights?: any[]): string {
  const userName = userCtx?.user?.fullName?.split(" ")[0] || "there";
  const focusMethod = userCtx?.onboarding?.focusMethod || "Balanced Focus";
  const weeklyGoal = userCtx?.onboarding?.weeklyFocusGoal || 5;
  const university = userCtx?.user?.university || "your university";
  const major = userCtx?.user?.major || "your studies";

  // Build stats summary
  let statsBlock = "";
  const lb = userCtx?.leaderboard;
  if (lb) {
    const hours = Math.floor((lb.totalFocusTime || 0) / 3600);
    statsBlock = `\n**Current Stats:** Level ${lb.level || 1}, ${hours}h total focus time, ${lb.currentStreak || 0}-day streak (longest: ${lb.longest_streak || 0})`;
  }
  const sessions = userCtx?.sessions;
  let sessionBlock = "";
  if (sessions?.length) {
    const totalMin = sessions.reduce((s: number, x: any) => s + (x.duration || 0), 0) / 60;
    sessionBlock = `\n**Recent Activity:** ${sessions.length} sessions, ${Math.round(totalMin)} min total`;
  }

  let instructions = `You are Nora, an advanced AI study companion inside HikeWise — the academic success platform. You have deep knowledge of each student's academic journey and provide personalized, actionable study support.

**Student Profile:**
- Name: ${userName}
- Study Method: ${focusMethod}
- Weekly Focus Goal: ${weeklyGoal} hours
- University: ${university}
- Major: ${major}${statsBlock}${sessionBlock}

**Your Capabilities (available based on mode):**
1. **Web Search** (Research & Deep modes) — Search the internet for current information, research papers, study resources, and facts. When available, use it to cite real sources and provide up-to-date data.
2. **File Search** — When the student has uploaded PDFs or documents, search through the ENTIRE document to find specific information, generate study questions, create summaries, and extract key concepts.
3. **Code Interpreter** (Deep mode) — Run Python code to solve math problems, create charts, analyze data, or work through science/engineering calculations step-by-step.

**Core Responsibilities:**
- Study planning: craft schedules, break down assignments, plan revision cycles
- Focus enhancement: concentration techniques tuned to their ${focusMethod} method
- Content mastery: explain concepts, design active-recall prompts, generate quizzes
- Document analysis: summarize PDFs, build study guides, extract key arguments, create question banks
- Academic writing: thesis creation, outline building, evidence integration, revision
- Motivation: encouragement, progress reflections, accountability

**Communication Style:**
- Warm, encouraging, practical, and specific — like an elite academic coach
- Match the student's energy (brief questions get concise answers; detailed questions get comprehensive responses)
- When users say "make it shorter", "explain more", "simplify" — apply the transformation to your previous response
- Track conversation topics and acknowledge subject changes naturally
- Reference their ${weeklyGoal}-hour weekly goal when discussing planning

**When documents are attached:**
- ALWAYS use file_search to scan the document thoroughly
- Quote retrieved snippets and cite sections (e.g., "[Chapter 3, p.12]")
- If the document doesn't contain the answer, say so clearly
- Never fabricate citations

**Response Formatting:**
- Use markdown for clear, structured responses
- Use ## headings to organize sections when responses have multiple parts
- Use **bold** for key terms, definitions, and important points
- Use bullet points for lists and step-by-step breakdowns
- For math and science: use code blocks (\`\`\`) with clear step-by-step work
- For research/search responses, structure as:
  ## Overview
  [Brief summary of findings]
  ## Key Findings
  - Finding 1 with details
  - Finding 2 with details
  ## Summary
  [Key takeaways]
- For explanations: use headings to break down complex topics into digestible sections
- Keep formatting clean, scannable, and easy to read on mobile

**Safety:**
- Follow OpenAI safety policies and academic integrity guidelines
- Provide guidance and scaffolding rather than complete graded work solutions
- Refuse requests that constitute cheating`;

  // Inject learned memories about the student
  if (memories && memories.length > 0) {
    const memoryLines = memories.map((m: any) => `- ${m.key}: ${m.value}`).join("\n");
    instructions += `\n\n**What You've Learned About ${userName}:**
${memoryLines}

Use this knowledge naturally in conversation. Don't repeat it back unless asked. Reference it when relevant to personalize your responses.`;
  }

  // Inject quiz-based self-discovery insights
  if (quizInsights && quizInsights.length > 0) {
    const profileInsights = quizInsights.filter((i: any) => i.type === "quiz_profile");
    const strengthInsights = quizInsights.filter((i: any) => i.type === "quiz_strength");
    const growthInsights = quizInsights.filter((i: any) => i.type === "quiz_growth");

    instructions += `\n\n**Self-Discovery Quiz Insights:**`;

    if (profileInsights.length > 0) {
      instructions += `\n*Learning Profile:*`;
      for (const insight of profileInsights) {
        instructions += `\n- ${insight.content}`;
        if (insight.trend === "improving") {
          instructions += " (showing improvement!)";
        }
      }
    }

    if (strengthInsights.length > 0) {
      instructions += `\n*Strengths:*`;
      for (const insight of strengthInsights.slice(0, 3)) {
        instructions += `\n- ${insight.content}`;
      }
    }

    if (growthInsights.length > 0) {
      instructions += `\n*Areas for Development (be encouraging about these):*`;
      for (const insight of growthInsights.slice(0, 3)) {
        instructions += `\n- ${insight.content}`;
        if (insight.trend === "improving") {
          instructions += " (showing progress!)";
        }
      }
    }

    instructions += `\n\nUse these insights to personalize study recommendations, acknowledge progress, and gently guide improvement in growth areas without being preachy.`;
  }

  if (pdfContext?.title) {
    instructions += `\n\n**Active Document:** "${pdfContext.title}"
When the student asks about this document, use file_search to retrieve specific information from it.`;
  }

  // ── Mode-specific instructions ──
  // Each mode produces a DISTINCTLY different response style.
  // Quick: fast, from Nora's knowledge, no web search
  // Research: medium detail, web search, cited sources
  // Deep: maximum detail, web search, cited sources, long comprehensive response

  if (thinkingMode === "quick") {
    instructions += `\n\n**Quick Mode — Nora's Knowledge Only:**
- Respond directly from your own training knowledge. Do NOT search the web.
- Be concise and direct. Get to the point fast.
- Short paragraphs, no lengthy intros or sign-offs.
- Use bullet points over long explanations.
- Aim for responses under 150 words unless the topic truly requires more.
- Match the student's energy — brief questions get brief answers.
- If the topic would benefit from research or deeper analysis, mention they can switch to Research (globe) or Deep (glasses) mode.`;
  } else if (thinkingMode === "research") {
    instructions += `\n\n**Web Research Mode — MANDATORY WEB SEARCH:**
- The student chose Research mode because they want REAL web sources — not just your training knowledge.
- **CRITICAL: You MUST call the web_search tool BEFORE writing any response.** This is your #1 priority. Do NOT respond from memory alone — always search first.
- Provide medium-length responses (200-400 words). More detailed than Quick but not as exhaustive as Deep.
- Cross-reference multiple sources when possible.
- Structure responses clearly:
  ## Overview
  [2-3 sentence summary of what you found]
  ## Key Findings
  - Finding with source attribution
  ## Recommended Resources
  - [Resource name](url) — brief description
- Include the actual URLs from your web search results so they appear as url_citation annotations. The student sees these as clickable source pills.
- If sources conflict, briefly note the disagreement.`;
  } else if (thinkingMode === "deep") {
    instructions += `\n\n**Deep Analysis Mode — MAXIMUM DEPTH + MANDATORY WEB SEARCH:**
- The student chose Deep mode because they want the MOST thorough, comprehensive analysis possible.
- **CRITICAL: You MUST call the web_search tool at least once (ideally multiple times) before responding.** Ground every claim in real, verifiable sources. This is non-negotiable.
- **Your response MUST be long and detailed** — aim for 500-1000+ words. This is NOT a quick answer. Think of it as a 15-minute private tutoring session.
- Break the topic into multiple sections with ## headings.
- For EVERY section, explain:
  - The "what" — define concepts clearly
  - The "why" — explain underlying reasoning and principles
  - The "how" — give concrete examples, analogies, and applications
  - The "so what" — connect to the student's goals, major, or coursework
- For STEM topics: show full step-by-step work, use code_interpreter for calculations.
- For humanities: explore multiple perspectives, cite evidence, analyze arguments.
- Use analogies and real-world examples to make abstract ideas concrete.
- Reference your web search findings throughout — cite specific sources with URLs so they appear as url_citation annotations.
- End with actionable next steps or study recommendations.
- DO NOT give a short answer in Deep mode. If your response is under 400 words, you're not being thorough enough — expand further.`;
  }

  return instructions;
}

// Fallback template response when OpenAI is unavailable
function fallbackResponse(message: string, userCtx: any, pdfContext: any): string {
  const userName = userCtx?.user?.fullName?.split(" ")[0] || "there";
  const focusMethod = userCtx?.onboarding?.focusMethod || "Balanced Focus";
  const weeklyGoal = userCtx?.onboarding?.weeklyFocusGoal || 5;
  const lower = message.toLowerCase();

  if (pdfContext?.title) {
    return `I see you're working with "${pdfContext.title}". I can help you create study plans, practice questions, or explain concepts from this material. What would you like to focus on?`;
  }
  if (lower.includes("focus") || lower.includes("concentrate")) {
    return `Great question about focus, ${userName}! With your ${focusMethod} style, I recommend structured sessions. Your ${weeklyGoal}-hour weekly goal breaks down to manageable daily blocks. What specific focus challenge are you facing?`;
  }
  if (lower.includes("plan") || lower.includes("schedule")) {
    return `Let's build a plan, ${userName}! With your ${weeklyGoal}-hour weekly goal and ${focusMethod} approach, we can create an effective schedule. What subjects are you working on?`;
  }
  if (lower.includes("motivation") || lower.includes("procrastination")) {
    return `I understand the struggle, ${userName}. Try the 15-Minute Rule: commit to just 15 minutes right now. Progress beats perfection! What task are you putting off?`;
  }
  return `Hello ${userName}! I'm Nora, your AI study companion. I can help with study planning, focus techniques, content mastery, document analysis, web research, and homework. What would you like to work on today?`;
}

// ────────────────────────────────────────────────────
// Main action: sendMessage
// ────────────────────────────────────────────────────

export const sendMessage = action({
  args: {
    message: v.string(),
    thinkingMode: v.optional(v.string()), // 'quick' | 'deep' | 'research'
    sessionId: v.optional(v.id("noraChatSessions")),
    conversationHistory: v.optional(v.array(v.object({ role: v.string(), content: v.string() }))),
    userSettings: v.optional(v.any()),
    pdfContext: v.optional(
      v.union(
        v.object({ title: v.string(), file_path: v.optional(v.string()) }),
        v.null()
      )
    ),
    screenContext: v.optional(v.any()),
    vectorStoreId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    error?: string;
    response?: string;
    success?: boolean;
    sessionId?: any;
    tier?: string;
    remaining_messages?: number;
    upgrade_required?: boolean;
    context?: any;
    sources?: Array<{ title: string; url: string }>;
  }> => {
    // 1. Authenticate
    const currentUser: any = await ctx.runQuery(internal.noraChat._getCurrentUser);
    if (!currentUser) {
      return {
        error: "Authentication failed",
        response: "I couldn't verify your identity. Please try signing in again.",
      };
    }
    const userId = currentUser._id as Id<"users">;

    // 2. Policy acceptance check (REQUIRED)
    const policyAccepted: boolean = await ctx.runQuery(
      internal.noraOnboarding._checkPolicyAccepted,
      { userId }
    );
    if (!policyAccepted) {
      return {
        error: "POLICY_NOT_ACCEPTED",
        response: "Please complete the Nora onboarding and accept the usage policies before chatting.",
      };
    }

    // 3. Rate limit check
    const rateLimit: any = await ctx.runQuery(internal.noraChat._checkRateLimit, {
      userId,
      aiType: "nora",
    });
    if (!rateLimit.allowed) {
      return {
        error: "ACCESS_DENIED",
        response: rateLimit.reason,
        tier: rateLimit.tier,
        remaining_messages: 0,
        upgrade_required: true,
      };
    }

    // 4. Sanitize & validate
    const sanitized = sanitizeInput(args.message);
    if (sanitized.length > rateLimit.maxLen) {
      return {
        error: "MESSAGE_TOO_LONG",
        response: `Message too long. Max ${rateLimit.maxLen} chars for your plan. Current: ${sanitized.length}.`,
        upgrade_required: rateLimit.tier !== "elite",
      };
    }

    // 5. Session management -- create if needed
    let sessionId = args.sessionId;
    if (!sessionId) {
      sessionId = await ctx.runMutation(internal.noraSessions._createSession, {
        userId,
        title: "New Chat",
      });
    }

    // 6. Get user context + memories + quiz insights
    const userCtx: any = await ctx.runQuery(internal.noraChat._getUserContext, { userId });
    const memories: any[] = await ctx.runQuery(internal.noraMemory._getTopMemories, {
      userId,
      limit: 20,
    });
    const quizInsights: any[] = await ctx.runQuery(internal.quizNoraIntegration.getQuizInsightsForNora, {
      userId,
    }) || [];

    // 7. Save user message (tagged to session)
    await ctx.runMutation(internal.noraChat._saveMessage, {
      userId,
      sessionId,
      role: "user",
      content: args.message,
    });

    // 8. Build the Responses API call
    const apiKey = process.env.OPENAI_API_KEY_NEW_NORA || process.env.OPENAI_API_KEY || "";
    const rawMode = args.thinkingMode || "quick";
    const thinkingMode: "quick" | "deep" | "research" =
      rawMode === "auto" ? resolveAutoMode(sanitized) : (rawMode as "quick" | "deep" | "research");

    if (!apiKey) {
      const responseText = fallbackResponse(sanitized, userCtx, args.pdfContext);
      await ctx.runMutation(internal.noraChat._saveMessage, {
        userId,
        sessionId,
        role: "assistant",
        content: responseText,
      });
      // Update session metadata
      await ctx.runMutation(internal.noraSessions._updateSessionAfterMessage, { sessionId });
      return {
        response: responseText,
        success: true,
        sessionId,
        tier: rateLimit.tier,
        remaining_messages: rateLimit.remaining - 1,
      };
    }

    let responseText: string;
    let responseSources: Array<{ title: string; url: string }> = [];

    try {
      // Get last response ID for conversation continuity (per session)
      const previousResponseId: string | null = await ctx.runQuery(
        internal.noraChat._getLastResponseId,
        { userId, sessionId }
      );

      // Build tools array based on thinking mode
      // Quick: no web_search — Nora responds purely from her own knowledge
      // Research: web_search with medium context — find sources, medium detail
      // Deep: web_search with high context + code_interpreter — thorough analysis with sources
      const tools: any[] = [];

      if (thinkingMode === "research") {
        tools.push({ type: "web_search", search_context_size: "medium" });
      } else if (thinkingMode === "deep") {
        tools.push({ type: "web_search", search_context_size: "high" });
        tools.push({ type: "code_interpreter", container: { type: "auto" } });
      }
      // Quick mode: no tools — fast response from Nora's own knowledge

      // Add file_search if a vector store is configured (any mode)
      if (args.vectorStoreId) {
        tools.push({
          type: "file_search",
          vector_store_ids: [args.vectorStoreId],
        });
      }

      // Build instructions with memories, quiz insights, and mode context
      const instructions = buildInstructions(userCtx, args.pdfContext, memories, thinkingMode, quizInsights);

      // Choose model and temperature based on thinking mode
      const modeConfig: Record<string, { model: string; temperature: number }> = {
        quick: { model: "gpt-4o-mini", temperature: 0.7 },
        deep: { model: "gpt-4o", temperature: 0.8 },
        research: { model: "gpt-4o", temperature: 0.5 },
      };
      const { model, temperature } = modeConfig[thinkingMode] || modeConfig.quick;

      // For research/deep modes, wrap the input to strongly signal search intent
      let apiInput = sanitized;
      if (thinkingMode === "research") {
        apiInput = `[Search the web thoroughly for information about this topic, then provide a well-sourced response]\n\n${sanitized}`;
      } else if (thinkingMode === "deep") {
        apiInput = `[Perform a deep analysis with web research to support your response]\n\n${sanitized}`;
      }

      // Build request body — only include tools if we have any (quick mode has none)
      const requestBody: any = {
        model,
        instructions,
        input: apiInput,
        temperature,
      };
      if (tools.length > 0) {
        requestBody.tools = tools;
      }

      // Chain to previous conversation if we have a response ID
      if (previousResponseId) {
        requestBody.previous_response_id = previousResponseId;
      }

      // Call OpenAI Responses API
      const res = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const errorBody = await res.text();
        console.error("OpenAI Responses API error:", res.status, errorBody);

        // If previous_response_id is invalid (expired/deleted), retry without it
        if (res.status === 400 && previousResponseId) {
          console.log("Retrying without previous_response_id...");
          delete requestBody.previous_response_id;
          const retryRes = await fetch("https://api.openai.com/v1/responses", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(requestBody),
          });
          if (!retryRes.ok) throw new Error(`OpenAI error: ${retryRes.status}`);
          const retryData = await retryRes.json();
          responseText = extractResponseText(retryData);
          responseSources = extractSources(retryData);
          if (retryData.id) {
            await ctx.runMutation(internal.noraChat._saveResponseId, {
              userId,
              sessionId,
              responseId: retryData.id,
            });
          }
        } else {
          throw new Error(`OpenAI error: ${res.status}`);
        }
      } else {
        const data = await res.json();

        // Debug: log output item types to verify web_search is being called
        if (Array.isArray(data.output)) {
          const itemTypes = data.output.map((item: any) => item.type);
          console.log(`[Nora][${thinkingMode}] API output items:`, itemTypes);
          const searchCalls = data.output.filter((item: any) => item.type === "web_search_call");
          console.log(`[Nora][${thinkingMode}] Web search calls:`, searchCalls.length);
        }

        responseText = extractResponseText(data);
        responseSources = extractSources(data);
        console.log(`[Nora][${thinkingMode}] Sources extracted:`, responseSources.length, responseSources.map((s: any) => s.url).slice(0, 3));

        // Save response ID for conversation continuity (per session)
        if (data.id) {
          await ctx.runMutation(internal.noraChat._saveResponseId, {
            userId,
            sessionId,
            responseId: data.id,
          });
        }

        // Log token usage from the API response
        if (data.usage) {
          await ctx.runMutation(internal.noraChat._logUsage, {
            userId,
            aiType: "nora",
            tokensUsed: data.usage.total_tokens || 0,
            costEstimate: estimateCost(
              data.usage.input_tokens || 0,
              data.usage.output_tokens || 0
            ),
          });
        }
      }
    } catch (e: any) {
      console.error("Responses API call failed:", e?.message || e);
      console.error("Full error:", JSON.stringify(e, null, 2));
      const isQuota = e?.message?.includes("429") || e?.message?.includes("quota");
      if (isQuota) {
        responseText = "I'm temporarily unable to process your request due to API usage limits. Please try again in a few minutes, or switch to **Quick** mode which uses fewer resources. I apologize for the inconvenience!";
      } else {
        responseText = fallbackResponse(sanitized, userCtx, args.pdfContext);
      }
    }

    // 9. Save Nora's response (tagged to session)
    await ctx.runMutation(internal.noraChat._saveMessage, {
      userId,
      sessionId,
      role: "assistant",
      content: responseText,
    });

    // 10. Update session metadata
    await ctx.runMutation(internal.noraSessions._updateSessionAfterMessage, { sessionId });

    // 11. Extract memories asynchronously (fire-and-forget)
    await ctx.scheduler.runAfter(0, internal.noraMemory.extractMemories, {
      userId,
      userMessage: args.message,
      noraResponse: responseText,
    });

    return {
      response: responseText,
      success: true,
      sessionId,
      tier: rateLimit.tier,
      remaining_messages: rateLimit.remaining - 1,
      sources: responseSources.length > 0 ? responseSources : undefined,
      context: {
        pdfActive: !!args.pdfContext,
        focusMethod: userCtx?.onboarding?.focusMethod,
        userLevel: userCtx?.leaderboard?.level || 1,
      },
    };
  },
});

// ────────────────────────────────────────────────────
// Response parsing helpers
// ────────────────────────────────────────────────────

/**
 * Strip OpenAI citation markers like 【4:0†source】 from the response text.
 * These markers are replaced by our own source UI.
 */
function cleanCitationMarkers(text: string): string {
  return text
    .replace(/【[^】]*】/g, "")
    .replace(/\[\d+\]\s*/g, "") // Also strip [1] [2] style markers
    .replace(/  +/g, " ")
    .trim();
}

/**
 * Extract the text content from a Responses API response.
 *
 * The output array can contain multiple items:
 *   - { type: "web_search_call", ... }
 *   - { type: "message", content: [{ type: "output_text", text: "...", annotations: [...] }] }
 *   - { type: "function_call", ... }
 *
 * We also use the top-level `output_text` shortcut when available.
 */
function extractResponseText(data: any): string {
  let text = "";

  // Shortcut: output_text is a top-level convenience field
  if (data.output_text) {
    text = data.output_text;
  } else if (Array.isArray(data.output)) {
    // Manual extraction from output array
    for (const item of data.output) {
      if (item.type === "message" && Array.isArray(item.content)) {
        const textParts = item.content
          .filter((c: any) => c.type === "output_text" && c.text)
          .map((c: any) => c.text);
        if (textParts.length) {
          text = textParts.join("\n\n");
          break;
        }
      }
    }
  }

  if (!text) {
    return "I'm here to help! Could you rephrase your question?";
  }

  return cleanCitationMarkers(text);
}

/** Extract unique web search source citations from OpenAI Responses API output */
function extractSources(data: any): Array<{ title: string; url: string }> {
  const sources: Array<{ title: string; url: string }> = [];
  const seenUrls = new Set<string>();

  if (Array.isArray(data.output)) {
    for (const item of data.output) {
      console.log("[extractSources] output item type:", item.type);

      if (item.type === "message" && Array.isArray(item.content)) {
        for (const content of item.content) {
          if (content.type === "output_text") {
            const annotationCount = Array.isArray(content.annotations) ? content.annotations.length : 0;
            console.log("[extractSources] output_text annotations:", annotationCount);

            if (Array.isArray(content.annotations)) {
              for (const ann of content.annotations) {
                if (ann.type === "url_citation" && ann.url && !seenUrls.has(ann.url)) {
                  seenUrls.add(ann.url);
                  sources.push({ title: ann.title || ann.url, url: ann.url });
                }
              }
            }
          }
        }
      }
    }
  }

  // Fallback: if no annotation-based sources found, parse markdown links from the response text
  if (sources.length === 0) {
    const responseText = data.output_text || "";
    const fallbackSources = extractSourcesFromText(responseText);
    for (const s of fallbackSources) {
      if (!seenUrls.has(s.url)) {
        seenUrls.add(s.url);
        sources.push(s);
      }
    }
  }

  console.log("[extractSources] total sources found:", sources.length);
  return sources;
}

/**
 * Fallback: extract sources from markdown links [title](url) in response text.
 * Filters out non-http links and deduplicates by URL.
 */
function extractSourcesFromText(text: string): Array<{ title: string; url: string }> {
  const sources: Array<{ title: string; url: string }> = [];
  const seenUrls = new Set<string>();
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  let match;
  while ((match = linkRegex.exec(text)) !== null) {
    const title = match[1];
    const url = match[2];
    if (!seenUrls.has(url)) {
      seenUrls.add(url);
      sources.push({ title, url });
    }
  }
  return sources;
}

function estimateCost(inputTokens: number, outputTokens: number): number {
  // gpt-4o pricing approximation
  return (inputTokens / 1000) * 0.0025 + (outputTokens / 1000) * 0.01;
}
