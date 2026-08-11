/**
 * Canonical subscription tiers — single source of truth for the backend.
 *
 * Real tiers: free → basic → pro → elite.
 * The 7-day free trial is a store intro offer (entitlement active from day 1),
 * so there is no "trial" tier. Legacy rows may still contain "trial" or
 * "premium"; normalizeTier maps those at read time (trial→free, premium→pro).
 *
 * AI access:
 *   Patrick (gpt-4o-mini study coach) — basic, pro, elite
 *   Nora (gpt-4o full assistant)      — elite only
 */

export type CanonicalTier = "free" | "basic" | "pro" | "elite";

export const TIER_RANK: Record<CanonicalTier, number> = {
  free: 0,
  basic: 1,
  pro: 2,
  elite: 3,
};

export function normalizeTier(raw: string | undefined | null): CanonicalTier {
  switch ((raw || "free").toLowerCase()) {
    case "elite":
      return "elite";
    case "pro":
    case "premium": // legacy name
      return "pro";
    case "basic":
      return "basic";
    default: // includes legacy "trial" and unknown values
      return "free";
  }
}

export function tierRank(raw: string | undefined | null): number {
  return TIER_RANK[normalizeTier(raw)];
}

/**
 * Study rooms a user may OWN at once. Mirrors getStudyRoomLimit in
 * src/utils/tierGating.ts — the client hides the button, this enforces it.
 */
const STUDY_ROOM_LIMIT: Record<CanonicalTier, number> = {
  free: 0,
  basic: 0,
  pro: 2,
  elite: Number.POSITIVE_INFINITY,
};

export function getStudyRoomLimit(raw: string | undefined | null): number {
  return STUDY_ROOM_LIMIT[normalizeTier(raw)];
}

/** Full community messaging (DMs beyond friends) is Pro and above. */
export function hasFullMessaging(raw: string | undefined | null): boolean {
  return tierRank(raw) >= TIER_RANK.pro;
}

export interface AiLimit {
  enabled: boolean;
  perDay: number;
  maxLen: number;
}

const DISABLED: AiLimit = { enabled: false, perDay: 0, maxLen: 0 };

const NORA_LIMITS: Record<CanonicalTier, AiLimit> = {
  free: DISABLED,
  basic: DISABLED,
  pro: DISABLED,
  elite: { enabled: true, perDay: 100, maxLen: 5000 },
};

const PATRICK_LIMITS: Record<CanonicalTier, AiLimit> = {
  free: DISABLED,
  basic: { enabled: true, perDay: 40, maxLen: 1500 },
  pro: { enabled: true, perDay: 100, maxLen: 3000 },
  elite: { enabled: true, perDay: 100, maxLen: 3000 },
};

export type AiType = "nora" | "patrick";

export function getAiLimit(
  aiType: AiType,
  rawTier: string | undefined | null,
): AiLimit {
  const tier = normalizeTier(rawTier);
  return aiType === "nora" ? NORA_LIMITS[tier] : PATRICK_LIMITS[tier];
}

/** Upsell copy shown when an AI is unavailable on the user's tier. */
export function aiDeniedReason(aiType: AiType, tier: CanonicalTier): string {
  if (aiType === "nora") {
    if (tier === "pro") {
      return "Nora is an Elite-exclusive assistant. You have Patrick on your Pro plan — upgrade to Elite to unlock Nora's web research, document analysis, and memory.";
    }
    return "Nora is available for Elite members. Upgrade to Elite to unlock web research, document analysis, and an assistant that learns with you.";
  }
  return "Patrick is included with every HikeWise membership (Basic and above). Subscribe to unlock your personal study coach!";
}
