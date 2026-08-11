/**
 * Turn a Convex error into something a person can read.
 *
 * A `throw new Error("This room is full")` inside a mutation reaches the client
 * as something like:
 *
 *   [CONVEX M(studyRooms:join)] [Request ID: abc] Server Error
 *   Uncaught Error: This room is full
 *     at handler (../convex/studyRooms.ts:312:13)
 *
 * Showing that in an Alert is worse than showing nothing, so pull the actual
 * sentence back out.
 */
export function humanizeConvexError(error: unknown, fallback: string): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  if (!raw) return fallback;

  const match = raw.match(/Uncaught (?:Convex)?Error:\s*(.+?)(?:\n|\s+at\s|$)/);
  const message = (match?.[1] ?? raw).trim();

  // Anything still carrying Convex plumbing is not fit to show a user.
  if (
    !message ||
    message.includes("[CONVEX") ||
    message.includes("Server Error")
  ) {
    return fallback;
  }
  return message;
}
