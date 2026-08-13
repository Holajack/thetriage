import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { getCurrentUser } from "./users";
import { normalizeTier } from "./tiers";

/**
 * Upload flow:
 *   1. Client calls `generateUploadUrl` to get a signed Convex storage URL.
 *   2. Client POSTs the PDF bytes directly to that URL.
 *   3. Client calls `registerUpload` with the resulting `storageId` + title.
 *   4. `registerUpload` schedules `ingestEbook` (an action) which uploads the
 *      file to OpenAI and attaches it to a per-user vector store.
 */

// Reasonable per-file cap for beta: bigger PDFs mean real added OpenAI
// ingestion cost (Elite file_search) for marginal benefit as a study aid.
const MAX_EBOOK_BYTES = 25 * 1024 * 1024; // 25MB

// Reasonable per-user cap for beta: every registered ebook can trigger a
// real, uncapped OpenAI ingestion call for Elite users, so the number of
// ebooks a single account can hold needs a ceiling.
const MAX_EBOOKS_PER_USER = 8;

// Step 1 — generate a one-shot upload URL. Returns a string the client posts to.
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await getCurrentUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

// Step 3 — register the freshly-uploaded file and kick off ingestion.
export const registerUpload = mutation({
  args: {
    storageId: v.string(),
    title: v.string(),
    fileSize: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    // Reject registration and clean up the blob the client already uploaded
    // (via generateUploadUrl) rather than leaving an unowned file sitting in
    // Convex storage forever.
    const reject = async (message: string): Promise<never> => {
      try {
        await ctx.storage.delete(args.storageId);
      } catch {
        // Best-effort cleanup of the now-orphaned Convex blob
      }
      throw new Error(message);
    };

    // Per-user quota — every registered ebook schedules a real, uncapped
    // OpenAI ingestion call for Elite users below, so this must be bounded.
    const existingCount = (
      await ctx.db
        .query("ebooks")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .collect()
    ).length;
    if (existingCount >= MAX_EBOOKS_PER_USER) {
      await reject(
        `You've reached the ${MAX_EBOOKS_PER_USER}-ebook limit. Delete one to upload another.`,
      );
    }

    // Resolve the storage id to its system record so we can read the ACTUAL
    // stored size and content-type — never trust the client-reported
    // fileSize/type, both of which are trivially spoofable.
    const storageId = ctx.db.system.normalizeId("_storage", args.storageId);
    if (!storageId) {
      await reject("Invalid upload reference.");
      return; // unreachable — reject() always throws
    }
    const meta = await ctx.db.system.get(storageId);
    if (!meta) {
      await reject("Uploaded file could not be found in storage.");
      return; // unreachable — reject() always throws
    }

    // Defense-in-depth MIME check. Convex records the Content-Type header
    // the client's upload POST sent, so this catches non-PDF uploads even
    // though the client already restricts the file picker to PDFs.
    if (meta.contentType && meta.contentType !== "application/pdf") {
      await reject("Only PDF files are supported.");
    }

    // Reject oversized files using the REAL stored size, not the
    // client-reported `args.fileSize`.
    if (meta.size > MAX_EBOOK_BYTES) {
      await reject(
        `File is too large (${(meta.size / (1024 * 1024)).toFixed(1)}MB). Max is ${MAX_EBOOK_BYTES / (1024 * 1024)}MB.`,
      );
    }

    const ebookId = await ctx.db.insert("ebooks", {
      userId: user._id,
      title: args.title,
      fileSize: meta.size,
      storageId: args.storageId,
      status: "processing",
      uploadedAt: new Date().toISOString(),
    });

    // Fire-and-forget OpenAI ingestion; ingestion will patch the row when done.
    await ctx.scheduler.runAfter(0, internal.ebooks.ingestEbook, { ebookId });

    return { ebookId };
  },
});

