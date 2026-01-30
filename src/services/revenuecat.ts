/**
 * RevenueCat Integration Service for HikeWise
 *
 * Handles subscription management for iOS and Android in-app purchases.
 * Syncs subscription status with Convex users table.
 *
 * Setup required:
 * 1. npm install react-native-purchases
 * 2. Configure in RevenueCat dashboard
 * 3. Set API keys in environment/secrets
 * 4. Create products in App Store Connect and Google Play Console
 */

import { Platform } from 'react-native';
import Purchases, {
  PurchasesPackage,
  CustomerInfo,
  PurchasesOffering,
  LOG_LEVEL,
} from 'react-native-purchases';
import { ConvexReactClient } from "convex/react";
import { api } from "../../convex/_generated/api";

let _convexClient: ConvexReactClient | null = null;

export function setConvexClient(client: ConvexReactClient) {
  _convexClient = client;
}

function getClient(): ConvexReactClient | null {
  return _convexClient;
}

// RevenueCat API Keys - Replace with your actual keys
// These should ideally come from environment variables
const REVENUECAT_API_KEYS = {
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || 'appl_YOUR_IOS_KEY',
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || 'goog_YOUR_ANDROID_KEY',
};

// Product identifiers matching RevenueCat dashboard
export const PRODUCT_IDS = {
  PREMIUM_MONTHLY: 'hikewise_premium_monthly',
  PRO_MONTHLY: 'hikewise_pro_monthly',
  PREMIUM_YEARLY: 'hikewise_premium_yearly',
  PRO_YEARLY: 'hikewise_pro_yearly',
};

// Entitlement identifiers
export const ENTITLEMENTS = {
  PREMIUM: 'premium',
  PRO: 'pro',
};

// Map RevenueCat entitlements to subscription_tier values
const ENTITLEMENT_TO_TIER: Record<string, 'free' | 'premium' | 'pro'> = {
  [ENTITLEMENTS.PRO]: 'pro',
  [ENTITLEMENTS.PREMIUM]: 'premium',
};

let isInitialized = false;

/**
 * Initialize RevenueCat SDK
 * Call this once at app startup after user authentication
 */
export async function initRevenueCat(userId?: string): Promise<void> {
  if (isInitialized) {
    console.log('[RevenueCat] Already initialized');
    return;
  }

  try {
    // Enable debug logs in development
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }

    const apiKey = Platform.OS === 'ios'
      ? REVENUECAT_API_KEYS.ios
      : REVENUECAT_API_KEYS.android;

    await Purchases.configure({
      apiKey,
      appUserID: userId, // Use Clerk user ID for cross-platform sync
    });

    isInitialized = true;
    console.log('[RevenueCat] Initialized successfully');

    // Set up listener for customer info updates
    Purchases.addCustomerInfoUpdateListener(handleCustomerInfoUpdate);
  } catch (error) {
    console.error('[RevenueCat] Initialization failed:', error);
    throw error;
  }
}

/**
 * Handle customer info updates from RevenueCat
 * Syncs subscription status to Convex
 */
async function handleCustomerInfoUpdate(customerInfo: CustomerInfo): Promise<void> {
  console.log('[RevenueCat] Customer info updated');

  const tier = getSubscriptionTierFromCustomerInfo(customerInfo);
  await syncSubscriptionToConvex(tier);
}

/**
 * Get subscription tier from RevenueCat customer info
 */
function getSubscriptionTierFromCustomerInfo(
  customerInfo: CustomerInfo
): 'free' | 'premium' | 'pro' {
  const activeEntitlements = customerInfo.entitlements.active;

  // Check for highest tier first (pro)
  if (activeEntitlements[ENTITLEMENTS.PRO]?.isActive) {
    return 'pro';
  }

  // Then check for premium
  if (activeEntitlements[ENTITLEMENTS.PREMIUM]?.isActive) {
    return 'premium';
  }

  return 'free';
}

/**
 * Sync subscription tier to Convex
 */
