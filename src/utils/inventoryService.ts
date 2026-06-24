import { api } from "../../convex/_generated/api";
import { getConvexClient } from "./convexClient";

export interface InventoryItem {
  id: string;
  userId: string;
  itemId: string;
  itemName: string;
  itemCategory: "gear" | "shelter" | "trail";
  itemIcon: string;
  purchasedAt: string;
}

export interface EquippedItem {
  id: string;
  userId: string;
  itemCategory: "gear" | "shelter" | "trail";
  itemId: string;
  itemName: string;
  itemIcon: string;
  equippedAt: string;
}

/**
 * Add an item to user's inventory (backpack)
 */
export async function addToInventory(
  itemId: string,
  itemName: string,
  itemCategory: "gear" | "shelter" | "trail",
  itemIcon: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getConvexClient();
    await client.mutation(api.inventory.purchaseItem, {
      itemId,
      itemName,
      itemCategory,
      itemIcon,
      cost: 0, // For free items, set cost to 0
    });
    return { success: true };
  } catch (error: any) {
    if (error.message?.includes("already owned")) {
      return { success: false, error: "You already own this item!" };
    }
    return { success: false, error: error.message };
  }
}

/**
 * Equip an item (can be from inventory or new purchase)
 */
export async function equipItem(
  itemId: string,
  itemName: string,
  itemCategory: "gear" | "shelter" | "trail",
  itemIcon: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getConvexClient();
    await client.mutation(api.inventory.equipItem, {
      itemId,
      itemName,
      itemCategory,
      itemIcon,
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get user's inventory
 */
export async function getUserInventory(): Promise<{
  success: boolean;
  data?: InventoryItem[];
  error?: string;
}> {
  try {
    const client = getConvexClient();
    const items = await client.query(api.inventory.listItems, {});

    // Convert Convex format to expected format
    const data: InventoryItem[] = (items || []).map((item: any) => ({
      id: item._id,
      userId: item.userId,
      itemId: item.itemId,
      itemName: item.itemName,
      itemCategory: item.itemCategory,
      itemIcon: item.itemIcon,
      purchasedAt: item.purchasedAt || new Date().toISOString(),
    }));

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get user's equipped items
 */
export async function getEquippedItems(): Promise<{
  success: boolean;
  data?: EquippedItem[];
  error?: string;
}> {
  try {
    const client = getConvexClient();
    const items = await client.query(api.inventory.getEquipped, {});

    // Convert Convex format to expected format
    const data: EquippedItem[] = (items || []).map((item: any) => ({
      id: item._id,
      userId: item.userId,
      itemCategory: item.itemCategory,
      itemId: item.itemId,
      itemName: item.itemName,
      itemIcon: item.itemIcon,
      equippedAt: item.equippedAt || new Date().toISOString(),
    }));

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Unequip an item
 */
async function unequipItem(
  itemCategory: "gear" | "shelter" | "trail",
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getConvexClient();
    await client.mutation(api.inventory.unequipItem, {
      itemCategory,
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
