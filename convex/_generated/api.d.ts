/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as achievements from "../achievements.js";
import type * as aiInsights from "../aiInsights.js";
import type * as focusSessions from "../focusSessions.js";
import type * as friends from "../friends.js";
import type * as http from "../http.js";
import type * as initUser from "../initUser.js";
import type * as inventory from "../inventory.js";
import type * as leaderboard from "../leaderboard.js";
import type * as learningMetrics from "../learningMetrics.js";
import type * as messages from "../messages.js";
import type * as noraChat from "../noraChat.js";
import type * as onboarding from "../onboarding.js";
import type * as patrickChat from "../patrickChat.js";
import type * as settings from "../settings.js";
import type * as studyRooms from "../studyRooms.js";
import type * as subjects from "../subjects.js";
import type * as subtasks from "../subtasks.js";
import type * as tasks from "../tasks.js";
import type * as transcribe from "../transcribe.js";
import type * as users from "../users.js";
import type * as webhookHelpers from "../webhookHelpers.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  achievements: typeof achievements;
  aiInsights: typeof aiInsights;
  focusSessions: typeof focusSessions;
  friends: typeof friends;
  http: typeof http;
  initUser: typeof initUser;
  inventory: typeof inventory;
  leaderboard: typeof leaderboard;
  learningMetrics: typeof learningMetrics;
  messages: typeof messages;
  noraChat: typeof noraChat;
  onboarding: typeof onboarding;
  patrickChat: typeof patrickChat;
  settings: typeof settings;
  studyRooms: typeof studyRooms;
  subjects: typeof subjects;
  subtasks: typeof subtasks;
  tasks: typeof tasks;
  transcribe: typeof transcribe;
  users: typeof users;
  webhookHelpers: typeof webhookHelpers;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
