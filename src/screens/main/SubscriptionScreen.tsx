import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedButton } from '../../components/premium/AnimatedButton';
import { StaggeredItem } from '../../components/premium/StaggeredList';
import { useTheme } from '../../context/ThemeContext';
import { Shadows, PremiumColors } from '../../theme/premiumTheme';

// RevenueCat temporarily disabled for demo purposes
// When ready to enable, uncomment the import below and remove mock functions
// import {
//   getAvailablePackages,
//   purchasePackage,
//   restorePurchases,
//   getCurrentTier,
//   PurchasesPackage,
// } from '../../services/revenuecat';

const plans = [
  {
    name: 'Basic',
    price: 'Free',
    features: [
      'Balanced Focus Timer (45/15 min cycles)',
      'Task & Subject Creation',
      'Weekly Progress Tracking',
      'Daily Inspiration Quotes',
      'Basic AI-Powered Insights (limited)',
      'Access to Community & Leaderboard',
      'Profile Customization',
    ],
    highlight: true,
    cta: 'Current Plan',
    badge: null,
  },
  {
    name: 'Premium',
    price: '$4.99/mo',
    features: [
      'Everything in Basic',
      'Unlimited AI-Powered Insights',
      'Advanced Task Prioritization',
      'Soundscapes for Focus',
      'Calendar Integration',
      'Chrome Extension Beta',
      'Priority Support',
    ],
    highlight: false,
    cta: 'Upgrade to Premium',
    badge: 'Most Popular',
  },
  {
    name: 'Pro',
    price: '$14.99/mo',
    features: [
      'Everything in Premium',
      'Personalized Study Plans (AI-generated)',
      'Brain Mapping & Motivation Profile',
      'Self-Discovery Quizzes',
      'E-Books Library Access',
      'Session Reports & Analytics',
      'App/Website Blocking (Protection Center)',
      'Early Access to New Features',
      'Pro Badge in Leaderboard',
    ],
    highlight: false,
    cta: 'Upgrade to Pro',
    badge: null,
  },
];

// Map plan names to RevenueCat product identifiers
const PLAN_TO_PRODUCT: Record<string, string> = {
  Premium: 'hikewise_premium_monthly',
  Pro: 'hikewise_pro_monthly',
};

// Mock RevenueCat functions for demo mode
const mockGetCurrentTier = async (): Promise<'free' | 'premium' | 'pro'> => {
  return 'free';
};

const mockPurchasePackage = async (planName: string): Promise<{ success: boolean; error?: string }> => {
  // Simulate a purchase for demo purposes
  console.log('[Demo Mode] Purchase simulated for:', planName);
  return { success: true };
};

const mockRestorePurchases = async (): Promise<{ success: boolean; tier: 'free' | 'premium' | 'pro'; error?: string }> => {
  console.log('[Demo Mode] Restore purchases simulated');
  return { success: true, tier: 'free' };
};

