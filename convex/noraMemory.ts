/**
 * Convex functions for Nora's long-term memory system.
 *
 * Nora learns facts about the user from conversations and stores them
 * for future reference. Users can view and manage what Nora knows.
 */
import { v } from "convex/values";
import {
  query,
  mutation,
  internalMutation,
  internalAction,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// ────────────────────────────────────────────────────
// Queries
// ────────────────────────────────────────────────────

/** Get all memories for the current user, sorted by confidence desc */
export const getMemories = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];

    const memories = await ctx.db
      .query("noraMemory")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    return memories.sort((a, b) => b.confidence - a.confidence);
  },
});

/** Internal: get top N memories for injection into system prompt */
export const _getTopMemories = internalQuery({
  args: { userId: v.id("users"), limit: v.number() },
  handler: async (ctx, { userId, limit }) => {
    const memories = await ctx.db
      .query("noraMemory")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    return memories.sort((a, b) => b.confidence - a.confidence).slice(0, limit);
  },
});

// ────────────────────────────────────────────────────
// Mutations
// ────────────────────────────────────────────────────

/** Upsert a memory -- insert if new key, update if exists */
export const _upsertMemory = internalMutation({
  args: {
    userId: v.id("users"),
    category: v.string(),
    key: v.string(),
    value: v.string(),
    confidence: v.number(),
    source: v.string(),
  },
  handler: async (
    ctx,
    { userId, category, key, value, confidence, source },
  ) => {
    // Check if memory with this key already exists for user
    const existing = await ctx.db
      .query("noraMemory")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const match = existing.find(
      (m) => m.key === key && m.category === category,
    );

    if (match) {
      // Update existing -- bump confidence slightly
      await ctx.db.patch(match._id, {
        value,
        confidence: Math.min(1.0, match.confidence + 0.1),
        lastReferencedAt: new Date().toISOString(),
      });
    } else {
      await ctx.db.insert("noraMemory", {
        userId,
        category,
        key,
        value,
        confidence,
        source,
        lastReferencedAt: new Date().toISOString(),
      });
    }
  },
});

/** Delete a specific memory (owner only) */
export const deleteMemory = mutation({
  args: { memoryId: v.id("noraMemory") },
  handler: async (ctx, { memoryId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return;

    const memory = await ctx.db.get(memoryId);
    if (!memory || memory.userId !== user._id) return;

    await ctx.db.delete(memoryId);
  },
});

/** Delete all memories for the current user */
export const clearAllMemories = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return;

    const memories = await ctx.db
      .query("noraMemory")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    for (const memory of memories) {
      await ctx.db.delete(memory._id);
    }
  },
});

// ────────────────────────────────────────────────────
// Actions
// ────────────────────────────────────────────────────

/**
 * Extract memories from a conversation turn.
 * Called asynchronously after each Nora response.
 */
export const extractMemories = internalAction({
  args: {
    userId: v.id("users"),
    userMessage: v.string(),
    noraResponse: v.string(),
  },
  handler: async (ctx, { userId, userMessage, noraResponse }) => {
    const apiKey =
      process.env.OPENAI_API_KEY_NEW_NORA || process.env.OPENAI_API_KEY || "";

    if (!apiKey) return;

    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `You extract learnable facts about a student from their conversation with an AI study assistant. Return a JSON object: {"facts": [...]} where each fact has these fields:
- category: one of "academic", "preference", "struggle", "goal", "personal"
- key: a snake_case identifier for this fact (e.g. "weak_subject", "preferred_study_time")
- value: the fact itself, as a concise string

Only extract clear, meaningful facts. Do NOT extract:
- Temporary states ("user is tired right now")
- Vague statements
- Things the AI said (only extract from the user's messages)

If no facts can be extracted, return {"facts": []}.`,
            },
            {
              role: "user",
              content: `Student said: "${userMessage.slice(0, 500)}"\n\nAI responded: "${noraResponse.slice(0, 200)}"`,
            },
          ],
          temperature: 0.3,
          max_tokens: 300,
        }),
      });

      if (!res.ok) {
        console.error(`[noraMemory] extraction call failed: ${res.status}`);
        return;
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content?.trim();
      if (!content) return;

      let facts: Array<{
        category: string;
        key: string;
        value: string;
      }>;

      try {
        const parsed = JSON.parse(content);
        facts = Array.isArray(parsed) ? parsed : parsed?.facts;
      } catch (e) {
        console.error("[noraMemory] extraction returned invalid JSON");
        return;
      }

      if (!Array.isArray(facts)) return;

      // Upsert each extracted fact
      const validCategories = [
        "academic",
        "preference",
        "struggle",
        "goal",
        "personal",
      ];
      for (const fact of facts.slice(0, 5)) {
        // Max 5 facts per turn
        if (
          !fact.category ||
          !fact.key ||
          !fact.value ||
          !validCategories.includes(fact.category)
        ) {
          continue;
        }

        await ctx.runMutation(internal.noraMemory._upsertMemory, {
          userId,
          category: fact.category,
          key: fact.key,
          value: fact.value,
          confidence: 0.5,
          source: "inferred",
        });
      }
    } catch (e: any) {
      console.error("[noraMemory] extraction failed:", e?.message || e);
    }
  },
});
