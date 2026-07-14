import { useState, useEffect } from "react";
import { useConvexProfile } from "./useConvex";
import {
  getCurrentTier,
  isRevenueCatInitialized,
  RcTier,
} from "../services/revenuecat";
import {
  normalizeTier,
  tierLevel,
  hasNoraAccess,
  hasPatrickAccess,
  CanonicalTier,
} from "../utils/tierGating";

/**
 * Resolve the user's subscription tier from both sources:
 * Convex (server-synced, webhook-authoritative) and the RevenueCat SDK
 * (instant after a purchase). The higher of the two wins so a fresh
 * purchase unlocks immediately while the webhook catches Convex up.
 */
export function useSubscriptionTier() {
  const { profile, loading } = useConvexProfile();
  const [rcTier, setRcTier] = useState<RcTier>("free");

  useEffect(() => {
    if (!isRevenueCatInitialized()) return;
    getCurrentTier().then((tier) => setRcTier(tier));
  }, []);

  const convexTier = normalizeTier(
    (profile as any)?.subscription_tier || (profile as any)?.subscriptionTier,
  );

  const currentTier: CanonicalTier =
    tierLevel(convexTier) >= tierLevel(rcTier) ? convexTier : rcTier;

  return {
    currentTier,
    // Until the profile resolves, currentTier reads "free" — gated screens must
    // wait on this rather than flashing an upgrade wall at a paying member.
    isLoading: loading,
    isElite: tierLevel(currentTier) >= 3,
    isPro: tierLevel(currentTier) >= 2,
    isBasic: tierLevel(currentTier) >= 1,
    isFree: currentTier === "free",
    hasNoraAccess: hasNoraAccess(currentTier),
    hasPatrickAccess: hasPatrickAccess(currentTier),
  };
}