const SubscriptionScreen = () => {
  const { theme } = useTheme();
  const [selectedPlan, setSelectedPlan] = useState<string | null>('Basic');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [currentTier, setCurrentTier] = useState<'free' | 'premium' | 'pro'>('free');
  const [loadingPackages, setLoadingPackages] = useState(false);

  // Fetch current subscription tier (demo mode - always returns free)
  useEffect(() => {
    const loadSubscriptionData = async () => {
      try {
        setLoadingPackages(true);

        // Get current tier (mock)
        const tier = await mockGetCurrentTier();
        setCurrentTier(tier);

        // Set selected plan based on current tier
        if (tier === 'pro') setSelectedPlan('Pro');
        else if (tier === 'premium') setSelectedPlan('Premium');
        else setSelectedPlan('Basic');
      } catch (error) {
        console.error('Error loading subscription data:', error);
      } finally {
        setLoadingPackages(false);
      }
    };

    loadSubscriptionData();
  }, []);

  const handlePlanSelect = (planName: string) => {
    // Don't allow selecting current tier or lower
    const tierRank = { Basic: 0, Premium: 1, Pro: 2 };
    const currentRank = tierRank[currentTier === 'free' ? 'Basic' : currentTier === 'premium' ? 'Premium' : 'Pro'];
    const selectedRank = tierRank[planName as keyof typeof tierRank];

    if (selectedRank > currentRank) {
      Haptics.selectionAsync();
      setSelectedPlan(planName);
    }
  };

  const handleUpgrade = async (planName: string) => {
    if (planName === 'Basic') return;

    setIsProcessing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Demo mode: Show alert that RevenueCat is not configured
      Alert.alert(
        'Demo Mode',
        `RevenueCat is not configured yet. In production, this would upgrade you to ${planName}.`,
        [
          {
            text: 'Simulate Success',
            onPress: async () => {
              const result = await mockPurchasePackage(planName);

              if (result.success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert(
                  'Success! (Demo)',
                  `You're now subscribed to ${planName}. (This is a demo - no actual purchase was made)`,
                  [{ text: 'OK' }]
                );

                // Update local state for demo
                const newTier = planName === 'Pro' ? 'pro' : 'premium';
                setCurrentTier(newTier);
                setSelectedPlan(planName);
              }
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            },
          },
        ]
      );
    } catch (error) {
      console.error('Purchase error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestorePurchases = async () => {
    setIsRestoring(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const result = await mockRestorePurchases();

      if (result.success && result.tier !== 'free') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Purchases Restored (Demo)',
          `Your ${result.tier} subscription has been restored. (Demo mode - RevenueCat not configured)`,
          [{ text: 'OK' }]
        );
        setCurrentTier(result.tier);
        setSelectedPlan(result.tier === 'pro' ? 'Pro' : 'Premium');
      } else if (result.tier === 'free') {
        Alert.alert('No Purchases Found (Demo)', 'No previous purchases were found to restore. (Demo mode)');
      } else {
        Alert.alert('Restore Failed', result.error || 'Could not restore purchases. Please try again.');
      }
    } catch (error) {
      console.error('Restore error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsRestoring(false);
    }
  };

  // Determine if a plan is the current plan
  const isPlanCurrent = (planName: string): boolean => {
    if (planName === 'Basic' && currentTier === 'free') return true;
    if (planName === 'Premium' && currentTier === 'premium') return true;
    if (planName === 'Pro' && currentTier === 'pro') return true;
    return false;
  };

  // Determine CTA text based on current tier
  const getCtaText = (planName: string): string => {
    if (isPlanCurrent(planName)) return 'Current Plan';
    if (planName === 'Basic') return 'Downgrade';
    return `Upgrade to ${planName}`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Animated.View entering={FadeInUp.delay(100).duration(400)}>
          <Text style={[styles.title, { color: theme.text }]}>Choose Your Plan</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Unlock your full potential with advanced features and insights.
          </Text>
        </Animated.View>

        <View style={styles.cardsColumn}>
          {plans.map((plan, idx) => {
            const isSelected = selectedPlan === plan.name;
            const isPremiumPlan = !plan.highlight;

            return (
              <StaggeredItem
                key={plan.name}
                index={idx}
                delay="normal"
                direction="up"
                style={styles.cardWrapper}
              >
                {plan.badge && (
                  <Animated.View
                    entering={FadeIn.delay(300 + idx * 150)}
                    style={[styles.badgeAboveCard, { backgroundColor: theme.primary }]}
                  >
                    <LinearGradient
                      colors={PremiumColors.gradients.gold as [string, string, ...string[]]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.badgeGradient}
                    >
                      <Text style={styles.badgeText}>✨ {plan.badge}</Text>
                    </LinearGradient>
                  </Animated.View>
                )}

                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => handlePlanSelect(plan.name)}
                >
                  <Animated.View
                    style={[
                      styles.card,
                      { backgroundColor: theme.card, borderColor: theme.border },
                      plan.highlight && styles.cardHighlight,
                      isSelected && isPremiumPlan && {
                        borderColor: theme.primary,
                        borderWidth: 2.5,
                        ...Shadows.glow(theme.primary),
                      },
                    ]}
                  >
                    <View style={styles.headerRow}>
                      <Text style={[styles.planName, { color: theme.primary }]}>{plan.name}</Text>
                      <Animated.View entering={FadeIn.delay(400 + idx * 150)}>
                        <Text style={[styles.planPrice, { color: theme.primary }]}>{plan.price}</Text>
                      </Animated.View>
                    </View>

                    <View style={styles.featuresList}>
                      {plan.features.map((feature, i) => (
                        <Animated.View
                          key={i}
                          entering={FadeInUp.delay(450 + idx * 150 + i * 50).duration(400)}
                          style={styles.featureRow}
                        >
                          <Ionicons
                            name="checkmark-circle"
                            size={18}
                            color={plan.highlight ? PremiumColors.success.main : theme.primary}
                            style={{ marginRight: 8 }}
                          />
                          <Text style={[styles.featureText, { color: theme.text }]}>{feature}</Text>
                        </Animated.View>
                      ))}
                    </View>

                    {isPlanCurrent(plan.name) ? (
                      <View style={[styles.ctaBtn, styles.ctaBtnCurrent, { borderColor: theme.border }]}>
                        <Ionicons name="checkmark-circle" size={20} color={PremiumColors.success.main} />
                        <Text style={[styles.ctaText, styles.ctaTextCurrent, { color: theme.textSecondary }]}>
                          Current Plan
                        </Text>
                      </View>
                    ) : plan.name === 'Basic' ? (
                      <View style={[styles.ctaBtn, styles.ctaBtnCurrent, { borderColor: theme.border }]}>
                        <Text style={[styles.ctaText, styles.ctaTextCurrent, { color: theme.textSecondary }]}>
                          Free Tier
                        </Text>
                      </View>
                    ) : (
                      <AnimatedButton
                        title={getCtaText(plan.name)}
                        onPress={() => handleUpgrade(plan.name)}
                        variant="primary"
                        size="large"
                        gradient
                        gradientColors={PremiumColors.gradients.primary as [string, string, ...string[]]}
                        loading={isProcessing && isSelected}
                        disabled={isProcessing || loadingPackages}
                        fullWidth
                        icon={<Ionicons name="arrow-forward" size={20} color="#FFF" />}
                        iconPosition="right"
                      />
                    )}
                  </Animated.View>
                </TouchableOpacity>
              </StaggeredItem>
            );
          })}
        </View>

        {/* Restore Purchases Button */}
        <Animated.View entering={FadeInUp.delay(800).duration(400)} style={styles.restoreContainer}>
          <TouchableOpacity
            style={[styles.restoreButton, { borderColor: theme.border }]}
            onPress={handleRestorePurchases}
            disabled={isRestoring}
          >
            {isRestoring ? (
              <Text style={[styles.restoreText, { color: theme.textSecondary }]}>Restoring...</Text>
            ) : (
              <>
                <Ionicons name="refresh" size={16} color={theme.textSecondary} />
                <Text style={[styles.restoreText, { color: theme.textSecondary }]}>
                  Restore Purchases
                </Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={[styles.termsText, { color: theme.textSecondary }]}>
            Subscriptions auto-renew until canceled. Cancel anytime in your device settings.
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FCF8' },
  scrollContent: { padding: 24, alignItems: 'center' },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#555',
    marginBottom: 24,
    textAlign: 'center',
    maxWidth: 320,
  },
  cardsColumn: {
    width: '100%',
    flexDirection: 'column',
    gap: 24,
  },
  cardWrapper: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 0,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 22,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
    width: '100%',
    maxWidth: 400,
  },
  cardHighlight: {
    borderColor: '#388E3C',
    shadowOpacity: 0.09,
    shadowRadius: 8,
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#388E3C',
  },
  planPrice: {
    fontSize: 18,
    color: '#7B61FF',
    fontWeight: '600',
  },
  featuresList: {
    marginBottom: 18,
    marginTop: 6,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 7,
  },
  featureText: {
    fontSize: 15,
    color: '#222',
  },
  ctaBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  ctaBtnActive: {
    backgroundColor: '#7B61FF',
  },
  ctaBtnCurrent: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#BDBDBD',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  ctaTextActive: {
    color: '#fff',
  },
  ctaTextCurrent: {
    color: '#888',
  },
  badgeAboveCard: {
    borderRadius: 8,
    marginBottom: -12,
    zIndex: 2,
    alignSelf: 'center',
    minWidth: 90,
    marginTop: 0,
    overflow: 'hidden',
  },
  badgeGradient: {
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  badgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  restoreContainer: {
    marginTop: 24,
    alignItems: 'center',
    paddingBottom: 40,
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  restoreText: {
    fontSize: 14,
    fontWeight: '500',
  },
  termsText: {
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 18,
  },
});

export default SubscriptionScreen; 
