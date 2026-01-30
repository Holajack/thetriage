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

export interface MusicPreferences {
  sound_preference: string;
  auto_play_sound: boolean;
  music_volume: number;
}

// Centralized music preference management
export const getMusicPreferences = async (userId: string): Promise<MusicPreferences> => {
  try {
    const client = getClient();

    // Fetch data from Convex (parallel queries)
    const [settings, onboarding, user] = await Promise.all([
      client.query(api.settings.get, {}),
      client.query(api.onboarding.get, {}),
      client.query(api.users.me, {}),
    ]);

    // Priority order: onboarding > user profile > default
    const soundPreference = onboarding?.focusMethod || user?.soundPreference || 'Lo-Fi';
    const autoPlaySound = settings?.autoPlaySound || settings?.soundEnabled || false;
    const musicVolume = settings?.musicVolume || 0.7;

    return {
      sound_preference: soundPreference,
      auto_play_sound: autoPlaySound,
      music_volume: musicVolume,
    };
  } catch (error) {
    console.error('Error getting music preferences:', error);
    return {
      sound_preference: 'Lo-Fi',
      auto_play_sound: false,
      music_volume: 0.7,
    };
  }
};

export const saveMusicPreferences = async (userId: string, preferences: Partial<MusicPreferences>): Promise<void> => {
  try {
    const client = getClient();

    // Update settings if auto_play_sound or music_volume changed
    if (preferences.auto_play_sound !== undefined || preferences.music_volume !== undefined) {
      const settingsUpdate: any = {};
      if (preferences.auto_play_sound !== undefined) {
        settingsUpdate.autoPlaySound = preferences.auto_play_sound;
        settingsUpdate.soundEnabled = preferences.auto_play_sound;
      }
      if (preferences.music_volume !== undefined) {
        settingsUpdate.musicVolume = preferences.music_volume;
      }

      await client.mutation(api.settings.update, settingsUpdate);
    }

    // Update onboarding preferences if sound_preference changed
    if (preferences.sound_preference) {
      await client.mutation(api.onboarding.update, {
        focusMethod: preferences.sound_preference,
      });
    }

    // Update user profile if sound_preference changed
    if (preferences.sound_preference) {
      await client.mutation(api.users.updateProfile, {
        soundPreference: preferences.sound_preference,
      });
    }

    console.log('✅ Music preferences saved successfully:', preferences);
  } catch (error) {
    console.error('❌ Error saving music preferences:', error);
    throw error;
  }
};

// Helper function to get just the sound preference string
export const getSoundPreference = (userData: any): string => {
  return userData?.onboarding?.sound_preference ||
         userData?.profile?.soundpreference ||
         userData?.profile?.sound_preference ||
         'Lo-Fi';
};

// Helper function to get auto-play setting
export const getAutoPlaySetting = (userData: any): boolean => {
  // If user has a sound preference set but no explicit auto_play_sound setting,
  // default to true for better user experience
  const hasExplicitAutoPlay = userData?.onboarding?.auto_play_sound !== undefined;
  const hasSoundPreference = userData?.onboarding?.sound_preference || userData?.profile?.soundpreference;

  return userData?.onboarding?.auto_play_sound ||
         userData?.settings?.sound_enabled ||
         (!hasExplicitAutoPlay && hasSoundPreference && hasSoundPreference !== 'Silence') ||
         false;
};

// Helper function to get music volume
export const getMusicVolume = (userData: any): number => {
  return 0.7; // Default volume since it's not stored in database
};
