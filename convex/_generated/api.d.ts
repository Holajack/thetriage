/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as achievementRules from "../achievementRules.js";
import type * as achievements from "../achievements.js";
import type * as aiInsights from "../aiInsights.js";
import type * as aiShared from "../aiShared.js";
import type * as appConfig from "../appConfig.js";
import type * as crons from "../crons.js";
import type * as ebooks from "../ebooks.js";
import type * as events from "../events.js";
import type * as focusSessions from "../focusSessions.js";
import type * as friends from "../friends.js";
import type * as http from "../http.js";
import type * as initUser from "../initUser.js";
import type * as inventory from "../inventory.js";
import type * as leaderboard from "../leaderboard.js";
import type * as learningMetrics from "../learningMetrics.js";
import type * as messages from "../messages.js";
import type * as noraChat from "../noraChat.js";
import type * as noraMemory from "../noraMemory.js";
import type * as noraNotifications from "../noraNotifications.js";
import type * as noraOnboarding from "../noraOnboarding.js";
import type * as noraSessions from "../noraSessions.js";
import type * as onboarding from "../onboarding.js";
import type * as patrickChat from "../patrickChat.js";
import type * as promoCodes from "../promoCodes.js";
import type * as quizBulkLoad from "../quizBulkLoad.js";
import type * as quizNoraIntegration from "../quizNoraIntegration.js";
import type * as quizQuestionData from "../quizQuestionData.js";
import type * as quizQuestions from "../quizQuestions.js";
import type * as quizSeed from "../quizSeed.js";
import type * as quizSessions from "../quizSessions.js";
import type * as quizVisualization from "../quizVisualization.js";
import type * as seedAdminUser from "../seedAdminUser.js";
import type * as settings from "../settings.js";
import type * as shopCatalog from "../shopCatalog.js";
import type * as studyRooms from "../studyRooms.js";
import type * as subjects from "../subjects.js";
import type * as subtasks from "../subtasks.js";
import type * as tasks from "../tasks.js";
import type * as tiers from "../tiers.js";
import type * as timeWindows from "../timeWindows.js";
import type * as transcribe from "../transcribe.js";
import type * as users from "../users.js";
import type * as webhookHelpers from "../webhookHelpers.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  achievementRules: typeof achievementRules;
  achievements: typeof achievements;
  aiInsights: typeof aiInsights;
  aiShared: typeof aiShared;
  appConfig: typeof appConfig;
  crons: typeof crons;
  ebooks: typeof ebooks;
  events: typeof events;
  focusSessions: typeof focusSessions;
  friends: typeof friends;
  http: typeof http;
  initUser: typeof initUser;
  inventory: typeof inventory;
  leaderboard: typeof leaderboard;
  learningMetrics: typeof learningMetrics;
  messages: typeof messages;
  noraChat: typeof noraChat;
  noraMemory: typeof noraMemory;
  noraNotifications: typeof noraNotifications;
  noraOnboarding: typeof noraOnboarding;
  noraSessions: typeof noraSessions;
  onboarding: typeof onboarding;
  patrickChat: typeof patrickChat;
  promoCodes: typeof promoCodes;
  quizBulkLoad: typeof quizBulkLoad;
  quizNoraIntegration: typeof quizNoraIntegration;
  quizQuestionData: typeof quizQuestionData;
  quizQuestions: typeof quizQuestions;
  quizSeed: typeof quizSeed;
  quizSessions: typeof quizSessions;
  quizVisualization: typeof quizVisualization;
  seedAdminUser: typeof seedAdminUser;
  settings: typeof settings;
  shopCatalog: typeof shopCatalog;
  studyRooms: typeof studyRooms;
  subjects: typeof subjects;
  subtasks: typeof subtasks;
  tasks: typeof tasks;
  tiers: typeof tiers;
  timeWindows: typeof timeWindows;
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
