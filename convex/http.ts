import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Webhook } from "svix";

const http = httpRouter();

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return new Response("Server misconfigured", { status: 500 });
    }

    const body = await request.text();
    const svixId = request.headers.get("svix-id");
    const svixTimestamp = request.headers.get("svix-timestamp");
    const svixSignature = request.headers.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      return new Response("Missing svix headers", { status: 400 });
    }

    let event: any;
    try {
      const wh = new Webhook(webhookSecret);
      event = wh.verify(body, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as any;
    } catch {
      return new Response("Invalid webhook signature", { status: 401 });
    }

    const eventType = event.type;
    const data = event.data;

    switch (eventType) {
      case "user.created": {
        const clerkId = data.id;
        const email =
          data.email_addresses?.find(
            (e: any) => e.id === data.primary_email_address_id,
          )?.email_address ?? data.email_addresses?.[0]?.email_address;
        const username = data.username;
        const firstName = data.first_name;
        const lastName = data.last_name;
        const fullName = [firstName, lastName].filter(Boolean).join(" ");
        const avatarUrl = data.image_url;

        if (!email) {
          return new Response("No email", { status: 400 });
        }

        // Create user in Convex
        const userId = await ctx.runMutation(
          internal.webhookHelpers.createUser,
          {
            clerkId,
            email,
            username: username ?? undefined,
            fullName: fullName || undefined,
            firstName: firstName ?? undefined,
            lastName: lastName ?? undefined,
            avatarUrl: avatarUrl ?? undefined,
          },
        );

        await ctx.runMutation(internal.webhookHelpers.initUserData, { userId });
        break;
      }

      case "user.updated": {
        const clerkId = data.id;
        const email =
          data.email_addresses?.find(
            (e: any) => e.id === data.primary_email_address_id,
          )?.email_address ?? data.email_addresses?.[0]?.email_address;
        const username = data.username;
        const firstName = data.first_name;
        const lastName = data.last_name;
        const fullName = [firstName, lastName].filter(Boolean).join(" ");
        const avatarUrl = data.image_url;

        await ctx.runMutation(internal.webhookHelpers.updateUserByClerkId, {
          clerkId,
          email,
          username: username ?? undefined,
          fullName: fullName || undefined,
          firstName: firstName ?? undefined,
          lastName: lastName ?? undefined,
          avatarUrl: avatarUrl ?? undefined,
        });

        break;
      }

      case "user.deleted": {
        const clerkId = data.id;
        await ctx.runMutation(internal.webhookHelpers.deleteUserByClerkId, {
          clerkId,
        });
        break;
      }

      default:
        break;
    }

    return new Response("OK", { status: 200 });
  }),
});

/**
 * RevenueCat server webhook — the trusted source for subscription tiers.
 *
 * Setup (RevenueCat dashboard → Integrations → Webhooks):
 *   - URL: https://<deployment>.convex.site/revenuecat-webhook
 *   - Authorization header value: the same string stored in the Convex env
 *     var REVENUECAT_WEBHOOK_TOKEN
 * Optionally set REVENUECAT_API_KEY (secret API key) so the handler can fetch
 * the subscriber's CURRENT entitlements instead of trusting event payloads.
 *
 * While REVENUECAT_WEBHOOK_TOKEN is set, users.updateMySubscription refuses
 * client-initiated upgrades — this endpoint is what grants paid tiers.
 */

/** Map RevenueCat entitlement ids to the canonical tier (highest wins). */
function tierFromEntitlements(entitlementIds: string[]): string {
  const ids = entitlementIds.map((e) => e.toLowerCase());
  if (ids.includes("elite")) return "elite";
  if (ids.includes("pro") || ids.includes("premium")) return "pro";
  if (ids.includes("basic")) return "basic";
  return "free";
}

