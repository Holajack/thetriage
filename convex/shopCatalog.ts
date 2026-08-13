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
  /**
   * false = not purchasable yet ("Coming Soon" in the shop). Omitted/true =
   * purchasable. Gear and shelter have no visual system built yet (nothing
   * renders an equipped gear/shelter item anywhere in the app), and several
   * trails have no art. Enforced here — not just client-side — so a direct
   * mutation call can't buy something the app can't actually show.
   */
  available?: boolean;
}

export const SHOP_CATALOG: Record<string, ShopItemDef> = {
  // Gear — no visual system built yet, not purchasable.
  bandana: {
    name: "Bandana",
    category: "gear",
    icon: "🧣",
    cost: 300,
    available: false,
  },
  hat: {
    name: "Explorer Hat",
    category: "gear",
    icon: "🎩",
    cost: 600,
    available: false,
  },
  vest: {
    name: "Adventure Vest",
    category: "gear",
    icon: "🦺",
    cost: 900,
    available: false,
  },
  sunglasses: {
    name: "Sunglasses",
    category: "gear",
    icon: "🕶️",
    cost: 1200,
    available: false,
  },
  backpack: {
    name: "Mini Backpack",
    category: "gear",
    icon: "🎒",
    cost: 1500,
    available: false,
  },
  scarf: {
    name: "Cozy Scarf",
    category: "gear",
    icon: "🧵",
    cost: 1800,
    available: false,
  },
  boots: {
    name: "Hiking Boots",
    category: "gear",
    icon: "🥾",
    cost: 2400,
    available: false,
  },
  compass: {
    name: "Compass Necklace",
    category: "gear",
    icon: "🧭",
    cost: 3000,
    available: false,
  },

  // Shelters — no home/base-camp screen built yet, not purchasable.
  tent: {
    name: "Camping Tent",
    category: "shelter",
    icon: "⛺",
    cost: 1500,
    available: false,
  },
  cabin: {
    name: "Log Cabin",
    category: "shelter",
    icon: "🛖",
    cost: 3000,
    available: false,
  },
  treehouse: {
    name: "Tree House",
    category: "shelter",
    icon: "🏠",
    cost: 6000,
    available: false,
  },
  igloo: {
    name: "Ice Igloo",
    category: "shelter",
    icon: "🏔️",
    cost: 9000,
    available: false,
  },
  lighthouse: {
    name: "Lighthouse",
    category: "shelter",
    icon: "🗼",
    cost: 12000,
    available: false,
  },
  castle: {
    name: "Stone Castle",
    category: "shelter",
    icon: "🏰",
    cost: 18000,
    available: false,
  },

  // Trails
  forest: { name: "Forest Path", category: "trail", icon: "🌲", cost: 0 },
  desert: { name: "Desert Trail", category: "trail", icon: "🏜️", cost: 1800 },
  beach: { name: "Beach Path", category: "trail", icon: "🏖️", cost: 3000 },
  jungle: { name: "Jungle Trek", category: "trail", icon: "🌴", cost: 4500 },
  snow: {
    name: "Snowy Path",
    category: "trail",
    icon: "❄️",
    cost: 6000,
    available: false,
  },
  canyon: {
    name: "Grand Canyon",
    category: "trail",
    icon: "🏞️",
    cost: 9000,
    available: false,
  },
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
    available: false,
  },
  galaxy: {
    name: "Galaxy Trail",
    category: "trail",
    icon: "🪐",
    cost: 22500,
    available: false,
  },
};

export function getShopItem(itemId: string): ShopItemDef | null {
  return SHOP_CATALOG[itemId] ?? null;
}
