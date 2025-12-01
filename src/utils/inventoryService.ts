import { supabase } from './supabase';

export interface InventoryItem {
  id: string;
  user_id: string;
  item_id: string;
  item_name: string;
  item_category: 'gear' | 'shelter' | 'trail';
  item_icon: string;
  purchased_at: string;
}

export interface EquippedItem {
  id: string;
  user_id: string;
  item_category: 'gear' | 'shelter' | 'trail';
  item_id: string;
  item_name: string;
  item_icon: string;
  equipped_at: string;
}

/**
 * Add an item to user's inventory (backpack)
 */
export async function addToInventory(
  itemId: string,
  itemName: string,
  itemCategory: 'gear' | 'shelter' | 'trail',
  itemIcon: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('user_inventory')
      .insert({
        user_id: session.user.id,
        item_id: itemId,
        item_name: itemName,
        item_category: itemCategory,
        item_icon: itemIcon,
      });

    if (error) {
      // Check if already owned
      if (error.code === '23505') {
        return { success: false, error: 'You already own this item!' };
      }
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Equip an item (can be from inventory or new purchase)
 */
export async function equipItem(
  itemId: string,
  itemName: string,
  itemCategory: 'gear' | 'shelter' | 'trail',
  itemIcon: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Upsert (update if exists, insert if not) for the category
    const { error } = await supabase
      .from('equipped_items')
      .upsert({
        user_id: session.user.id,
        item_category: itemCategory,
        item_id: itemId,
        item_name: itemName,
        item_icon: itemIcon,
      }, {
        onConflict: 'user_id,item_category'
      });

    if (error) {
      return { success: false, error: error.message };
    }

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
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('user_inventory')
      .select('*')
      .eq('user_id', session.user.id)
      .order('purchased_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
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
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('equipped_items')
      .select('*')
      .eq('user_id', session.user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Check if user owns an item
 */
export async function ownsItem(itemId: string): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return false;

    const { data } = await supabase
      .from('user_inventory')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('item_id', itemId)
      .single();

    return !!data;
  } catch (error) {
    return false;
  }
}

/**
 * Check if an item is equipped
 */
export async function isItemEquipped(itemId: string): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return false;

    const { data } = await supabase
      .from('equipped_items')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('item_id', itemId)
      .single();

    return !!data;
  } catch (error) {
    return false;
  }
}

/**
 * Unequip an item
 */
export async function unequipItem(
  itemCategory: 'gear' | 'shelter' | 'trail'
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('equipped_items')
      .delete()
      .eq('user_id', session.user.id)
      .eq('item_category', itemCategory);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