http.route({
  path: "/revenuecat-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const expectedToken = process.env.REVENUECAT_WEBHOOK_TOKEN;
    if (!expectedToken) {
      return new Response("Server misconfigured", { status: 500 });
    }

    const authHeader = request.headers.get("authorization") || "";
    const provided = authHeader.replace(/^Bearer\s+/i, "");
    if (provided !== expectedToken) {
      return new Response("Unauthorized", { status: 401 });
    }

    let payload: any;
    try {
      payload = await request.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    const event = payload?.event;
    if (!event?.app_user_id) {
      return new Response("Missing event", { status: 400 });
    }

    // Candidate user ids: the app identifies users to RevenueCat with the
    // Convex users._id (see AuthContext → identifyUser). Aliases can include
    // anonymous ids, which _setSubscriptionTierFromWebhook safely ignores.
    const candidates: string[] = [
      event.app_user_id,
      ...(Array.isArray(event.aliases) ? event.aliases : []),
    ];

    // Resolve the user's current entitlements. Prefer asking the RevenueCat
    // REST API (authoritative); fall back to the event payload otherwise.
    let tier: string | null = null;
    const rcApiKey = process.env.REVENUECAT_API_KEY;
    if (rcApiKey) {
      try {
        const res = await fetch(
          `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(event.app_user_id)}`,
          { headers: { Authorization: `Bearer ${rcApiKey}` } },
        );
        if (res.ok) {
          const data: any = await res.json();
          const entitlements = data?.subscriber?.entitlements ?? {};
          const now = Date.now();
          const active = Object.keys(entitlements).filter((key) => {
            const expires = entitlements[key]?.expires_date;
            return !expires || new Date(expires).getTime() > now;
          });
          tier = tierFromEntitlements(active);
        }
      } catch (e: any) {
        console.error(
          "[revenuecat-webhook] subscriber fetch failed:",
          e?.message || e,
        );
      }
    }

    // Idempotency / ordering guard for the event-payload fallback below.
    // RevenueCat webhook delivery is at-least-once and NOT guaranteed to be
    // in order, so a replayed or out-of-order delivery could otherwise stomp
    // a newer tier with stale data from an older event. We only need this
    // for the fallback: the live-fetch path above always asks RevenueCat for
    // the subscriber's CURRENT entitlements, so it's correct regardless of
    // delivery order. `appConfig` is a generic key/value table (see
    // convex/appConfig.ts) reused here — keyed per RevenueCat app_user_id —
    // to remember the timestamp of the last event we actually applied,
    // without requiring a schema change for a dedicated events table.
    const eventTimestampMs =
      typeof event.event_timestamp_ms === "number"
        ? event.event_timestamp_ms
        : undefined;
    const lastEventKey = `revenuecat_last_event_ts:${event.app_user_id}`;
    let isStaleFallback = false;
    if (tier === null && eventTimestampMs !== undefined) {
      const lastProcessedRaw: string = await ctx.runQuery(
        internal.appConfig.get,
        { key: lastEventKey },
      );
      const lastProcessed = lastProcessedRaw ? Number(lastProcessedRaw) : 0;
      isStaleFallback = lastProcessed > eventTimestampMs;
      if (isStaleFallback) {
        console.warn(
          "[revenuecat-webhook] ignoring stale/out-of-order event for",
          event.app_user_id,
        );
      }
    }

    if (tier === null && !isStaleFallback) {
      // Event-based fallback. EXPIRATION means the entitlement lapsed;
      // everything else carries the entitlements the event applies to.
      if (event.type === "EXPIRATION") {
        tier = "free";
      } else if (Array.isArray(event.entitlement_ids)) {
        tier = tierFromEntitlements(event.entitlement_ids);
      }
    }

    if (tier !== null) {
      for (const candidate of candidates) {
        await ctx.runMutation(internal.users._setSubscriptionTierFromWebhook, {
          userIdString: String(candidate),
          subscriptionTier: tier,
        });
      }
      if (eventTimestampMs !== undefined) {
        await ctx.runMutation(internal.appConfig.set, {
          key: lastEventKey,
          value: String(eventTimestampMs),
        });
      }
    }

    return new Response("OK", { status: 200 });
  }),
});

export default http;
