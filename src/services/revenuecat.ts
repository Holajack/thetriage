/**
 * RevenueCat Integration Service for HikeWise
 *
 * Handles subscription management for iOS and Android in-app purchases.
 * Syncs subscription status with Convex users table.
 * Supports RevenueCat Paywall and Customer Center via react-native-purchases-ui.
 *
 * Setup:
 * 1. npx expo install react-native-purchases react-native-purchases-ui
 * 2. Configure products/entitlements/offerings in RevenueCat dashboard
 * 3. Set EXPO_PUBLIC_REVENUECAT_IOS_KEY in .env.local
 * 4. Create products in App Store Connect / Google Play Console
 * 5. Build with EAS (Expo Go doesn't support native IAP modules)
 */

import { Platform } from "react-native";
import Purchases, {
  PurchasesPackage,
  CustomerInfo,
  PurchasesOffering,
  LOG_LEVEL,
} from "react-native-purchases";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";
import { api } from "../../convex/_generated/api";
import { getConvexClient } from "../utils/convexClient";

// ============================================
// CONFIGURATION
// ============================================

const REVENUECAT_API_KEYS = {
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || "",
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || "",
};

// Product identifiers — match these in RevenueCat dashboard & App Store Connect.
// Tiers: basic (app functionality) < pro (+ Patrick AI) < elite (+ Nora AI).
// All products should carry a 7-day free intro offer.
const PRODUCT_IDS = {
  BASIC_MONTHLY: "hikewise_basic_monthly",
  BASIC_YEARLY: "hikewise_basic_yearly",
  PRO_MONTHLY: "hikewise_pro_monthly",
  PRO_YEARLY: "hikewise_pro_yearly",
  ELITE_MONTHLY: "hikewise_elite_monthly",
  ELITE_YEARLY: "hikewise_elite_yearly",
};

// Entitlement identifiers — configure in RevenueCat dashboard.
// "premium" is the legacy entitlement name and maps to pro.
const ENTITLEMENTS = {
  BASIC: "basic",
  PRO: "pro",
  ELITE: "elite",
  LEGACY_PREMIUM: "premium",
};

export type RcTier = "free" | "basic" | "pro" | "elite";

let isInitialized = false;

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize RevenueCat SDK.
 * Call once at app startup. Pass Clerk userId to link purchases cross-platform.
 */
export async function initRevenueCat(userId?: string): Promise<void> {
  if (isInitialized) {
    return;
  }

  const apiKey =
    Platform.OS === "ios"
      ? REVENUECAT_API_KEYS.ios
      : REVENUECAT_API_KEYS.android;

  if (!apiKey) {
    return;
  }

  try {
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }

    await Purchases.configure({
      apiKey,
      appUserID: userId,
    });

    isInitialized = true;

    Purchases.addCustomerInfoUpdateListener(handleCustomerInfoUpdate);
  } catch (error) {
    throw error;
  }
}

/** Returns whether the SDK has been initialized */
export function isRevenueCatInitialized(): boolean {
  return isInitialized;
}

// ============================================
// CUSTOMER INFO & TIER RESOLUTION
// ============================================

async function handleCustomerInfoUpdate(
  customerInfo: CustomerInfo,
): Promise<void> {
  const tier = getSubscriptionTierFromCustomerInfo(customerInfo);
  await syncSubscriptionToConvex(tier);
}

function getSubscriptionTierFromCustomerInfo(
  customerInfo: CustomerInfo,
): RcTier {
  const activeEntitlements = customerInfo.entitlements.active;

  // Check highest tier first
  if (activeEntitlements[ENTITLEMENTS.ELITE]?.isActive) {
    return "elite";
  }
  if (
    activeEntitlements[ENTITLEMENTS.PRO]?.isActive ||
    activeEntitlements[ENTITLEMENTS.LEGACY_PREMIUM]?.isActive
  ) {
    return "pro";
  }
  if (activeEntitlements[ENTITLEMENTS.BASIC]?.isActive) {
    return "basic";
  }
  return "free";
}

async function syncSubscriptionToConvex(tier: RcTier): Promise<void> {
  try {
    const client = getConvexClient();
    await client.mutation(api.users.updateMySubscription, {
      subscriptionTier: tier,
    });
  } catch (error) {
    // Sync error — will retry on next customer info update
  }
}

/** Get current customer info */
async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    return await Purchases.getCustomerInfo();
  } catch (error) {
    return null;
  }
}

/** Get current subscription tier */
export async function getCurrentTier(): Promise<RcTier> {
  const customerInfo = await getCustomerInfo();
  if (!customerInfo) return "free";
  return getSubscriptionTierFromCustomerInfo(customerInfo);
}

/** Check if user has any active subscription */
async function hasActiveSubscription(): Promise<boolean> {
  const tier = await getCurrentTier();
  return tier !== "free";
}

/** Check if user has a specific entitlement */
async function hasEntitlement(entitlementId: string): Promise<boolean> {
  const customerInfo = await getCustomerInfo();
  if (!customerInfo) return false;
  return customerInfo.entitlements.active[entitlementId]?.isActive === true;
}

// ============================================
// OFFERINGS & PACKAGES
// ============================================

