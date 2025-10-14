// src/hooks/useBackgroundMusic.ts - Fixed with correct audio file paths
import { Audio } from 'expo-av';
import { AppState } from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { Asset } from 'expo-asset';

// Check if expo-av is available
let audioSupported = false;
try {
  audioSupported = !!Audio;
} catch (error) {
  console.warn('expo-av not available, music playback disabled');
}

export type MusicCategory = 'Ambient' | 'Nature' | 'Classical' | 'Lo-Fi' | 'Jazz Ambient';

export type MusicTrack = {
  id: string;
  name: string;
  displayName: string;
  url: string;
  category: MusicCategory;
  duration?: number;
  file_size?: number;
};

// Import local audio files from assets - CORRECTED PATHS
const LOCAL_AUDIO_FILES: Record<MusicCategory, any[]> = {
  'Ambient': [
    require('../../assets/music/Ambient/Epic Spectrum - Wallflower (freetouse.com).mp3'),
    require('../../assets/music/Ambient/Pufino - Creek (freetouse.com).mp3'),
    require('../../assets/music/Ambient/Pufino - Flourish (freetouse.com).mp3'),
  ],
  'Nature': [
    require('../../assets/music/Nature/Windy trees in mountain forest.mp3'),
  ],
  'Classical': [
    require('../../assets/music/Classical/Aeris - Sky With Yellow Spots (freetouse.com).mp3'),
    require('../../assets/music/Classical/Alegend - Wings of Freedom (freetouse.com).mp3'),
    require('../../assets/music/Classical/Epic Spectrum - Sky Clearing (freetouse.com).mp3'),
    require('../../assets/music/Classical/Guillermo Guareschi - Farewell (freetouse.com).mp3'),
    require('../../assets/music/Classical/Walen - Dragon Kingdom (freetouse.com).mp3'),
  ],
  'Lo-Fi': [
    require('../../assets/music/lo-fi/Lukrembo - Biscuit (freetouse.com).mp3'),
    require('../../assets/music/lo-fi/Lukrembo - Donut (freetouse.com).mp3'),
    require('../../assets/music/lo-fi/Lukrembo - Marshmallow (freetouse.com).mp3'),
    require('../../assets/music/lo-fi/Lukrembo - Sunset (freetouse.com).mp3'),
    require('../../assets/music/lo-fi/massobeats - honey jam (freetouse.com).mp3'),
  ],
  'Jazz Ambient': [
    require('../../assets/music/jazz-ambient/Aylex - Italy (freetouse.com).mp3'),
    require('../../assets/music/jazz-ambient/Hazelwood - At Ease (freetouse.com).mp3'),
    require('../../assets/music/jazz-ambient/Lukrembo - Cheese (freetouse.com).mp3'),
    require('../../assets/music/jazz-ambient/Lukrembo - Sunset (freetouse.com).mp3'),
    require('../../assets/music/jazz-ambient/Moavii - Downtown (freetouse.com).mp3'),
    require('../../assets/music/jazz-ambient/Pufino - Fantasy (freetouse.com).mp3'),
  ],
};

