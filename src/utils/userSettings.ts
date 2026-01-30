import { ConvexReactClient } from "convex/react";
import { api } from "../../convex/_generated/api";

let _convexClient: ConvexReactClient | null = null;

export function setConvexClient(client: ConvexReactClient) {
  _convexClient = client;
}

function getClient(): ConvexReactClient {
  if (!_convexClient) throw new Error("Convex client not initialized");
  return _convexClient;
}

export interface UserSettings {
  auto_play_sound?: boolean;
  sound_enabled?: boolean;
  music_volume?: number;
  theme?: 'light' | 'dark' | 'auto';
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
}

/**
 * Get user settings from database
 */
export async function getUserSettings(userId?: string): Promise<UserSettings | null> {
  try {
    const client = getClient();
    const settings = await client.query(api.settings.get, {});

    if (!settings) {
      console.warn('No settings found for current user');
      return null;
    }

    // Convert Convex camelCase to snake_case for backward compatibility
    return {
      auto_play_sound: settings.autoPlaySound,
      sound_enabled: settings.soundEnabled,
      music_volume: settings.musicVolume,
      theme: settings.theme as 'light' | 'dark' | 'auto',
      notifications_enabled: settings.notificationsEnabled,
      auto_start_breaks: settings.autoStartBreaks,
      auto_start_focus: settings.autoStartFocus,
      auto_dnd_focus: settings.autoDndFocus,
      daily_goal_minutes: settings.dailyGoalMinutes,
      preferred_session_length: settings.preferredSessionLength,
      preferred_break_length: settings.breakLength,
    };
  } catch (error) {
    console.error('Error in getUserSettings:', error);
    return null;
  }
}

/**
 * Update user settings in database
 */
export async function updateUserSettings(userId: string, settings: UserSettings): Promise<boolean> {
  try {
    const client = getClient();

    // Convert snake_case to camelCase for Convex
    const convexSettings: any = {};

    if (settings.auto_play_sound !== undefined) convexSettings.autoPlaySound = settings.auto_play_sound;
    if (settings.sound_enabled !== undefined) convexSettings.soundEnabled = settings.sound_enabled;
    if (settings.music_volume !== undefined) convexSettings.musicVolume = settings.music_volume;
    if (settings.theme !== undefined) convexSettings.theme = settings.theme;
    if (settings.notifications_enabled !== undefined) convexSettings.notificationsEnabled = settings.notifications_enabled;
    if (settings.auto_start_breaks !== undefined) convexSettings.autoStartBreaks = settings.auto_start_breaks;
    if (settings.auto_start_focus !== undefined) convexSettings.autoStartFocus = settings.auto_start_focus;
    if (settings.auto_dnd_focus !== undefined) convexSettings.autoDndFocus = settings.auto_dnd_focus;
    if (settings.daily_goal_minutes !== undefined) convexSettings.dailyGoalMinutes = settings.daily_goal_minutes;
    if (settings.preferred_session_length !== undefined) convexSettings.preferredSessionLength = settings.preferred_session_length;
    if (settings.preferred_break_length !== undefined) convexSettings.breakLength = settings.preferred_break_length;

    await client.mutation(api.settings.update, convexSettings);

    console.log('✅ User settings updated successfully');
    return true;
  } catch (error) {
    console.error('Error in updateUserSettings:', error);
    return false;
  }
}

/**
 * Create initial user settings for new users
 */
export async function createInitialUserSettings(userId: string): Promise<boolean> {
  try {
    const defaultSettings: UserSettings = {
      auto_play_sound: false,
      sound_enabled: true,
      music_volume: 0.5,
      theme: 'auto',
      notifications_enabled: true,
      study_reminders: true,
      break_reminders: true,
      auto_start_breaks: false,
      auto_start_focus: false,
      auto_dnd_focus: false,
      daily_goal_minutes: 120,
      preferred_session_length: 25,
      preferred_break_length: 5,
      timezone: 'UTC',
      language: 'en',
      vibration_enabled: true,
    };

    return await updateUserSettings(userId, defaultSettings);
  } catch (error) {
    console.error('Error creating initial user settings:', error);
    return false;
  }
}
