import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  Dimensions,
  Image,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ITEM_MARGIN = 8;
const ITEM_WIDTH = (SCREEN_WIDTH - 32 - ITEM_MARGIN) / 2; // 2 items per row with padding
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MainTabParamList } from "../../navigation/types";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useConvexProfile } from "../../hooks/useConvex";
import { SafeAreaView } from "react-native-safe-area-context";
import { UnifiedHeader } from "../../components/UnifiedHeader";
import { FlintIcon } from "../../components/FlintIcon";
import Animated, {
  FadeInUp,
  Layout,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { AnimatedButton } from "../../components/premium/AnimatedButton";
import { StaggeredItem } from "../../components/premium/StaggeredList";
import { ShimmerLoader } from "../../components/premium/ShimmerLoader";
import {
  useCounterAnimation,
  usePulseAnimation,
  useSuccessAnimation,
} from "../../utils/animationUtils";
import {
  AnimationConfig,
  Spacing,
  BorderRadius,
  Shadows,
  PremiumColors,
} from "../../theme/premiumTheme";
import {
  purchaseItem,
  equipItem,
  getUserInventory,
  getEquippedItems,
  type InventoryItem,
  type EquippedItem,
} from "../../utils/inventoryService";

// Shop item categories
type ShopCategory = "gear" | "shelter" | "trail";

interface ShopItem {
  id: string;
  name: string;
  description: string;
  cost: number; // in Flint
  category: ShopCategory;
  icon: string;
  /** Preferred raster thumbnail. Falls back to `icon` (emoji) when missing. */
  image?: any;
  comingSoon?: boolean;
}

// Trail thumbnails — using the existing parallax `path_animation.png` per trail so the shop
// shows the actual environment rather than an emoji that may render as "tofu" on devices
// without the matching glyph.
const TRAIL_IMAGES: Record<string, any> = {
  forest: require("../../../assets/Background_animations/Forest/path_animation.webp"),
  beach: require("../../../assets/Background_animations/Beach/beach_path.webp"),
  desert: require("../../../assets/Background_animations/Desert/desert_background.webp"),
  jungle: require("../../../assets/Background_animations/Jungle/generated/path_animation.webp"),
  snow: require("../../../assets/Background_animations/Snow/generated/path_animation.webp"),
  canyon: require("../../../assets/Background_animations/Canyon/generated/path_animation.webp"),
  volcano: require("../../../assets/Background_animations/Volcano/generated/path_animation.webp"),
  northern: require("../../../assets/Background_animations/Northern/generated/path_animation.webp"),
  // galaxy: no thumbnail yet — falls back to emoji
};

// Expanded shop items (prices in Flint = minutes of focus time required)
const SHOP_ITEMS: ShopItem[] = [
  // Trail Gear (for pets/animals) - 5-50 hours of focus
  {
    id: "bandana",
    name: "Bandana",
    description: "A colorful bandana (5 hours)",
    cost: 300,
    category: "gear",
    icon: "🧣",
    comingSoon: true,
  },
  {
    id: "hat",
    name: "Explorer Hat",
    description: "Perfect for adventures (10 hours)",
    cost: 600,
    category: "gear",
    icon: "🎩",
    comingSoon: true,
  },
  {
    id: "vest",
    name: "Adventure Vest",
    description: "Hiking vest (15 hours)",
    cost: 900,
    category: "gear",
    icon: "🦺",
    comingSoon: true,
  },
  {
    id: "sunglasses",
    name: "Sunglasses",
    description: "Cool shades for sunny trails (20 hours)",
    cost: 1200,
    category: "gear",
    icon: "🕶️",
    comingSoon: true,
  },
  {
    id: "backpack",
    name: "Mini Backpack",
    description: "Carry essentials on the trail (25 hours)",
    cost: 1500,
    category: "gear",
    icon: "🎒",
    comingSoon: true,
  },
  {
    id: "scarf",
    name: "Cozy Scarf",
    description: "Warm scarf for cold trails (30 hours)",
    cost: 1800,
    category: "gear",
    icon: "🧵",
    comingSoon: true,
  },
  {
    id: "boots",
    name: "Hiking Boots",
    description: "Sturdy boots for any terrain (40 hours)",
    cost: 2400,
    category: "gear",
    icon: "🥾",
    comingSoon: true,
  },
  {
    id: "compass",
    name: "Compass Necklace",
    description: "Never lose your way (50 hours)",
    cost: 3000,
    category: "gear",
    icon: "🧭",
    comingSoon: true,
  },

  // Shelters - 25-300 hours of focus (progressive goals)
  {
    id: "tent",
    name: "Camping Tent",
    description: "Cozy tent for breaks (25 hours)",
    cost: 1500,
    category: "shelter",
    icon: "⛺",
    comingSoon: true,
  },
  {
    id: "cabin",
    name: "Log Cabin",
    description: "A warm cabin retreat (50 hours)",
    cost: 3000,
    category: "shelter",
    icon: "🛖",
    comingSoon: true,
  },
  {
    id: "treehouse",
    name: "Tree House",
    description: "A house in the trees (100 hours)",
    cost: 6000,
    category: "shelter",
    icon: "🏠",
    comingSoon: true,
  },
  {
    id: "igloo",
    name: "Ice Igloo",
    description: "Cool shelter for arctic trails (150 hours)",
    cost: 9000,
    category: "shelter",
    icon: "🏔️",
    comingSoon: true,
  },
  {
    id: "lighthouse",
    name: "Lighthouse",
    description: "Coastal shelter with a view (200 hours)",
    cost: 12000,
    category: "shelter",
    icon: "🗼",
    comingSoon: true,
  },
  {
    id: "castle",
    name: "Stone Castle",
    description: "Royal mountain fortress (300 hours)",
    cost: 18000,
    category: "shelter",
    icon: "🏰",
    comingSoon: true,
  },

  // Trails - 15-375 hours of focus (progressive goals)
  {
    id: "forest",
    name: "Forest Path",
    description: "Your starting trail — always free!",
    cost: 0,
    category: "trail",
    icon: "🌲",
    image: TRAIL_IMAGES.forest,
  },
  {
    id: "desert",
    name: "Desert Trail",
    description: "Explore sandy dunes (30 hours)",
    cost: 1800,
    category: "trail",
    icon: "🏜️",
    image: TRAIL_IMAGES.desert,
  },
  {
    id: "beach",
    name: "Beach Path",
    description: "Walk along the shore (50 hours)",
    cost: 3000,
    category: "trail",
    icon: "🏖️",
    image: TRAIL_IMAGES.beach,
  },
  {
    id: "jungle",
    name: "Jungle Trek",
    description: "Adventure through the jungle (75 hours)",
    cost: 4500,
    category: "trail",
    icon: "🌴",
    image: TRAIL_IMAGES.jungle,
  },
  {
    id: "snow",
    name: "Snowy Path",
    description: "Winter wonderland trail (100 hours)",
    cost: 6000,
    category: "trail",
    icon: "❄️",
    image: TRAIL_IMAGES.snow,
    comingSoon: true,
  },
  {
    id: "canyon",
    name: "Grand Canyon",
    description: "Majestic canyon views (150 hours)",
    cost: 9000,
    category: "trail",
    icon: "🏞️",
    image: TRAIL_IMAGES.canyon,
    comingSoon: true,
  },
  {
    id: "volcano",
    name: "Volcano Trail",
    description: "Hike near active volcano (225 hours)",
    cost: 13500,
    category: "trail",
    icon: "🌋",
    image: TRAIL_IMAGES.volcano,
  },
  {
    id: "northern",
    name: "Northern Lights",
    description: "Aurora borealis path (300 hours)",
    cost: 18000,
    category: "trail",
    icon: "🌌",
    image: TRAIL_IMAGES.northern,
    comingSoon: true,
  },
  {
    id: "galaxy",
    name: "Galaxy Trail",
    description: "Traverse the cosmos (375 hours)",
    cost: 22500,
    category: "trail",
    icon: "🪐",
    comingSoon: true,
  },
];

// Per-trail accent colors (used for border + status tags when owned/equipped)
const TRAIL_ACCENT_COLORS: Record<string, string> = {
  forest: "#4CAF50", // green
  desert: "#E8913A", // sandy orange
  beach: "#3BA8D4", // ocean blue
  jungle: "#2E8B57", // deep green
  volcano: "#D4553A", // lava red
  snow: "#90CAF9", // icy blue
  canyon: "#C47A4A", // canyon brown
  northern: "#7B61FF", // aurora purple
  galaxy: "#9C27B0", // cosmic purple
};

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

type ShopTab = "shop" | "gear";

// Skeleton placeholders shown while inventory/equipped queries resolve, so
// ownership badges never flip from "un-owned" to "Equipped" in front of the user.
const ShopGridSkeleton = ({ count = 6 }: { count?: number }) => {
  const { theme } = useTheme();
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.itemCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <ShimmerLoader variant="circle" height={60} />
          <ShimmerLoader variant="text" width="70%" height={13} />
          <ShimmerLoader variant="text" width="90%" height={10} />
          <ShimmerLoader
            variant="custom"
            width="100%"
            height={22}
            borderRadius={6}
          />
        </View>
      ))}
    </>
  );
};

