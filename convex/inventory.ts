import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrNull } from "./users";
import { getShopItem } from "./shopCatalog";

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

/**
 * Buy an item. The client sends ONLY an itemId — never a price.
 *
 * Taking `cost` from the client meant the shop was free (pass cost: 0), and a
 * negative cost minted Flint outright (`balance - (-5000)`).
 */
export const purchaseItem = mutation({
  args: { itemId: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const item = getShopItem(args.itemId);
    if (!item) throw new Error("That item doesn't exist");

    const existing = await ctx.db
      .query("userInventory")
      .withIndex("by_userId_itemId", (q) =>
        q.eq("userId", user._id).eq("itemId", args.itemId),
      )
      .first();
    if (existing) throw new Error("Item already owned");

    // Price comes from the server catalogue, and can never be negative.
    const cost = Math.max(0, item.cost);
    const currentFlint = user.flintCurrency ?? 0;
    if (currentFlint < cost) throw new Error("Insufficient flint currency");

    if (cost > 0) {
      await ctx.db.patch(user._id, { flintCurrency: currentFlint - cost });
    }

    return await ctx.db.insert("userInventory", {
      userId: user._id,
      itemId: args.itemId,
      itemName: item.name,
      itemCategory: item.category,
      itemIcon: item.icon,
      purchasedAt: new Date().toISOString(),
    });
  },
});

/** Equip something you own. Name/category/icon come from the catalogue. */
export const equipItem = mutation({
  args: { itemId: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const item = getShopItem(args.itemId);
    if (!item) throw new Error("That item doesn't exist");

    // You may only equip what you actually own.
    const owned = await ctx.db
      .query("userInventory")
      .withIndex("by_userId_itemId", (q) =>
        q.eq("userId", user._id).eq("itemId", args.itemId),
      )
      .first();
    if (!owned) throw new Error("You don't own that yet");

    const existing = await ctx.db
      .query("equippedItems")
      .withIndex("by_userId_itemCategory", (q) =>
        q.eq("userId", user._id).eq("itemCategory", item.category),
      )
      .first();
    if (existing) await ctx.db.delete(existing._id);

    return await ctx.db.insert("equippedItems", {
      userId: user._id,
      itemCategory: item.category,
      itemId: args.itemId,
      itemName: item.name,
      itemIcon: item.icon,
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
        q.eq("userId", user._id).eq("itemCategory", args.itemCategory),
      )
      .first();
    if (existing) await ctx.db.delete(existing._id);
  },
});
