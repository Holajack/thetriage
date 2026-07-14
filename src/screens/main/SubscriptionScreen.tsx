import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp, FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../../context/ThemeContext";
import {
  Typography,
  Spacing,
  BorderRadius,
  PremiumColors,
  Shadows,
} from "../../theme/premiumTheme";
import { StaggeredItem } from "../../components/premium/StaggeredList";
import { normalizeTier, tierLevel } from "../../utils/tierGating";

// Sub-components
import BillingToggle, { BillingPeriod } from "./subscription/BillingToggle";
import PlanCard, { PlanTier } from "./subscription/PlanCard";
import NoraShowcase from "./subscription/NoraShowcase";
import FeatureComparisonTable from "./subscription/FeatureComparisonTable";
// SocialProofBar removed — no real stats to show yet
import EliteCelebrationView from "./subscription/EliteCelebrationView";

import {
  getAvailablePackages,
  purchasePackage,
  restorePurchases,
  getCurrentTier,
  getManagementURL,
  presentPaywall,
  presentCustomerCenter,
  isRevenueCatInitialized,
  PurchasesPackage,
} from "../../services/revenuecat";
import { useConvexProfile } from "../../hooks/useConvex";

// ============================================
// PLAN DATA
// ============================================

const BASIC_PLAN: PlanTier = {
  name: "Basic",
  tier: "basic",
  monthlyPrice: 2.99,
  annualPrice: 28.99,
  annualMonthlyEquivalent: 2.41,
  badge: undefined,
  tagline: "Get started with the essentials",
  features: [
    { text: "Forest trail", included: true },
    { text: "Default theme", included: true },
    { text: "Bear trail buddy", included: true },
    { text: "Lo-Fi sound album", included: true },
    { text: "Patrick AI Study Coach", included: true, highlight: true },
    { text: "Basecamp Focus Mode", included: true },
    { text: "Basic session history", included: true },
    { text: "Leaderboard access", included: true },
  ],
  gradient: ["#22C55E", "#16A34A"],
};

const PRO_PLAN: PlanTier = {
  name: "Pro",
  tier: "pro",
  monthlyPrice: 14.99,
  annualPrice: 143.99,
  annualMonthlyEquivalent: 11.99,
  badge: "Most Popular",
  tagline: "Level up your study sessions",
  features: [
    {
      text: "Patrick AI (higher daily limit)",
      included: true,
      highlight: true,
    },
    { text: "Forest, Beach & Jungle trails", included: true },
    { text: "All themes", included: true },
    { text: "Pro-level trail buddies", included: true },
    { text: "Pro sound albums", included: true },
    { text: "Summit Focus Mode", included: true },
    { text: "Up to 2 Study Rooms", included: true },
    { text: "Community messaging", included: true },
    { text: "Brain Mapping (limited)", included: true },
    { text: "Self-Discovery Quizzes (Quick)", included: true },
  ],
  gradient: PremiumColors.gradients.primary,
};

const ELITE_PLAN: PlanTier = {
  name: "Elite",
  tier: "elite",
  monthlyPrice: 29.99,
  annualPrice: 287.99,
  annualMonthlyEquivalent: 23.99,
  badge: "Best Value",
  tagline: "The ultimate study companion with Nora AI",
  features: [
    { text: "Everything in Pro", included: true },
    {
      text: "Nora Advanced AI Study Assistant",
      included: true,
      highlight: true,
    },
    {
      text: "Voice Interaction & PDF Analysis",
      included: true,
      highlight: true,
    },
    { text: "All sound albums & themes", included: true },
    { text: "Exclusive Lion trail buddy", included: true },
    { text: "Unlimited Study Rooms", included: true },
    { text: "Full Brain Mapping", included: true },
    { text: "All Bonus Quizzes (incl. In-Depth)", included: true },
    { text: "AI Insights & Personalized Plans", included: true },
    { text: "Elite Badge & Name Color", included: true },
    { text: "Early Access to New Features", included: true },
    { text: "Exclusive in-app gift with purchase", included: true },
  ],
  gradient: PremiumColors.gradients.premium,
};

