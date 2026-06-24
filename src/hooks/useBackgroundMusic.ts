// src/hooks/useBackgroundMusic.ts - Fixed with correct audio file paths
import { Audio } from "expo-av";
import { AppState, AppStateStatus } from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { Asset } from "expo-asset";
import type { AVPlaybackStatus } from "expo-av";

// Check if expo-av is available
let audioSupported = false;
try {
  audioSupported = !!Audio;
} catch {
  // expo-av not available, music playback disabled
}

type MusicCategory =
  | "Ambient"
  | "Nature"
  | "Classical"
  | "Lo-Fi"
  | "Jazz Ambient";

type MusicTrack = {
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
  Ambient: [
    require("../../assets/music/Ambient/Epic Spectrum - Wallflower (freetouse.com).mp3"),
    require("../../assets/music/Ambient/Pufino - Creek (freetouse.com).mp3"),
    require("../../assets/music/Ambient/Pufino - Flourish (freetouse.com).mp3"),
  ],
  Nature: [
    require("../../assets/music/Nature/Windy trees in mountain forest.mp3"),
  ],
  Classical: [
    require("../../assets/music/Classical/Aeris - Sky With Yellow Spots (freetouse.com).mp3"),
    require("../../assets/music/Classical/Alegend - Wings of Freedom (freetouse.com).mp3"),
    require("../../assets/music/Classical/Epic Spectrum - Sky Clearing (freetouse.com).mp3"),
    require("../../assets/music/Classical/Guillermo Guareschi - Farewell (freetouse.com).mp3"),
    require("../../assets/music/Classical/Walen - Dragon Kingdom (freetouse.com).mp3"),
  ],
  "Lo-Fi": [
    require("../../assets/music/lo-fi/Lukrembo - Biscuit (freetouse.com).mp3"),
    require("../../assets/music/lo-fi/Lukrembo - Donut (freetouse.com).mp3"),
    require("../../assets/music/lo-fi/Lukrembo - Marshmallow (freetouse.com).mp3"),
    require("../../assets/music/lo-fi/Lukrembo - Sunset (freetouse.com).mp3"),
    require("../../assets/music/lo-fi/massobeats - honey jam (freetouse.com).mp3"),
  ],
  "Jazz Ambient": [
    require("../../assets/music/jazz-ambient/Aylex - Italy (freetouse.com).mp3"),
    require("../../assets/music/jazz-ambient/Hazelwood - At Ease (freetouse.com).mp3"),
    require("../../assets/music/jazz-ambient/Lukrembo - Cheese (freetouse.com).mp3"),
    require("../../assets/music/jazz-ambient/Lukrembo - Sunset (freetouse.com).mp3"),
    require("../../assets/music/jazz-ambient/Moavii - Downtown (freetouse.com).mp3"),
    require("../../assets/music/jazz-ambient/Pufino - Fantasy (freetouse.com).mp3"),
  ],
};

// Stored preferences arrive in many shapes (focus-method strings, wrong case,
// legacy aliases). Map them to a real audio category so playback never silently
// no-ops on an unknown key.
const CATEGORY_ALIASES: Record<string, MusicCategory> = {
  ambient: "Ambient",
  nature: "Nature",
  classical: "Classical",
  "lo-fi": "Lo-Fi",
  lofi: "Lo-Fi",
  "lo fi": "Lo-Fi",
  jazz: "Jazz Ambient",
  "jazz ambient": "Jazz Ambient",
  "jazz-ambient": "Jazz Ambient",
};

