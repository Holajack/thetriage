/**
 * Convex-based AI chat service
 *
 * Screens call these functions to interact with AI chat features.
 * Internally uses the ConvexReactClient to invoke Convex actions.
 */
import { api } from "../../convex/_generated/api";
import { getConvexClient } from "./convexClient";
export { setConvexClient } from "./convexClient";

// ────────────────────────────────────────────────────
// Nora Chat
// ────────────────────────────────────────────────────

export interface NoraChatArgs {
  message: string;
  thinkingMode?: "auto" | "quick" | "deep" | "research";
  sessionId?: string;
  conversationHistory?: { role: string; content: string }[];
  userSettings?: any;
  pdfContext?: { title: string; file_path?: string } | null;
  screenContext?: any;
  /** OpenAI vector store ID for the attached ebook so file_search can find it. */
  vectorStoreId?: string;
}

export interface AIChatResponse {
  response?: string;
  error?: string;
  success?: boolean;
  sessionId?: string;
  tier?: string;
  remaining_messages?: number;
  upgrade_required?: boolean;
  context?: any;
  sources?: Array<{ title: string; url: string }>;
}

export async function sendNoraChatMessage(
  args: NoraChatArgs,
): Promise<AIChatResponse> {
  try {
    const client = getConvexClient();
    const result = await client.action(api.noraChat.sendMessage, {
      message: args.message,
      thinkingMode: args.thinkingMode || "quick",
      sessionId: args.sessionId as any,
      conversationHistory: args.conversationHistory,
      userSettings: args.userSettings,
      pdfContext: args.pdfContext || null,
      screenContext: args.screenContext,
      vectorStoreId: args.vectorStoreId,
    });
    return result as AIChatResponse;
  } catch (error: any) {
    return {
      error: error.message || "Failed to send message",
      response:
        "I'm experiencing technical difficulties. Please try again in a moment.",
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

export async function sendPatrickChatMessage(
  args: PatrickChatArgs,
): Promise<AIChatResponse> {
  try {
    const client = getConvexClient();
    const result = await client.action(api.patrickChat.sendMessage, {
      message: args.message,
      pdfContext: args.pdfContext,
      userSettings: args.userSettings,
    });
    return result as AIChatResponse;
  } catch (error: any) {
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

export async function transcribeAudio(
  args: TranscribeArgs,
): Promise<TranscribeResponse> {
  try {
    const client = getConvexClient();
    const result = await client.action(api.transcribe.transcribe, {
      audioBase64: args.audioBase64,
      mimeType: args.mimeType,
      fileName: args.fileName,
      model: args.model,
    });
    return result as TranscribeResponse;
  } catch (error: any) {
    return { text: null, error: error.message || "Transcription failed" };
  }
}
