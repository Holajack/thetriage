import { v } from "convex/values";
import { query, mutation, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getCurrentUser, getCurrentUserOrNull } from "./users";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;
    return await ctx.db
      .query("subjects")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    return await ctx.db.insert("subjects", {
      userId: user._id,
      name: args.name,
      color: args.color,
    });
  },
});

/** Load a subject and prove the caller owns it. */
async function getOwnedSubject(ctx: MutationCtx, subjectId: Id<"subjects">) {
  const user = await getCurrentUser(ctx);
  const subject = await ctx.db.get(subjectId);
  if (!subject || subject.userId !== user._id) {
    throw new Error("Subject not found");
  }
  return subject;
}

export const update = mutation({
  args: {
    subjectId: v.id("subjects"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Previously patched any subject by id with no auth call at all.
    const subject = await getOwnedSubject(ctx, args.subjectId);

    const { subjectId: _id, ...updates } = args;
    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) cleanUpdates[key] = value;
    }
    if (Object.keys(cleanUpdates).length > 0) {
      await ctx.db.patch(subject._id, cleanUpdates);
    }
  },
});

export const remove = mutation({
  args: { subjectId: v.id("subjects") },
  handler: async (ctx, args) => {
    const subject = await getOwnedSubject(ctx, args.subjectId);
    await ctx.db.delete(subject._id);
  },
});
