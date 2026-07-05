import { api } from "../../convex/_generated/api";
import { getConvexClient } from "./convexClient";

export interface UserSettings {
  auto_play_sound?: boolean;
  sound_enabled?: boolean;
  music_volume?: number;
  theme?: "light" | "dark" | "auto";
  notifications_enabled?: boolean;
  study_reminders?: boolean;
  break_reminders?: boolean;
  auto_start_breaks?: boolean;
  auto_start_focus?: boolean;
  auto_dnd_focus?: boolean;
  daily_goal_minutes?: number;
  preferred_session_length?: number;
  preferred_break_length?: number;
  timezone?: string;
  language?: string;
  vibration_enabled?: boolean;
  workStyle?: string;
  focus_duration?: number;
  break_duration?: number;
  // Notifications & reminders
  daily_reminder?: string;
  session_end_reminder?: boolean;
  notif_friend_requests?: boolean;
  notif_friend_messages?: boolean;
  notif_study_room_invites?: boolean;
  notif_qr_scans?: boolean;
  study_reminders_enabled?: boolean;
  weekly_goal_reminders_enabled?: boolean;
  weekly_goal_reminder_days?: string[];
  focus_session_warnings_enabled?: boolean;
  app_updates_enabled?: boolean;
  // AI feature toggles
  nora_enabled?: boolean;
  patrick_enabled?: boolean;
  insights_enabled?: boolean;
  personalized_responses?: boolean;
  // Accessibility
  tts_enabled?: boolean;
  high_contrast?: boolean;
  reduce_motion?: boolean;
  // Ambient sound toggles
  ambientEnvironmentEnabled?: boolean;
  ambientWhiteNoiseEnabled?: boolean;
  ambientCrittersEnabled?: boolean;
  ambientVolume?: number;
  // Music service preferences
  preferredMusicService?: string;
  appleMusicConnected?: boolean;
}

/**
 * Get user settings from database
 */
export async function getUserSettings(
  userId?: string,
): Promise<UserSettings | null> {
  try {
    const client = getConvexClient();
    const settings = await client.query(api.settings.get, {});

    if (!settings) {
      // No settings found for current user
      return null;
    }

    // Convert Convex camelCase to snake_case for backward compatibility
    return {
      auto_play_sound: settings.autoPlaySound,
      sound_enabled: settings.soundEnabled,
      music_volume: settings.musicVolume,
      theme: settings.theme as "light" | "dark" | "auto",
      notifications_enabled: settings.notificationsEnabled,
      auto_start_breaks: settings.autoStartBreaks,
      auto_start_focus: settings.autoStartFocus,
      auto_dnd_focus: settings.autoDndFocus,
      daily_goal_minutes: settings.dailyGoalMinutes,
      preferred_session_length: settings.preferredSessionLength,
      preferred_break_length: settings.breakLength,
      daily_reminder: settings.dailyReminder,
      session_end_reminder: settings.sessionEndReminder,
      notif_friend_requests: settings.notifFriendRequests,
      notif_friend_messages: settings.notifFriendMessages,
      notif_study_room_invites: settings.notifStudyRoomInvites,
      notif_qr_scans: settings.notifQrScans,
      study_reminders_enabled: settings.studyRemindersEnabled,
      weekly_goal_reminders_enabled: settings.weeklyGoalRemindersEnabled,
      weekly_goal_reminder_days: settings.weeklyGoalReminderDays,
      focus_session_warnings_enabled: settings.focusSessionWarningsEnabled,
      app_updates_enabled: settings.appUpdatesEnabled,
      nora_enabled: settings.noraEnabled,
      patrick_enabled: settings.patrickEnabled,
      insights_enabled: settings.insightsEnabled,
      personalized_responses: settings.personalizedResponses,
      tts_enabled: settings.ttsEnabled,
      high_contrast: settings.highContrast,
      reduce_motion: settings.reduceMotion,
      ambientEnvironmentEnabled: settings.ambientEnvironmentEnabled,
      ambientWhiteNoiseEnabled: settings.ambientWhiteNoiseEnabled,
      ambientCrittersEnabled: settings.ambientCrittersEnabled,
      ambientVolume: settings.ambientVolume,
      appleMusicConnected: settings.appleMusicConnected,
    };
  } catch (error) {
    // Error in getUserSettings
    return null;
  }
}

/**
 * Update user settings in database
 */
