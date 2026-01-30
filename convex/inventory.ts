import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrNull } from "./users";

export const listItems = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;
    return await ctx.db
      .query("userInventory")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const getEquipped = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;
    return await ctx.db
      .query("equippedItems")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const purchaseItem = mutation({
  args: {
    itemId: v.string(),
    itemName: v.string(),
    itemCategory: v.string(),
    itemIcon: v.string(),
    cost: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    // Check if already owned
    const existing = await ctx.db
      .query("userInventory")
      .withIndex("by_userId_itemId", (q) =>
        q.eq("userId", user._id).eq("itemId", args.itemId)
      )
      .first();
    if (existing) throw new Error("Item already owned");

    // Check currency
    const currentFlint = user.flintCurrency ?? 0;
    if (currentFlint < args.cost) throw new Error("Insufficient flint currency");

    // Deduct currency
    await ctx.db.patch(user._id, { flintCurrency: currentFlint - args.cost });

    // Add to inventory
    return await ctx.db.insert("userInventory", {
      userId: user._id,
      itemId: args.itemId,
      itemName: args.itemName,
      itemCategory: args.itemCategory,
      itemIcon: args.itemIcon,
      purchasedAt: new Date().toISOString(),
    });
  },
});

export const equipItem = mutation({
  args: {
    itemId: v.string(),
    itemName: v.string(),
    itemCategory: v.string(),
    itemIcon: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    // Remove existing equipped item of same category
    const existing = await ctx.db
      .query("equippedItems")
      .withIndex("by_userId_itemCategory", (q) =>
        q.eq("userId", user._id).eq("itemCategory", args.itemCategory)
      )
      .first();
    if (existing) await ctx.db.delete(existing._id);

    // Equip new item
    return await ctx.db.insert("equippedItems", {
      userId: user._id,
      itemCategory: args.itemCategory,
      itemId: args.itemId,
      itemName: args.itemName,
      itemIcon: args.itemIcon,
      equippedAt: new Date().toISOString(),
    });
  },
});

export const unequipItem = mutation({
  args: {
    itemCategory: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const existing = await ctx.db
      .query("equippedItems")
      .withIndex("by_userId_itemCategory", (q) =>
        q.eq("userId", user._id).eq("itemCategory", args.itemCategory)
      )
      .first();
    if (existing) await ctx.db.delete(existing._id);
  },
});
