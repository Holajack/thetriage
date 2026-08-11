/**
 * Day/week/month keys for streaks and the rolling focus-time windows.
 *
 * Shared so that the writer (focusSessions.applySessionToStats) and the readers
 * (leaderboard queries) can never disagree about which week "this week" is.
 */

/** YYYY-MM-DD in the user's own timezone, so streaks break on THEIR midnight. */
export function localDayKey(at: Date, timeZone: string | undefined): string {
  try {
    // en-CA formats as YYYY-MM-DD.
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timeZone || "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(at);
  } catch {
    // A bad tz string from an old client must not break session completion.
    return at.toISOString().split("T")[0];
  }
}

/** Monday of the week containing `dayKey` (YYYY-MM-DD). */
export function weekStartKey(dayKey: string): string {
  const d = new Date(dayKey + "T00:00:00Z");
  const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().split("T")[0];
}

/** YYYY-MM for `dayKey`. */
export function monthKey(dayKey: string): string {
  return dayKey.slice(0, 7);
}
