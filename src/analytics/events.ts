/**
 * Product analytics — the beta event vocabulary.
 *
 * Before this, HikeWise fired zero events of any kind, so a beta would have told
 * us nothing about where testers dropped off. These are the events that answer
 * the questions that matter for beta:
 *
 *   Did they finish onboarding?          onboarding_* / signup_completed
 *   Did they reach a first win?           session_started -> session_completed
 *   Did they come back?                   app_opened (+ day2_return)
 *   Where did they quit?                  session_abandoned, paywall_viewed
 *   Did the social loop work?             invite_sent / invite_accepted
 *
 * Keep this list SHORT and stable. An event nobody reads is just noise.
 */

export const AnalyticsEvent = {
  // Lifecycle
  APP_OPENED: "app_opened",
  DAY2_RETURN: "day2_return",

  // Activation funnel
  SIGNUP_COMPLETED: "signup_completed",
  ONBOARDING_STEP_COMPLETED: "onboarding_step_completed",
  ONBOARDING_COMPLETED: "onboarding_completed",

  // Core loop — the thing the whole app exists for
  SESSION_STARTED: "session_started",
  SESSION_COMPLETED: "session_completed",
  SESSION_ABANDONED: "session_abandoned",
  BREAK_COMPLETED: "break_completed",

  // Supporting actions
  TASK_CREATED: "task_created",
  TASK_COMPLETED: "task_completed",
  ACHIEVEMENT_UNLOCKED: "achievement_unlocked",
  BRAIN_MAP_OPENED: "brain_map_opened",
  QUIZ_COMPLETED: "quiz_completed",

  // Community
  ROOM_CREATED: "room_created",
  ROOM_JOINED: "room_joined",
  INVITE_SENT: "invite_sent",
  INVITE_ACCEPTED: "invite_accepted",
  FRIEND_ADDED: "friend_added",

  // Monetization
  PAYWALL_VIEWED: "paywall_viewed",
  UPGRADE_STARTED: "upgrade_started",
  UPGRADE_COMPLETED: "upgrade_completed",
} as const;

export type AnalyticsEventName =
  (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];

/** Small, non-PII payload. Ids, counts, durations, enum-ish strings only. */
export type AnalyticsProps = Record<
  string,
  string | number | boolean | null | undefined
>;
