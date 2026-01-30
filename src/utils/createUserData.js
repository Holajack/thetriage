/**
 * User Data Creation Utilities
 *
 * This file contains functions to create initial data for new users
 * when they complete registration or onboarding.
 *
 * Migrated to use Convex backend.
 */

import { ConvexReactClient } from "convex/react";
import { api } from "../../convex/_generated/api";

let _convexClient = null;

export function setConvexClient(client) {
  _convexClient = client;
}

function getClient() {
  if (!_convexClient) throw new Error("Convex client not initialized");
  return _convexClient;
}

/**
 * Creates initial data for a new user across all required tables
 * Enhanced with better error handling for iOS
 */
export async function createInitialUserData(userId, profileData = {}) {
  console.log(`Creating initial data for user: ${userId}`);

  const results = {
    success: true,
    created: [],
    failed: [],
    errors: []
  };

  try {
    const client = getClient();

    // Call the Convex mutation to initialize user data
    // This creates onboarding preferences, settings, leaderboard stats, and learning metrics
    await client.mutation(api.initUser.initializeCurrentUser, {});

    // The mutation is idempotent and handles all table creation
    results.created.push('onboarding', 'settings', 'leaderboard', 'metrics');
    console.log('✅ User data creation completed via Convex');

    return { success: true, results };

  } catch (error) {
    console.error('❌ Critical error in createInitialUserData:', error);
    results.failed.push('initialization');
    results.errors.push(error.message || 'Unknown error occurred during user data creation');
    return {
      success: false,
      error: error.message || 'Unknown error occurred during user data creation',
      results
    };
  }
}

/**
 * Checks if user has all required data, creates missing pieces
 * This fixes the login issue for users with incomplete profiles
 */
export async function ensureUserDataCompleteness(userId) {
  console.log(`🔍 Checking data completeness for user: ${userId}`);

  try {
    const client = getClient();

    // Call the same initialization mutation - it's idempotent
    // It will only create records that don't exist
    await client.mutation(api.initUser.initializeCurrentUser, {});

    console.log('✅ Data completeness check finished via Convex');

    return {
      success: true,
      created: [], // The mutation handles this internally
      failed: []
    };

  } catch (error) {
    console.error('❌ Error checking user data completeness:', error);
    return { success: false, error: error.message, created: [], failed: [] };
  }
}

/**
 * Demo data creation for testing (creates more realistic data)
 * Note: This is simplified for Convex - demo data would need specific Convex mutations
 */
export async function createDemoUserData(userId) {
  console.log(`Creating demo data for user: ${userId}`);

  try {
    // First create initial data
    await createInitialUserData(userId, {
      fullName: 'Demo User',
      avatarUrl: null
    });

    // TODO: Add demo sessions, tasks, and achievements if needed
    // This would require separate Convex mutations

    return { success: true };
  } catch (error) {
    console.error('Error creating demo data:', error);
    return { success: false, error: error.message };
  }
}
