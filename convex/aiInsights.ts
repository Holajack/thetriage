import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrNull } from "./users";

export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;
    const q = ctx.db
      .query("aiInsights")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc");

    if (args.limit) return await q.take(args.limit);
    return await q.collect();
  },
});

export const getUnread = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;
    const all = await ctx.db
      .query("aiInsights")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
    return all.filter((i) => !i.readAt);
  },
});

export const create = mutation({
  args: {
    insightType: v.string(),
    title: v.string(),
    content: v.string(),
    priority: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    return await ctx.db.insert("aiInsights", {
      userId: user._id,
      insightType: args.insightType,
      title: args.title,
      content: args.content,
      priority: args.priority ?? "medium",
      category: args.category,
    });
  },
});

export const markRead = mutation({
  args: { insightId: v.id("aiInsights") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.insightId, { readAt: new Date().toISOString() });
  },
});
