/**
 * App-lifetime cursor selecting which ground path variant a study session shows.
 * Advances only when a session completes, so the path stays continuous within a
 * session and rotates to the next variant for the following session.
 */
let cursor = 0;

export function getPathVariantIndex(): number {
  return cursor;
}

export function advancePathVariant(): void {
  cursor += 1;
}
