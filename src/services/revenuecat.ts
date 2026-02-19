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

import { Platform } from 'react-native';
import Purchases, {
  PurchasesPackage,
  CustomerInfo,
  PurchasesOffering,
  LOG_LEVEL,
} from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { ConvexReactClient } from "convex/react";
import { api } from "../../convex/_generated/api";

// ============================================
// CONVEX CLIENT
// ============================================

let _convexClient: ConvexReactClient | null = null;

export function setConvexClient(client: ConvexReactClient) {
  _convexClient = client;
}

function getClient(): ConvexReactClient | null {
  return _convexClient;
}

// ============================================
// CONFIGURATION
// ============================================

const REVENUECAT_API_KEYS = {
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || '',
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || '',
};

// Product identifiers — match these in RevenueCat dashboard & App Store Connect
export const PRODUCT_IDS = {
  PREMIUM_MONTHLY: 'hikewise_premium_monthly',   // $14.99/mo
  ELITE_MONTHLY: 'hikewise_elite_monthly',       // $29.99/mo
  PREMIUM_YEARLY: 'hikewise_premium_yearly',     // $107.99/yr ($8.99/mo)
  ELITE_YEARLY: 'hikewise_elite_yearly',         // $215.99/yr ($17.99/mo)
};

// Entitlement identifiers — configure in RevenueCat dashboard
export const ENTITLEMENTS = {
  PREMIUM: 'premium',
  ELITE: 'elite',
};

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
    console.log('[RevenueCat] Already initialized');
    return;
  }

  const apiKey = Platform.OS === 'ios'
    ? REVENUECAT_API_KEYS.ios
    : REVENUECAT_API_KEYS.android;

  if (!apiKey) {
    console.warn('[RevenueCat] No API key configured for', Platform.OS);
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
    console.log('[RevenueCat] Initialized successfully');

    Purchases.addCustomerInfoUpdateListener(handleCustomerInfoUpdate);
  } catch (error) {
    console.error('[RevenueCat] Initialization failed:', error);
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

async function handleCustomerInfoUpdate(customerInfo: CustomerInfo): Promise<void> {
  console.log('[RevenueCat] Customer info updated');
  const tier = getSubscriptionTierFromCustomerInfo(customerInfo);
  await syncSubscriptionToConvex(tier);
}

function getSubscriptionTierFromCustomerInfo(
  customerInfo: CustomerInfo
): 'free' | 'premium' | 'elite' {
  const activeEntitlements = customerInfo.entitlements.active;

  // Check highest tier first
  if (activeEntitlements[ENTITLEMENTS.ELITE]?.isActive) {
    return 'elite';
  }
  if (activeEntitlements[ENTITLEMENTS.PREMIUM]?.isActive) {
    return 'premium';
  }
  return 'free';
}

async function syncSubscriptionToConvex(
  tier: 'free' | 'premium' | 'elite'
): Promise<void> {
  try {
    const client = getClient();
    if (!client) {
      console.log('[RevenueCat] Convex client not set, skipping sync');
      return;
    }
    await client.mutation(api.users.updateMySubscription, {
      subscriptionTier: tier,
    });
    console.log(`[RevenueCat] Synced tier to Convex: ${tier}`);
  } catch (error) {
    console.error('[RevenueCat] Error syncing to Convex:', error);
  }
}

/** Get current customer info */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    return await Purchases.getCustomerInfo();
  } catch (error) {
    console.error('[RevenueCat] Failed to get customer info:', error);
    return null;
  }
}

/** Get current subscription tier */
export async function getCurrentTier(): Promise<'free' | 'premium' | 'elite'> {
  const customerInfo = await getCustomerInfo();
  if (!customerInfo) return 'free';
  return getSubscriptionTierFromCustomerInfo(customerInfo);
}

/** Check if user has any active subscription */
export async function hasActiveSubscription(): Promise<boolean> {
  const tier = await getCurrentTier();
  return tier !== 'free';
}

/** Check if user has a specific entitlement */
export async function hasEntitlement(entitlementId: string): Promise<boolean> {
  const customerInfo = await getCustomerInfo();
  if (!customerInfo) return false;
  return customerInfo.entitlements.active[entitlementId]?.isActive === true;
}

// ============================================
// OFFERINGS & PACKAGES
// ============================================

