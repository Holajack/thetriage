import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { Typography, Spacing, BorderRadius, PremiumColors, Shadows } from '../../theme/premiumTheme';
import { StaggeredItem } from '../../components/premium/StaggeredList';

// Sub-components
import BillingToggle, { BillingPeriod } from './subscription/BillingToggle';
import PlanCard, { PlanTier } from './subscription/PlanCard';
import NoraShowcase from './subscription/NoraShowcase';
import FeatureComparisonTable from './subscription/FeatureComparisonTable';
import SocialProofBar from './subscription/SocialProofBar';
import EliteCelebrationView from './subscription/EliteCelebrationView';

// RevenueCat temporarily disabled for demo purposes
// When ready to enable, uncomment the import below and remove mock functions
// import {
//   getAvailablePackages,
//   purchasePackage,
//   restorePurchases,
//   getCurrentTier,
//   getManagementURL,
// } from '../../services/revenuecat';

// ============================================
// PLAN DATA
// ============================================

const PREMIUM_PLAN: PlanTier = {
  name: 'Premium',
  tier: 'premium',
  monthlyPrice: 7.99,
  annualPrice: 57.99,
  annualMonthlyEquivalent: 4.83,
  badge: 'Most Popular',
  tagline: 'Supercharge your study sessions',
  features: [
    { text: 'Unlimited AI-Powered Insights', included: true },
    { text: 'Advanced Task Prioritization', included: true },
    { text: 'Soundscapes for Focus', included: true },
    { text: 'Calendar Integration', included: true },
    { text: 'Chrome Extension Beta', included: true },
    { text: 'Priority Support', included: true },
  ],
  gradient: PremiumColors.gradients.primary,
};

const ELITE_PLAN: PlanTier = {
  name: 'Elite',
  tier: 'elite',
  monthlyPrice: 19.99,
  annualPrice: 143.99,
  annualMonthlyEquivalent: 12.00,
  badge: 'Best Value',
  tagline: 'The ultimate study companion with Nora AI',
  features: [
    { text: 'Everything in Premium', included: true },
    { text: 'Nora AI Study Assistant', included: true, highlight: true },
    { text: 'Voice Interaction & PDF Analysis', included: true, highlight: true },
    { text: 'Personalized Study Plans', included: true },
    { text: 'Brain Mapping & Motivation Profile', included: true },
    { text: 'Self-Discovery Quizzes', included: true },
    { text: 'eBooks Library Access', included: true },
    { text: 'Session Reports & Analytics', included: true },
    { text: 'App/Website Blocking', included: true },
    { text: 'Early Access to New Features', included: true },
    { text: 'Elite Badge in Leaderboard', included: true },
  ],
  gradient: PremiumColors.gradients.premium,
};

// Map plan tiers to RevenueCat product identifiers
const PLAN_PRODUCTS: Record<string, Record<BillingPeriod, string>> = {
  premium: {
    monthly: 'hikewise_premium_monthly',
    annual: 'hikewise_premium_yearly',
  },
  elite: {
    monthly: 'hikewise_elite_monthly',
    annual: 'hikewise_elite_yearly',
  },
};

// ============================================
// MOCK FUNCTIONS (Demo Mode)
// ============================================

const mockGetCurrentTier = async (): Promise<'free' | 'premium' | 'elite'> => {
  return 'free';
};

const mockPurchasePackage = async (planName: string): Promise<{ success: boolean; error?: string }> => {
  console.log('[Demo Mode] Purchase simulated for:', planName);
  return { success: true };
};

const mockRestorePurchases = async (): Promise<{ success: boolean; tier: 'free' | 'premium' | 'elite'; error?: string }> => {
  console.log('[Demo Mode] Restore purchases simulated');
  return { success: true, tier: 'free' };
};

// ============================================
// SUBSCRIPTION SCREEN
// ============================================