export const useBackgroundMusic = () => {
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [currentPlaylist, setCurrentPlaylist] = useState<any[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [volume, setVolume] = useState(0.7);

  // Sound refs
  const primarySound = useRef<Audio.Sound | null>(null);
  const secondarySound = useRef<Audio.Sound | null>(null);
  const previewSound = useRef<Audio.Sound | null>(null);
  const previewTimeout = useRef<NodeJS.Timeout | null>(null);

  // App state ref for background handling
  const appStateRef = useRef(AppState.currentState);

  // Handle app state changes to prevent music interruption
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('🎵 App returned to foreground - keeping music playing');
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  // Simplified audio initialization that works reliably
  const initializeAudio = async () => {
    try {
      if (audioSupported) {
        await Audio.setAudioModeAsync({
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: false,
          playThroughEarpieceAndroid: false,
        });
        console.log('🎵 Audio configured successfully');
      }
    } catch (error) {
      console.error('🎵 Failed to configure audio mode:', error);
    }
  };

  // Initialize audio on mount
  useEffect(() => {
    initializeAudio();
  }, []);

  // Get tracks from local assets with corrected paths
  const getTracksFromCategory = useCallback(async (category: MusicCategory): Promise<MusicTrack[]> => {
    try {
      console.log(`🎵 Getting tracks from local assets, category: ${category}`);
      
      const audioFiles = LOCAL_AUDIO_FILES[category];
      
      if (!audioFiles || audioFiles.length === 0) {
        console.log(`❌ No audio files found for category: ${category}`);
        return [];
      }

      console.log(`🎵 Found ${audioFiles.length} files for ${category}`);
      
      // Enhanced file display names
      const fileDisplayNames: Record<string, string> = {
        // Ambient tracks (3)
        'Epic Spectrum - Wallflower (freetouse.com).mp3': 'Wallflower - Epic Spectrum',
        'Pufino - Creek (freetouse.com).mp3': 'Creek - Pufino',
        'Pufino - Flourish (freetouse.com).mp3': 'Flourish - Pufino',
        
        // Nature tracks (1)
        'Windy trees in mountain forest.mp3': 'Windy Trees in Mountain Forest',
        
        // Classical tracks (5)
        'Aeris - Sky With Yellow Spots (freetouse.com).mp3': 'Sky With Yellow Spots - Aeris',
        'Alegend - Wings of Freedom (freetouse.com).mp3': 'Wings of Freedom - Alegend',
        'Epic Spectrum - Sky Clearing (freetouse.com).mp3': 'Sky Clearing - Epic Spectrum',
        'Guillermo Guareschi - Farewell (freetouse.com).mp3': 'Farewell - Guillermo Guareschi',
        'Walen - Dragon Kingdom (freetouse.com).mp3': 'Dragon Kingdom - Walen',
        
        // Lo-Fi tracks (5)
        'Lukrembo - Biscuit (freetouse.com).mp3': 'Biscuit - Lukrembo',
        'Lukrembo - Donut (freetouse.com).mp3': 'Donut - Lukrembo',
        'Lukrembo - Marshmallow (freetouse.com).mp3': 'Marshmallow - Lukrembo',
        'Lukrembo - Sunset (freetouse.com).mp3': 'Sunset - Lukrembo',
        'massobeats - honey jam (freetouse.com).mp3': 'Honey Jam - massobeats',
        
        // Jazz Ambient tracks (6)
        'Aylex - Italy (freetouse.com).mp3': 'Italy - Aylex',
        'Hazelwood - At Ease (freetouse.com).mp3': 'At Ease - Hazelwood',
        'Lukrembo - Cheese (freetouse.com).mp3': 'Cheese - Lukrembo',
        'Lukrembo - Sunset (freetouse.com).mp3': 'Sunset - Lukrembo (Jazz)',
        'Moavii - Downtown (freetouse.com).mp3': 'Downtown - Moavii',
        'Pufino - Fantasy (freetouse.com).mp3': 'Fantasy - Pufino',
      };
      
      const tracks: MusicTrack[] = [];
      
      for (let i = 0; i < audioFiles.length; i++) {
        const audioFile = audioFiles[i];
        
        try {
          // Load the asset to get the local URI
          const asset = Asset.fromModule(audioFile);
          await asset.downloadAsync();
          
          // Extract filename for display name lookup
          const assetUri = asset.uri || asset.localUri || '';
          const filename = assetUri.split('/').pop() || `${category} Track ${i + 1}`;
          const displayName = fileDisplayNames[filename] || filename.replace(/\.(mp3|wav|m4a)$/i, '');
          
          const track: MusicTrack = {
            id: `${category}-${i + 1}`,
            name: filename,
            displayName: displayName,
            url: asset.localUri || asset.uri,
            category,
          };
          
          tracks.push(track);
          console.log(`🎵 Loaded track: ${track.displayName} - ${track.url}`);
        } catch (assetError) {
          console.warn(`Failed to load asset for ${category} track ${i + 1}:`, assetError);
        }
      }
      
      console.log(`🎵 Successfully loaded ${tracks.length} tracks for ${category}`);
      return tracks;
      
    } catch (error) {
      console.error(`Error getting tracks for ${category}:`, error);
      return [];
    }
  }, []);

  // Play a 10-second preview of a category
  const playPreview = useCallback(async (soundPreference: string) => {
    console.log(`🎵 Preview request for: ${soundPreference}`);
    
    if (!audioSupported) {
      console.warn('Audio not supported for preview');
      Alert.alert('Audio Error', 'Audio playback not supported on this device');
      return;
    }

    try {
      // Stop any existing preview
      await stopPreview();
      
      const category = soundPreference as MusicCategory;
      console.log(`🎵 Preview mapped to category: ${category}`);
      
      setIsLoading(true);
      setIsPreviewMode(true);
      
      const tracks = await getTracksFromCategory(category);
      console.log(`🎵 Preview found ${tracks.length} tracks in ${category}`);
      
      if (tracks.length === 0) {
        console.warn(`No tracks found in ${category} category for preview`);
        Alert.alert('No Music Found', `No audio files found in the ${soundPreference} category.`);
        return;
      }

      // Play the first track as preview
      const track = tracks[0];
      console.log(`🎵 Previewing track: ${track.displayName}`);
      console.log(`🎵 Track URL: ${track.url}`);
      
      if (!track.url) {
        Alert.alert('Audio Error', 'Track URL is missing or invalid');
        return;
      }

      console.log(`🎵 Creating audio sound for: ${track.url}`);
      const { sound } = await Audio.Sound.createAsync(
        { uri: track.url },
        { 
          shouldPlay: true,
          isLooping: false,
          volume: volume
        }
      );

      previewSound.current = sound;
      setCurrentTrack(track);
      setIsPlaying(true);
      console.log(`🎵 Preview started successfully for: ${track.displayName}`);

      // Stop preview after 10 seconds
      previewTimeout.current = setTimeout(async () => {
        console.log(`🎵 Preview timeout reached, stopping`);
        await stopPreview();
      }, 10000);

    } catch (error) {
      console.error('Error playing preview:', error);
      Alert.alert('Preview Error', `Unable to play preview: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [getTracksFromCategory, volume]);

  const stopPreview = useCallback(async () => {
    try {
      if (previewTimeout.current) {
        clearTimeout(previewTimeout.current);
        previewTimeout.current = null;
      }
      
      if (previewSound.current) {
        await previewSound.current.unloadAsync();
        previewSound.current = null;
      }
      
      setIsPlaying(false);
      setIsPreviewMode(false);
      setCurrentTrack(null);
      console.log('🎵 Preview stopped');
    } catch (error) {
      console.error('Error stopping preview:', error);
    }
  }, []);

  // Start playlist for study session
  const startPlaylist = useCallback(async (soundPreference: string) => {
    console.log(`🎵 Starting playlist for: ${soundPreference}`);
    
    if (!audioSupported) {
      console.warn('Audio not supported for playlist');
      return;
    }

    try {
      // Stop any existing audio
      await stopPlayback();
      
      const category = soundPreference as MusicCategory;
      const tracks = await getTracksFromCategory(category);
      
      if (tracks.length === 0) {
        console.warn(`No tracks found for playlist: ${soundPreference}`);
        return;
      }

      setCurrentPlaylist(tracks);
      setCurrentTrackIndex(0);
      setIsPreviewMode(false);
      
      // Start playing first track
      await playTrackAtIndex(0, tracks);
      
    } catch (error) {
      console.error('Error starting playlist:', error);
    }
  }, [getTracksFromCategory]);

  const playTrackAtIndex = useCallback(async (index: number, playlist?: MusicTrack[]) => {
    const tracksToUse = playlist || currentPlaylist;

    if (!tracksToUse || index >= tracksToUse.length || index < 0) {
      console.warn('Invalid track index or empty playlist');
      return;
    }

    const track = tracksToUse[index];
    console.log(`🎵 Playing track ${index + 1} of ${tracksToUse.length}: ${track.displayName}`);

    try {
      // Stop and unload previous track before playing new one
      if (primarySound.current) {
        await primarySound.current.stopAsync();
        await primarySound.current.unloadAsync();
        primarySound.current = null;
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: track.url },
        {
          shouldPlay: true,
          isLooping: false,
          volume: volume
        }
      );

      // Set up primary sound
      primarySound.current = sound;
      setCurrentTrack(track);
      setCurrentTrackIndex(index);
      setIsPlaying(true);

      // Set up next track when this one finishes
      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.didJustFinish) {
          const nextIndex = (index + 1) % tracksToUse.length;
          playTrackAtIndex(nextIndex, tracksToUse);
        }
      });

    } catch (error) {
      console.error('Error playing track:', error);
    }
  }, [currentPlaylist, volume]);

  const stopPlayback = useCallback(async () => {
    try {
      if (primarySound.current) {
        await primarySound.current.unloadAsync();
        primarySound.current = null;
      }
      
      if (secondarySound.current) {
        await secondarySound.current.unloadAsync();
        secondarySound.current = null;
      }
      
      setIsPlaying(false);
      setCurrentTrack(null);
      setCurrentPlaylist([]);
      setCurrentTrackIndex(0);
      setIsPreviewMode(false);
      console.log('🎵 Playback stopped');
    } catch (error) {
      console.error('Error stopping playback:', error);
    }
  }, []);

  // Navigation functions
  const nextTrack = useCallback(async () => {
    if (currentPlaylist.length > 0) {
      const nextIndex = (currentTrackIndex + 1) % currentPlaylist.length;
      await playTrackAtIndex(nextIndex);
    }
  }, [currentPlaylist, currentTrackIndex, playTrackAtIndex]);

  const previousTrack = useCallback(async () => {
    if (currentPlaylist.length > 0) {
      const prevIndex = currentTrackIndex === 0 ? currentPlaylist.length - 1 : currentTrackIndex - 1;
      await playTrackAtIndex(prevIndex);
    }
  }, [currentPlaylist, currentTrackIndex, playTrackAtIndex]);

  const pausePlayback = useCallback(async () => {
    try {
      if (primarySound.current) {
        const status = await primarySound.current.getStatusAsync();
        if (status.isLoaded) {
          if (status.isPlaying) {
            await primarySound.current.pauseAsync();
            setIsPlaying(false);
          } else {
            await primarySound.current.playAsync();
            setIsPlaying(true);
          }
        }
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  }, []);

  // Get current playlist tracks for display
  const getCurrentPlaylistTracks = useCallback(() => {
    return currentPlaylist || [];
  }, [currentPlaylist]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPlayback();
      stopPreview();
    };
  }, [stopPlayback, stopPreview]);

  // Return the hook interface
  return {
    currentTrack,
    currentPlaylist,
    currentTrackIndex,
    isPlaying,
    isPreviewMode,
    audioSupported,
    startPlaylist,
    stopPlayback,
    playPreview,
    stopPreview,
    nextTrack,
    previousTrack,
    pausePlayback,
    getCurrentPlaylistTracks,
    isLoading,
    volume,
    setVolume,
  };
};