/** Get the current offering configured in RevenueCat dashboard */
export async function getOfferings(): Promise<PurchasesOffering | null> {
  try {
    const offerings = await Purchases.getOfferings();
    if (offerings.current) {
      console.log('[RevenueCat] Current offering:', offerings.current.identifier);
      return offerings.current;
    }
    console.log('[RevenueCat] No current offering available');
    return null;
  } catch (error) {
    console.error('[RevenueCat] Failed to get offerings:', error);
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
  pkg: PurchasesPackage
): Promise<{ success: boolean; customerInfo?: CustomerInfo; error?: string }> {
  try {
    console.log('[RevenueCat] Purchasing package:', pkg.identifier);
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const tier = getSubscriptionTierFromCustomerInfo(customerInfo);

    if (tier !== 'free') {
      console.log('[RevenueCat] Purchase successful, tier:', tier);
      await syncSubscriptionToConvex(tier);
      return { success: true, customerInfo };
    }
    return { success: false, error: 'Purchase completed but no active entitlement' };
  } catch (error: any) {
    if (error.userCancelled) {
      console.log('[RevenueCat] User cancelled purchase');
      return { success: false, error: 'cancelled' };
    }
    console.error('[RevenueCat] Purchase failed:', error);
    return { success: false, error: error.message || 'Purchase failed' };
  }
}

/** Restore previous purchases (reinstall / device switch) */
export async function restorePurchases(): Promise<{
  success: boolean;
  tier: 'free' | 'premium' | 'elite';
  error?: string;
}> {
  try {
    console.log('[RevenueCat] Restoring purchases...');
    const customerInfo = await Purchases.restorePurchases();
    const tier = getSubscriptionTierFromCustomerInfo(customerInfo);
    await syncSubscriptionToConvex(tier);
    console.log('[RevenueCat] Restored tier:', tier);
    return { success: true, tier };
  } catch (error: any) {
    console.error('[RevenueCat] Restore failed:', error);
    return { success: false, tier: 'free', error: error.message };
  }
}

// ============================================
// PAYWALL (react-native-purchases-ui)
// ============================================

/**
 * Present the RevenueCat Paywall modal.
 * Returns true if user purchased or restored, false otherwise.
 */
export async function presentPaywall(offering?: PurchasesOffering): Promise<boolean> {
  try {
    const options: any = {};
    if (offering) {
      options.offering = offering;
    }

    const result: PAYWALL_RESULT = await RevenueCatUI.presentPaywall(options);

    switch (result) {
      case PAYWALL_RESULT.PURCHASED:
      case PAYWALL_RESULT.RESTORED:
        console.log('[RevenueCat] Paywall result:', result);
        // Sync tier after paywall purchase/restore
        const tier = await getCurrentTier();
        await syncSubscriptionToConvex(tier);
        return true;
      case PAYWALL_RESULT.CANCELLED:
        console.log('[RevenueCat] Paywall cancelled');
        return false;
      case PAYWALL_RESULT.NOT_PRESENTED:
        console.log('[RevenueCat] Paywall not presented');
        return false;
      case PAYWALL_RESULT.ERROR:
        console.error('[RevenueCat] Paywall error');
        return false;
      default:
        return false;
    }
  } catch (error) {
    console.error('[RevenueCat] Failed to present paywall:', error);
    return false;
  }
}

/**
 * Present the Paywall only if the user does NOT have the given entitlement.
 * Useful for gating premium features inline.
 */
export async function presentPaywallIfNeeded(
  requiredEntitlement: string = ENTITLEMENTS.PREMIUM,
  offering?: PurchasesOffering
): Promise<boolean> {
  try {
    const options: any = { requiredEntitlementIdentifier: requiredEntitlement };
    if (offering) {
      options.offering = offering;
    }

    const result: PAYWALL_RESULT = await RevenueCatUI.presentPaywallIfNeeded(options);

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
    console.error('[RevenueCat] Failed to present paywall if needed:', error);
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
        onRestoreCompleted: ({ customerInfo }: { customerInfo: CustomerInfo }) => {
          const tier = getSubscriptionTierFromCustomerInfo(customerInfo);
          syncSubscriptionToConvex(tier);
          console.log('[RevenueCat] Customer Center: restore completed, tier:', tier);
        },
        onRestoreFailed: ({ error }: { error: any }) => {
          console.error('[RevenueCat] Customer Center: restore failed:', error);
        },
      },
    });
    console.log('[RevenueCat] Customer Center dismissed');
  } catch (error) {
    console.error('[RevenueCat] Failed to present Customer Center:', error);
  }
}

// ============================================
// USER IDENTITY
// ============================================

/** Identify user with RevenueCat (call on sign-in) */
export async function identifyUser(userId: string): Promise<void> {
  try {
    await Purchases.logIn(userId);
    console.log('[RevenueCat] User identified:', userId);

    const customerInfo = await getCustomerInfo();
    if (customerInfo) {
      const tier = getSubscriptionTierFromCustomerInfo(customerInfo);
      await syncSubscriptionToConvex(tier);
    }
  } catch (error) {
    console.error('[RevenueCat] Failed to identify user:', error);
  }
}

/** Log user out from RevenueCat (call on sign-out) */
export async function logOutRevenueCat(): Promise<void> {
  try {
    await Purchases.logOut();
    isInitialized = false;
    console.log('[RevenueCat] Logged out');
  } catch (error) {
    console.error('[RevenueCat] Logout failed:', error);
  }
}

/** Get management URL for native subscription management */
export async function getManagementURL(): Promise<string | null> {
  try {
    const customerInfo = await getCustomerInfo();
    return customerInfo?.managementURL || null;
  } catch (error) {
    console.error('[RevenueCat] Failed to get management URL:', error);
    return null;
  }
}

// Export types for use in components
export type { PurchasesPackage, CustomerInfo, PurchasesOffering };
export { PAYWALL_RESULT };
