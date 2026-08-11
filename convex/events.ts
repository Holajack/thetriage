import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
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

const eventInput = v.object({
  name: v.string(),
  props: v.optional(v.any()),
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
 * Read this from the Convex dashboard during the beta.
 */
export const funnel = query({
  args: { sinceDays: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const since = Date.now() - (args.sinceDays ?? 30) * 24 * 60 * 60 * 1000;

    const events = await ctx.db
      .query("events")
      .withIndex("by_ts", (q) => q.gte("ts", since))
      .collect();

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

/** Raw counts per event name — a quick "is anything firing?" check. */
export const countsByName = query({
  args: { sinceDays: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const since = Date.now() - (args.sinceDays ?? 7) * 24 * 60 * 60 * 1000;
    const events = await ctx.db
      .query("events")
      .withIndex("by_ts", (q) => q.gte("ts", since))
      .collect();

    const counts: Record<string, number> = {};
    for (const e of events) counts[e.name] = (counts[e.name] ?? 0) + 1;

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  },
});