/** Get the current offering configured in RevenueCat dashboard */
async function getOfferings(): Promise<PurchasesOffering | null> {
  try {
    const offerings = await Purchases.getOfferings();
    if (offerings.current) {
      return offerings.current;
    }
    return null;
  } catch (error) {
    throw error;
  }
}

/** Get available packages from the current offering */
export async function getAvailablePackages(): Promise<PurchasesPackage[]> {
  const offering = await getOfferings();
  return offering?.availablePackages || [];
}

// ============================================
// PURCHASING
// ============================================

/** Purchase a subscription package */
export async function purchasePackage(
  pkg: PurchasesPackage,
): Promise<{ success: boolean; customerInfo?: CustomerInfo; error?: string }> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const tier = getSubscriptionTierFromCustomerInfo(customerInfo);

    if (tier !== "free") {
      await syncSubscriptionToConvex(tier);
      return { success: true, customerInfo };
    }
    return {
      success: false,
      error: "Purchase completed but no active entitlement",
    };
  } catch (error: any) {
    if (error.userCancelled) {
      return { success: false, error: "cancelled" };
    }
    return { success: false, error: error.message || "Purchase failed" };
  }
}

/** Restore previous purchases (reinstall / device switch) */
export async function restorePurchases(): Promise<{
  success: boolean;
  tier: RcTier;
  error?: string;
}> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    const tier = getSubscriptionTierFromCustomerInfo(customerInfo);
    await syncSubscriptionToConvex(tier);
    return { success: true, tier };
  } catch (error: any) {
    return { success: false, tier: "free", error: error.message };
  }
}

// ============================================
// PAYWALL (react-native-purchases-ui)
// ============================================

/**
 * Present the RevenueCat Paywall modal.
 * Returns true if user purchased or restored, false otherwise.
 */
export async function presentPaywall(
  offering?: PurchasesOffering,
): Promise<boolean> {
  try {
    const options: any = {};
    if (offering) {
      options.offering = offering;
    }

    const result: PAYWALL_RESULT = await RevenueCatUI.presentPaywall(options);

    switch (result) {
      case PAYWALL_RESULT.PURCHASED:
      case PAYWALL_RESULT.RESTORED:
        // Sync tier after paywall purchase/restore
        const tier = await getCurrentTier();
        await syncSubscriptionToConvex(tier);
        return true;
      case PAYWALL_RESULT.CANCELLED:
        return false;
      case PAYWALL_RESULT.NOT_PRESENTED:
        return false;
      case PAYWALL_RESULT.ERROR:
        return false;
      default:
        return false;
    }
  } catch (error) {
    return false;
  }
}

/**
 * Present the Paywall only if the user does NOT have the given entitlement.
 * Useful for gating premium features inline.
 */
async function presentPaywallIfNeeded(
  requiredEntitlement: string = ENTITLEMENTS.PRO,
  offering?: PurchasesOffering,
): Promise<boolean> {
  try {
    const options: any = { requiredEntitlementIdentifier: requiredEntitlement };
    if (offering) {
      options.offering = offering;
    }

    const result: PAYWALL_RESULT =
      await RevenueCatUI.presentPaywallIfNeeded(options);

    switch (result) {
      case PAYWALL_RESULT.PURCHASED:
      case PAYWALL_RESULT.RESTORED:
        const tier = await getCurrentTier();
        await syncSubscriptionToConvex(tier);
        return true;
      case PAYWALL_RESULT.NOT_PRESENTED:
        // User already has the entitlement
        return true;
      default:
        return false;
    }
  } catch (error) {
    return false;
  }
}

// ============================================
// CUSTOMER CENTER (react-native-purchases-ui)
// ============================================

/**
 * Present the RevenueCat Customer Center for self-service subscription management.
 * Allows users to cancel, request refunds, or restore purchases.
 */
export async function presentCustomerCenter(): Promise<void> {
  try {
    await RevenueCatUI.presentCustomerCenter({
      callbacks: {
        onRestoreCompleted: ({
          customerInfo,
        }: {
          customerInfo: CustomerInfo;
        }) => {
          const tier = getSubscriptionTierFromCustomerInfo(customerInfo);
          syncSubscriptionToConvex(tier);
        },
        onRestoreFailed: ({ error }: { error: any }) => {
          // Restore failed — user can retry from Customer Center
        },
      },
    });
  } catch (error) {
    // Customer Center presentation failed
  }
}

// ============================================
// USER IDENTITY
// ============================================

/** Identify user with RevenueCat (call on sign-in) */
export async function identifyUser(userId: string): Promise<void> {
  try {
    await Purchases.logIn(userId);

    const customerInfo = await getCustomerInfo();
    if (customerInfo) {
      const tier = getSubscriptionTierFromCustomerInfo(customerInfo);
      await syncSubscriptionToConvex(tier);
    }
  } catch (error) {
    // Identification failed — purchases will be anonymous
  }
}

/** Log user out from RevenueCat (call on sign-out) */
export async function logOutRevenueCat(): Promise<void> {
  try {
    await Purchases.logOut();
    isInitialized = false;
  } catch (error) {
    // Logout failed
  }
}

/** Get management URL for native subscription management */
export async function getManagementURL(): Promise<string | null> {
  try {
    const customerInfo = await getCustomerInfo();
    return customerInfo?.managementURL || null;
  } catch (error) {
    return null;
  }
}

// Export types for use in components
export type { PurchasesPackage, CustomerInfo, PurchasesOffering };
