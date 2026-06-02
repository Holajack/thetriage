import { v } from "convex/values";
import { action, internalQuery, mutation, query } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { getCurrentUser } from "./users";

/**
 * Upload flow:
 *   1. Client calls `generateUploadUrl` to get a signed Convex storage URL.
 *   2. Client POSTs the PDF bytes directly to that URL.
 *   3. Client calls `registerUpload` with the resulting `storageId` + title.
 *   4. `registerUpload` schedules `ingestEbook` (an action) which uploads the
 *      file to OpenAI and attaches it to a per-user vector store.
 */

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
    const ebookId = await ctx.db.insert("ebooks", {
      userId: user._id,
      title: args.title,
      fileSize: args.fileSize,
      storageId: args.storageId,
      status: "processing",
      uploadedAt: new Date().toISOString(),
    });

    // Fire-and-forget OpenAI ingestion; ingestion will patch the row when done.
    await ctx.scheduler.runAfter(0, api.ebooks.ingestEbook, { ebookId });

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

    // Best-effort cleanup of Convex-stored bytes; OpenAI cleanup happens elsewhere.
    try {
      await ctx.storage.delete(book.storageId);
    } catch {
      // Best-effort storage cleanup
    }
    await ctx.db.delete(args.ebookId);
  },
});

// Internal mutation used by the ingestion action to patch ebook rows.
export const setEbookOpenAIIds = mutation({
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
export const ingestEbook = action({
  args: { ebookId: v.id("ebooks") },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { success: false, error: "OPENAI_API_KEY missing" };
    }

    const ebook: any = await ctx.runQuery(internal.ebooks._getEbookInternal, {
      ebookId: args.ebookId,
    });
    if (!ebook) return { success: false, error: "Ebook not found" };

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
      await ctx.runMutation(api.ebooks.setEbookOpenAIIds, {
        ebookId: args.ebookId,
        openaiFileId,
        vectorStoreId,
        status: "ready",
      });

      return { success: true };
    } catch (err: any) {
      await ctx.runMutation(api.ebooks.setEbookOpenAIIds, {
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
  handler: async (ctx, args) => ctx.db.get(args.ebookId),
});
