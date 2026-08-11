import { Platform } from "react-native";
import Constants from "expo-constants";
import { api } from "../../convex/_generated/api";
import { getConvexClient } from "../utils/convexClient";
import type { AnalyticsEventName, AnalyticsProps } from "./events";

/**
 * Fire-and-forget event tracking.
 *
 * Rules this module lives by:
 *  - It NEVER throws and never blocks the UI. Analytics must not be able to
 *    break a focus session.
 *  - It batches, so a burst of events is one round trip.
 *  - It carries no PII — only ids, counts, durations and enum-ish strings.
 */

const FLUSH_INTERVAL_MS = 10_000;
const MAX_BUFFER = 40;

interface QueuedEvent {
  name: string;
  props?: AnalyticsProps;
  platform: string;
  appVersion?: string;
  sessionId: string;
  clientTs: number;
}

// One id per app-open, so events can be grouped into a usage session.
const appOpenId = `${Date.now().toString(36)}-${Math.floor(
  Math.random() * 1e6,
).toString(36)}`;

const appVersion = Constants.expoConfig?.version ?? undefined;

let buffer: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

async function flush(): Promise<void> {
  if (buffer.length === 0) return;

  const batch = buffer;
  buffer = [];

  try {
    const client = getConvexClient();
    await client.mutation(api.events.track, {
      events: batch.map((e) => ({
        name: e.name,
        props: e.props,
        platform: e.platform,
        appVersion: e.appVersion,
        sessionId: e.sessionId,
        clientTs: e.clientTs,
      })),
    });
  } catch {
    // Dropped on the floor by design. Analytics is never worth an error in the
    // user's face, and retrying forever would just grow the buffer without bound.
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flush();
  }, FLUSH_INTERVAL_MS);
}

/** Record one product event. Safe to call from anywhere, including render paths. */
export function track(name: AnalyticsEventName, props?: AnalyticsProps): void {
  try {
    buffer.push({
      name,
      props,
      platform: Platform.OS,
      appVersion,
      sessionId: appOpenId,
      clientTs: Date.now(),
    });

    if (buffer.length >= MAX_BUFFER) {
      void flush();
      return;
    }
    scheduleFlush();
  } catch {
    // Never let instrumentation throw into a caller.
  }
}

/** Send anything buffered right now (e.g. when the app backgrounds). */
export function flushAnalytics(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  return flush();
}
