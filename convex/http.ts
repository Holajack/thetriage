import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

/**
 * Clerk webhook handler.
 *
 * Clerk sends webhook events when users are created, updated, or deleted.
 * This handler syncs those changes to the Convex users table.
 *
 * Setup:
 * 1. In the Clerk Dashboard, go to Webhooks
 * 2. Add endpoint: https://<your-convex-deployment>.convex.site/clerk-webhook
 * 3. Select events: user.created, user.updated, user.deleted
 * 4. Copy the signing secret and add as CLERK_WEBHOOK_SECRET env var in Convex
 */
http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();

    // In production, verify the webhook signature using svix
    // For now, we parse the event directly
    let event: any;
    try {
      event = JSON.parse(body);
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    const eventType = event.type;
    const data = event.data;

    console.log(`[Clerk Webhook] Event: ${eventType}`);

    switch (eventType) {
      case "user.created": {
        const clerkId = data.id;
        const email =
          data.email_addresses?.find(
            (e: any) => e.id === data.primary_email_address_id
          )?.email_address ?? data.email_addresses?.[0]?.email_address;
        const username = data.username;
        const firstName = data.first_name;
        const lastName = data.last_name;
        const fullName = [firstName, lastName].filter(Boolean).join(" ");
        const avatarUrl = data.image_url;

        if (!email) {
          console.error("[Clerk Webhook] No email found for user:", clerkId);
          return new Response("No email", { status: 400 });
        }

        // Create user in Convex
        const userId = await ctx.runMutation(internal.webhookHelpers.createUser, {
          clerkId,
          email,
          username: username ?? undefined,
          fullName: fullName || undefined,
          firstName: firstName ?? undefined,
          lastName: lastName ?? undefined,
          avatarUrl: avatarUrl ?? undefined,
        });

        console.log(`[Clerk Webhook] User created: ${clerkId} -> ${userId}`);

        // Initialize related records
        await ctx.runMutation(internal.webhookHelpers.initUserData, { userId });

        console.log(`[Clerk Webhook] User data initialized for: ${userId}`);
        break;
      }

      case "user.updated": {
        const clerkId = data.id;
        const email =
          data.email_addresses?.find(
            (e: any) => e.id === data.primary_email_address_id
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

        console.log(`[Clerk Webhook] User updated: ${clerkId}`);
        break;
      }

      case "user.deleted": {
        const clerkId = data.id;
        await ctx.runMutation(internal.webhookHelpers.deleteUserByClerkId, {
          clerkId,
        });
        console.log(`[Clerk Webhook] User deleted: ${clerkId}`);
        break;
      }

      default:
        console.log(`[Clerk Webhook] Unhandled event type: ${eventType}`);
    }

    return new Response("OK", { status: 200 });
  }),
});

export default http;