async function syncSubscriptionToConvex(
  tier: 'free' | 'premium' | 'pro'
): Promise<void> {
  try {
    const client = getClient();
    if (!client) {
      console.log('[RevenueCat] Convex client not initialized, skipping sync');
      return;
    }

    await client.mutation(api.users.updateMySubscription, {
      subscriptionTier: tier,
    });

    console.log(`[RevenueCat] Synced subscription tier to Convex: ${tier}`);
  } catch (error) {
    console.error('[RevenueCat] Error syncing to Convex:', error);
  }
}

/**
 * Get available subscription offerings
 */
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

/**
 * Get available packages from the current offering
 */
export async function getAvailablePackages(): Promise<PurchasesPackage[]> {
  const offering = await getOfferings();
  return offering?.availablePackages || [];
}

/**
 * Purchase a subscription package
 */
export async function purchasePackage(
  pkg: PurchasesPackage
): Promise<{ success: boolean; customerInfo?: CustomerInfo; error?: string }> {
  try {
    console.log('[RevenueCat] Purchasing package:', pkg.identifier);

    const { customerInfo } = await Purchases.purchasePackage(pkg);

    // Check if purchase was successful
    const tier = getSubscriptionTierFromCustomerInfo(customerInfo);

    if (tier !== 'free') {
      console.log('[RevenueCat] Purchase successful, tier:', tier);
      await syncSubscriptionToConvex(tier);
      return { success: true, customerInfo };
    }

    return { success: false, error: 'Purchase completed but no active entitlement' };
  } catch (error: any) {
    // Handle specific error codes
    if (error.userCancelled) {
      console.log('[RevenueCat] User cancelled purchase');
      return { success: false, error: 'cancelled' };
    }

    console.error('[RevenueCat] Purchase failed:', error);
    return { success: false, error: error.message || 'Purchase failed' };
  }
}

/**
 * Restore previous purchases
 * Useful when user reinstalls app or switches devices
 */
export async function restorePurchases(): Promise<{
  success: boolean;
  tier: 'free' | 'premium' | 'pro';
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

/**
 * Get current customer info
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    return await Purchases.getCustomerInfo();
  } catch (error) {
    console.error('[RevenueCat] Failed to get customer info:', error);
    return null;
  }
}

/**
 * Get current subscription tier
 */
export async function getCurrentTier(): Promise<'free' | 'premium' | 'pro'> {
  const customerInfo = await getCustomerInfo();

  if (!customerInfo) {
    return 'free';
  }

  return getSubscriptionTierFromCustomerInfo(customerInfo);
}

/**
 * Check if user has active premium or pro subscription
 */
export async function hasActiveSubscription(): Promise<boolean> {
  const tier = await getCurrentTier();
  return tier !== 'free';
}

/**
 * Check if user has specific entitlement
 */
export async function hasEntitlement(entitlementId: string): Promise<boolean> {
  const customerInfo = await getCustomerInfo();

  if (!customerInfo) {
    return false;
  }

  return customerInfo.entitlements.active[entitlementId]?.isActive === true;
}

/**
 * Log user out from RevenueCat
 * Call when user signs out of the app
 */
export async function logOutRevenueCat(): Promise<void> {
  try {
    await Purchases.logOut();
    console.log('[RevenueCat] Logged out');
  } catch (error) {
    console.error('[RevenueCat] Logout failed:', error);
  }
}

/**
 * Identify user with RevenueCat
 * Call when user signs in to link purchases to their account
 */
export async function identifyUser(userId: string): Promise<void> {
  try {
    await Purchases.logIn(userId);
    console.log('[RevenueCat] User identified:', userId);

    // Sync current subscription status after identifying
    const customerInfo = await getCustomerInfo();
    if (customerInfo) {
      const tier = getSubscriptionTierFromCustomerInfo(customerInfo);
      await syncSubscriptionToConvex(tier);
    }
  } catch (error) {
    console.error('[RevenueCat] Failed to identify user:', error);
  }
}

/**
 * Get management URL for subscription
 * Opens native subscription management on iOS/Android
 */
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
