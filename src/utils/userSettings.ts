// Create this new file for user settings management

import { supabase } from './supabase';

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
  daily_goal_minutes?: number;
  preferred_session_length?: number;
  preferred_break_length?: number;
  timezone?: string;
  language?: string;
  vibration_enabled?: boolean;
}

/**
 * Get user settings from database
 */
export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user settings:', error);
      return null;
    }

    return data;
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
    // First check if settings exist for this user
    const { data: existingSettings } = await supabase
      .from('user_settings')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (existingSettings) {
      // Update existing settings
      const { error } = await supabase
        .from('user_settings')
        .update({
          ...settings,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating existing user settings:', error);
        return false;
      }
    } else {
      // Insert new settings
      const { error } = await supabase
        .from('user_settings')
        .insert({
          user_id: userId,
          ...settings,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error creating new user settings:', error);
        return false;
      }
    }

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