export async function updateUserSettings(
  userId: string,
  settings: UserSettings,
): Promise<boolean> {
  try {
    const client = getConvexClient();

    // Convert snake_case to camelCase for Convex
    const convexSettings: any = {};

    if (settings.auto_play_sound !== undefined)
      convexSettings.autoPlaySound = settings.auto_play_sound;
    if (settings.sound_enabled !== undefined)
      convexSettings.soundEnabled = settings.sound_enabled;
    if (settings.music_volume !== undefined)
      convexSettings.musicVolume = settings.music_volume;
    if (settings.theme !== undefined) convexSettings.theme = settings.theme;
    if (settings.notifications_enabled !== undefined)
      convexSettings.notificationsEnabled = settings.notifications_enabled;
    if (settings.auto_start_breaks !== undefined)
      convexSettings.autoStartBreaks = settings.auto_start_breaks;
    if (settings.auto_start_focus !== undefined)
      convexSettings.autoStartFocus = settings.auto_start_focus;
    if (settings.auto_dnd_focus !== undefined)
      convexSettings.autoDndFocus = settings.auto_dnd_focus;
    if (settings.daily_goal_minutes !== undefined)
      convexSettings.dailyGoalMinutes = settings.daily_goal_minutes;
    if (settings.preferred_session_length !== undefined)
      convexSettings.preferredSessionLength = settings.preferred_session_length;
    if (settings.preferred_break_length !== undefined)
      convexSettings.breakLength = settings.preferred_break_length;
    // Ambient sound and music service settings (already camelCase)
    if (settings.ambientEnvironmentEnabled !== undefined)
      convexSettings.ambientEnvironmentEnabled =
        settings.ambientEnvironmentEnabled;
    if (settings.ambientWhiteNoiseEnabled !== undefined)
      convexSettings.ambientWhiteNoiseEnabled =
        settings.ambientWhiteNoiseEnabled;
    if (settings.ambientCrittersEnabled !== undefined)
      convexSettings.ambientCrittersEnabled = settings.ambientCrittersEnabled;
    if (settings.ambientVolume !== undefined)
      convexSettings.ambientVolume = settings.ambientVolume;
    if (settings.preferredMusicService !== undefined)
      convexSettings.preferredMusicService = settings.preferredMusicService;
    if (settings.appleMusicConnected !== undefined)
      convexSettings.appleMusicConnected = settings.appleMusicConnected;
    // Notifications & reminders
    if (settings.daily_reminder !== undefined)
      convexSettings.dailyReminder = settings.daily_reminder;
    if (settings.session_end_reminder !== undefined)
      convexSettings.sessionEndReminder = settings.session_end_reminder;
    if (settings.notif_friend_requests !== undefined)
      convexSettings.notifFriendRequests = settings.notif_friend_requests;
    if (settings.notif_friend_messages !== undefined)
      convexSettings.notifFriendMessages = settings.notif_friend_messages;
    if (settings.notif_study_room_invites !== undefined)
      convexSettings.notifStudyRoomInvites = settings.notif_study_room_invites;
    if (settings.notif_qr_scans !== undefined)
      convexSettings.notifQrScans = settings.notif_qr_scans;
    if (settings.study_reminders_enabled !== undefined)
      convexSettings.studyRemindersEnabled = settings.study_reminders_enabled;
    if (settings.weekly_goal_reminders_enabled !== undefined)
      convexSettings.weeklyGoalRemindersEnabled =
        settings.weekly_goal_reminders_enabled;
    if (settings.weekly_goal_reminder_days !== undefined)
      convexSettings.weeklyGoalReminderDays =
        settings.weekly_goal_reminder_days;
    if (settings.focus_session_warnings_enabled !== undefined)
      convexSettings.focusSessionWarningsEnabled =
        settings.focus_session_warnings_enabled;
    if (settings.app_updates_enabled !== undefined)
      convexSettings.appUpdatesEnabled = settings.app_updates_enabled;
    // AI feature toggles
    if (settings.nora_enabled !== undefined)
      convexSettings.noraEnabled = settings.nora_enabled;
    if (settings.patrick_enabled !== undefined)
      convexSettings.patrickEnabled = settings.patrick_enabled;
    if (settings.insights_enabled !== undefined)
      convexSettings.insightsEnabled = settings.insights_enabled;
    if (settings.personalized_responses !== undefined)
      convexSettings.personalizedResponses = settings.personalized_responses;
    // Accessibility
    if (settings.tts_enabled !== undefined)
      convexSettings.ttsEnabled = settings.tts_enabled;
    if (settings.high_contrast !== undefined)
      convexSettings.highContrast = settings.high_contrast;
    if (settings.reduce_motion !== undefined)
      convexSettings.reduceMotion = settings.reduce_motion;

    await client.mutation(api.settings.update, convexSettings);

    // User settings updated
    return true;
  } catch (error) {
    // Error in updateUserSettings
    return false;
  }
}

/**
 * Create initial user settings for new users
 */
async function createInitialUserSettings(userId: string): Promise<boolean> {
  try {
    const defaultSettings: UserSettings = {
      auto_play_sound: true,
      sound_enabled: true,
      music_volume: 0.5,
      theme: "auto",
      notifications_enabled: true,
      study_reminders: true,
      break_reminders: true,
      auto_start_breaks: false,
      auto_start_focus: false,
      auto_dnd_focus: false,
      daily_goal_minutes: 120,
      preferred_session_length: 25,
      preferred_break_length: 5,
      timezone: "UTC",
      language: "en",
      vibration_enabled: true,
    };

    return await updateUserSettings(userId, defaultSettings);
  } catch (error) {
    // Error creating initial user settings
    return false;
  }
}
