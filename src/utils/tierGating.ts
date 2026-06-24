/**
 * Centralized subscription tier gating utilities.
 * All feature access checks should use these helpers to ensure consistency.
 *
 * Tier hierarchy: free/trial < basic < pro/premium < elite
 *
 * Client spec (2026):
 *   Basic: office theme, ambient soundscape, forest trail, Patrick trail buddy,
 *          Patrick AI chat, basecamp focus, leaderboard, shop & flint
 *   Pro:   everything in Basic + forest/beach/jungle trails (NOT all),
 *          all themes, pro-level trail buddies (Nora available), pro sound albums,
 *          summit focus, study rooms ≤ 2, community messaging, brain mapping (limited),
 *          self-discovery quizzes (QUICK versions only)
 *   Elite: everything in Pro + Nora Advanced AI, voice + PDF, ALL sound albums + themes,
 *          exclusive Lion buddy, unlimited study rooms, full brain mapping,
 *          ALL bonus quizzes (incl. extended), AI insights & personalized plans,
 *          elite badge & name color, early access, exclusive in-app gift
 */

export type SubscriptionTier =
  | "free"
  | "trial"
  | "basic"
  | "premium"
  | "pro"
  | "elite";

// Normalize tier names (pro = premium, trial = free for gating purposes)
function normalizeTier(tier: string | undefined | null): SubscriptionTier {
  if (!tier) return "free";
  const t = tier.toLowerCase();
  if (t === "pro") return "premium";
  if (t === "trial") return "trial"; // trial gets same access as free
  return t as SubscriptionTier;
}

const TIER_LEVEL: Record<string, number> = {
  free: 0,
  trial: 0,
  basic: 1,
  premium: 2,
  pro: 2,
  elite: 3,
};

function tierLevel(tier: string | undefined | null): number {
  return TIER_LEVEL[normalizeTier(tier)] ?? 0;
}

// ============================================
// TIER CHECKS
// ============================================

const isBasicOrAbove = (tier: string | undefined | null): boolean =>
  tierLevel(tier) >= 1;
export const isProOrAbove = (tier: string | undefined | null): boolean =>
  tierLevel(tier) >= 2;
export const isElite = (tier: string | undefined | null): boolean =>
  tierLevel(tier) >= 3;

// ============================================
// FEATURE GATING
// ============================================

// Themes: Basic=office only, Pro+=all themes, Elite=all themes
function getAvailableThemes(tier: string | undefined | null): string[] {
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
function getAvailableSoundAlbums(tier: string | undefined | null): string[] {
  if (isElite(tier))
    return ["Ambient", "Nature", "Classical", "Lo-Fi", "Jazz Ambient"];
  if (isProOrAbove(tier)) return ["Ambient", "Nature"];
  return ["Ambient"];
}

function isSoundAlbumLocked(
  tier: string | undefined | null,
  album: string,
): boolean {
  return !getAvailableSoundAlbums(tier).includes(album);
}

// Trails: Basic=forest only, Pro=forest+beach+jungle, Elite=all trails
const PRO_TRAILS = new Set(["forest", "beach", "jungle"]);

function isTrailLocked(
  tier: string | undefined | null,
  trailId: string,
): boolean {
  if (isElite(tier)) return false;
  if (isProOrAbove(tier)) return !PRO_TRAILS.has(trailId);
  return trailId !== "forest";
}

function getAvailableTrails(tier: string | undefined | null): string[] {
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
const DEFAULT_BUDDY = "patrick";

// AI: Basic/Pro=patrick only, Elite=nora
function hasNoraAccess(tier: string | undefined | null): boolean {
  return isElite(tier);
}

function hasPatrickAccess(tier: string | undefined | null): boolean {
  return isBasicOrAbove(tier);
}

function hasAIInsights(tier: string | undefined | null): boolean {
  return isElite(tier);
}

// Voice + PDF analysis: Elite only
function hasVoiceAndPdfAnalysis(tier: string | undefined | null): boolean {
  return isElite(tier);
}

// Personalized study plans: Elite only
function hasPersonalizedPlans(tier: string | undefined | null): boolean {
  return isElite(tier);
}

// Focus modes: Basic=basecamp only, Pro/Elite=basecamp+summit
function hasSummitAccess(tier: string | undefined | null): boolean {
  return isProOrAbove(tier);
}

// Study rooms: Basic=no, Pro=2 max, Elite=unlimited
function getStudyRoomLimit(tier: string | undefined | null): number {
  if (isElite(tier)) return Infinity;
  if (isProOrAbove(tier)) return 2;
  return 0;
}

function canCreateStudyRoom(tier: string | undefined | null): boolean {
  return isProOrAbove(tier);
}

// Brain mapping: Basic=no, Pro=limited, Elite=full
function hasBrainMappingAccess(tier: string | undefined | null): boolean {
  return isProOrAbove(tier);
}

function hasFullBrainMapping(tier: string | undefined | null): boolean {
  return isElite(tier);
}

// Quiz access — split by variant. Pro gets quick only; Elite gets quick + in-depth/extended.
export type QuizVariant = "quick" | "extended" | "in_depth";

function hasQuizAccess(
  tier: string | undefined | null,
  variant: QuizVariant = "quick",
): boolean {
  if (variant === "extended" || variant === "in_depth") return isElite(tier);
  return isProOrAbove(tier);
}

// Backwards-compatible helpers (used by existing callers)
function getBonusQuizLimit(tier: string | undefined | null): number {
  if (isElite(tier)) return Infinity;
  if (isProOrAbove(tier)) return 2; // quick versions only
  return 0;
}

// Leaderboard: all see it, Elite gets badge + name color
function hasEliteBadge(tier: string | undefined | null): boolean {
  return isElite(tier);
}

// Messaging: Basic=friends only, Pro/Elite=full community messaging
function hasFullMessaging(tier: string | undefined | null): boolean {
  return isProOrAbove(tier);
}

// Early access to new features: Elite only
function hasEarlyAccess(tier: string | undefined | null): boolean {
  return isElite(tier);
}
