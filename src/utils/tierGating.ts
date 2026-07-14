/**
 * Centralized subscription tier gating utilities (client side).
 * All feature access checks should use these helpers to ensure consistency.
 * The backend equivalent lives in convex/tiers.ts — keep the two in sync.
 *
 * Tier hierarchy: free < basic < pro < elite
 * (legacy rows: "trial" → free, "premium" → pro)
 *
 * Client spec (2026):
 *   Basic: office theme, ambient soundscape, forest trail, Patrick trail buddy,
 *          Patrick AI chat, basecamp focus, leaderboard, shop & flint
 *   Pro:   everything in Basic + forest/beach/jungle trails (NOT all),
 *          all themes, pro-level trail buddies, pro sound albums,
 *          summit focus, study rooms ≤ 2, community messaging, brain mapping
 *          (limited), self-discovery quizzes (QUICK versions only).
 *          Pro's AI is Patrick only — never Nora.
 *   Elite: everything in Pro + Nora AI (memory, app access, learning),
 *          voice + PDF analysis, ALL sound albums + themes, exclusive Lion
 *          buddy, unlimited study rooms, full brain mapping, ALL bonus
 *          quizzes (incl. extended), AI insights & personalized plans,
 *          elite badge & name color, early access, exclusive in-app gift
 */

export type SubscriptionTier =
  | "free"
  | "trial" // legacy value, treated as free
  | "basic"
  | "premium" // legacy value, treated as pro
  | "pro"
  | "elite";

export type CanonicalTier = "free" | "basic" | "pro" | "elite";

// Normalize tier names (premium = pro, trial = free)
export function normalizeTier(tier: string | undefined | null): CanonicalTier {
  switch ((tier || "free").toLowerCase()) {
    case "elite":
      return "elite";
    case "pro":
    case "premium":
      return "pro";
    case "basic":
      return "basic";
    default:
      return "free";
  }
}

const TIER_LEVEL: Record<CanonicalTier, number> = {
  free: 0,
  basic: 1,
  pro: 2,
  elite: 3,
};

export function tierLevel(tier: string | undefined | null): number {
  return TIER_LEVEL[normalizeTier(tier)];
}

// ============================================
// TIER CHECKS
// ============================================

export const isBasicOrAbove = (tier: string | undefined | null): boolean =>
  tierLevel(tier) >= 1;
export const isProOrAbove = (tier: string | undefined | null): boolean =>
  tierLevel(tier) >= 2;
export const isElite = (tier: string | undefined | null): boolean =>
  tierLevel(tier) >= 3;

// ============================================
// AI GATING
// ============================================

// Nora (full assistant with memory + app access): Elite only
export function hasNoraAccess(tier: string | undefined | null): boolean {
  return isElite(tier);
}

// Patrick (basic study coach): every membership (Basic and above)
export function hasPatrickAccess(tier: string | undefined | null): boolean {
  return isBasicOrAbove(tier);
}

export function hasAIInsights(tier: string | undefined | null): boolean {
  return isElite(tier);
}

// Voice + PDF analysis (Nora features): Elite only
export function hasVoiceAndPdfAnalysis(
  tier: string | undefined | null,
): boolean {
  return isElite(tier);
}

// Personalized study plans: Elite only
export function hasPersonalizedPlans(tier: string | undefined | null): boolean {
  return isElite(tier);
}

// ============================================
// FEATURE GATING
// ============================================

// Themes: Basic=office only, Pro+=all themes
export function getAvailableThemes(tier: string | undefined | null): string[] {
  if (isProOrAbove(tier))
    return [
      "office",
      "forest",
      "ocean",
      "sunset",
      "night",
      "home",
      "library",
      "coffee",
      "park",
    ];
  return ["office"];
}

// Sound albums: Basic=Ambient only, Pro=Ambient+Nature, Elite=all
export function getAvailableSoundAlbums(
  tier: string | undefined | null,
): string[] {
  if (isElite(tier))
    return ["Ambient", "Nature", "Classical", "Lo-Fi", "Jazz Ambient"];
  if (isProOrAbove(tier)) return ["Ambient", "Nature"];
  return ["Ambient"];
}

export function isSoundAlbumLocked(
  tier: string | undefined | null,
  album: string,
): boolean {
  return !getAvailableSoundAlbums(tier).includes(album);
}

// Trails: Basic=forest only, Pro=forest+beach+jungle, Elite=all trails
const PRO_TRAILS = new Set(["forest", "beach", "jungle"]);

export function isTrailLocked(
  tier: string | undefined | null,
  trailId: string,
): boolean {
  if (isElite(tier)) return false;
  if (isProOrAbove(tier)) return !PRO_TRAILS.has(trailId);
  return trailId !== "forest";
}

export function getAvailableTrails(tier: string | undefined | null): string[] {
  if (isElite(tier)) {
    return [
      "forest",
      "beach",
      "jungle",
      "desert",
      "snow",
      "canyon",
      "volcano",
      "northern",
      "galaxy",
    ];
  }
  if (isProOrAbove(tier)) return ["forest", "beach", "jungle"];
  return ["forest"];
}

// Buddies: Basic=Patrick only, Pro=all except lion, Elite=all (including exclusive Lion)
export function isBuddyLocked(
  tier: string | undefined | null,
  buddyId: string,
): boolean {
  if (isElite(tier)) return false;
  if (isProOrAbove(tier)) return buddyId === "lion";
  // Basic / free: only Patrick is unlocked.
  return buddyId !== "patrick";
}

/** Default trail buddy assigned to a brand-new account. */
export const DEFAULT_BUDDY = "patrick";

// Focus modes: Basic=basecamp only, Pro/Elite=basecamp+summit
export function hasSummitAccess(tier: string | undefined | null): boolean {
  return isProOrAbove(tier);
}

// Study rooms: Basic=no, Pro=2 max, Elite=unlimited
export function getStudyRoomLimit(tier: string | undefined | null): number {
  if (isElite(tier)) return Infinity;
  if (isProOrAbove(tier)) return 2;
  return 0;
}

export function canCreateStudyRoom(tier: string | undefined | null): boolean {
  return isProOrAbove(tier);
}

// Brain mapping: Basic=no, Pro=limited, Elite=full
export function hasBrainMappingAccess(
  tier: string | undefined | null,
): boolean {
  return isProOrAbove(tier);
}

export function hasFullBrainMapping(tier: string | undefined | null): boolean {
  return isElite(tier);
}

// Quiz access — split by variant. Pro gets quick only; Elite gets quick + in-depth/extended.
export type QuizVariant = "quick" | "extended" | "in_depth";

export function hasQuizAccess(
  tier: string | undefined | null,
  variant: QuizVariant = "quick",
): boolean {
  if (variant === "extended" || variant === "in_depth") return isElite(tier);
  return isProOrAbove(tier);
}

// Backwards-compatible helpers (used by existing callers)
export function getBonusQuizLimit(tier: string | undefined | null): number {
  if (isElite(tier)) return Infinity;
  if (isProOrAbove(tier)) return 2; // quick versions only
  return 0;
}

// Leaderboard: all see it, Elite gets badge + name color
export function hasEliteBadge(tier: string | undefined | null): boolean {
  return isElite(tier);
}

// Messaging: Basic=friends only, Pro/Elite=full community messaging
export function hasFullMessaging(tier: string | undefined | null): boolean {
  return isProOrAbove(tier);
}

// Early access to new features: Elite only
export function hasEarlyAccess(tier: string | undefined | null): boolean {
  return isElite(tier);
}
