import { useState, useEffect } from "react";
import { useConvexProfile } from "./useConvex";
import {
  getCurrentTier,
  isRevenueCatInitialized,
} from "../services/revenuecat";

export type SubscriptionTier = "free" | "basic" | "premium" | "elite";

const TIER_RANK: Record<string, number> = {
  free: 0,
  basic: 1,
  premium: 2,
  pro: 2,
  elite: 3,
};

export function useSubscriptionTier() {
  const { profile } = useConvexProfile();
  const [rcTier, setRcTier] = useState<SubscriptionTier>("free");

  useEffect(() => {
    if (!isRevenueCatInitialized()) return;
    getCurrentTier().then((tier) => setRcTier(tier));
  }, []);

  const convexTier = (profile?.subscription_tier ||
    profile?.subscriptionTier ||
    "free") as string;
  const normalizedConvex = convexTier === "pro" ? "premium" : convexTier;

  const resolved =
    (TIER_RANK[normalizedConvex] ?? 0) >= (TIER_RANK[rcTier] ?? 0)
      ? normalizedConvex
      : rcTier;

  const currentTier = resolved as SubscriptionTier;

  return {
    currentTier,
    isElite: currentTier === "elite",
    isPremium: currentTier === "premium" || currentTier === "elite",
    isBasic:
      currentTier === "basic" ||
      currentTier === "premium" ||
      currentTier === "elite",
    isFree: currentTier === "free",
    hasAIAccess: currentTier === "premium" || currentTier === "elite",
  };
}
