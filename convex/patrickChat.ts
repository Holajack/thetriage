/**
 * Convex action for Patrick AI chat — GPT-4o-mini powered study coach.
 *
 * Patrick is the Premium-tier AI assistant. He provides personalized study
 * coaching, time management advice, motivation, and general academic support
 * using GPT-4o-mini (cost-effective).
 *
 * What Patrick CAN do:
 *   - Conversational study coaching with real AI responses
 *   - Personalized advice based on user's study data
 *   - Time management, focus techniques, motivation
 *   - General academic Q&A and study planning
 *
 * What Patrick CANNOT do (upsell to Nora/Pro):
 *   - Web search / real-time research
 *   - PDF / document analysis
 *   - Code execution / STEM problem solving
 *   - Deep research mode
 */
import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// ────────────────────────────────────────────────────
// Internal helpers
// ────────────────────────────────────────────────────

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

/** Get user context for personalized responses */
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
      .take(5);
    return { user, onboarding, leaderboard, sessions };
  },
});

export const _checkRateLimit = internalQuery({
  args: { userId: v.id("users"), aiType: v.string() },
  handler: async (ctx, { userId, aiType }) => {
    const user = await ctx.db.get(userId);
    const tier = user?.subscriptionTier || "free";

    // Patrick is available for premium+ tiers
    const limits: Record<string, { enabled: boolean; perDay: number; maxLen: number }> = {
      free: { enabled: false, perDay: 0, maxLen: 500 },
      trial: { enabled: true, perDay: 15, maxLen: 1500 },
      premium: { enabled: true, perDay: 40, maxLen: 2000 },
      pro: { enabled: true, perDay: 100, maxLen: 3000 },
    };
    const tierLimits = limits[tier] || limits.free;

    if (!tierLimits.enabled) {
      return {
        allowed: false,
        tier,
        reason: "Patrick AI is available for Premium and Pro members. Upgrade to unlock your personal study coach!",
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
        reason: `You've reached your daily Patrick message limit (${tierLimits.perDay}). ${tier === "premium" ? "Upgrade to Pro for more messages and access to Nora AI!" : "Come back tomorrow!"}`,
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

export const _saveMessage = internalMutation({
  args: {
    userId: v.id("users"),
    role: v.string(),
    content: v.string(),
  },
  handler: async (ctx, { userId, role, content }) => {
    await ctx.db.insert("patrickChat", { userId, role, content });
  },
});

/** Get recent chat history for conversation context */
export const _getRecentHistory = internalQuery({
  args: { userId: v.id("users"), limit: v.number() },
  handler: async (ctx, { userId, limit }) => {
    const messages = await ctx.db
      .query("patrickChat")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);
    // Return in chronological order
    return messages.reverse().map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
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

function estimateCost(inputTokens: number, outputTokens: number): number {
  // GPT-4o-mini pricing
  return (inputTokens / 1000) * 0.00015 + (outputTokens / 1000) * 0.0006;
}

function buildSystemPrompt(userCtx: any): string {
  const userName = userCtx?.user?.fullName?.split(" ")[0] || "there";
  const focusMethod = userCtx?.onboarding?.focusMethod || "Balanced Focus";
  const weeklyGoal = userCtx?.onboarding?.weeklyFocusGoal || 5;
  const university = userCtx?.user?.university || "";
  const major = userCtx?.user?.major || "";

  let statsBlock = "";
  const lb = userCtx?.leaderboard;
  if (lb) {
    const hours = Math.floor((lb.totalFocusTime || 0) / 3600);
    statsBlock = `\n- Level: ${lb.level || 1}
- Total Focus Time: ${hours} hours
- Current Streak: ${lb.currentStreak || 0} days
- Sessions Completed: ${lb.sessionsCompleted || 0}`;
  }

  let sessionBlock = "";
  const sessions = userCtx?.sessions;
  if (sessions?.length) {
    const totalMin = sessions.reduce((s: number, x: any) => s + ((x.durationSeconds || 0) / 60), 0);
    sessionBlock = `\n- Recent Activity: ${sessions.length} sessions, ${Math.round(totalMin)} minutes total`;
  }

  return `You are Patrick, a friendly and knowledgeable AI study coach inside HikeWise — the academic success platform. You're warm, encouraging, and practical. Think of yourself as a supportive upperclassman who's been through it all and genuinely wants to help.

**Student Profile:**
- Name: ${userName}
- Study Method: ${focusMethod}
- Weekly Focus Goal: ${weeklyGoal} hours${university ? `\n- University: ${university}` : ""}${major ? `\n- Major: ${major}` : ""}${statsBlock}${sessionBlock}

**Your Strengths (what you're great at):**
- Study planning and scheduling advice
- Focus and concentration techniques (especially ${focusMethod})
- Time management and productivity strategies
- Motivation, accountability, and overcoming procrastination
- General study tips and academic advice
- Exam preparation strategies
- Stress management and work-life balance
- Celebrating progress and encouraging consistency

**Your Style:**
- Be conversational and encouraging — not robotic or generic
- Give specific, actionable advice (not just "study harder")
- Reference their actual data when relevant (streak, focus time, weekly goal)
- Keep responses concise but helpful (2-4 paragraphs max unless they ask for more)
- Use their name naturally (not every message, but occasionally)
- When they're struggling, be empathetic first, then offer practical next steps
- Celebrate wins, no matter how small

**Boundaries (handle gracefully):**
- If asked to search the web, research something, or find current information: "I can't search the web, but I can share what I know! For real-time research, Nora AI on the Pro plan can search the internet and cite sources for you."
- If asked to analyze a PDF, document, or uploaded file: "I'm not able to read documents, but Nora AI on the Pro plan can analyze your PDFs, create study guides, and generate practice questions from them!"
- If asked to solve complex math, run code, or do STEM calculations: "That's a bit beyond my wheelhouse! Nora AI on the Pro plan has a code interpreter that can work through math and science problems step by step."
- If asked to write entire essays or complete assignments: "I'd love to help you plan and outline your work! I can help with thesis development, structure, and study strategies — but the actual writing is your superpower. Want to start with an outline?"
- Keep upsell mentions natural and helpful, not pushy — mention Nora only when genuinely relevant

**Safety:**
- Follow academic integrity guidelines
- Provide guidance and scaffolding, not complete solutions to graded work
- Be honest when you don't know something`;
}

// Fallback response when OpenAI API is unavailable
function fallbackResponse(message: string, userCtx: any): string {
  const userName = userCtx?.user?.fullName?.split(" ")[0] || "there";
  const lower = message.toLowerCase();

  if (lower.includes("focus") || lower.includes("concentrate")) {
    return `Great question about focus, ${userName}! Try the "5-4-3-2-1" grounding technique before your next study session: name 5 things you see, 4 you hear, 3 you feel, 2 you smell, 1 you taste. It brings your mind fully into the present. Then start with just 15 minutes of focused work — momentum will carry you from there!`;
  }
  if (lower.includes("motivation") || lower.includes("procrastination")) {
    return `I hear you, ${userName}. Here's what works: pick the smallest possible next step for your task. Not "write the essay" — just "open the document and write one sentence." Once you start, your brain shifts from resistance to flow. What's the task you're putting off?`;
  }
  if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
    return `Hey ${userName}! I'm Patrick, your study coach. I'm here to help with study planning, focus techniques, time management, and keeping you on track. What are you working on today?`;
  }
  return `Hey ${userName}! I'd love to help with that. I'm best at study planning, focus techniques, time management, and motivation. Could you tell me a bit more about what you're working on?`;
}

// ────────────────────────────────────────────────────
// Main action: sendMessage
// ────────────────────────────────────────────────────

export const sendMessage = action({
  args: {
    message: v.string(),
    pdfContext: v.optional(v.any()),
    userSettings: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // 1. Authenticate
    const currentUser: any = await ctx.runQuery(internal.patrickChat._getCurrentUser);
    if (!currentUser) {
      return {
        error: "Authentication failed",
        response: "I couldn't verify your identity. Please try signing in again.",
      };
    }
    const userId = currentUser._id as Id<"users">;

    // 2. Rate limit check
    const rateLimit: any = await ctx.runQuery(internal.patrickChat._checkRateLimit, {
      userId,
      aiType: "patrick",
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
        response: `Message too long. Max ${rateLimit.maxLen} characters for your plan. Current: ${sanitized.length}.`,
        upgrade_required: rateLimit.tier === "premium",
      };
    }

    // 4. Handle PDF context gracefully (upsell to Nora)
    if (args.pdfContext) {
      return {
        response:
          "I appreciate you sharing that document! Unfortunately, I'm not able to read or analyze PDFs. But Nora AI on the Pro plan can dive deep into your documents — she'll create study guides, practice questions, and summaries from them. Want me to help you with something else in the meantime?",
        success: true,
        tier: rateLimit.tier,
        remaining_messages: rateLimit.remaining, // Don't count this against their limit
        upgrade_prompt: "pro",
      };
    }

    // 5. Get user context for personalized responses
    const userCtx: any = await ctx.runQuery(internal.patrickChat._getUserContext, { userId });

    // 6. Save user message
    await ctx.runMutation(internal.patrickChat._saveMessage, {
      userId,
      role: "user",
      content: sanitized,
    });

    // 7. Call GPT-4o-mini
    const apiKey = process.env.OPENAI_API_KEY || "";
    let responseText: string;

    if (!apiKey) {
      responseText = fallbackResponse(sanitized, userCtx);
    } else {
      try {
        // Get recent conversation history for context
        const recentHistory: any[] = await ctx.runQuery(
          internal.patrickChat._getRecentHistory,
          { userId, limit: 10 }
        );

        const systemPrompt = buildSystemPrompt(userCtx);

        // Build messages array with conversation history
        const messages: { role: string; content: string }[] = [
          { role: "system", content: systemPrompt },
        ];

        // Add recent history (excluding the message we just saved)
        for (const msg of recentHistory) {
          // Skip the current message we just inserted
          if (msg.role === "user" && msg.content === sanitized) continue;
          messages.push({ role: msg.role, content: msg.content });
        }

        // Add current message
        messages.push({ role: "user", content: sanitized });

        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages,
            temperature: 0.7,
            max_tokens: 800,
          }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error("OpenAI Chat Completions error:", res.status, errorText);
          throw new Error(`OpenAI error: ${res.status}`);
        }

        const data = await res.json();
        responseText = data.choices?.[0]?.message?.content || fallbackResponse(sanitized, userCtx);

        // Log actual token usage
        if (data.usage) {
          await ctx.runMutation(internal.patrickChat._logUsage, {
            userId,
            aiType: "patrick",
            tokensUsed: data.usage.total_tokens || 0,
            costEstimate: estimateCost(
              data.usage.prompt_tokens || 0,
              data.usage.completion_tokens || 0
            ),
          });
        }
      } catch (e) {
        console.error("Patrick GPT-4o-mini call failed:", e);
        responseText = fallbackResponse(sanitized, userCtx);
      }
    }

    // 8. Save Patrick's response
    await ctx.runMutation(internal.patrickChat._saveMessage, {
      userId,
      role: "assistant",
      content: responseText,
    });

    return {
      response: responseText,
      tier: rateLimit.tier,
      remaining_messages: rateLimit.remaining - 1,
      success: true,
    };
  },
});
