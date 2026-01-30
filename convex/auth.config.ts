/**
 * Convex authentication configuration for Clerk integration.
 *
 * This file configures Convex to accept JWTs from Clerk.
 * The CLERK_JWT_ISSUER_DOMAIN must be set in the Convex dashboard
 * under Settings > Environment Variables.
 */

const authConfig = {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};

export default authConfig;
