/**
 * Age policy, shared by the Convex backend and the app.
 *
 * Keep this file free of server-only imports so the client can import it too.
 * We store birth month and year only. Age is counted in completed years and
 * the birthday month is treated as not yet reached, so nobody is admitted a
 * few weeks early.
 */
export const MINIMUM_AGE = 14;
export const ADULT_AGE = 18;

export type AgeBand = "under14" | "teen" | "adult" | "unknown";

export type BirthFields = { birthYear?: number; birthMonth?: number };

export function isValidBirthMonthYear(
  birthYear: number,
  birthMonth: number,
  now: Date = new Date(),
): boolean {
  const thisYear = now.getUTCFullYear();
  return (
    Number.isInteger(birthYear) &&
    Number.isInteger(birthMonth) &&
    birthMonth >= 1 &&
    birthMonth <= 12 &&
    birthYear >= thisYear - 120 &&
    birthYear <= thisYear
  );
}

function completedYears(birthYear: number, birthMonth: number, now: Date) {
  const years = now.getUTCFullYear() - birthYear;
  return now.getUTCMonth() + 1 > birthMonth ? years : years - 1;
}

export function ageBandFromBirth(
  birthYear: number | undefined,
  birthMonth: number | undefined,
  now: Date = new Date(),
): AgeBand {
  if (birthYear === undefined || birthMonth === undefined) return "unknown";
  const years = completedYears(birthYear, birthMonth, now);
  if (years < MINIMUM_AGE) return "under14";
  if (years < ADULT_AGE) return "teen";
  return "adult";
}

export function ageBandOf(user: BirthFields, now: Date = new Date()): AgeBand {
  return ageBandFromBirth(user.birthYear, user.birthMonth, now);
}

/**
 * Everyone who is not a confirmed adult gets the teen safeguards: 14 to 17
 * year olds, and accounts that have not confirmed an age yet.
 */
export function isProtectedMinor(
  user: BirthFields,
  now: Date = new Date(),
): boolean {
  return ageBandOf(user, now) !== "adult";
}

export type RoomAudience = "teen" | "adult";

export function roomAudienceFor(user: BirthFields): RoomAudience {
  return isProtectedMinor(user) ? "teen" : "adult";
}

type VisibilityFields = {
  fullNameVisibility?: string;
  universityVisibility?: string;
  locationVisibility?: string;
  classesVisibility?: string;
};

function atMost(current: string | undefined, cap: string): string {
  return current === "none" || current === "private" ? current : cap;
}

/**
 * A minor's name, school and classes never show beyond friends, and their
 * location never shows at all, whatever their own settings say.
 */
export function clampVisibilityForMinors<
  T extends VisibilityFields & BirthFields,
>(user: T): T {
  if (!isProtectedMinor(user)) return user;
  return {
    ...user,
    fullNameVisibility: atMost(user.fullNameVisibility, "friends"),
    universityVisibility: atMost(user.universityVisibility, "friends"),
    classesVisibility: atMost(user.classesVisibility, "friends"),
    locationVisibility: "none",
  };
}

/** A minor's photo is for friends only; strangers see the trail buddy instead. */
export function isAvatarVisible(
  user: BirthFields,
  isSelf: boolean,
  isFriend: boolean,
): boolean {
  return isSelf || isFriend || !isProtectedMinor(user);
}
