/**
 * Convex action for whisper transcription — replaces whisper-transcribe edge function.
 *
 * Takes base64-encoded audio and forwards it to OpenAI Whisper API.
 * The client must convert the audio file to base64 before calling this action,
 * since Convex actions cannot receive raw file uploads (FormData).
 */
import { v } from "convex/values";
import { action, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

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

/**
 * Transcribe audio via OpenAI Whisper API.
 *
 * The client sends `audioBase64` (the raw audio bytes encoded as a base64 string)
 * and `mimeType` (e.g. "audio/m4a"). We decode it server-side and POST to Whisper.
 */
export const transcribe = action({
  args: {
    audioBase64: v.string(),
    mimeType: v.optional(v.string()),
    fileName: v.optional(v.string()),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Authenticate
    const currentUser: any = await ctx.runQuery(internal.transcribe._getCurrentUser);
    if (!currentUser) {
      return { error: "Authentication failed", text: null };
    }

    // 2. Check API key
    const apiKey = process.env.OPENAI_API_KEY || "";
    if (!apiKey) {
      return { error: "Transcription service not configured", text: null };
    }

    // 3. Decode base64 → binary
    const binaryStr = atob(args.audioBase64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: args.mimeType || "audio/m4a" });

    // 4. Build FormData for Whisper API
    const formData = new FormData();
    formData.append("file", blob, args.fileName || "recording.m4a");
    formData.append("model", args.model || "whisper-1");
    formData.append("response_format", "json");

    // 5. Call OpenAI Whisper
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Whisper API error:", res.status, errorText);
      return { error: "Transcription failed", text: null, details: errorText };
    }

    const result = await res.json();
    return { text: result.text, error: null };
  },
});
