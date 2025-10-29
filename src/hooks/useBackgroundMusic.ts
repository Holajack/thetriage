// src/hooks/useBackgroundMusic.ts - Fixed with correct audio file paths
import { Audio } from 'expo-av';
import { AppState } from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { Asset } from 'expo-asset';
import type { AVPlaybackStatus } from 'expo-av';

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

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const isSoundNotLoadedError = (error: unknown) => {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const message = (error as { message?: string }).message;
  if (typeof message !== 'string') {
    return false;
  }
  return message.toLowerCase().includes('not loaded');
};

export const useBackgroundMusic = () => {
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [currentPlaylist, setCurrentPlaylist] = useState<any[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const volumeRef = useRef(volume);
  const userPausedRef = useRef(false);

  // Sound refs
  const primarySound = useRef<Audio.Sound | null>(null);
  const secondarySound = useRef<Audio.Sound | null>(null);
  const previewSound = useRef<Audio.Sound | null>(null);
  const previewTimeout = useRef<NodeJS.Timeout | null>(null);
  const isStoppingRef = useRef<boolean>(false); // CRITICAL: Prevent auto-advance during stop
  const allowAutoAdvanceRef = useRef<boolean>(false); // CRITICAL: Only allow auto-advance on focus session screen

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

  useEffect(() => {
    volumeRef.current = volume;
    if (primarySound.current) {
      primarySound.current.setVolumeAsync(volume).catch(() => null);
    }
  }, [volume]);

  const fadeVolumeAsync = useCallback(
    async (sound: Audio.Sound | null, targetVolume: number, duration = 600) => {
      if (!sound) return;
      try {
        const status = await sound.getStatusAsync() as AVPlaybackStatus;
        if (!status.isLoaded) {
          return;
        }

        const fromVolume = typeof status.volume === 'number' ? status.volume : volumeRef.current;
        const steps = Math.max(1, Math.round(duration / 50));
        const stepDuration = duration / steps;
        const volumeStep = (targetVolume - fromVolume) / steps;

        for (let step = 1; step <= steps; step++) {
          const nextVolume = Math.min(Math.max(fromVolume + volumeStep * step, 0), 1);
          try {
            await sound.setVolumeAsync(nextVolume);
          } catch (setError) {
            if (isSoundNotLoadedError(setError)) {
              break;
            }
            throw setError;
          }
          if (step < steps) {
            await sleep(stepDuration);
          }
        }
      } catch (error) {
        if (!isSoundNotLoadedError(error)) {
          console.warn('🎵 Failed to fade volume:', error);
        }
      }
    },
    []
  );

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

  const playTrackAtIndex = useCallback(async (index: number, playlist?: MusicTrack[]) => {
    // Reset stopping flag when starting new playback
    isStoppingRef.current = false;

    const tracksToUse = playlist || currentPlaylist;

    if (!tracksToUse || index >= tracksToUse.length || index < 0) {
      console.warn('Invalid track index or empty playlist');
      return;
    }

    const track = tracksToUse[index];
    console.log(`🎵 Playing track ${index + 1} of ${tracksToUse.length}: ${track.displayName}`);

    try {
      // Stop and cleanup ALL existing sounds first
      const previousSound = primarySound.current;
      if (previousSound) {
        primarySound.current = null;

        // Remove any existing status update listeners to prevent auto-advance conflicts
        try {
          previousSound.setOnPlaybackStatusUpdate(null);
        } catch (err) {
          // Ignore errors when removing listeners
        }

        try {
          await fadeVolumeAsync(previousSound, 0, 300);
        } catch (fadeError) {
          if (!isSoundNotLoadedError(fadeError)) {
            console.warn('🎵 Error fading previous track before switch:', fadeError);
          }
        }

        try {
          const status = await previousSound.getStatusAsync();
          if (status.isLoaded) {
            await previousSound.stopAsync();
          }
        } catch (stopError) {
          if (!isSoundNotLoadedError(stopError)) {
            console.warn('🎵 Error stopping previous track before switch:', stopError);
          }
        }

        try {
          await previousSound.unloadAsync();
        } catch (unloadError) {
          if (!isSoundNotLoadedError(unloadError)) {
            console.warn('🎵 Error unloading previous track:', unloadError);
          }
        }
      }

      // Ensure secondary sound is also stopped
      if (secondarySound.current) {
        try {
          secondarySound.current.setOnPlaybackStatusUpdate(null);
          await secondarySound.current.stopAsync();
          await secondarySound.current.unloadAsync();
        } catch (err) {
          // Ignore cleanup errors
        }
        secondarySound.current = null;
      }

      // Small delay to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 100));

      const initialAutoplay = !userPausedRef.current;
      if (!initialAutoplay) {
        console.log('🎵 Playback is paused - loading track without autoplay');
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: track.url },
        {
          shouldPlay: initialAutoplay,
          isLooping: false,
          volume: 0
        }
      );

      const isPausedNow = userPausedRef.current;
      let shouldAutoplay = !isPausedNow;

      if (initialAutoplay && isPausedNow) {
        try {
          await sound.pauseAsync();
          await sound.setPositionAsync(0);
        } catch (pauseErr) {
          if (!isSoundNotLoadedError(pauseErr)) {
            console.warn('🎵 Error pausing sound after user pause:', pauseErr);
          }
        }
        shouldAutoplay = false;
      } else if (!initialAutoplay && !isPausedNow) {
        try {
          await sound.playAsync();
        } catch (playErr) {
          if (!isSoundNotLoadedError(playErr)) {
            console.warn('🎵 Error starting sound after resume:', playErr);
          }
        }
        shouldAutoplay = true;
      }

      primarySound.current = sound;
      setCurrentTrack(track);
      setCurrentTrackIndex(index);
      setIsPlaying(shouldAutoplay);

      if (shouldAutoplay) {
        await fadeVolumeAsync(sound, volumeRef.current, 600);
      } else {
        await sound.setVolumeAsync(0);
      }

      // Set up auto-advance listener ONLY if this sound is still the primary sound
      sound.setOnPlaybackStatusUpdate((status: any) => {
        // CRITICAL: Check if we're stopping playback - if so, do NOT auto-advance
        if (isStoppingRef.current) {
          console.log('🎵 Track finished but stopPlayback was called - NOT auto-advancing');
          return;
        }

        // CRITICAL: Only allow auto-advance on focus session screen
        if (!allowAutoAdvanceRef.current && status.didJustFinish) {
          console.log('🎵 Track finished but not on focus session screen - NOT auto-advancing');
          return;
        }

        if (
          status.didJustFinish &&
          primarySound.current === sound &&
          !userPausedRef.current
        ) {
          console.log('🎵 Track finished, auto-advancing to next');
          const nextIndex = (index + 1) % tracksToUse.length;
          playTrackAtIndex(nextIndex, tracksToUse).catch(nextError => {
            console.error('🎵 Failed to advance to next track:', nextError);
          });
        } else if (
          status.didJustFinish &&
          primarySound.current === sound &&
          userPausedRef.current
        ) {
          console.log('🎵 Track finished while paused - holding position');
        }
      });

    } catch (error) {
      console.error('Error playing track:', error);
    }
  }, [currentPlaylist, fadeVolumeAsync]);

  const stopPlayback = useCallback(async () => {
    console.log('🎵 ========== STOP PLAYBACK CALLED - FORCE STOPPING EVERYTHING ==========');

    // CRITICAL: Set flags IMMEDIATELY to prevent any auto-advance or new playback
    isStoppingRef.current = true;
    allowAutoAdvanceRef.current = false; // Also disable auto-advance here

    const activeSound = primarySound.current;
    primarySound.current = null;
    userPausedRef.current = false;

    try {
      if (activeSound) {
        // Remove status update listener FIRST to prevent callbacks
        try {
          console.log('🎵 [1/4] Removing playback status listener');
          activeSound.setOnPlaybackStatusUpdate(null);
        } catch (err) {
          console.warn('🎵 Error removing status listener:', err);
        }

        // STOP the sound IMMEDIATELY without fading
        try {
          console.log('🎵 [2/4] Stopping sound immediately (no fade)');
          const status = await activeSound.getStatusAsync();
          if (status.isLoaded) {
            // Set volume to 0 immediately
            await activeSound.setVolumeAsync(0);
            // Stop immediately
            if (status.isPlaying) {
              await activeSound.stopAsync();
            }
          }
        } catch (err) {
          if (!isSoundNotLoadedError(err)) {
            console.warn('🎵 Error stopping sound:', err);
          }
        }

        // Unload the sound
        try {
          console.log('🎵 [3/4] Unloading sound');
          await activeSound.unloadAsync();
        } catch (error) {
          if (!isSoundNotLoadedError(error)) {
            console.warn('🎵 Error unloading sound:', error);
          }
        }
      }

      // Stop secondary sound
      if (secondarySound.current) {
        try {
          console.log('🎵 [4/4] Stopping secondary sound');
          secondarySound.current.setOnPlaybackStatusUpdate(null);
          await secondarySound.current.stopAsync().catch(() => {});
          await secondarySound.current.unloadAsync();
        } catch (error) {
          if (!isSoundNotLoadedError(error)) {
            console.warn('🎵 Error unloading secondary sound:', error);
          }
        }
        secondarySound.current = null;
      }

      // Stop preview sound
      if (previewSound.current) {
        try {
          console.log('🎵 Stopping preview sound');
          previewSound.current.setOnPlaybackStatusUpdate(null);
          await previewSound.current.stopAsync().catch(() => {});
          await previewSound.current.unloadAsync();
        } catch (error) {
          if (!isSoundNotLoadedError(error)) {
            console.warn('🎵 Error unloading preview sound:', error);
          }
        }
        previewSound.current = null;
      }

      setIsPlaying(false);
      setCurrentTrack(null);
      setCurrentPlaylist([]);
      setCurrentTrackIndex(0);
      setIsPreviewMode(false);
      console.log('🎵 ========== ALL SOUNDS STOPPED - NO MUSIC PLAYING - AUTO-ADVANCE DISABLED ==========');
    } catch (error) {
      console.error('Error stopping playback:', error);
    }
  }, [fadeVolumeAsync]);

  // Navigation functions - ensure clean transitions
  const nextTrack = useCallback(async () => {
    if (currentPlaylist.length === 0) {
      console.warn('🎵 No playlist to skip');
      return;
    }

    if (userPausedRef.current) {
      console.log('🎵 Ignoring next track request while playback is paused');
      return;
    }

    console.log('🎵 Skipping to next track');

    // Stop ALL sounds before playing next
    const currentSound = primarySound.current;
    if (currentSound) {
      try {
        await currentSound.stopAsync();
        await currentSound.unloadAsync();
      } catch (err) {
        console.warn('🎵 Error stopping current track:', err);
      }
      primarySound.current = null;
    }

    if (secondarySound.current) {
      try {
        await secondarySound.current.stopAsync();
        await secondarySound.current.unloadAsync();
      } catch (err) {
        console.warn('🎵 Error stopping secondary sound:', err);
      }
      secondarySound.current = null;
    }

    const nextIndex = (currentTrackIndex + 1) % currentPlaylist.length;
    await playTrackAtIndex(nextIndex);
  }, [currentPlaylist, currentTrackIndex, playTrackAtIndex]);

  const previousTrack = useCallback(async () => {
    if (currentPlaylist.length === 0) {
      console.warn('🎵 No playlist to go back');
      return;
    }

    if (userPausedRef.current) {
      console.log('🎵 Ignoring previous track request while playback is paused');
      return;
    }

    console.log('🎵 Going to previous track');

    // Stop ALL sounds before playing previous
    const currentSound = primarySound.current;
    if (currentSound) {
      try {
        await currentSound.stopAsync();
        await currentSound.unloadAsync();
      } catch (err) {
        console.warn('🎵 Error stopping current track:', err);
      }
      primarySound.current = null;
    }

    if (secondarySound.current) {
      try {
        await secondarySound.current.stopAsync();
        await secondarySound.current.unloadAsync();
      } catch (err) {
        console.warn('🎵 Error stopping secondary sound:', err);
      }
      secondarySound.current = null;
    }

    const prevIndex = currentTrackIndex === 0 ? currentPlaylist.length - 1 : currentTrackIndex - 1;
    await playTrackAtIndex(prevIndex);
  }, [currentPlaylist, currentTrackIndex, playTrackAtIndex]);

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

      userPausedRef.current = false;
      setCurrentPlaylist(tracks);
      setCurrentTrackIndex(0);
      setIsPreviewMode(false);
      
      // Start playing first track
      await playTrackAtIndex(0, tracks);
      
    } catch (error) {
      console.error('Error starting playlist:', error);
    }
  }, [getTracksFromCategory, playTrackAtIndex, stopPlayback]);

  const pausePlayback = useCallback(async () => {
    const activeSound = primarySound.current;

    try {
      if (secondarySound.current) {
        try {
          await secondarySound.current.stopAsync();
          await secondarySound.current.unloadAsync();
        } catch (err) {
          console.warn('🎵 Error stopping secondary sound:', err);
        }
        secondarySound.current = null;
      }

      if (previewSound.current) {
        try {
          await previewSound.current.stopAsync();
          await previewSound.current.unloadAsync();
        } catch (err) {
          console.warn('🎵 Error stopping preview sound:', err);
        }
        previewSound.current = null;
      }

      if (!activeSound) {
        console.warn('🎵 No active sound to pause/resume');
        userPausedRef.current = true;
        setIsPlaying(false);
        return;
      }

      const status = await activeSound.getStatusAsync();
      if (!status.isLoaded) {
        console.warn('🎵 Sound not loaded');
        return;
      }

      if (!userPausedRef.current) {
        console.log('🎵 Pausing playback');
        userPausedRef.current = true;

        if (status.isPlaying) {
          await fadeVolumeAsync(activeSound, 0, 400);
          await activeSound.pauseAsync();
        } else {
          try {
            await activeSound.stopAsync();
          } catch (stopErr) {
            if (!isSoundNotLoadedError(stopErr)) {
              console.warn('🎵 Error stopping sound during pause:', stopErr);
            }
          }
        }

        setIsPlaying(false);
        return;
      }

      console.log('🎵 Resuming playback');
      userPausedRef.current = false;

      const resumeStatus = await activeSound.getStatusAsync();
      if (!resumeStatus.isLoaded) {
        console.warn('🎵 Cannot resume playback - sound not loaded');
        return;
      }

      const hasReachedEnd =
        resumeStatus.didJustFinish ||
        (
          typeof resumeStatus.positionMillis === 'number' &&
          typeof resumeStatus.durationMillis === 'number' &&
          resumeStatus.durationMillis > 0 &&
          resumeStatus.positionMillis >= resumeStatus.durationMillis
        );

      if (hasReachedEnd) {
        try {
          await activeSound.setPositionAsync(0);
        } catch (resetErr) {
          if (!isSoundNotLoadedError(resetErr)) {
            console.warn('🎵 Error resetting position before resume:', resetErr);
          }
        }
      }

      await activeSound.setVolumeAsync(0);
      await activeSound.playAsync();
      await fadeVolumeAsync(activeSound, volumeRef.current, 400);
      setIsPlaying(true);
    } catch (error) {
      if (!isSoundNotLoadedError(error)) {
        console.error('Error toggling playback:', error);
      }
    }
  }, [fadeVolumeAsync]);

  // Get current playlist tracks for display
  const getCurrentPlaylistTracks = useCallback(() => {
    return currentPlaylist || [];
  }, [currentPlaylist]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPlayback().catch(error => console.warn('🎵 Cleanup stopPlayback failed:', error));
      stopPreview().catch(error => console.warn('🎵 Cleanup stopPreview failed:', error));
    };
  }, [stopPlayback, stopPreview]);

  // Functions to control auto-advance (only for focus session screen)
  const enableAutoAdvance = useCallback(() => {
    console.log('🎵 Auto-advance ENABLED (focus session screen active)');
    allowAutoAdvanceRef.current = true;
  }, []);

  const disableAutoAdvance = useCallback(() => {
    console.log('🎵 Auto-advance DISABLED (left focus session screen)');
    allowAutoAdvanceRef.current = false;
  }, []);

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
    enableAutoAdvance,
    disableAutoAdvance,
  };
};
