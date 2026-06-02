/**
 * useAmbientSounds - Manages three independent ambient sound layers
 * that play on top of focus music during study sessions.
 *
 * Layers:
 *   - Environment: Primary atmosphere of the place (terrain, weather, landscape)
 *   - White Noise: Steady background drone unique to that environment
 *   - Critters: Bugs, creatures, or objects native to that world
 *     (insects in forest, scorpions in desert, satellites in galaxy, etc.)
 *
 * Each layer loads the correct audio file based on the user's equipped trail
 * and plays in a seamless loop at a lower volume than the main music.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Audio } from "expo-av";
import { Asset } from "expo-asset";
import { AppState } from "react-native";
import { useEquippedTrail } from "./useEquippedTrail";
import type { TrailId } from "../config/trailAssets";
import type { AVPlaybackStatus } from "expo-av";

// Static require map - React Native requires literal strings in require()
const AMBIENT_ASSETS: Record<string, Record<string, any>> = {
  forest: {
    environment: require("../../assets/ambient/forest/environment.mp3"),
    whitenoise: require("../../assets/ambient/forest/whitenoise.mp3"),
    critters: require("../../assets/ambient/forest/critters.mp3"),
  },
  beach: {
    environment: require("../../assets/ambient/beach/environment.mp3"),
    whitenoise: require("../../assets/ambient/beach/whitenoise.mp3"),
    critters: require("../../assets/ambient/beach/critters.mp3"),
  },
  jungle: {
    environment: require("../../assets/ambient/jungle/environment.mp3"),
    whitenoise: require("../../assets/ambient/jungle/whitenoise.mp3"),
    critters: require("../../assets/ambient/jungle/critters.mp3"),
  },
  volcano: {
    environment: require("../../assets/ambient/volcano/environment.mp3"),
    whitenoise: require("../../assets/ambient/volcano/whitenoise.mp3"),
    critters: require("../../assets/ambient/volcano/critters.mp3"),
  },
  desert: {
    environment: require("../../assets/ambient/desert/environment.mp3"),
    whitenoise: require("../../assets/ambient/desert/whitenoise.mp3"),
    critters: require("../../assets/ambient/desert/critters.mp3"),
  },
  canyon: {
    environment: require("../../assets/ambient/canyon/environment.mp3"),
    whitenoise: require("../../assets/ambient/canyon/whitenoise.mp3"),
    critters: require("../../assets/ambient/canyon/critters.mp3"),
  },
  galaxy: {
    environment: require("../../assets/ambient/galaxy/environment.mp3"),
    whitenoise: require("../../assets/ambient/galaxy/whitenoise.mp3"),
    critters: require("../../assets/ambient/galaxy/critters.mp3"),
  },
  northern: {
    environment: require("../../assets/ambient/northern/environment.mp3"),
    whitenoise: require("../../assets/ambient/northern/whitenoise.mp3"),
    critters: require("../../assets/ambient/northern/critters.mp3"),
  },
  snow: {
    environment: require("../../assets/ambient/snow/environment.mp3"),
    whitenoise: require("../../assets/ambient/snow/whitenoise.mp3"),
    critters: require("../../assets/ambient/snow/critters.mp3"),
  },
};

export type AmbientLayer = "environment" | "whitenoise" | "critters";

const DEFAULT_AMBIENT_VOLUME = 0.3;
const FADE_DURATION_MS = 400;
const FADE_STEP_MS = 50;

export function useAmbientSounds() {
  const trailId = useEquippedTrail();

  // Toggle states
  const [environmentEnabled, setEnvironmentEnabled] = useState(false);
  const [whiteNoiseEnabled, setWhiteNoiseEnabled] = useState(false);
  const [crittersEnabled, setCrittersEnabled] = useState(false);
  const [volume, setVolumeState] = useState(DEFAULT_AMBIENT_VOLUME);

  // Sound refs - one per layer
  const environmentSound = useRef<Audio.Sound | null>(null);
  const whiteNoiseSound = useRef<Audio.Sound | null>(null);
  const crittersSound = useRef<Audio.Sound | null>(null);

  // Track which trail is currently loaded per layer to avoid unnecessary reloads
  const loadedTrail = useRef<Record<AmbientLayer, string | null>>({
    environment: null,
    whitenoise: null,
    critters: null,
  });

  const volumeRef = useRef(DEFAULT_AMBIENT_VOLUME);

  const getSoundRef = (layer: AmbientLayer) => {
    switch (layer) {
      case "environment":
        return environmentSound;
      case "whitenoise":
        return whiteNoiseSound;
      case "critters":
        return crittersSound;
    }
  };

  const fadeVolume = async (sound: Audio.Sound, targetVolume: number) => {
    try {
      const status = await sound.getStatusAsync();
      if (!status.isLoaded) return;

      const currentVol = status.volume ?? 0;
      const steps = Math.ceil(FADE_DURATION_MS / FADE_STEP_MS);
      const stepSize = (targetVolume - currentVol) / steps;

      for (let i = 1; i <= steps; i++) {
        const vol = Math.max(0, Math.min(1, currentVol + stepSize * i));
        try {
          await sound.setVolumeAsync(vol);
        } catch {
          return; // Sound was unloaded during fade
        }
        await new Promise((r) => setTimeout(r, FADE_STEP_MS));
      }
    } catch {
      // Sound not loaded, ignore
    }
  };

  const loadAndPlayLayer = useCallback(
    async (layer: AmbientLayer, trail: TrailId) => {
      const soundRef = getSoundRef(layer);
      const assets = AMBIENT_ASSETS[trail];
      if (!assets || !assets[layer]) {
        // No ambient asset available for this trail/layer combination
        return;
      }

      // Stop existing sound if loaded
      if (soundRef.current) {
        try {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
        } catch {
          // Ignore cleanup errors
        }
        soundRef.current = null;
      }

      try {
        const asset = Asset.fromModule(assets[layer]);
        await asset.downloadAsync();

        const { sound } = await Audio.Sound.createAsync(
          { uri: asset.localUri || asset.uri },
          {
            shouldPlay: true,
            isLooping: true,
            volume: 0, // Start silent, fade in
          },
        );

        soundRef.current = sound;
        loadedTrail.current[layer] = trail;

        // Fade in
        await fadeVolume(sound, volumeRef.current);

        // Ambient layer started
      } catch (error) {
        // Error loading ambient layer
      }
    },
    [],
  );

  const stopLayer = useCallback(async (layer: AmbientLayer) => {
    const soundRef = getSoundRef(layer);
    if (!soundRef.current) return;

    try {
      await fadeVolume(soundRef.current, 0);
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
    } catch {
      // Ignore cleanup errors
    }
    soundRef.current = null;
    loadedTrail.current[layer] = null;
    // Ambient layer stopped
  }, []);

  // Toggle handlers
  const toggleEnvironment = useCallback(() => {
    setEnvironmentEnabled((prev) => !prev);
  }, []);

  const toggleWhiteNoise = useCallback(() => {
    setWhiteNoiseEnabled((prev) => !prev);
  }, []);

  const toggleCritters = useCallback(() => {
    setCrittersEnabled((prev) => !prev);
  }, []);

  const setVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    volumeRef.current = clamped;
    setVolumeState(clamped);

    // Update all active sounds
    [environmentSound, whiteNoiseSound, crittersSound].forEach((ref) => {
      if (ref.current) {
        ref.current.setVolumeAsync(clamped).catch(() => {});
      }
    });
  }, []);

  const stopAll = useCallback(async () => {
    await Promise.all([
      stopLayer("environment"),
      stopLayer("whitenoise"),
      stopLayer("critters"),
    ]);
  }, [stopLayer]);

  // React to toggle changes
  useEffect(() => {
    if (environmentEnabled) {
      loadAndPlayLayer("environment", trailId);
    } else {
      stopLayer("environment");
    }
  }, [environmentEnabled, trailId, loadAndPlayLayer, stopLayer]);

  useEffect(() => {
    if (whiteNoiseEnabled) {
      loadAndPlayLayer("whitenoise", trailId);
    } else {
      stopLayer("whitenoise");
    }
  }, [whiteNoiseEnabled, trailId, loadAndPlayLayer, stopLayer]);

  useEffect(() => {
    if (crittersEnabled) {
      loadAndPlayLayer("critters", trailId);
    } else {
      stopLayer("critters");
    }
  }, [crittersEnabled, trailId, loadAndPlayLayer, stopLayer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      [environmentSound, whiteNoiseSound, crittersSound].forEach((ref) => {
        if (ref.current) {
          ref.current.stopAsync().catch(() => {});
          ref.current.unloadAsync().catch(() => {});
          ref.current = null;
        }
      });
    };
  }, []);

  return {
    // Toggle states
    environmentEnabled,
    whiteNoiseEnabled,
    crittersEnabled,
    volume,
    // Current trail
    trailId,
    // Actions
    toggleEnvironment,
    toggleWhiteNoise,
    toggleCritters,
    setVolume,
    stopAll,
    // Direct setters for loading from saved settings
    setEnvironmentEnabled,
    setWhiteNoiseEnabled,
    setCrittersEnabled,
  };
}