const ShopScreen = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<MainTabParamList>>();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { profile } = useConvexProfile();
  const [activeTab, setActiveTab] = useState<ShopTab>("shop");
  const [selectedCategory, setSelectedCategory] =
    useState<ShopCategory>("trail");
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [equippedItems, setEquippedItems] = useState<EquippedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Get Flint currency from profile
  const flintCurrency = profile?.flint_currency || 0;

  // Animate currency counter
  const animatedFlint = useCounterAnimation(flintCurrency, 800);

  // Load inventory and equipped items
  useEffect(() => {
    loadInventoryData();
  }, [user?.id]);

  const loadInventoryData = async () => {
    setLoading(true);
    const [invResult, equippedResult] = await Promise.all([
      getUserInventory(),
      getEquippedItems(),
    ]);

    if (invResult.success) {
      setInventory(invResult.data || []);
    }
    if (equippedResult.success) {
      setEquippedItems(equippedResult.data || []);
    }
    setLoading(false);
  };

  // Filter items by selected category
  const filteredItems = SHOP_ITEMS.filter(
    (item) => item.category === selectedCategory,
  );

  // Check if item is owned
  const isOwned = (itemId: string) => {
    return inventory.some((item) => item.itemId === itemId);
  };

  // Check if item is equipped
  const isEquipped = (itemId: string) => {
    return equippedItems.some((item) => item.itemId === itemId);
  };

  const handleItemPress = async (item: ShopItem) => {
    if (item.comingSoon) {
      Alert.alert("Coming Soon", `${item.name} is coming in a future update!`);
      return;
    }

    const owned = isOwned(item.id);
    const equipped = isEquipped(item.id);

    if (equipped) {
      Alert.alert("Already Equipped", `${item.name} is currently equipped!`);
      return;
    }

    if (owned) {
      // Already owned, just equip it
      handleEquipFromInventory(item);
      return;
    }

    // Free item — claim and equip directly
    if (item.cost === 0) {
      try {
        const claimed = await purchaseItem(item.id);
        if (!claimed.success) {
          Alert.alert(
            "Couldn't claim item",
            claimed.error ?? "Please try again.",
          );
          return;
        }
        await equipItem(item.id);
        await loadInventoryData();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Equipped!", `${item.name} is now equipped!`);
      } catch {
        Alert.alert("Error", "Failed to claim item. Please try again.");
      }
      return;
    }

    // Not owned, need to purchase
    if (flintCurrency < item.cost) {
      Alert.alert(
        "Not Enough Flint",
        `You need ${item.cost} Flint to purchase this item. Complete more focus sessions to earn Flint!`,
        [{ text: "OK" }],
      );
      return;
    }

    // Show purchase modal
    setSelectedItem(item);
    setShowApplyModal(true);
  };

  const handleEquipFromInventory = async (item: ShopItem) => {
    const result = await equipItem(item.id);
    if (result.success) {
      await loadInventoryData();
      Alert.alert("Equipped!", `${item.name} is now equipped!`);
    } else {
      Alert.alert("Error", result.error || "Failed to equip item");
    }
  };

  const handlePurchaseAndApply = async () => {
    if (!selectedItem || isPurchasing) return;

    setIsPurchasing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // The server checks the balance and deducts the Flint. Deducting it here
      // and telling the server the item was free is what made the shop free.
      const result = await purchaseItem(selectedItem.id);
      if (!result.success) {
        setIsPurchasing(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Couldn't buy that", result.error ?? "Please try again.");
        return;
      }

      await equipItem(selectedItem.id);

      await loadInventoryData();
      setShowApplyModal(false);
      setIsPurchasing(false);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Equipped! 🎉",
        `${selectedItem.name} has been purchased and equipped!`,
        [{ text: "Awesome!" }],
      );
    } catch {
      setIsPurchasing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "Failed to purchase item. Please try again.");
    }
  };

  const handlePurchaseAndSave = async () => {
    if (!selectedItem || isPurchasing) return;

    setIsPurchasing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const result = await purchaseItem(selectedItem.id);
      if (!result.success) {
        setIsPurchasing(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Couldn't buy that", result.error ?? "Please try again.");
        return;
      }

      await loadInventoryData();
      setShowApplyModal(false);
      setIsPurchasing(false);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Added to Backpack! 🎒",
        `${selectedItem.name} has been added to your backpack!`,
        [{ text: "Great!" }],
      );
    } catch {
      setIsPurchasing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "Failed to purchase item. Please try again.");
    }
  };

  const getCategoryLabel = (category: ShopCategory) => {
    switch (category) {
      case "gear":
        return "Trail Gear";
      case "shelter":
        return "Shelters";
      case "trail":
        return "Trails";
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <UnifiedHeader
        title="Gear Shop"
        onClose={() => navigation.navigate("Profile" as any)}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Flint Balance Card */}
        <Animated.View
          entering={FadeInUp.delay(50).duration(300)}
          style={[styles.balanceCard, { backgroundColor: theme.card }]}
        >
          <View style={styles.balanceContent}>
            <View style={[styles.flintIcon, { backgroundColor: "#FF570020" }]}>
              <FlintIcon size={40} color="#FF5700" />
            </View>
            <View style={styles.balanceInfo}>
              <Text
                style={[styles.balanceLabel, { color: theme.textSecondary }]}
              >
                Your Flint
              </Text>
              <Animated.Text
                style={[styles.balanceAmount, { color: theme.text }]}
              >
                {Math.round(animatedFlint.value * 10) / 10}
              </Animated.Text>
              <Text
                style={[styles.balanceHint, { color: theme.textSecondary }]}
              >
                Earn 1 Flint per focus minute completed
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Top-level Shop / Your Gear tabs */}
        <Animated.View
          entering={FadeInUp.delay(70).duration(300)}
          style={[styles.topTabs, { backgroundColor: theme.surface }]}
        >
          <TouchableOpacity
            style={[
              styles.topTab,
              activeTab === "shop" && styles.topTabActive,
              activeTab === "shop" && { backgroundColor: theme.card },
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab("shop");
            }}
          >
            <Ionicons
              name="storefront-outline"
              size={16}
              color={activeTab === "shop" ? theme.primary : theme.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.topTabText,
                {
                  color:
                    activeTab === "shop" ? theme.primary : theme.textSecondary,
                },
              ]}
            >
              Shop
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.topTab,
              activeTab === "gear" && styles.topTabActive,
              activeTab === "gear" && { backgroundColor: theme.card },
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab("gear");
            }}
          >
            <Ionicons
              name="cube-outline"
              size={16}
              color={activeTab === "gear" ? theme.primary : theme.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.topTabText,
                {
                  color:
                    activeTab === "gear" ? theme.primary : theme.textSecondary,
                },
              ]}
            >
              Your Gear
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {activeTab === "gear" ? (
          /* ===== YOUR GEAR TAB ===== */
          <View style={styles.itemsGrid}>
            {loading ? (
              <ShopGridSkeleton count={4} />
            ) : inventory.length === 0 ? (
              <View style={styles.emptyGear}>
                <Ionicons
                  name="cube-outline"
                  size={48}
                  color={theme.textSecondary}
                />
                <Text style={[styles.emptyGearTitle, { color: theme.text }]}>
                  No gear yet
                </Text>
                <Text
                  style={[
                    styles.emptyGearSubtitle,
                    { color: theme.textSecondary },
                  ]}
                >
                  Purchase items from the Shop to see them here
                </Text>
              </View>
            ) : (
              inventory.map((invItem, index) => {
                const shopItem = SHOP_ITEMS.find(
                  (s) => s.id === invItem.itemId,
                );
                if (!shopItem) return null;
                const equipped = isEquipped(invItem.itemId);
                const accentColor =
                  TRAIL_ACCENT_COLORS[invItem.itemId] || "#4CAF50";

                return (
                  <StaggeredItem
                    key={invItem.itemId}
                    index={index}
                    delay="fast"
                    direction="fade"
                    subtle={true}
                  >
                    <AnimatedTouchable
                      style={[
                        styles.itemCard,
                        {
                          backgroundColor: theme.card,
                          borderColor: equipped ? accentColor : theme.border,
                        },
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        if (equipped) {
                          Alert.alert(
                            "Already Equipped",
                            `${shopItem.name} is currently equipped!`,
                          );
                        } else {
                          handleEquipFromInventory(shopItem);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.itemIconContainer,
                          { backgroundColor: theme.surface },
                        ]}
                      >
                        {shopItem.image ? (
                          <Image
                            source={shopItem.image}
                            style={styles.itemImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <Text style={styles.itemIcon}>{shopItem.icon}</Text>
                        )}
                        {equipped && (
                          <View
                            style={[
                              styles.statusBadge,
                              { backgroundColor: accentColor },
                            ]}
                          >
                            <Ionicons
                              name="checkmark-outline"
                              size={10}
                              color="#FFF"
                            />
                          </View>
                        )}
                      </View>
                      <Text
                        style={[styles.itemName, { color: theme.text }]}
                        numberOfLines={1}
                      >
                        {shopItem.name}
                      </Text>
                      <Text
                        style={[
                          styles.itemDescription,
                          { color: theme.textSecondary },
                        ]}
                        numberOfLines={2}
                      >
                        {shopItem.description}
                      </Text>
                      <View
                        style={[
                          styles.statusTag,
                          { backgroundColor: accentColor + "20" },
                        ]}
                      >
                        <Text
                          style={[styles.statusText, { color: accentColor }]}
                        >
                          {equipped ? "Equipped" : "Tap to Equip"}
                        </Text>
                      </View>
                    </AnimatedTouchable>
                  </StaggeredItem>
                );
              })
            )}
          </View>
        ) : (
          /* ===== SHOP TAB ===== */
          <>
            {/* Category Tabs */}
            <Animated.View
              entering={FadeInUp.delay(80).duration(300)}
              style={[styles.categoryTabs, { backgroundColor: theme.surface }]}
            >
              <TouchableOpacity
                style={[
                  styles.categoryTab,
                  selectedCategory === "shelter" && styles.categoryTabActive,
                  selectedCategory === "shelter" && {
                    backgroundColor: theme.card,
                  },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedCategory("shelter");
                }}
              >
                <Text
                  style={[
                    styles.categoryTabText,
                    {
                      color:
                        selectedCategory === "shelter"
                          ? theme.primary
                          : theme.textSecondary,
                    },
                  ]}
                >
                  Shelters
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.categoryTab,
                  selectedCategory === "trail" && styles.categoryTabActive,
                  selectedCategory === "trail" && {
                    backgroundColor: theme.card,
                  },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedCategory("trail");
                }}
              >
                <Text
                  style={[
                    styles.categoryTabText,
                    {
                      color:
                        selectedCategory === "trail"
                          ? theme.primary
                          : theme.textSecondary,
                    },
                  ]}
                >
                  Trails
                </Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Shop Items Grid */}
            <View style={styles.itemsGrid}>
              {loading ? (
                <ShopGridSkeleton count={filteredItems.length || 6} />
              ) : (
                filteredItems.map((item, index) => {
                  const canAfford = flintCurrency >= item.cost;
                  const owned = isOwned(item.id);
                  const equipped = isEquipped(item.id);
                  const isFree = item.cost === 0;
                  const isComingSoon = item.comingSoon === true;
                  // Trail-specific accent color (falls back to green for non-trails)
                  const accentColor = TRAIL_ACCENT_COLORS[item.id] || "#4CAF50";

                  return (
                    <StaggeredItem
                      key={item.id}
                      index={index}
                      delay="fast"
                      direction="fade"
                      subtle={true}
                    >
                      <AnimatedTouchable
                        style={[
                          styles.itemCard,
                          {
                            backgroundColor: theme.card,
                            borderColor: isComingSoon
                              ? theme.border
                              : equipped
                                ? accentColor
                                : owned
                                  ? accentColor
                                  : isFree
                                    ? accentColor
                                    : canAfford
                                      ? "#FF5700"
                                      : theme.border,
                          },
                          (isComingSoon || (!canAfford && !owned && !isFree)) &&
                            styles.itemCardLocked,
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Light,
                          );
                          handleItemPress(item);
                        }}
                        activeOpacity={0.7}
                      >
                        {/* Icon — prefer image when present, fall back to emoji */}
                        <View
                          style={[
                            styles.itemIconContainer,
                            { backgroundColor: theme.surface },
                          ]}
                        >
                          {item.image ? (
                            <Image
                              source={item.image}
                              style={styles.itemImage}
                              resizeMode="cover"
                            />
                          ) : (
                            <Text style={styles.itemIcon}>{item.icon}</Text>
                          )}
                          {isComingSoon && (
                            <View
                              style={[
                                styles.statusBadge,
                                { backgroundColor: "#888" },
                              ]}
                            >
                              <Ionicons
                                name="time-outline"
                                size={10}
                                color="#FFF"
                              />
                            </View>
                          )}
                          {!isComingSoon && equipped && (
                            <View
                              style={[
                                styles.statusBadge,
                                { backgroundColor: accentColor },
                              ]}
                            >
                              <Ionicons
                                name="checkmark-outline"
                                size={10}
                                color="#FFF"
                              />
                            </View>
                          )}
                          {!isComingSoon && owned && !equipped && (
                            <View
                              style={[
                                styles.statusBadge,
                                { backgroundColor: accentColor },
                              ]}
                            >
                              <Ionicons
                                name="swap-horizontal-outline"
                                size={10}
                                color="#FFF"
                              />
                            </View>
                          )}
                          {!isComingSoon && !canAfford && !owned && !isFree && (
                            <View
                              style={[
                                styles.statusBadge,
                                { backgroundColor: "#666" },
                              ]}
                            >
                              <Ionicons
                                name="lock-closed-outline"
                                size={10}
                                color="#FFF"
                              />
                            </View>
                          )}
                        </View>

                        {/* Info */}
                        <Text
                          style={[styles.itemName, { color: theme.text }]}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        <Text
                          style={[
                            styles.itemDescription,
                            { color: theme.textSecondary },
                          ]}
                          numberOfLines={2}
                        >
                          {item.description}
                        </Text>

                        {/* Status/Price */}
                        {isComingSoon ? (
                          <View
                            style={[
                              styles.statusTag,
                              { backgroundColor: "#88888820" },
                            ]}
                          >
                            <Text
                              style={[styles.statusText, { color: "#888" }]}
                            >
                              Coming Soon
                            </Text>
                          </View>
                        ) : equipped ? (
                          <View
                            style={[
                              styles.statusTag,
                              { backgroundColor: accentColor + "20" },
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusText,
                                { color: accentColor },
                              ]}
                            >
                              Equipped
                            </Text>
                          </View>
                        ) : owned ? (
                          <View
                            style={[
                              styles.statusTag,
                              { backgroundColor: accentColor + "20" },
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusText,
                                { color: accentColor },
                              ]}
                            >
                              Tap to Equip
                            </Text>
                          </View>
                        ) : isFree ? (
                          <View
                            style={[
                              styles.statusTag,
                              { backgroundColor: accentColor + "20" },
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusText,
                                { color: accentColor },
                              ]}
                            >
                              Free
                            </Text>
                          </View>
                        ) : (
                          <View
                            style={[
                              styles.priceTag,
                              {
                                backgroundColor: canAfford
                                  ? "#FF570015"
                                  : theme.surface,
                              },
                            ]}
                          >
                            <FlintIcon
                              size={12}
                              color={
                                canAfford ? "#FF5700" : theme.textSecondary
                              }
                            />
                            <Text
                              style={[
                                styles.itemCost,
                                {
                                  color: canAfford
                                    ? "#FF5700"
                                    : theme.textSecondary,
                                },
                              ]}
                            >
                              {item.cost}
                            </Text>
                          </View>
                        )}
                      </AnimatedTouchable>
                    </StaggeredItem>
                  );
                })
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Purchase & Apply Modal */}
      <Modal
        visible={showApplyModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowApplyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: theme.card }]}>
            {selectedItem && (
              <>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  Purchase {selectedItem.name}?
                </Text>

                <View style={styles.modalIcon}>
                  <Text style={{ fontSize: 60 }}>{selectedItem.icon}</Text>
                </View>

                <Text
                  style={[
                    styles.modalDescription,
                    { color: theme.textSecondary },
                  ]}
                >
                  {selectedItem.description}
                </Text>

                <View
                  style={[styles.modalCost, { backgroundColor: "#FF570015" }]}
                >
                  <FlintIcon size={24} color="#FF5700" />
                  <Text style={styles.modalCostText}>
                    {selectedItem.cost} Flint
                  </Text>
                </View>

                <Text style={[styles.modalQuestion, { color: theme.text }]}>
                  Apply now or save to backpack?
                </Text>

                <View style={styles.modalButtons}>
                  <AnimatedButton
                    title="Save to Backpack"
                    onPress={handlePurchaseAndSave}
                    variant="outline"
                    size="medium"
                    loading={isPurchasing}
                    disabled={isPurchasing}
                    icon={
                      <Ionicons
                        name="cube-outline"
                        size={20}
                        color={theme.text}
                      />
                    }
                    iconPosition="left"
                    style={{ flex: 1 }}
                  />

                  <AnimatedButton
                    title="Apply Now"
                    onPress={handlePurchaseAndApply}
                    variant="primary"
                    size="medium"
                    gradient
                    gradientColors={[
                      theme.primary,
                      PremiumColors.gradients.primary[1],
                    ]}
                    loading={isPurchasing}
                    disabled={isPurchasing}
                    icon={
                      <Ionicons name="flash-outline" size={20} color="#FFF" />
                    }
                    iconPosition="left"
                    style={{ flex: 1 }}
                  />
                </View>

                <TouchableOpacity
                  style={styles.modalCancel}
                  onPress={() => setShowApplyModal(false)}
                >
                  <Text
                    style={[
                      styles.modalCancelText,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  balanceCard: {
    margin: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  balanceContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  flintIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  balanceInfo: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 4,
  },
  balanceHint: {
    fontSize: 12,
  },
  topTabs: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 4,
  },
  topTab: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  topTabActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  topTabText: {
    fontSize: 15,
    fontWeight: "700",
  },
  emptyGear: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 8,
  },
  emptyGearTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 8,
  },
  emptyGearSubtitle: {
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  categoryTabs: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 4,
  },
  categoryTab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  categoryTabActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  itemsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: ITEM_MARGIN,
  },
  itemCard: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH, // Square aspect ratio
    borderRadius: 16,
    padding: 12,
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemCardLocked: {
    opacity: 0.6,
  },
  itemIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    position: "relative",
    overflow: "hidden",
  },
  itemIcon: {
    fontSize: 32,
  },
  itemImage: {
    width: "100%",
    height: "100%",
  },
  statusBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  itemName: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  itemDescription: {
    fontSize: 10,
    textAlign: "center",
    lineHeight: 13,
  },
  statusTag: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  statusText: {
    fontSize: 9,
    fontWeight: "600",
  },
  priceTag: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 4,
  },
  itemCost: {
    fontSize: 14,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    width: "85%",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  modalIcon: {
    marginBottom: 16,
  },
  modalDescription: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  modalCost: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  modalCostText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FF5700",
  },
  modalQuestion: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    marginBottom: 12,
  },
  modalButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  modalButtonSecondary: {
    borderWidth: 2,
  },
  modalButtonPrimary: {},
  modalButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  modalCancel: {
    paddingVertical: 8,
  },
  modalCancelText: {
    fontSize: 14,
  },
});

export default ShopScreen;
