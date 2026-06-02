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

export default http;