const normalizeCategory = (preference: string): MusicCategory => {
  if (preference in LOCAL_AUDIO_FILES) {
    return preference as MusicCategory;
  }
  const key = String(preference || "")
    .trim()
    .toLowerCase();
  return CATEGORY_ALIASES[key] || "Lo-Fi";
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isSoundNotLoadedError = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return false;
  }
  const message = (error as { message?: string }).message;
  if (typeof message !== "string") {
    return false;
  }
  return message.toLowerCase().includes("not loaded");
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
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );
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
      }
    } catch {
      // Failed to configure audio mode
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
        const status = (await sound.getStatusAsync()) as AVPlaybackStatus;
        if (!status.isLoaded) {
          return;
        }

        const fromVolume =
          typeof status.volume === "number" ? status.volume : volumeRef.current;
        const steps = Math.max(1, Math.round(duration / 50));
        const stepDuration = duration / steps;
        const volumeStep = (targetVolume - fromVolume) / steps;

        for (let step = 1; step <= steps; step++) {
          const nextVolume = Math.min(
            Math.max(fromVolume + volumeStep * step, 0),
            1,
          );
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
          // Failed to fade volume
        }
      }
    },
    [],
  );

  // Get tracks from local assets with corrected paths
  const getTracksFromCategory = useCallback(
    async (category: MusicCategory): Promise<MusicTrack[]> => {
      try {
        const normalizedCategory = normalizeCategory(category);
        const audioFiles = LOCAL_AUDIO_FILES[normalizedCategory];

        if (!audioFiles || audioFiles.length === 0) {
          return [];
        }

        // Enhanced file display names
        const fileDisplayNames: Record<string, string> = {
          // Ambient tracks (3)
          "Epic Spectrum - Wallflower (freetouse.com).mp3":
            "Wallflower - Epic Spectrum",
          "Pufino - Creek (freetouse.com).mp3": "Creek - Pufino",
          "Pufino - Flourish (freetouse.com).mp3": "Flourish - Pufino",

          // Nature tracks (1)
          "Windy trees in mountain forest.mp3":
            "Windy Trees in Mountain Forest",

          // Classical tracks (5)
          "Aeris - Sky With Yellow Spots (freetouse.com).mp3":
            "Sky With Yellow Spots - Aeris",
          "Alegend - Wings of Freedom (freetouse.com).mp3":
            "Wings of Freedom - Alegend",
          "Epic Spectrum - Sky Clearing (freetouse.com).mp3":
            "Sky Clearing - Epic Spectrum",
          "Guillermo Guareschi - Farewell (freetouse.com).mp3":
            "Farewell - Guillermo Guareschi",
          "Walen - Dragon Kingdom (freetouse.com).mp3":
            "Dragon Kingdom - Walen",

          // Lo-Fi tracks (5)
          "Lukrembo - Biscuit (freetouse.com).mp3": "Biscuit - Lukrembo",
          "Lukrembo - Donut (freetouse.com).mp3": "Donut - Lukrembo",
          "Lukrembo - Marshmallow (freetouse.com).mp3":
            "Marshmallow - Lukrembo",
          "Lukrembo - Sunset (freetouse.com).mp3": "Sunset - Lukrembo",
          "massobeats - honey jam (freetouse.com).mp3":
            "Honey Jam - massobeats",

          // Jazz Ambient tracks (6)
          "Aylex - Italy (freetouse.com).mp3": "Italy - Aylex",
          "Hazelwood - At Ease (freetouse.com).mp3": "At Ease - Hazelwood",
          "Lukrembo - Cheese (freetouse.com).mp3": "Cheese - Lukrembo",
          "Moavii - Downtown (freetouse.com).mp3": "Downtown - Moavii",
          "Pufino - Fantasy (freetouse.com).mp3": "Fantasy - Pufino",
        };

        const tracks: MusicTrack[] = [];

        for (let i = 0; i < audioFiles.length; i++) {
          const audioFile = audioFiles[i];

          try {
            // Load the asset to get the local URI
            const asset = Asset.fromModule(audioFile);
            await asset.downloadAsync();

            // Extract filename for display name lookup
            const assetUri = asset.uri || asset.localUri || "";
            const filename =
              assetUri.split("/").pop() || `${category} Track ${i + 1}`;
            const displayName =
              fileDisplayNames[filename] ||
              filename.replace(/\.(mp3|wav|m4a)$/i, "");

            const track: MusicTrack = {
              id: `${normalizedCategory}-${i + 1}`,
              name: filename,
              displayName: displayName,
              url: asset.localUri || asset.uri,
              category: normalizedCategory,
            };

            tracks.push(track);
          } catch {
            // Failed to load asset
          }
        }

        return tracks;
      } catch {
        return [];
      }
    },
    [],
  );

  // Play a 10-second preview of a category
  const playPreview = useCallback(
    async (soundPreference: string) => {
      if (!audioSupported) {
        Alert.alert(
          "Audio Error",
          "Audio playback not supported on this device",
        );
        return;
      }

      try {
        // Stop any existing preview
        await stopPreview();

        const category = soundPreference as MusicCategory;

        setIsLoading(true);
        setIsPreviewMode(true);

        const tracks = await getTracksFromCategory(category);

        if (tracks.length === 0) {
          Alert.alert(
            "No Music Found",
            `No audio files found in the ${soundPreference} category.`,
          );
          return;
        }

        // Play the first track as preview
        const track = tracks[0];

        if (!track.url) {
          Alert.alert("Audio Error", "Track URL is missing or invalid");
          return;
        }

        const { sound } = await Audio.Sound.createAsync(
          { uri: track.url },
          {
            shouldPlay: true,
            isLooping: false,
            volume: volume,
          },
        );

        previewSound.current = sound;
        setCurrentTrack(track);
        setIsPlaying(true);

        // Stop preview after 10 seconds
        previewTimeout.current = setTimeout(async () => {
          await stopPreview();
        }, 10000);
      } catch (error) {
        Alert.alert(
          "Preview Error",
          `Unable to play preview: ${(error as Error).message}`,
        );
      } finally {
        setIsLoading(false);
      }
    },
    [getTracksFromCategory, volume],
  );

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
    } catch {
      // Error stopping preview
    }
  }, []);

  const playTrackAtIndex = useCallback(
    async (index: number, playlist?: MusicTrack[]) => {
      // Reset stopping flag when starting new playback
      isStoppingRef.current = false;

      const tracksToUse = playlist || currentPlaylist;

      if (!tracksToUse || index >= tracksToUse.length || index < 0) {
        return;
      }

      const track = tracksToUse[index];

      try {
        // Stop and cleanup ALL existing sounds first
        const previousSound = primarySound.current;
        if (previousSound) {
          primarySound.current = null;

          // Remove any existing status update listeners to prevent auto-advance conflicts
          try {
            previousSound.setOnPlaybackStatusUpdate(null);
          } catch {
            // Ignore errors when removing listeners
          }

          try {
            await fadeVolumeAsync(previousSound, 0, 300);
          } catch (fadeError) {
            if (!isSoundNotLoadedError(fadeError)) {
              // Error fading previous track
            }
          }

          try {
            const status = await previousSound.getStatusAsync();
            if (status.isLoaded) {
              await previousSound.stopAsync();
            }
          } catch (stopError) {
            if (!isSoundNotLoadedError(stopError)) {
              // Error stopping previous track
            }
          }

          try {
            await previousSound.unloadAsync();
          } catch (unloadError) {
            if (!isSoundNotLoadedError(unloadError)) {
              // Error unloading previous track
            }
          }
        }

        // Ensure secondary sound is also stopped
        if (secondarySound.current) {
          try {
            secondarySound.current.setOnPlaybackStatusUpdate(null);
            await secondarySound.current.stopAsync();
            await secondarySound.current.unloadAsync();
          } catch {
            // Ignore cleanup errors
          }
          secondarySound.current = null;
        }

        // Small delay to ensure cleanup is complete
        await new Promise((resolve) => setTimeout(resolve, 100));

        const initialAutoplay = !userPausedRef.current;

        const { sound } = await Audio.Sound.createAsync(
          { uri: track.url },
          {
            shouldPlay: initialAutoplay,
            isLooping: false,
            volume: 0,
          },
        );

        const isPausedNow = userPausedRef.current;
        let shouldAutoplay = !isPausedNow;

        if (initialAutoplay && isPausedNow) {
          try {
            await sound.pauseAsync();
            await sound.setPositionAsync(0);
          } catch (pauseErr) {
            if (!isSoundNotLoadedError(pauseErr)) {
              // Error pausing sound after user pause
            }
          }
          shouldAutoplay = false;
        } else if (!initialAutoplay && !isPausedNow) {
          try {
            await sound.playAsync();
          } catch (playErr) {
            if (!isSoundNotLoadedError(playErr)) {
              // Error starting sound after resume
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
            return;
          }

          // CRITICAL: Only allow auto-advance on focus session screen
          if (!allowAutoAdvanceRef.current && status.didJustFinish) {
            return;
          }

          if (
            status.didJustFinish &&
            primarySound.current === sound &&
            !userPausedRef.current
          ) {
            const nextIndex = (index + 1) % tracksToUse.length;
            playTrackAtIndex(nextIndex, tracksToUse).catch(() => {
              // Failed to advance to next track
            });
          }
        });
      } catch {
        // Error playing track
      }
    },
    [currentPlaylist, fadeVolumeAsync],
  );

  const stopPlayback = useCallback(async () => {
    // CRITICAL: Set flag IMMEDIATELY to prevent any auto-advance during stop
    // NOTE: We do NOT set allowAutoAdvanceRef.current = false here because:
    // 1. The component manages auto-advance via enableAutoAdvance()/disableAutoAdvance()
    // 2. startPlaylist() calls stopPlayback() but should retain auto-advance state
    // 3. Component cleanup already calls disableAutoAdvance() before stopPlayback()
    isStoppingRef.current = true;

    const activeSound = primarySound.current;
    primarySound.current = null;
    userPausedRef.current = false;

    try {
      if (activeSound) {
        // Remove status update listener FIRST to prevent callbacks
        try {
          activeSound.setOnPlaybackStatusUpdate(null);
        } catch {
          // Error removing status listener
        }

        // STOP the sound IMMEDIATELY without fading
        try {
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
            // Error stopping sound
          }
        }

        // Unload the sound
        try {
          await activeSound.unloadAsync();
        } catch (error) {
          if (!isSoundNotLoadedError(error)) {
            // Error unloading sound
          }
        }
      }

      // Stop secondary sound
      if (secondarySound.current) {
        try {
          secondarySound.current.setOnPlaybackStatusUpdate(null);
          await secondarySound.current.stopAsync().catch(() => {});
          await secondarySound.current.unloadAsync();
        } catch (error) {
          if (!isSoundNotLoadedError(error)) {
            // Error unloading secondary sound
          }
        }
        secondarySound.current = null;
      }

      // Stop preview sound
      if (previewSound.current) {
        try {
          previewSound.current.setOnPlaybackStatusUpdate(null);
          await previewSound.current.stopAsync().catch(() => {});
          await previewSound.current.unloadAsync();
        } catch (error) {
          if (!isSoundNotLoadedError(error)) {
            // Error unloading preview sound
          }
        }
        previewSound.current = null;
      }

      setIsPlaying(false);
      setCurrentTrack(null);
      setCurrentPlaylist([]);
      setCurrentTrackIndex(0);
      setIsPreviewMode(false);
    } catch {
      // Error stopping playback
    }
  }, [fadeVolumeAsync]);

  // Navigation functions - ensure clean transitions
  const nextTrack = useCallback(async () => {
    if (currentPlaylist.length === 0) {
      return;
    }

    if (userPausedRef.current) {
      return;
    }

    // Stop ALL sounds before playing next
    const currentSound = primarySound.current;
    if (currentSound) {
      try {
        await currentSound.stopAsync();
        await currentSound.unloadAsync();
      } catch {
        // Error stopping current track
      }
      primarySound.current = null;
    }

    if (secondarySound.current) {
      try {
        await secondarySound.current.stopAsync();
        await secondarySound.current.unloadAsync();
      } catch {
        // Error stopping secondary sound
      }
      secondarySound.current = null;
    }

    const nextIndex = (currentTrackIndex + 1) % currentPlaylist.length;
    await playTrackAtIndex(nextIndex);
  }, [currentPlaylist, currentTrackIndex, playTrackAtIndex]);

  const previousTrack = useCallback(async () => {
    if (currentPlaylist.length === 0) {
      return;
    }

    if (userPausedRef.current) {
      return;
    }

    // Stop ALL sounds before playing previous
    const currentSound = primarySound.current;
    if (currentSound) {
      try {
        await currentSound.stopAsync();
        await currentSound.unloadAsync();
      } catch {
        // Error stopping current track
      }
      primarySound.current = null;
    }

    if (secondarySound.current) {
      try {
        await secondarySound.current.stopAsync();
        await secondarySound.current.unloadAsync();
      } catch {
        // Error stopping secondary sound
      }
      secondarySound.current = null;
    }

    const prevIndex =
      currentTrackIndex === 0
        ? currentPlaylist.length - 1
        : currentTrackIndex - 1;
    await playTrackAtIndex(prevIndex);
  }, [currentPlaylist, currentTrackIndex, playTrackAtIndex]);

  // Start playlist for study session
  const startPlaylist = useCallback(
    async (soundPreference: string) => {
      if (!audioSupported) {
        return;
      }

      try {
        // Stop any existing audio
        await stopPlayback();

        const category = soundPreference as MusicCategory;
        const tracks = await getTracksFromCategory(category);

        if (tracks.length === 0) {
          return;
        }

        userPausedRef.current = false;
        setCurrentPlaylist(tracks);
        setCurrentTrackIndex(0);
        setIsPreviewMode(false);

        // Start playing first track
        await playTrackAtIndex(0, tracks);
      } catch {
        // Error starting playlist
      }
    },
    [getTracksFromCategory, playTrackAtIndex, stopPlayback],
  );

  const pausePlayback = useCallback(async () => {
    const activeSound = primarySound.current;

    try {
      if (secondarySound.current) {
        try {
          await secondarySound.current.stopAsync();
          await secondarySound.current.unloadAsync();
        } catch {
          // Error stopping secondary sound
        }
        secondarySound.current = null;
      }

      if (previewSound.current) {
        try {
          await previewSound.current.stopAsync();
          await previewSound.current.unloadAsync();
        } catch {
          // Error stopping preview sound
        }
        previewSound.current = null;
      }

      if (!activeSound) {
        userPausedRef.current = true;
        setIsPlaying(false);
        return;
      }

      const status = await activeSound.getStatusAsync();
      if (!status.isLoaded) {
        return;
      }

      if (!userPausedRef.current) {
        userPausedRef.current = true;

        if (status.isPlaying) {
          await fadeVolumeAsync(activeSound, 0, 400);
          await activeSound.pauseAsync();
        } else {
          try {
            await activeSound.stopAsync();
          } catch (stopErr) {
            if (!isSoundNotLoadedError(stopErr)) {
              // Error stopping sound during pause
            }
          }
        }

        setIsPlaying(false);
        return;
      }

      userPausedRef.current = false;

      const resumeStatus = await activeSound.getStatusAsync();
      if (!resumeStatus.isLoaded) {
        return;
      }

      const hasReachedEnd =
        resumeStatus.didJustFinish ||
        (typeof resumeStatus.positionMillis === "number" &&
          typeof resumeStatus.durationMillis === "number" &&
          resumeStatus.durationMillis > 0 &&
          resumeStatus.positionMillis >= resumeStatus.durationMillis);

      if (hasReachedEnd) {
        try {
          await activeSound.setPositionAsync(0);
        } catch (resetErr) {
          if (!isSoundNotLoadedError(resetErr)) {
            // Error resetting position before resume
          }
        }
      }

      await activeSound.setVolumeAsync(0);
      await activeSound.playAsync();
      await fadeVolumeAsync(activeSound, volumeRef.current, 400);
      setIsPlaying(true);
    } catch (error) {
      if (!isSoundNotLoadedError(error)) {
        // Error toggling playback
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
      stopPlayback().catch(() => {});
      stopPreview().catch(() => {});
    };
  }, [stopPlayback, stopPreview]);

  // Functions to control auto-advance (only for focus session screen)
  const enableAutoAdvance = useCallback(() => {
    allowAutoAdvanceRef.current = true;
  }, []);

  const disableAutoAdvance = useCallback(() => {
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
