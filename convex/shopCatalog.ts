/**
 * The shop price list — SERVER-SIDE.
 *
 * The price must never come from the client. Taking `cost` as a mutation
 * argument meant a caller could buy an 18,000-Flint castle for 0 (or pass a
 * NEGATIVE cost and mint Flint, since `balance - (-5000)` grows the balance).
 * The client sends only an itemId; everything else is looked up here.
 *
 * Keep in step with SHOP_ITEMS in src/screens/main/ShopScreen.tsx — that list is
 * presentation only.
 */

export type ShopCategory = "gear" | "shelter" | "trail";

export interface ShopItemDef {
  name: string;
  category: ShopCategory;
  icon: string;
  cost: number; // Flint (1 Flint = 1 focused minute)
}

export const SHOP_CATALOG: Record<string, ShopItemDef> = {
  // Gear
  bandana: { name: "Bandana", category: "gear", icon: "🧣", cost: 300 },
  hat: { name: "Explorer Hat", category: "gear", icon: "🎩", cost: 600 },
  vest: { name: "Adventure Vest", category: "gear", icon: "🦺", cost: 900 },
  sunglasses: { name: "Sunglasses", category: "gear", icon: "🕶️", cost: 1200 },
  backpack: { name: "Mini Backpack", category: "gear", icon: "🎒", cost: 1500 },
  scarf: { name: "Cozy Scarf", category: "gear", icon: "🧵", cost: 1800 },
  boots: { name: "Hiking Boots", category: "gear", icon: "🥾", cost: 2400 },
  compass: {
    name: "Compass Necklace",
    category: "gear",
    icon: "🧭",
    cost: 3000,
  },

  // Shelters
  tent: { name: "Camping Tent", category: "shelter", icon: "⛺", cost: 1500 },
  cabin: { name: "Log Cabin", category: "shelter", icon: "🛖", cost: 3000 },
  treehouse: {
    name: "Tree House",
    category: "shelter",
    icon: "🏠",
    cost: 6000,
  },
  igloo: { name: "Ice Igloo", category: "shelter", icon: "🏔️", cost: 9000 },
  lighthouse: {
    name: "Lighthouse",
    category: "shelter",
    icon: "🗼",
    cost: 12000,
  },
  castle: {
    name: "Stone Castle",
    category: "shelter",
    icon: "🏰",
    cost: 18000,
  },

  // Trails
  forest: { name: "Forest Path", category: "trail", icon: "🌲", cost: 0 },
  desert: { name: "Desert Trail", category: "trail", icon: "🏜️", cost: 1800 },
  beach: { name: "Beach Path", category: "trail", icon: "🏖️", cost: 3000 },
  jungle: { name: "Jungle Trek", category: "trail", icon: "🌴", cost: 4500 },
  snow: { name: "Snowy Path", category: "trail", icon: "❄️", cost: 6000 },
  canyon: { name: "Grand Canyon", category: "trail", icon: "🏞️", cost: 9000 },
  volcano: {
    name: "Volcano Trail",
    category: "trail",
    icon: "🌋",
    cost: 13500,
  },
  northern: {
    name: "Northern Lights",
    category: "trail",
    icon: "🌌",
    cost: 18000,
  },
  galaxy: { name: "Galaxy Path", category: "trail", icon: "🌠", cost: 22500 },
};

export function getShopItem(itemId: string): ShopItemDef | null {
  return SHOP_CATALOG[itemId] ?? null;
}
