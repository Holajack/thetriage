import { supabase } from './supabase';

export interface MusicPreferences {
  sound_preference: string;
  auto_play_sound: boolean;
  music_volume: number;
}

// Centralized music preference management
export const getMusicPreferences = async (userId: string): Promise<MusicPreferences> => {
  try {
    // Priority order: onboarding_preferences > profiles > user_settings (for sound_enabled only)
    const [settingsResult, onboardingResult, profileResult] = await Promise.all([
      supabase.from('user_settings').select('sound_enabled').eq('user_id', userId).single(),
      supabase.from('onboarding_preferences').select('sound_preference, auto_play_sound').eq('user_id', userId).single(),
      supabase.from('profiles').select('soundpreference').eq('id', userId).single()
    ]);

    const settings = settingsResult.data;
    const onboarding = onboardingResult.data;
    const profile = profileResult.data;

    return {
      sound_preference: onboarding?.sound_preference || 
                       profile?.soundpreference || 
                       'Lo-Fi',
      auto_play_sound: onboarding?.auto_play_sound || settings?.sound_enabled || false,
      music_volume: 0.7 // Default volume since it's not stored in database
    };
  } catch (error) {
    console.error('Error getting music preferences:', error);
    return {
      sound_preference: 'Lo-Fi',
      auto_play_sound: false,
      music_volume: 0.7
    };
  }
};

export const saveMusicPreferences = async (userId: string, preferences: Partial<MusicPreferences>): Promise<void> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      throw new Error('No authenticated user');
    }

    // Update user_settings table (only sound_enabled field exists)
    if (preferences.auto_play_sound !== undefined) {
      const { error: settingsError } = await supabase
        .from('user_settings')
        .upsert({
          user_id: userId,
          sound_enabled: preferences.auto_play_sound,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'  // Handle unique constraint properly
        });

      if (settingsError) {
        console.error('Error updating user_settings:', settingsError);
      }
    }

    // Update onboarding_preferences table for sound preference and auto_play_sound
    if (preferences.sound_preference || preferences.auto_play_sound !== undefined) {
      const updateData: any = {
        user_id: userId,
        updated_at: new Date().toISOString()
      };

      if (preferences.sound_preference) {
        updateData.sound_preference = preferences.sound_preference;
      }
      if (preferences.auto_play_sound !== undefined) {
        updateData.auto_play_sound = preferences.auto_play_sound;
      }

      await supabase
        .from('onboarding_preferences')
        .upsert(updateData, {
          onConflict: 'user_id'  // Handle unique constraint properly
        });
    }

    // Update profiles table (note: different field name for legacy support)
    if (preferences.sound_preference) {
      await supabase
        .from('profiles')
        .upsert({
          id: userId,
          soundpreference: preferences.sound_preference,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'  // Handle unique constraint properly
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