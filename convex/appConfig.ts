import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

/** Get a config value from the DB */
export const get = internalQuery({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const config = await ctx.db
      .query("appConfig")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    return config?.value || "";
  },
});

/** Set a config value in the DB */
export const set = internalMutation({
  args: { key: v.string(), value: v.string() },
  handler: async (ctx, { key, value }) => {
    const existing = await ctx.db
      .query("appConfig")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { value });
    } else {
      await ctx.db.insert("appConfig", { key, value });
    }
    return { key, set: true };
  },
});
