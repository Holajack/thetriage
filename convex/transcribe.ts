/**
 * Convex action for whisper transcription — replaces whisper-transcribe edge function.
 *
 * Voice input is a Nora feature, so transcription is Elite-only (see tiers.ts).
 * Takes base64-encoded audio and forwards it to OpenAI Whisper API.
 * The client must convert the audio file to base64 before calling this action,
 * since Convex actions cannot receive raw file uploads (FormData).
 */
import { v } from "convex/values";
import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { normalizeTier } from "./tiers";

// Whisper is priced per audio-minute, not per token; this caps runaway use.
const DAILY_TRANSCRIPTION_LIMIT = 200;

// 10MB of base64 text decodes to ~7.5MB of raw audio — generous for a
// several-minute voice message at typical compressed (m4a/aac) bitrates,
// but bounds the payload before we atob()-decode and forward it to OpenAI.
const MAX_AUDIO_BASE64_LENGTH = 10 * 1024 * 1024;

/**
 * Atomically check-and-reserve today's transcription slot in one mutation.
 * A separate read-only count check followed by _logUsage after the OpenAI
 * call (the old shape here) lets concurrent requests all read the same
 * "under limit" count before any of them commits an increment — the same
 * race _reserveUsage closes for Nora/Patrick in aiShared.ts. This must be
 * called before the Whisper request goes out, not after.
 */
export const _reserveTranscription = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const today = new Date().toISOString().slice(0, 10);
    const existing = await ctx.db
      .query("aiUsageTracking")
      .withIndex("by_userId_aiType_date", (q) =>
        q.eq("userId", userId).eq("aiType", "whisper").eq("date", today),
      )
      .unique();

    const sent = existing?.messagesSent ?? 0;
    if (sent >= DAILY_TRANSCRIPTION_LIMIT) {
      return { allowed: false };
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        messagesSent: sent + 1,
        lastMessageAt: new Date().toISOString(),
      });
    } else {
      await ctx.db.insert("aiUsageTracking", {
        userId,
        aiType: "whisper",
        date: today,
        messagesSent: 1,
        tokensUsed: 0,
        costEstimate: 0,
        lastMessageAt: new Date().toISOString(),
      });
    }

    return { allowed: true };
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
    // 0. Reject oversized payloads before doing anything else — base64
    // length correlates directly with decoded byte size, so this bounds
    // the audio blob without needing to atob()-decode it first.
    if (args.audioBase64.length > MAX_AUDIO_BASE64_LENGTH) {
      return {
        error: "Audio file is too large. Please keep recordings shorter.",
        text: null,
      };
    }

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

    // 2. Daily cap — atomic check-and-reserve (must happen before the
    // Whisper call, not after, to close the concurrent-request race).
    const reservation: { allowed: boolean } = await ctx.runMutation(
      internal.transcribe._reserveTranscription,
      { userId: currentUser._id },
    );
    if (!reservation.allowed) {
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