export const listForCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    return await ctx.db
      .query("ebooks")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const deleteEbook = mutation({
  args: { ebookId: v.id("ebooks") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const book = await ctx.db.get(args.ebookId);
    if (!book || book.userId !== user._id) throw new Error("Not authorized");

    // Best-effort cleanup of Convex-stored bytes.
    try {
      await ctx.storage.delete(book.storageId);
    } catch {
      // Best-effort storage cleanup
    }
    await ctx.db.delete(args.ebookId);

    // Best-effort cleanup of the OpenAI-side vector store + file, if this
    // ebook ever went through ingestEbook (Elite only — see ingestEbook).
    // Scheduled as an action because deleting from OpenAI needs an external
    // HTTP call; a failed OpenAI-side delete is logged, not thrown, so it
    // never blocks or rolls back the Convex-side deletion above, which has
    // already completed by the time this runs.
    if (book.openaiFileId || book.vectorStoreId) {
      await ctx.scheduler.runAfter(0, internal.ebooks._cleanupOpenAIResources, {
        openaiFileId: book.openaiFileId,
        vectorStoreId: book.vectorStoreId,
      });
    }
  },
});

/**
 * Best-effort cleanup of OpenAI-side resources after an ebook row has
 * already been deleted from Convex. Scheduled (fire-and-forget) from
 * `deleteEbook`. Uses the same base URL / auth header / OpenAI-Beta header
 * pattern as the ingestion calls in `ingestEbook`. Each delete is wrapped in
 * its own try/catch: a failure here is logged and does not throw, since
 * there is nothing left to roll back and no retry queue for beta scope.
 */
export const _cleanupOpenAIResources = internalAction({
  args: {
    openaiFileId: v.optional(v.string()),
    vectorStoreId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return;

    if (args.vectorStoreId) {
      try {
        const res = await fetch(
          `https://api.openai.com/v1/vector_stores/${args.vectorStoreId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "OpenAI-Beta": "assistants=v2",
            },
          },
        );
        if (!res.ok) {
          console.error(
            `[ebooks] Failed to delete OpenAI vector store ${args.vectorStoreId}: ${res.status} ${await res.text()}`,
          );
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[ebooks] Error deleting OpenAI vector store:", message);
      }
    }

    if (args.openaiFileId) {
      try {
        const res = await fetch(
          `https://api.openai.com/v1/files/${args.openaiFileId}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${apiKey}` },
          },
        );
        if (!res.ok) {
          console.error(
            `[ebooks] Failed to delete OpenAI file ${args.openaiFileId}: ${res.status} ${await res.text()}`,
          );
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[ebooks] Error deleting OpenAI file:", message);
      }
    }
  },
});

// Internal mutation used by the ingestion action to patch ebook rows.
export const _setEbookOpenAIIds = internalMutation({
  args: {
    ebookId: v.id("ebooks"),
    openaiFileId: v.optional(v.string()),
    vectorStoreId: v.optional(v.string()),
    status: v.string(),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { ebookId, ...rest } = args;
    await ctx.db.patch(ebookId, rest);
  },
});

/**
 * Ingest a previously-uploaded PDF into OpenAI:
 *   - Download bytes from Convex storage
 *   - Upload to OpenAI Files (`purpose: "assistants"`)
 *   - Create or reuse a vector store and attach the file
 *   - Persist the IDs on the ebook row so Nora's file_search can find it
 *
 * If the OPENAI_API_KEY isn't configured (e.g., dev environment), the upload
 * still succeeds but the row is left in `processing` and Nora can't reference it.
 */
