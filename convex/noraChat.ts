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
import { action, internalMutation, internalQuery } from "./_generated/server";
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

/** Check rate limit for the user */
export const _checkRateLimit = internalQuery({
  args: { userId: v.id("users"), aiType: v.string() },
  handler: async (ctx, { userId, aiType }) => {
    const user = await ctx.db.get(userId);
    const tier = user?.subscriptionTier || "free";

    // Nora is available for trial (limited) and Pro tiers
    // Trial users get a taste of Nora, then must upgrade when trial ends
    const limits: Record<string, { enabled: boolean; perDay: number; maxLen: number }> = {
      free: { enabled: false, perDay: 0, maxLen: 500 },
      trial: { enabled: true, perDay: 10, maxLen: 2000 },
      premium: { enabled: false, perDay: 0, maxLen: 500 },
      pro: { enabled: true, perDay: 100, maxLen: 5000 },
    };
    const tierLimits = limits[tier] || limits.free;

    if (!tierLimits.enabled) {
      const reason = tier === "premium"
        ? "Nora AI is a Pro-exclusive feature. You're already on Premium — upgrade to Pro to unlock web research, document analysis, and advanced study support!"
        : "Nora AI is available for Pro members. Upgrade to Pro to unlock web research, document analysis, and advanced study support!";
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
        reason: `You've reached your daily Nora message limit (${tierLimits.perDay}). ${tier === "trial" ? "Upgrade to Pro for 100 messages per day!" : "Come back tomorrow!"}`,
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

/** Save a chat message to noraChat */
export const _saveMessage = internalMutation({
  args: {
    userId: v.id("users"),
    role: v.string(),
    content: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, { userId, role, content, metadata }) => {
    await ctx.db.insert("noraChat", { userId, role, content, metadata });
  },
});

/** Get the last OpenAI response ID for conversation continuity */
export const _getLastResponseId = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const record = await ctx.db
      .query("noraResponseIds")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    return record?.responseId ?? null;
  },
});

/** Save/update the last OpenAI response ID */
export const _saveResponseId = internalMutation({
  args: { userId: v.id("users"), responseId: v.string() },
  handler: async (ctx, { userId, responseId }) => {
    const existing = await ctx.db
      .query("noraResponseIds")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { responseId });
    } else {
      await ctx.db.insert("noraResponseIds", { userId, responseId });
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

function buildInstructions(userCtx: any, pdfContext: any): string {
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

**Your Capabilities (use these tools when relevant):**
1. **Web Search** — Search the internet for current information, research papers, study resources, facts, and up-to-date data. Use this proactively when the student asks about topics that benefit from current information.
2. **File Search** — When the student has uploaded PDFs or documents, search through the ENTIRE document to find specific information, generate study questions, create summaries, and extract key concepts. Always use file_search when a document is attached.
3. **Code Interpreter** — Run Python code to solve math problems, create charts, analyze data, or work through science/engineering calculations step-by-step. Use this for any STEM homework that involves computation.

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

**Safety:**
- Follow OpenAI safety policies and academic integrity guidelines
- Provide guidance and scaffolding rather than complete graded work solutions
- Refuse requests that constitute cheating`;

  if (pdfContext?.title) {
    instructions += `\n\n**Active Document:** "${pdfContext.title}"
When the student asks about this document, use file_search to retrieve specific information from it.`;
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
    thinkingMode: v.optional(v.string()), // 'fast' | 'deep'
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
  handler: async (ctx, args) => {
    // 1. Authenticate
    const currentUser: any = await ctx.runQuery(internal.noraChat._getCurrentUser);
    if (!currentUser) {
      return {
        error: "Authentication failed",
        response: "I couldn't verify your identity. Please try signing in again.",
      };
    }
    const userId = currentUser._id as Id<"users">;

    // 2. Rate limit check
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

    // 3. Sanitize & validate
    const sanitized = sanitizeInput(args.message);
    if (sanitized.length > rateLimit.maxLen) {
      return {
        error: "MESSAGE_TOO_LONG",
        response: `Message too long. Max ${rateLimit.maxLen} chars for your plan. Current: ${sanitized.length}.`,
        upgrade_required: rateLimit.tier !== "pro",
      };
    }

    // 4. Get user context
    const userCtx: any = await ctx.runQuery(internal.noraChat._getUserContext, { userId });

    // 5. Save user message
    await ctx.runMutation(internal.noraChat._saveMessage, {
      userId,
      role: "user",
      content: args.message,
    });

    // 6. Build the Responses API call
    const apiKey = process.env.OPENAI_API_KEY_NEW_NORA || process.env.OPENAI_API_KEY || "";
    const thinkingMode = (args.thinkingMode || "fast") as "fast" | "deep";

    if (!apiKey) {
      const responseText = fallbackResponse(sanitized, userCtx, args.pdfContext);
      await ctx.runMutation(internal.noraChat._saveMessage, {
        userId,
        role: "assistant",
        content: responseText,
      });
      return {
        response: responseText,
        success: true,
        tier: rateLimit.tier,
        remaining_messages: rateLimit.remaining - 1,
      };
    }

    let responseText: string;

    try {
      // Get last response ID for conversation continuity
      const previousResponseId: string | null = await ctx.runQuery(
        internal.noraChat._getLastResponseId,
        { userId }
      );

      // Build tools array
      const tools: any[] = [{ type: "web_search" }];

      // Add file_search if a vector store is configured
      if (args.vectorStoreId) {
        tools.push({
          type: "file_search",
          vector_store_ids: [args.vectorStoreId],
        });
      }

      // Add code_interpreter for deep think mode (STEM calculations, data analysis)
      if (thinkingMode === "deep") {
        tools.push({
          type: "code_interpreter",
          container: { type: "auto" },
        });
      }

      // Build instructions
      const instructions = buildInstructions(userCtx, args.pdfContext);

      // Choose model based on thinking mode
      const model = thinkingMode === "deep" ? "gpt-4o" : "gpt-4o-mini";

      // Build request body
      const requestBody: any = {
        model,
        instructions,
        input: sanitized,
        tools,
        temperature: thinkingMode === "deep" ? 0.8 : 0.7,
      };

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
          // Save new response ID
          if (retryData.id) {
            await ctx.runMutation(internal.noraChat._saveResponseId, {
              userId,
              responseId: retryData.id,
            });
          }
        } else {
          throw new Error(`OpenAI error: ${res.status}`);
        }
      } else {
        const data = await res.json();
        responseText = extractResponseText(data);

        // Save response ID for conversation continuity
        if (data.id) {
          await ctx.runMutation(internal.noraChat._saveResponseId, {
            userId,
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
      responseText = fallbackResponse(sanitized, userCtx, args.pdfContext);
    }

    // 7. Save Nora's response
    await ctx.runMutation(internal.noraChat._saveMessage, {
      userId,
      role: "assistant",
      content: responseText,
    });

    // 8. Log usage (fallback estimation if not already logged from API response)
    // Only log if we hit the fallback path (API path logs from actual usage data above)

    return {
      response: responseText,
      success: true,
      tier: rateLimit.tier,
      remaining_messages: rateLimit.remaining - 1,
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
  // Shortcut: output_text is a top-level convenience field
  if (data.output_text) {
    return data.output_text;
  }

  // Manual extraction from output array
  if (Array.isArray(data.output)) {
    for (const item of data.output) {
      if (item.type === "message" && Array.isArray(item.content)) {
        const textParts = item.content
          .filter((c: any) => c.type === "output_text" && c.text)
          .map((c: any) => c.text);
        if (textParts.length) return textParts.join("\n\n");
      }
    }
  }

  return "I'm here to help! Could you rephrase your question?";
}

function estimateCost(inputTokens: number, outputTokens: number): number {
  // gpt-4o pricing approximation
  return (inputTokens / 1000) * 0.0025 + (outputTokens / 1000) * 0.01;
}
