import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_MARGIN = 8;
const ITEM_WIDTH = (SCREEN_WIDTH - 32 - ITEM_MARGIN) / 2; // 2 items per row with padding
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainTabParamList } from '../../navigation/types';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useSupabaseProfile } from '../../utils/supabaseHooks';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UnifiedHeader } from '../../components/UnifiedHeader';
import { FlintIcon } from '../../components/FlintIcon';
import Animated, {
  FadeInUp,
  Layout,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  interpolate
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { AnimatedButton } from '../../components/premium/AnimatedButton';
import { StaggeredItem } from '../../components/premium/StaggeredList';
import { useCounterAnimation, usePulseAnimation, useSuccessAnimation } from '../../utils/animationUtils';
import { AnimationConfig, Spacing, BorderRadius, Shadows, PremiumColors } from '../../theme/premiumTheme';
import {
  addToInventory,
  equipItem,
  getUserInventory,
  getEquippedItems,
  ownsItem,
  isItemEquipped,
  type InventoryItem,
  type EquippedItem
} from '../../utils/inventoryService';

// Shop item categories
type ShopCategory = 'gear' | 'shelter' | 'trail';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  cost: number; // in Flint
  category: ShopCategory;
  icon: string;
}

// Expanded shop items
const SHOP_ITEMS: ShopItem[] = [
  // Trail Gear (for pets/animals)
  { id: 'bandana', name: 'Bandana', description: 'A colorful bandana', cost: 4, category: 'gear', icon: '🧣' },
  { id: 'hat', name: 'Explorer Hat', description: 'Perfect for adventures', cost: 6, category: 'gear', icon: '🎩' },
  { id: 'vest', name: 'Adventure Vest', description: 'Hiking vest', cost: 8, category: 'gear', icon: '🦺' },
  { id: 'sunglasses', name: 'Sunglasses', description: 'Cool shades for sunny trails', cost: 10, category: 'gear', icon: '🕶️' },
  { id: 'backpack', name: 'Mini Backpack', description: 'Carry essentials on the trail', cost: 12, category: 'gear', icon: '🎒' },
  { id: 'scarf', name: 'Cozy Scarf', description: 'Warm scarf for cold trails', cost: 14, category: 'gear', icon: '🧵' },
  { id: 'boots', name: 'Hiking Boots', description: 'Sturdy boots for any terrain', cost: 16, category: 'gear', icon: '🥾' },
  { id: 'compass', name: 'Compass Necklace', description: 'Never lose your way', cost: 18, category: 'gear', icon: '🧭' },

  // Shelters
  { id: 'tent', name: 'Camping Tent', description: 'Cozy tent for breaks', cost: 20, category: 'shelter', icon: '⛺' },
  { id: 'cabin', name: 'Log Cabin', description: 'A warm cabin retreat', cost: 30, category: 'shelter', icon: '🛖' },
  { id: 'treehouse', name: 'Tree House', description: 'A house in the trees', cost: 40, category: 'shelter', icon: '🏠' },
  { id: 'igloo', name: 'Ice Igloo', description: 'Cool shelter for arctic trails', cost: 50, category: 'shelter', icon: '🏔️' },
  { id: 'lighthouse', name: 'Lighthouse', description: 'Coastal shelter with a view', cost: 60, category: 'shelter', icon: '🗼' },
  { id: 'castle', name: 'Stone Castle', description: 'Royal mountain fortress', cost: 80, category: 'shelter', icon: '🏰' },

  // Trails (removed mountains - that's the starting trail)
  { id: 'forest', name: 'Forest Path', description: 'Walk through tall trees', cost: 25, category: 'trail', icon: '🌲' },
  { id: 'desert', name: 'Desert Trail', description: 'Explore sandy dunes', cost: 35, category: 'trail', icon: '🏜️' },
  { id: 'beach', name: 'Beach Path', description: 'Walk along the shore', cost: 45, category: 'trail', icon: '🏖️' },
  { id: 'jungle', name: 'Jungle Trek', description: 'Adventure through the jungle', cost: 55, category: 'trail', icon: '🌴' },
  { id: 'snow', name: 'Snowy Path', description: 'Winter wonderland trail', cost: 65, category: 'trail', icon: '❄️' },
  { id: 'canyon', name: 'Grand Canyon', description: 'Majestic canyon views', cost: 75, category: 'trail', icon: '🏞️' },
  { id: 'volcano', name: 'Volcano Trail', description: 'Hike near active volcano', cost: 85, category: 'trail', icon: '🌋' },
  { id: 'northern', name: 'Northern Lights', description: 'Aurora borealis path', cost: 95, category: 'trail', icon: '🌌' },
];

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const ShopScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<MainTabParamList>>();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { profile, updateProfile } = useSupabaseProfile();
  const [selectedCategory, setSelectedCategory] = useState<ShopCategory>('gear');
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
  }, [user]);

  const loadInventoryData = async () => {
    setLoading(true);
    const [invResult, equippedResult] = await Promise.all([
      getUserInventory(),
      getEquippedItems()
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
  const filteredItems = SHOP_ITEMS.filter(item => item.category === selectedCategory);

  // Check if item is owned
  const isOwned = (itemId: string) => {
    return inventory.some(item => item.item_id === itemId);
  };

  // Check if item is equipped
  const isEquipped = (itemId: string) => {
    return equippedItems.some(item => item.item_id === itemId);
  };

  const handleItemPress = (item: ShopItem) => {
    const owned = isOwned(item.id);
    const equipped = isEquipped(item.id);

    if (equipped) {
      Alert.alert('Already Equipped', `${item.name} is currently equipped!`);
      return;
    }

    if (owned) {
      // Already owned, just equip it
      handleEquipFromInventory(item);
      return;
    }

    // Not owned, need to purchase
    if (flintCurrency < item.cost) {
      Alert.alert(
        'Not Enough Flint',
        `You need ${item.cost} Flint to purchase this item. Complete more focus sessions to earn Flint!`,
        [{ text: 'OK' }]
      );
      return;
    }

    // Show purchase modal
    setSelectedItem(item);
    setShowApplyModal(true);
  };

  const handleEquipFromInventory = async (item: ShopItem) => {
    const result = await equipItem(item.id, item.name, item.category, item.icon);
    if (result.success) {
      await loadInventoryData();
      Alert.alert('Equipped!', `${item.name} is now equipped!`);
    } else {
      Alert.alert('Error', result.error || 'Failed to equip item');
    }
  };

  const handlePurchaseAndApply = async () => {
    if (!selectedItem || isPurchasing) return;

    setIsPurchasing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Deduct Flint
      const newBalance = flintCurrency - selectedItem.cost;
      await updateProfile({ flint_currency: newBalance });

      // Add to inventory
      await addToInventory(
        selectedItem.id,
        selectedItem.name,
        selectedItem.category,
        selectedItem.icon
      );

      // Equip immediately
      await equipItem(
        selectedItem.id,
        selectedItem.name,
        selectedItem.category,
        selectedItem.icon
      );

      await loadInventoryData();
      setShowApplyModal(false);
      setIsPurchasing(false);

      // Success haptic
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert(
        'Equipped! 🎉',
        `${selectedItem.name} has been purchased and equipped!\n\nFlint balance: ${newBalance.toFixed(1)}`,
        [{ text: 'Awesome!' }]
      );
    } catch (error) {
      setIsPurchasing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to purchase item. Please try again.');
    }
  };

  const handlePurchaseAndSave = async () => {
    if (!selectedItem || isPurchasing) return;

    setIsPurchasing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Deduct Flint
      const newBalance = flintCurrency - selectedItem.cost;
      await updateProfile({ flint_currency: newBalance });

      // Add to inventory
      await addToInventory(
        selectedItem.id,
        selectedItem.name,
        selectedItem.category,
        selectedItem.icon
      );

      await loadInventoryData();
      setShowApplyModal(false);
      setIsPurchasing(false);

      // Success haptic
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert(
        'Added to Backpack! 🎒',
        `${selectedItem.name} has been added to your backpack!\n\nFlint balance: ${newBalance.toFixed(1)}`,
        [{ text: 'Great!' }]
      );
    } catch (error) {
      setIsPurchasing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to purchase item. Please try again.');
    }
  };

  const getCategoryLabel = (category: ShopCategory) => {
    switch (category) {
      case 'gear': return 'Trail Gear';
      case 'shelter': return 'Shelters';
      case 'trail': return 'Trails';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <UnifiedHeader title="Gear Shop" onClose={() => navigation.navigate('Profile' as any)} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Flint Balance Card */}
        <Animated.View
          entering={FadeInUp.delay(50).duration(300)}
          style={[styles.balanceCard, { backgroundColor: theme.card }]}
        >
          <View style={styles.balanceContent}>
            <View style={[styles.flintIcon, { backgroundColor: '#FF570020' }]}>
              <FlintIcon size={40} color="#FF5700" />
            </View>
            <View style={styles.balanceInfo}>
              <Text style={[styles.balanceLabel, { color: theme.textSecondary }]}>Your Flint</Text>
              <Animated.Text style={[styles.balanceAmount, { color: theme.text }]}>
                {Math.round(animatedFlint.value * 10) / 10}
              </Animated.Text>
              <Text style={[styles.balanceHint, { color: theme.textSecondary }]}>Earn 1 Flint per focus minute completed</Text>
            </View>
          </View>
        </Animated.View>

        {/* Category Tabs */}
        <Animated.View
          entering={FadeInUp.delay(80).duration(300)}
          style={[styles.categoryTabs, { backgroundColor: theme.surface }]}
        >
          <TouchableOpacity
            style={[
              styles.categoryTab,
              selectedCategory === 'gear' && styles.categoryTabActive,
              selectedCategory === 'gear' && { backgroundColor: theme.card }
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setSelectedCategory('gear');
            }}
          >
            <Text style={[
              styles.categoryTabText,
              { color: selectedCategory === 'gear' ? theme.primary : theme.textSecondary }
            ]}>
              Trail Gear
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.categoryTab,
              selectedCategory === 'shelter' && styles.categoryTabActive,
              selectedCategory === 'shelter' && { backgroundColor: theme.card }
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setSelectedCategory('shelter');
            }}
          >
            <Text style={[
              styles.categoryTabText,
              { color: selectedCategory === 'shelter' ? theme.primary : theme.textSecondary }
            ]}>
              Shelters
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.categoryTab,
              selectedCategory === 'trail' && styles.categoryTabActive,
              selectedCategory === 'trail' && { backgroundColor: theme.card }
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setSelectedCategory('trail');
            }}
          >
            <Text style={[
              styles.categoryTabText,
              { color: selectedCategory === 'trail' ? theme.primary : theme.textSecondary }
            ]}>
              Trails
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Shop Items Grid */}
        <View style={styles.itemsGrid}>
          {filteredItems.map((item, index) => {
            const canAfford = flintCurrency >= item.cost;
            const owned = isOwned(item.id);
            const equipped = isEquipped(item.id);

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
                      borderColor: equipped ? theme.primary : (owned ? '#4CAF50' : (canAfford ? '#FF5700' : theme.border))
                    },
                    !canAfford && !owned && styles.itemCardLocked
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    handleItemPress(item);
                  }}
                  activeOpacity={0.7}
                >
                {/* Icon */}
                <View style={[styles.itemIconContainer, { backgroundColor: theme.surface }]}>
                  <Text style={styles.itemIcon}>{item.icon}</Text>
                  {equipped && (
                    <View style={[styles.statusBadge, { backgroundColor: theme.primary }]}>
                      <Ionicons name="checkmark-outline" size={10} color="#FFF" />
                    </View>
                  )}
                  {owned && !equipped && (
                    <View style={[styles.statusBadge, { backgroundColor: '#4CAF50' }]}>
                      <Ionicons name="cube-outline" size={10} color="#FFF" />
                    </View>
                  )}
                  {!canAfford && !owned && (
                    <View style={[styles.statusBadge, { backgroundColor: '#666' }]}>
                      <Ionicons name="lock-closed-outline" size={10} color="#FFF" />
                    </View>
                  )}
                </View>

                {/* Info */}
                <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[styles.itemDescription, { color: theme.textSecondary }]} numberOfLines={2}>
                  {item.description}
                </Text>

                {/* Status/Price */}
                {equipped ? (
                  <View style={[styles.statusTag, { backgroundColor: theme.primary + '20' }]}>
                    <Text style={[styles.statusText, { color: theme.primary }]}>Equipped</Text>
                  </View>
                ) : owned ? (
                  <View style={[styles.statusTag, { backgroundColor: '#4CAF5020' }]}>
                    <Text style={[styles.statusText, { color: '#4CAF50' }]}>Owned - Tap to Equip</Text>
                  </View>
                ) : (
                  <View style={[styles.priceTag, { backgroundColor: canAfford ? '#FF570015' : theme.surface }]}>
                    <FlintIcon size={12} color={canAfford ? "#FF5700" : theme.textSecondary} />
                    <Text style={[styles.itemCost, { color: canAfford ? '#FF5700' : theme.textSecondary }]}>
                      {item.cost}
                    </Text>
                  </View>
                )}
                </AnimatedTouchable>
              </StaggeredItem>
            );
          })}
        </View>
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

                <Text style={[styles.modalDescription, { color: theme.textSecondary }]}>
                  {selectedItem.description}
                </Text>

                <View style={[styles.modalCost, { backgroundColor: '#FF570015' }]}>
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
                    icon={<Ionicons name="cube-outline" size={20} color={theme.text} />}
                    iconPosition="left"
                    style={{ flex: 1 }}
                  />

                  <AnimatedButton
                    title="Apply Now"
                    onPress={handlePurchaseAndApply}
                    variant="primary"
                    size="medium"
                    gradient
                    gradientColors={[theme.primary, PremiumColors.gradients.primary[1]]}
                    loading={isPurchasing}
                    disabled={isPurchasing}
                    icon={<Ionicons name="flash-outline" size={20} color="#FFF" />}
                    iconPosition="left"
                    style={{ flex: 1 }}
                  />
                </View>

                <TouchableOpacity
                  style={styles.modalCancel}
                  onPress={() => setShowApplyModal(false)}
                >
                  <Text style={[styles.modalCancelText, { color: theme.textSecondary }]}>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  balanceContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flintIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontWeight: 'bold',
    marginBottom: 4,
  },
  balanceHint: {
    fontSize: 12,
  },
  categoryTabs: {
    flexDirection: 'row',
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
    alignItems: 'center',
  },
  categoryTabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: ITEM_MARGIN,
  },
  itemCard: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH, // Square aspect ratio
    borderRadius: 16,
    padding: 12,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemCardLocked: {
    opacity: 0.6,
  },
  itemIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    position: 'relative',
  },
  itemIcon: {
    fontSize: 32,
  },
  statusBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  itemDescription: {
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 13,
  },
  statusTag: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 9,
    fontWeight: '600',
  },
  priceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 4,
  },
  itemCost: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '85%',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalIcon: {
    marginBottom: 16,
  },
  modalDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalCost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  modalCostText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF5700',
  },
  modalQuestion: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 12,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  modalButtonSecondary: {
    borderWidth: 2,
  },
  modalButtonPrimary: {
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalCancel: {
    paddingVertical: 8,
  },
  modalCancelText: {
    fontSize: 14,
  },
});

export default ShopScreen;