export const ingestEbook = internalAction({
  args: { ebookId: v.id("ebooks") },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { success: false, error: "OPENAI_API_KEY missing" };
    }

    const result: any = await ctx.runQuery(internal.ebooks._getEbookInternal, {
      ebookId: args.ebookId,
    });
    const ebook = result?.ebook;
    if (!ebook) return { success: false, error: "Ebook not found" };

    // OpenAI file_search only exists for Nora (Elite). For everyone else the
    // PDF stays viewable in-app, but we skip the OpenAI upload + vector store
    // so non-Elite accounts never generate OpenAI cost.
    if (normalizeTier(result.ownerTier) !== "elite") {
      await ctx.runMutation(internal.ebooks._setEbookOpenAIIds, {
        ebookId: args.ebookId,
        status: "ready",
      });
      return { success: true };
    }

    try {
      // 1. Download PDF bytes from Convex storage
      const url = await ctx.storage.getUrl(ebook.storageId);
      if (!url) throw new Error("Could not get storage URL for ebook");
      const pdfResp = await fetch(url);
      if (!pdfResp.ok)
        throw new Error(`Failed to download PDF: ${pdfResp.status}`);
      const pdfBlob = await pdfResp.blob();

      // 2. Upload to OpenAI Files
      const fileForm = new FormData();
      fileForm.append("file", pdfBlob, `${ebook.title}.pdf`);
      fileForm.append("purpose", "assistants");
      const fileRes = await fetch("https://api.openai.com/v1/files", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: fileForm,
      });
      if (!fileRes.ok)
        throw new Error(
          `OpenAI file upload failed: ${fileRes.status} ${await fileRes.text()}`,
        );
      const fileJson: any = await fileRes.json();
      const openaiFileId: string = fileJson.id;

      // 3. Create vector store and attach the file
      const vsRes = await fetch("https://api.openai.com/v1/vector_stores", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "OpenAI-Beta": "assistants=v2",
        },
        body: JSON.stringify({ name: ebook.title, file_ids: [openaiFileId] }),
      });
      if (!vsRes.ok)
        throw new Error(
          `OpenAI vector store create failed: ${vsRes.status} ${await vsRes.text()}`,
        );
      const vsJson: any = await vsRes.json();
      const vectorStoreId: string = vsJson.id;

      // 4. Persist on the ebook row
      await ctx.runMutation(internal.ebooks._setEbookOpenAIIds, {
        ebookId: args.ebookId,
        openaiFileId,
        vectorStoreId,
        status: "ready",
      });

      return { success: true };
    } catch (err: any) {
      await ctx.runMutation(internal.ebooks._setEbookOpenAIIds, {
        ebookId: args.ebookId,
        status: "failed",
        errorMessage: err?.message || String(err),
      });
      return { success: false, error: err?.message || String(err) };
    }
  },
});

export const getEbook = query({
  args: { ebookId: v.id("ebooks") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const ebook = await ctx.db.get(args.ebookId);
    if (!ebook || ebook.userId !== user._id) return null;
    return ebook;
  },
});

export const _getEbookInternal = internalQuery({
  args: { ebookId: v.id("ebooks") },
  handler: async (ctx, args) => {
    const ebook = await ctx.db.get(args.ebookId);
    if (!ebook) return null;
    const owner = await ctx.db.get(ebook.userId);
    return { ebook, ownerTier: owner?.subscriptionTier };
  },
});

/**
 * Internal: resolve one of the CALLER'S OWN ready ebooks for Nora's
 * file_search, scoped by userId (same ownership boundary as `getEbook`'s
 * `ebook.userId !== user._id` check). Never derived from a client-supplied
 * vectorStoreId. When `storageId` is given (the client already has this via
 * pdfContext.file_path), it selects that specific ebook; otherwise falls
 * back to the user's first ready ebook.
 */
export const _getReadyEbookForUser = internalQuery({
  args: {
    userId: v.id("users"),
    storageId: v.optional(v.string()),
  },
  handler: async (ctx, { userId, storageId }) => {
    const readyEbooks = await ctx.db
      .query("ebooks")
      .withIndex("by_userId_status", (q) =>
        q.eq("userId", userId).eq("status", "ready"),
      )
      .collect();
    if (storageId) {
      return readyEbooks.find((e) => e.storageId === storageId) ?? null;
    }
    return readyEbooks[0] ?? null;
  },
});
