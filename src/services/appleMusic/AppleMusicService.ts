/**
 * Apple Music Integration Service
 *
 * Uses @lomray/react-native-apple-music for native MusicKit authorization
 * and playback control on iOS.
 *
 * Prerequisites:
 * 1. Enable MusicKit capability for com.hikewise.app in Apple Developer portal
 * 2. Run a development build (not Expo Go) - `eas build --profile development`
 * 3. The withMusicKit config plugin adds the entitlement and Info.plist key automatically
 */
import { Alert, NativeModules, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { AudioSource, MusicProvider, TrackInfo, PlaybackState, PlaylistInfo } from '../musicProviders/types';

// Lazy-import the library so it doesn't crash on Android or Expo Go
let AppleMusicAuth: typeof import('@lomray/react-native-apple-music').Auth | null = null;
let AppleMusicPlayer: typeof import('@lomray/react-native-apple-music').Player | null = null;
let AppleMusicKit: typeof import('@lomray/react-native-apple-music').MusicKit | null = null;
let AppleMusicAuthStatus: typeof import('@lomray/react-native-apple-music').AuthStatus | null = null;

try {
  // Only load if the native module is available (dev build on iOS)
  if (Platform.OS === 'ios' && NativeModules.MusicModule) {
    const lib = require('@lomray/react-native-apple-music');
    AppleMusicAuth = lib.Auth;
    AppleMusicPlayer = lib.Player;
    AppleMusicKit = lib.MusicKit;
    AppleMusicAuthStatus = lib.AuthStatus;
  }
} catch {
  // Native module not available (Expo Go or Android)
}

const SECURE_STORE_KEYS = {
  connected: 'apple_music_connected',
};

type StateCallback<T> = (value: T) => void;

class AppleMusicService implements MusicProvider {
  readonly source: AudioSource = 'apple-music';

  private connected: boolean = false;
  private currentTrackInfo: TrackInfo | null = null;
  private playbackState: PlaybackState = 'idle';
  private stateCallbacks: StateCallback<PlaybackState>[] = [];
  private trackCallbacks: StateCallback<TrackInfo | null>[] = [];
  private playbackListener: { remove: () => void } | null = null;
  private songListener: { remove: () => void } | null = null;

  constructor() {
    if (Platform.OS !== 'ios') {
      console.log('Apple Music is only available on iOS');
    }
  }

  // --- Connection lifecycle ---

  async connect(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      Alert.alert('Apple Music', 'Apple Music integration is only available on iOS devices.');
      return false;
    }

    if (!AppleMusicAuth) {
      Alert.alert(
        'Development Build Required',
        'Apple Music requires a development build with MusicKit enabled. Run: eas build --profile development',
      );
      return false;
    }

    try {
      // Try to restore saved connection
      const wasConnected = await SecureStore.getItemAsync(SECURE_STORE_KEYS.connected);
      if (wasConnected === 'true') {
        // Verify authorization is still valid
        const status = await AppleMusicAuth.authorize();
        if (status === AppleMusicAuthStatus?.AUTHORIZED) {
          this.connected = true;
          await this.configureAndListen();
          return true;
        }
      }

      // Request fresh authorization
      const status = await AppleMusicAuth.authorize();
      if (status !== AppleMusicAuthStatus?.AUTHORIZED) {
        if (status === AppleMusicAuthStatus?.DENIED) {
          Alert.alert(
            'Permission Denied',
            'Please enable Apple Music access in Settings > HikeWise > Media & Apple Music.',
          );
        }
        return false;
      }

      this.connected = true;
      await SecureStore.setItemAsync(SECURE_STORE_KEYS.connected, 'true');
      await this.configureAndListen();
      console.log('Apple Music connected successfully');
      return true;
    } catch (error) {
      console.error('Apple Music connect error:', error);
      Alert.alert('Apple Music Error', 'Failed to connect to Apple Music. Please try again.');
      return false;
    }
  }

  async disconnect(): Promise<void> {
    await this.stop();
    this.removeListeners();
    this.connected = false;
    this.currentTrackInfo = null;
    this.playbackState = 'idle';

    await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.connected);

    this.notifyStateChange('idle');
    this.notifyTrackChange(null);
    console.log('Apple Music disconnected');
  }

  isConnected(): boolean {
    return this.connected && Platform.OS === 'ios' && !!AppleMusicAuth;
  }

  // --- Playback control ---

  async play(options: { category?: string; playlistId?: string; trackId?: string }): Promise<void> {
    if (!this.connected || !AppleMusicKit || !AppleMusicPlayer) return;

    try {
      if (options.trackId) {
        await AppleMusicKit.playLibrarySong(options.trackId);
      } else if (options.playlistId) {
        await AppleMusicKit.playLibraryPlaylist(options.playlistId);
      }
      AppleMusicPlayer.play();
      this.playbackState = 'playing';
      this.notifyStateChange('playing');
    } catch (error) {
      console.error('Apple Music play error:', error);
    }
  }

  async pause(): Promise<void> {
    if (!this.connected || !AppleMusicPlayer) return;
    try {
      AppleMusicPlayer.pause();
      this.playbackState = 'paused';
      this.notifyStateChange('paused');
    } catch (error) {
      console.error('Apple Music pause error:', error);
    }
  }

  async resume(): Promise<void> {
    if (!this.connected || !AppleMusicPlayer) return;
    try {
      AppleMusicPlayer.play();
      this.playbackState = 'playing';
      this.notifyStateChange('playing');
    } catch (error) {
      console.error('Apple Music resume error:', error);
    }
  }

  async stop(): Promise<void> {
    try {
      if (AppleMusicPlayer) {
        AppleMusicPlayer.pause();
      }
      this.playbackState = 'stopped';
      this.notifyStateChange('stopped');
    } catch {
      // Ignore stop errors
    }
  }

  async nextTrack(): Promise<void> {
    if (!this.connected || !AppleMusicPlayer) return;
    AppleMusicPlayer.skipToNextEntry();
  }

  async previousTrack(): Promise<void> {
    if (!this.connected || !AppleMusicPlayer) return;
    AppleMusicPlayer.skipToPreviousEntry();
  }

  async setVolume(_volume: number): Promise<void> {
    // MusicKit uses system volume - no direct control
  }

  // --- State queries ---

  getCurrentTrack(): TrackInfo | null {
    return this.currentTrackInfo;
  }

  getPlaybackState(): PlaybackState {
    return this.playbackState;
  }

  // --- Playlist browsing ---

  async getPlaylists(): Promise<PlaylistInfo[]> {
    if (!this.connected || !AppleMusicKit) return [];

    try {
      const result = await AppleMusicKit.getUserPlaylists();
      return (result.playlists || []).map((p) => ({
        id: p.id,
        name: p.name,
        trackCount: p.trackCount || 0,
        imageUrl: p.artworkUrl,
        source: 'apple-music' as AudioSource,
      }));
    } catch (error) {
      console.error('Apple Music playlists error:', error);
      return [];
    }
  }

  async searchTracks(query: string): Promise<TrackInfo[]> {
    if (!this.connected || !AppleMusicKit) return [];

    try {
      const result = await AppleMusicKit.catalogSearch(query, ['songs' as any]);
      const songs = (result as any).songs || [];
      return songs.map((t: any) => ({
        id: t.id,
        name: t.title || 'Unknown',
        artist: t.artistName || 'Unknown',
        albumArt: t.artworkUrl,
        durationMs: (t.duration || 0) * 1000, // Library returns seconds
        source: 'apple-music' as AudioSource,
      }));
    } catch (error) {
      console.error('Apple Music search error:', error);
      return [];
    }
  }

  // --- Event callbacks ---

  onStateChange(callback: StateCallback<PlaybackState>): () => void {
    this.stateCallbacks.push(callback);
    return () => {
      this.stateCallbacks = this.stateCallbacks.filter(cb => cb !== callback);
    };
  }

  onTrackChange(callback: StateCallback<TrackInfo | null>): () => void {
    this.trackCallbacks.push(callback);
    return () => {
      this.trackCallbacks = this.trackCallbacks.filter(cb => cb !== callback);
    };
  }

  // --- Internal helpers ---

  private async configureAndListen(): Promise<void> {
    if (!AppleMusicPlayer) return;

    // Configure to mix with other audio (ambient sounds)
    try {
      await AppleMusicPlayer.configurePlayer(true);
    } catch {
      // Non-critical
    }

    // Listen for playback state changes
    this.playbackListener = AppleMusicPlayer.addListener(
      'onPlaybackStateChange',
      (state: any) => {
        const status = state?.playbackStatus;
        let mapped: PlaybackState = 'idle';
        if (status === 'playing') mapped = 'playing';
        else if (status === 'paused') mapped = 'paused';
        else if (status === 'stopped') mapped = 'stopped';

        if (mapped !== this.playbackState) {
          this.playbackState = mapped;
          this.notifyStateChange(mapped);
        }
      },
    );

    // Listen for track changes
    this.songListener = AppleMusicPlayer.addListener(
      'onCurrentSongChange',
      (state: any) => {
        const song = state?.currentSong;
        if (song) {
          const track: TrackInfo = {
            id: song.id,
            name: song.title || 'Unknown',
            artist: song.artistName || 'Unknown',
            albumArt: song.artworkUrl,
            durationMs: (song.duration || 0) * 1000,
            source: 'apple-music',
          };
          if (track.id !== this.currentTrackInfo?.id) {
            this.currentTrackInfo = track;
            this.notifyTrackChange(track);
          }
        }
      },
    );
  }

  private removeListeners(): void {
    if (this.playbackListener) {
      this.playbackListener.remove();
      this.playbackListener = null;
    }
    if (this.songListener) {
      this.songListener.remove();
      this.songListener = null;
    }
  }

  private notifyStateChange(state: PlaybackState): void {
    this.stateCallbacks.forEach(cb => cb(state));
  }

  private notifyTrackChange(track: TrackInfo | null): void {
    this.trackCallbacks.forEach(cb => cb(track));
  }
}

// Singleton instance
export const appleMusicService = new AppleMusicService();
