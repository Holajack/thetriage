/**
 * Convex action for whisper transcription — replaces whisper-transcribe edge function.
 *
 * Voice input is a Nora feature, so transcription is Elite-only (see tiers.ts).
 * Takes base64-encoded audio and forwards it to OpenAI Whisper API.
 * The client must convert the audio file to base64 before calling this action,
 * since Convex actions cannot receive raw file uploads (FormData).
 */
import { v } from "convex/values";
import { action, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { normalizeTier } from "./tiers";

// Whisper is priced per audio-minute, not per token; this caps runaway use.
const DAILY_TRANSCRIPTION_LIMIT = 200;

/** Today's transcription count for a user. */
export const _getTodayCount = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const today = new Date().toISOString().slice(0, 10);
    const usage = await ctx.db
      .query("aiUsageTracking")
      .withIndex("by_userId_aiType_date", (q) =>
        q.eq("userId", userId).eq("aiType", "whisper").eq("date", today),
      )
      .unique();
    return usage?.messagesSent ?? 0;
  },
});

/**
 * Transcribe audio via OpenAI Whisper API (Elite only).
 *
 * The client sends `audioBase64` (the raw audio bytes encoded as a base64 string)
 * and `mimeType` (e.g. "audio/m4a"). We decode it server-side and POST to Whisper.
 */
export const transcribe = action({
  args: {
    audioBase64: v.string(),
    mimeType: v.optional(v.string()),
    fileName: v.optional(v.string()),
    durationSeconds: v.optional(v.number()), // client-reported, for cost tracking only
  },
  handler: async (ctx, args) => {
    // 1. Authenticate + tier gate (voice input belongs to Nora / Elite)
    const currentUser: any = await ctx.runQuery(
      internal.aiShared._getCurrentUser,
    );
    if (!currentUser) {
      return { error: "Authentication failed", text: null };
    }
    if (normalizeTier(currentUser.subscriptionTier) !== "elite") {
      return {
        error: "ACCESS_DENIED",
        text: null,
        upgrade_required: true,
      };
    }

    // 2. Daily cap
    const todayCount: number = await ctx.runQuery(
      internal.transcribe._getTodayCount,
      { userId: currentUser._id },
    );
    if (todayCount >= DAILY_TRANSCRIPTION_LIMIT) {
      return {
        error: "Daily voice limit reached. Try again tomorrow.",
        text: null,
      };
    }

    // 3. Check API key
    const apiKey = process.env.OPENAI_API_KEY || "";
    if (!apiKey) {
      return { error: "Transcription service not configured", text: null };
    }

    // 4. Decode base64 → binary
    const binaryStr = atob(args.audioBase64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: args.mimeType || "audio/m4a" });

    // 5. Build FormData for Whisper API (model is fixed server-side)
    const formData = new FormData();
    formData.append("file", blob, args.fileName || "recording.m4a");
    formData.append("model", "whisper-1");
    formData.append("response_format", "json");

    // 6. Call OpenAI Whisper
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(
        `[transcribe] Whisper failed ${res.status}: ${errorText.slice(0, 300)}`,
      );
      return { error: "Transcription failed", text: null };
    }

    const result = await res.json();

    // 7. Log usage (whisper-1 ≈ $0.006 per audio-minute)
    const minutes = Math.max((args.durationSeconds || 0) / 60, 0);
    await ctx.runMutation(internal.aiShared._logUsage, {
      userId: currentUser._id,
      aiType: "whisper",
      tokensUsed: 0,
      costEstimate: minutes * 0.006,
    });

    return { text: result.text, error: null };
  },
});
