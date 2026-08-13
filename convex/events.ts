import { v } from "convex/values";
import { internalQuery, mutation } from "./_generated/server";
import { getCurrentUserOrNull } from "./users";

/**
 * First-party product analytics.
 *
 * The app previously had NO event system of any kind — no SDK, no call sites,
 * no table — so a beta would have told us nothing about activation, drop-off or
 * retention. This is deliberately a Convex table rather than a third-party SDK:
 * the questions we need answered for beta are all first-party, it adds no binary
 * weight, and it needs no App Tracking Transparency prompt.
 */

const MAX_EVENTS_PER_CALL = 50;

// Ceiling on how many rows a single analytics read will scan, regardless of
// the requested window. Keeps a mistakenly (or maliciously) huge `sinceDays`
// from turning a dashboard read into a full-table dump.
const MAX_EVENTS_PER_QUERY = 20000;

// Primitive-only props: keeps analytics payloads small, non-PII, and safe to
// insert without a schema change (the `events.props` table field stays
// `v.any()` in schema.ts; this is what actually gates what a caller can send).
const eventProps = v.record(
  v.string(),
  v.union(v.string(), v.number(), v.boolean(), v.null()),
);

const eventInput = v.object({
  name: v.string(),
  props: v.optional(eventProps),
  platform: v.optional(v.string()),
  appVersion: v.optional(v.string()),
  sessionId: v.optional(v.string()),
  /** Client timestamp; the server stamps its own `ts` and ignores this for ordering. */
  clientTs: v.optional(v.number()),
});

/** Record a batch of events. Fire-and-forget: never blocks or breaks the UI. */
export const track = mutation({
  args: { events: v.array(eventInput) },
  handler: async (ctx, args) => {
    // Unauthenticated events are still useful (pre-signup funnel), so a missing
    // user is not an error.
    const user = await getCurrentUserOrNull(ctx);
    const now = Date.now();

    const batch = args.events.slice(0, MAX_EVENTS_PER_CALL);

    for (const e of batch) {
      const name = e.name.trim();
      if (!name) continue;

      await ctx.db.insert("events", {
        userId: user?._id,
        name,
        props: e.props,
        source: user?.signupSource,
        platform: e.platform,
        appVersion: e.appVersion,
        sessionId: e.sessionId,
        ts: now,
      });
    }

    return { accepted: batch.length };
  },
});

/**
 * Beta funnel: how far each cohort of testers actually got.
 * Read this from the Convex dashboard during the beta (internal-only: this
 * table has no user-facing consumer, and it must not be a public query —
 * an unauthenticated caller could otherwise dump the whole analytics table
 * via `.collect()`). Same internal-only pattern as the admin operations in
 * promoCodes.ts / seedAdminUser.ts.
 */
export const funnel = internalQuery({
  args: { sinceDays: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const since = Date.now() - (args.sinceDays ?? 30) * 24 * 60 * 60 * 1000;

    const events = await ctx.db
      .query("events")
      .withIndex("by_ts", (q) => q.gte("ts", since))
      .take(MAX_EVENTS_PER_QUERY);

    const usersFor = (name: string) =>
      new Set(
        events.filter((e) => e.name === name && e.userId).map((e) => e.userId!),
      );

    const signedUp = usersFor("signup_completed");
    const onboarded = usersFor("onboarding_completed");
    const started = usersFor("session_started");
    const completed = usersFor("session_completed");
    const returned = usersFor("day2_return");

    const count = (s: Set<unknown>) => s.size;

    return {
      windowDays: args.sinceDays ?? 30,
      totalEvents: events.length,
      signedUp: count(signedUp),
      completedOnboarding: count(onboarded),
      startedFirstSession: count(started),
      completedFirstSession: count(completed),
      returnedDay2: count(returned),
      // Where people fall out.
      dropOff: {
        atOnboarding: count(signedUp) - count(onboarded),
        beforeFirstSession: count(onboarded) - count(started),
        midFirstSession: count(started) - count(completed),
        neverReturned: count(completed) - count(returned),
      },
    };
  },
});

/**
 * Raw counts per event name — a quick "is anything firing?" check.
 * Internal-only, same reasoning as `funnel` above.
 */
export const countsByName = internalQuery({
  args: { sinceDays: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const since = Date.now() - (args.sinceDays ?? 7) * 24 * 60 * 60 * 1000;
    const events = await ctx.db
      .query("events")
      .withIndex("by_ts", (q) => q.gte("ts", since))
      .take(MAX_EVENTS_PER_QUERY);

    const counts: Record<string, number> = {};
    for (const e of events) counts[e.name] = (counts[e.name] ?? 0) + 1;

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  },
});
