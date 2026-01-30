/**
 * Convex-based AI chat service
 *
 * Screens call these functions to interact with AI chat features.
 * Internally uses the ConvexReactClient to invoke Convex actions.
 */
import { ConvexReactClient } from "convex/react";
import { api } from "../../convex/_generated/api";

let _convexClient: ConvexReactClient | null = null;

export function setConvexClient(client: ConvexReactClient) {
  _convexClient = client;
}

function getClient(): ConvexReactClient {
  if (!_convexClient) {
    throw new Error("Convex client not initialized. Call setConvexClient first.");
  }
  return _convexClient;
}

// ────────────────────────────────────────────────────
// Nora Chat
// ────────────────────────────────────────────────────

export interface NoraChatArgs {
  message: string;
  thinkingMode?: "fast" | "deep";
  conversationHistory?: { role: string; content: string }[];
  userSettings?: any;
  pdfContext?: { title: string; file_path?: string } | null;
  screenContext?: any;
}

export interface AIChatResponse {
  response?: string;
  error?: string;
  success?: boolean;
  tier?: string;
  remaining_messages?: number;
  upgrade_required?: boolean;
  context?: any;
}

export async function sendNoraChatMessage(args: NoraChatArgs): Promise<AIChatResponse> {
  try {
    const client = getClient();
    const result = await client.action(api.noraChat.sendMessage, {
      message: args.message,
      thinkingMode: args.thinkingMode || "fast",
      conversationHistory: args.conversationHistory,
      userSettings: args.userSettings,
      pdfContext: args.pdfContext || null,
      screenContext: args.screenContext,
    });
    return result as AIChatResponse;
  } catch (error: any) {
    console.error("Nora chat error:", error);
    return {
      error: error.message || "Failed to send message",
      response: "I'm experiencing technical difficulties. Please try again in a moment.",
      success: false,
    };
  }
}

// ────────────────────────────────────────────────────
// Patrick Chat
// ────────────────────────────────────────────────────

export interface PatrickChatArgs {
  message: string;
  pdfContext?: any;
  userSettings?: any;
}

export async function sendPatrickChatMessage(args: PatrickChatArgs): Promise<AIChatResponse> {
  try {
    const client = getClient();
    const result = await client.action(api.patrickChat.sendMessage, {
      message: args.message,
      pdfContext: args.pdfContext,
      userSettings: args.userSettings,
    });
    return result as AIChatResponse;
  } catch (error: any) {
    console.error("Patrick chat error:", error);
    return {
      error: error.message || "Failed to send message",
      response: "I'm having trouble right now. Please try again.",
      success: false,
    };
  }
}

// ────────────────────────────────────────────────────
// Whisper Transcription
// ────────────────────────────────────────────────────

export interface TranscribeArgs {
  audioBase64: string;
  mimeType?: string;
  fileName?: string;
  model?: string;
}

export interface TranscribeResponse {
  text: string | null;
  error: string | null;
}

export async function transcribeAudio(args: TranscribeArgs): Promise<TranscribeResponse> {
  try {
    const client = getClient();
    const result = await client.action(api.transcribe.transcribe, {
      audioBase64: args.audioBase64,
      mimeType: args.mimeType,
      fileName: args.fileName,
      model: args.model,
    });
    return result as TranscribeResponse;
  } catch (error: any) {
    console.error("Transcribe error:", error);
    return { text: null, error: error.message || "Transcription failed" };
  }
}