const SubscriptionScreen = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [currentTier, setCurrentTier] = useState<'free' | 'premium' | 'elite'>('free');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingTier, setProcessingTier] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [loadingPackages, setLoadingPackages] = useState(false);

  // Load current subscription tier
  useEffect(() => {
    const loadSubscriptionData = async () => {
      try {
        setLoadingPackages(true);
        const tier = await mockGetCurrentTier();
        setCurrentTier(tier);
      } catch (error) {
        console.error('Error loading subscription data:', error);
      } finally {
        setLoadingPackages(false);
      }
    };
    loadSubscriptionData();
  }, []);

  const handleUpgrade = useCallback(async (plan: PlanTier) => {
    setIsProcessing(true);
    setProcessingTier(plan.tier);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const productId = PLAN_PRODUCTS[plan.tier]?.[billingPeriod];
      Alert.alert(
        'Demo Mode',
        `RevenueCat is not configured yet. In production, this would upgrade you to ${plan.name} (${productId}).`,
        [
          {
            text: 'Simulate Success',
            onPress: async () => {
              const result = await mockPurchasePackage(plan.name);
              if (result.success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert(
                  'Welcome to ' + plan.name + '!',
                  `You now have full ${plan.name} access. (Demo — no actual purchase made)`,
                  [{ text: 'OK' }],
                );
                setCurrentTier(plan.tier);
              }
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
          },
        ],
      );
    } catch (error) {
      console.error('Purchase error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsProcessing(false);
      setProcessingTier(null);
    }
  }, [billingPeriod]);

  const handleRestorePurchases = useCallback(async () => {
    setIsRestoring(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const result = await mockRestorePurchases();
      if (result.success && result.tier !== 'free') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Purchases Restored',
          `Your ${result.tier} subscription has been restored. (Demo mode)`,
          [{ text: 'OK' }],
        );
        setCurrentTier(result.tier);
      } else if (result.tier === 'free') {
        Alert.alert('No Purchases Found', 'No previous purchases were found to restore.');
      } else {
        Alert.alert('Restore Failed', result.error || 'Could not restore purchases.');
      }
    } catch (error) {
      console.error('Restore error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsRestoring(false);
    }
  }, []);

  const handleManageSubscription = useCallback(async () => {
    // In production, use getManagementURL() from RevenueCat
    Alert.alert(
      'Manage Subscription',
      'This would open your device subscription settings. (Demo mode)',
      [{ text: 'OK' }],
    );
  }, []);

  const isEliteUser = currentTier === 'elite';
  const isPremiumUser = currentTier === 'premium';
  const isFreeUser = currentTier === 'free';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Subscription</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ============================================ */}
        {/* HERO HEADER */}
        {/* ============================================ */}
        <Animated.View entering={FadeInUp.delay(100).duration(500)}>
          <LinearGradient
            colors={PremiumColors.gradients.premium as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <Ionicons name="diamond-outline" size={40} color="rgba(255,255,255,0.9)" />
            <Text style={styles.heroTitle}>
              {isEliteUser ? 'Elite Member' : 'Unlock Your Full Potential'}
            </Text>
            <Text style={styles.heroSubtitle}>
              {isEliteUser
                ? 'You have access to everything'
                : isPremiumUser
                  ? 'Upgrade to Elite for Nora AI and more'
                  : 'Choose the plan that fits your study goals'}
            </Text>
          </LinearGradient>
        </Animated.View>

        {/* ============================================ */}
        {/* BILLING TOGGLE (non-elite users) */}
        {/* ============================================ */}
        {!isEliteUser && (
          <BillingToggle
            billingPeriod={billingPeriod}
            onToggle={setBillingPeriod}
            savingsPercent={40}
          />
        )}

        {/* ============================================ */}
        {/* TIER-ADAPTIVE CONTENT */}
        {/* ============================================ */}
        {isEliteUser ? (
          /* --- Elite User: Celebration View --- */
          <StaggeredItem index={0} delay="slow" direction="up">
            <EliteCelebrationView onManageSubscription={handleManageSubscription} />
          </StaggeredItem>
        ) : isPremiumUser ? (
          /* --- Premium User: Current Plan + Elite Upgrade --- */
          <View>
            {/* Current Plan Acknowledgment */}
            <Animated.View entering={FadeIn.delay(350).duration(400)} style={styles.currentPlanBanner}>
              <LinearGradient
                colors={PremiumColors.gradients.primary as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.currentPlanGradient}
              >
                <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
                <Text style={styles.currentPlanText}>You're on Premium</Text>
              </LinearGradient>
            </Animated.View>

            {/* Elite Upgrade Card */}
            <StaggeredItem index={0} delay="slow" direction="up" style={styles.cardContainer}>
              <PlanCard
                plan={ELITE_PLAN}
                isRecommended
                isCurrent={false}
                billingPeriod={billingPeriod}
                onUpgrade={() => handleUpgrade(ELITE_PLAN)}
                isProcessing={isProcessing && processingTier === 'elite'}
                disabled={isProcessing || loadingPackages}
              />
            </StaggeredItem>
          </View>
        ) : (
          /* --- Free User: Both Plan Cards --- */
          <View>
            <StaggeredItem index={0} delay="slow" direction="up" style={styles.cardContainer}>
              <PlanCard
                plan={PREMIUM_PLAN}
                isCurrent={false}
                billingPeriod={billingPeriod}
                onUpgrade={() => handleUpgrade(PREMIUM_PLAN)}
                isProcessing={isProcessing && processingTier === 'premium'}
                disabled={isProcessing || loadingPackages}
              />
            </StaggeredItem>

            <StaggeredItem index={1} delay="slow" direction="up" style={styles.cardContainer}>
              <PlanCard
                plan={ELITE_PLAN}
                isRecommended
                isCurrent={false}
                billingPeriod={billingPeriod}
                onUpgrade={() => handleUpgrade(ELITE_PLAN)}
                isProcessing={isProcessing && processingTier === 'elite'}
                disabled={isProcessing || loadingPackages}
              />
            </StaggeredItem>
          </View>
        )}

        {/* ============================================ */}
        {/* NORA AI SHOWCASE (non-elite users) */}
        {/* ============================================ */}
        {!isEliteUser && (
          <View style={styles.sectionPadding}>
            <NoraShowcase onUpgradeToElite={() => handleUpgrade(ELITE_PLAN)} />
          </View>
        )}

        {/* ============================================ */}
        {/* FEATURE COMPARISON TABLE (non-elite users) */}
        {/* ============================================ */}
        {!isEliteUser && (
          <View style={styles.sectionPadding}>
            <FeatureComparisonTable />
          </View>
        )}

        {/* ============================================ */}
        {/* SOCIAL PROOF */}
        {/* ============================================ */}
        <SocialProofBar />

        {/* ============================================ */}
        {/* RESTORE + LEGAL FOOTER */}
        {/* ============================================ */}
        <Animated.View entering={FadeIn.delay(1000).duration(300)} style={styles.footer}>
          <Animated.View style={styles.restoreButton}>
            <Ionicons
              name="refresh"
              size={16}
              color={theme.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[styles.restoreText, { color: theme.textSecondary }]}
              onPress={handleRestorePurchases}
            >
              {isRestoring ? 'Restoring...' : 'Restore Purchases'}
            </Text>
          </Animated.View>
          <Text style={[styles.legalText, { color: theme.textSecondary }]}>
            Subscriptions auto-renew until canceled.{'\n'}Cancel anytime in your device settings.
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.h2,
  },
  scrollContent: {
    paddingBottom: 60,
  },

  // Hero
  heroGradient: {
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  heroTitle: {
    ...Typography.display,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  heroSubtitle: {
    ...Typography.body,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    maxWidth: 300,
  },

  // Card containers
  cardContainer: {
    paddingHorizontal: Spacing.lg,
  },
  sectionPadding: {
    paddingHorizontal: Spacing.lg,
  },

  // Current Plan Banner (Premium users)
  currentPlanBanner: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  currentPlanGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  currentPlanText: {
    color: '#FFFFFF',
    ...Typography.h3,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  restoreText: {
    ...Typography.bodySmall,
    fontWeight: '500',
  },
  legalText: {
    ...Typography.caption,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 300,
  },
});

export default SubscriptionScreen;