// RevenueCat product identifiers — match these in App Store Connect
const PLAN_PRODUCTS: Record<string, Record<BillingPeriod, string[]>> = {
  basic: {
    monthly: ["hikewise_basic_monthly"],
    annual: ["hikewise_basic_yearly"],
  },
  // Legacy "premium" product ids kept as fallback until the dashboard
  // catalog is fully migrated to the pro naming.
  pro: {
    monthly: ["hikewise_pro_monthly", "hikewise_premium_monthly"],
    annual: ["hikewise_pro_yearly", "hikewise_premium_yearly"],
  },
  elite: {
    monthly: ["hikewise_elite_monthly"],
    annual: ["hikewise_elite_yearly"],
  },
};

// Map plan tier + billing period to the correct RevenueCat package
function findPackageForPlan(
  packages: PurchasesPackage[],
  tier: string,
  period: BillingPeriod,
): PurchasesPackage | undefined {
  const productIds =
    PLAN_PRODUCTS[tier]?.[period === "monthly" ? "monthly" : "annual"] ?? [];
  for (const productId of productIds) {
    const match = packages.find((pkg) => pkg.product.identifier === productId);
    if (match) return match;
  }
  return undefined;
}

// ============================================
// SUBSCRIPTION SCREEN
// ============================================

const SubscriptionScreen = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const { profile } = useConvexProfile();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");
  const [currentTier, setCurrentTier] = useState<
    "free" | "basic" | "pro" | "elite"
  >("free");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingTier, setProcessingTier] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);

  // Load current subscription tier and available packages
  useEffect(() => {
    const loadSubscriptionData = async () => {
      try {
        setLoadingPackages(true);

        let resolvedTier: "free" | "basic" | "pro" | "elite" = "free";

        if (isRevenueCatInitialized()) {
          const [rcTier, availablePackages] = await Promise.all([
            getCurrentTier(),
            getAvailablePackages(),
          ]);
          resolvedTier = rcTier;
          setPackages(availablePackages);
        }

        const convexTier = normalizeTier(
          profile?.subscriptionTier as string | undefined,
        );
        if (tierLevel(convexTier) > tierLevel(resolvedTier)) {
          resolvedTier = convexTier;
        }

        setCurrentTier(resolvedTier);
      } catch {
        setCurrentTier("free");
      } finally {
        setLoadingPackages(false);
      }
    };
    loadSubscriptionData();
  }, [profile?.subscriptionTier]);

  // Present RevenueCat Paywall (recommended approach)
  const handlePresentPaywall = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const purchased = await presentPaywall();
    if (purchased) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const tier = await getCurrentTier();
      setCurrentTier(tier);
    }
  }, []);

  const handleUpgrade = useCallback(
    async (plan: PlanTier) => {
      setIsProcessing(true);
      setProcessingTier(plan.tier);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      try {
        // Try to find the matching RevenueCat package
        const pkg = findPackageForPlan(packages, plan.tier, billingPeriod);

        if (pkg) {
          // Use RevenueCat native purchase flow
          const result = await purchasePackage(pkg);
          if (result.success) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert(
              "Welcome to " + plan.name + "!",
              `You now have full ${plan.name} access.`,
              [{ text: "OK" }],
            );
            setCurrentTier(plan.tier);
          } else if (result.error !== "cancelled") {
            Alert.alert("Purchase Failed", result.error || "Please try again.");
          }
        } else {
          // No packages available yet — present RevenueCat Paywall instead
          const purchased = await presentPaywall();
          if (purchased) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            const tier = await getCurrentTier();
            setCurrentTier(tier);
          }
        }
      } catch (error) {
        // Purchase error
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Error", "An unexpected error occurred. Please try again.");
      } finally {
        setIsProcessing(false);
        setProcessingTier(null);
      }
    },
    [billingPeriod, packages],
  );

  const handleRestorePurchases = useCallback(async () => {
    setIsRestoring(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const result = await restorePurchases();
      if (result.success && result.tier !== "free") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          "Purchases Restored",
          `Your ${result.tier} subscription has been restored.`,
          [{ text: "OK" }],
        );
        setCurrentTier(result.tier);
      } else if (result.tier === "free") {
        Alert.alert(
          "No Purchases Found",
          "No previous purchases were found to restore.",
        );
      } else {
        Alert.alert(
          "Restore Failed",
          result.error || "Could not restore purchases.",
        );
      }
    } catch (error) {
      // Restore error
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setIsRestoring(false);
    }
  }, []);

  const handleManageSubscription = useCallback(async () => {
    // Try RevenueCat Customer Center first (self-service UI)
    try {
      await presentCustomerCenter();
      // Refresh tier after customer center interaction
      const tier = await getCurrentTier();
      setCurrentTier(tier);
    } catch {
      // Fallback: open native management URL
      const url = await getManagementURL();
      if (url) {
        const { Linking } = require("react-native");
        Linking.openURL(url);
      } else {
        Alert.alert(
          "Manage Subscription",
          "Please manage your subscription in your device Settings > Subscriptions.",
        );
      }
    }
  }, []);

  const isEliteUser = currentTier === "elite";
  const isProUser = currentTier === "pro";
  const isFreeUser = currentTier === "free";

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={theme.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Subscription
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ============================================ */}
        {/* HERO HEADER WITH IMAGE */}
        {/* ============================================ */}
        <Animated.View entering={FadeInUp.delay(100).duration(500)}>
          <View style={styles.heroContainer}>
            <Image
              source={require("../../../assets/examples/settings_image.png")}
              style={styles.heroImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={[
                "rgba(0,0,0,0.1)",
                "rgba(0,0,0,0.55)",
                "rgba(0,0,0,0.85)",
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.heroOverlay}
            />
            <View style={styles.heroContent}>
              <Ionicons
                name="diamond-outline"
                size={36}
                color="rgba(255,255,255,0.9)"
              />
              <Text style={styles.heroTitle}>
                {isEliteUser ? "Elite Member" : "Unlock Your\nFull Potential"}
              </Text>
              <Text style={styles.heroSubtitle}>
                {isEliteUser
                  ? "You have access to everything"
                  : isProUser
                    ? "Upgrade to Elite for Nora AI and more"
                    : "Choose the plan that fits your study goals"}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* ============================================ */}
        {/* CURRENT PLAN CARD                              */}
        {/* ============================================ */}
        <StaggeredItem index={0} direction="up">
          <View
            style={[
              styles.currentPlanCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <View style={styles.currentPlanRow}>
              <View style={styles.currentPlanIcon}>
                <Ionicons
                  name={
                    isEliteUser
                      ? "diamond"
                      : isProUser
                        ? "star"
                        : "leaf-outline"
                  }
                  size={22}
                  color={
                    isEliteUser
                      ? "#FFD24A"
                      : isProUser
                        ? "#7B61FF"
                        : theme.primary
                  }
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.currentPlanLabel,
                    { color: theme.textSecondary },
                  ]}
                >
                  YOUR CURRENT PLAN
                </Text>
                <Text style={[styles.currentPlanTier, { color: theme.text }]}>
                  {isEliteUser
                    ? "Elite"
                    : isProUser
                      ? "Premium"
                      : currentTier === "basic"
                        ? "Basic"
                        : "Free"}
                </Text>
              </View>
              {!isFreeUser && (
                <TouchableOpacity
                  onPress={handleManageSubscription}
                  style={styles.currentPlanManage}
                >
                  <Text
                    style={[
                      styles.currentPlanManageText,
                      { color: theme.primary },
                    ]}
                  >
                    Manage
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </StaggeredItem>

        {/* ============================================ */}
        {/* BILLING TOGGLE (non-elite users) */}
        {/* ============================================ */}
        {!isEliteUser && (
          <BillingToggle
            billingPeriod={billingPeriod}
            onToggle={setBillingPeriod}
            savingsPercent={20}
          />
        )}

        {/* ============================================ */}
        {/* TIER-ADAPTIVE CONTENT */}
        {/* ============================================ */}
        {isEliteUser ? (
          /* --- Elite User: Celebration View --- */
          <StaggeredItem index={0} delay="slow" direction="up">
            <EliteCelebrationView
              onManageSubscription={handleManageSubscription}
            />
          </StaggeredItem>
        ) : isProUser ? (
          /* --- Premium User: Current Plan + Elite Upgrade --- */
          <View>
            {/* Current Plan Acknowledgment */}
            <Animated.View
              entering={FadeIn.delay(350).duration(400)}
              style={styles.currentPlanBanner}
            >
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
            <StaggeredItem
              index={0}
              delay="slow"
              direction="up"
              style={styles.cardContainer}
            >
              <PlanCard
                plan={ELITE_PLAN}
                isRecommended
                isCurrent={false}
                billingPeriod={billingPeriod}
                onUpgrade={() => handleUpgrade(ELITE_PLAN)}
                isProcessing={isProcessing && processingTier === "elite"}
                disabled={isProcessing || loadingPackages}
              />
            </StaggeredItem>
          </View>
        ) : (
          /* --- Free/Basic User: All Plan Cards --- */
          <View>
            <StaggeredItem
              index={0}
              delay="slow"
              direction="up"
              style={styles.cardContainer}
            >
              <PlanCard
                plan={BASIC_PLAN}
                isCurrent={currentTier === "basic"}
                billingPeriod={billingPeriod}
                onUpgrade={() => handleUpgrade(BASIC_PLAN)}
                isProcessing={isProcessing && processingTier === "basic"}
                disabled={isProcessing || loadingPackages}
              />
            </StaggeredItem>

            <StaggeredItem
              index={1}
              delay="slow"
              direction="up"
              style={styles.cardContainer}
            >
              <PlanCard
                plan={PRO_PLAN}
                isCurrent={false}
                billingPeriod={billingPeriod}
                onUpgrade={() => handleUpgrade(PRO_PLAN)}
                isProcessing={isProcessing && processingTier === "pro"}
                disabled={isProcessing || loadingPackages}
              />
            </StaggeredItem>

            <StaggeredItem
              index={2}
              delay="slow"
              direction="up"
              style={styles.cardContainer}
            >
              <PlanCard
                plan={ELITE_PLAN}
                isRecommended
                isCurrent={false}
                billingPeriod={billingPeriod}
                onUpgrade={() => handleUpgrade(ELITE_PLAN)}
                isProcessing={isProcessing && processingTier === "elite"}
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

        {/* Social proof removed — no real stats yet */}

        {/* ============================================ */}
        {/* RESTORE + LEGAL FOOTER */}
        {/* ============================================ */}
        <Animated.View
          entering={FadeIn.delay(1000).duration(300)}
          style={styles.footer}
        >
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
              {isRestoring ? "Restoring..." : "Restore Purchases"}
            </Text>
          </Animated.View>
          <Text style={[styles.legalText, { color: theme.textSecondary }]}>
            Subscriptions auto-renew until canceled.{"\n"}Cancel anytime in your
            device settings.
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    ...Typography.h2,
  },
  scrollContent: {
    paddingBottom: 60,
  },

  // Current Plan card
  currentPlanCard: {
    marginHorizontal: Spacing.md,
    marginTop: -Spacing.md,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    ...Shadows.sm,
  },
  currentPlanRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  currentPlanIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,210,74,0.12)",
  },
  currentPlanLabel: {
    ...Typography.caption,
    fontWeight: "600",
    letterSpacing: 0.6,
    fontSize: 11,
  },
  currentPlanTier: {
    ...Typography.h3,
    marginTop: 2,
  },
  currentPlanManage: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
  },
  currentPlanManageText: {
    ...Typography.bodySmall,
    fontWeight: "600",
  },

  // Hero with image
  heroContainer: {
    height: 260,
    position: "relative",
    overflow: "hidden",
    marginBottom: Spacing.lg,
  },
  heroImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  heroOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    alignItems: "center",
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 40,
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  heroSubtitle: {
    ...Typography.body,
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    maxWidth: 300,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
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
    overflow: "hidden",
  },
  currentPlanGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  currentPlanText: {
    color: "#FFFFFF",
    ...Typography.h3,
  },

  // Footer
  footer: {
    alignItems: "center",
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  restoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  restoreText: {
    ...Typography.bodySmall,
    fontWeight: "500",
  },
  legalText: {
    ...Typography.caption,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 300,
  },
});

export default SubscriptionScreen;
