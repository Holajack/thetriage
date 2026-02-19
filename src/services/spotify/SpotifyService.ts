/**
 * Spotify Integration Service
 *
 * Uses Spotify Web API + OAuth PKCE flow via expo-auth-session.
 * Playback is controlled via Spotify Connect API (requires Spotify app
 * to be open/active on the device).
 *
 * Prerequisites:
 * 1. Register app at https://developer.spotify.com/dashboard
 * 2. Set redirect URI to: thetriage://spotify-callback
 * 3. Add EXPO_PUBLIC_SPOTIFY_CLIENT_ID to .env.local
 */
import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import { Alert, Linking, Platform } from 'react-native';
import type { AudioSource, MusicProvider, TrackInfo, PlaybackState, PlaylistInfo } from '../musicProviders/types';

const CLIENT_ID = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID || '';
const REDIRECT_URI = AuthSession.makeRedirectUri({ scheme: 'hikewise', path: 'spotify-callback' });
const SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'playlist-read-private',
  'playlist-read-collaborative',
  'streaming',
].join(' ');

const AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize';
const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';
const API_BASE = 'https://api.spotify.com/v1';

const SECURE_STORE_KEYS = {
  accessToken: 'spotify_access_token',
  refreshToken: 'spotify_refresh_token',
  expiresAt: 'spotify_expires_at',
};

type StateCallback<T> = (value: T) => void;

class SpotifyService implements MusicProvider {
  readonly source: AudioSource = 'spotify';

  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private expiresAt: number = 0;
  private connected: boolean = false;
  private currentTrackInfo: TrackInfo | null = null;
  private playbackState: PlaybackState = 'idle';
  private stateCallbacks: StateCallback<PlaybackState>[] = [];
  private trackCallbacks: StateCallback<TrackInfo | null>[] = [];
  private pollingInterval: ReturnType<typeof setInterval> | null = null;

  // --- Connection lifecycle ---

  async connect(): Promise<boolean> {
    if (!CLIENT_ID) {
      Alert.alert(
        'Spotify Not Configured',
        'Add EXPO_PUBLIC_SPOTIFY_CLIENT_ID to your .env.local file. Get one from developer.spotify.com/dashboard'
      );
      return false;
    }

    try {
      // Try to restore saved tokens first
      const restored = await this.restoreTokens();
      if (restored) {
        this.connected = true;
        this.startPolling();
        return true;
      }

      // OAuth PKCE flow
      const discovery = {
        authorizationEndpoint: AUTH_ENDPOINT,
        tokenEndpoint: TOKEN_ENDPOINT,
      };

      const request = new AuthSession.AuthRequest({
        clientId: CLIENT_ID,
        scopes: SCOPES.split(' '),
        redirectUri: REDIRECT_URI,
        usePKCE: true,
        responseType: AuthSession.ResponseType.Code,
      });

      const result = await request.promptAsync(discovery);

      if (result.type !== 'success' || !result.params.code) {
        console.log('Spotify auth cancelled or failed:', result.type);
        return false;
      }

      // Exchange code for tokens
      const tokenResponse = await AuthSession.exchangeCodeAsync(
        {
          clientId: CLIENT_ID,
          code: result.params.code,
          redirectUri: REDIRECT_URI,
          extraParams: { code_verifier: request.codeVerifier! },
        },
        discovery
      );

      this.accessToken = tokenResponse.accessToken;
      this.refreshToken = tokenResponse.refreshToken || null;
      this.expiresAt = Date.now() + (tokenResponse.expiresIn || 3600) * 1000;
      this.connected = true;

      await this.saveTokens();
      this.startPolling();

      console.log('Spotify connected successfully');
      return true;
    } catch (error) {
      console.error('Spotify connect error:', error);
      Alert.alert('Spotify Error', 'Failed to connect to Spotify. Please try again.');
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.stopPolling();
    await this.stop();
    this.accessToken = null;
    this.refreshToken = null;
    this.expiresAt = 0;
    this.connected = false;
    this.currentTrackInfo = null;
    this.playbackState = 'idle';

    await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.accessToken);
    await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.refreshToken);
    await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.expiresAt);

    this.notifyStateChange('idle');
    this.notifyTrackChange(null);
    console.log('Spotify disconnected');
  }

  isConnected(): boolean {
    return this.connected && !!this.accessToken;
  }

  // --- Playback control ---

  async play(options: { category?: string; playlistId?: string; trackId?: string }): Promise<void> {
    await this.ensureToken();

    try {
      // Check for active device
      const devices = await this.apiGet('/me/player/devices');
      if (!devices.devices || devices.devices.length === 0) {
        Alert.alert(
          'Open Spotify',
          'Please open the Spotify app first so we can control playback.',
          [
            { text: 'Open Spotify', onPress: () => this.openSpotifyApp() },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        return;
      }

      const body: any = {};
      if (options.trackId) {
        body.uris = [`spotify:track:${options.trackId}`];
      } else if (options.playlistId) {
        body.context_uri = `spotify:playlist:${options.playlistId}`;
      }

      await this.apiPut('/me/player/play', body);
      this.playbackState = 'playing';
      this.notifyStateChange('playing');
    } catch (error: any) {
      if (error.status === 404) {
        Alert.alert('Open Spotify', 'Please open the Spotify app to start playback.');
        this.openSpotifyApp();
      } else {
        console.error('Spotify play error:', error);
      }
    }
  }

  async pause(): Promise<void> {
    await this.ensureToken();
    try {
      await this.apiPut('/me/player/pause');
      this.playbackState = 'paused';
      this.notifyStateChange('paused');
    } catch (error) {
      console.error('Spotify pause error:', error);
    }
  }

  async resume(): Promise<void> {
    await this.ensureToken();
    try {
      await this.apiPut('/me/player/play');
      this.playbackState = 'playing';
      this.notifyStateChange('playing');
    } catch (error) {
      console.error('Spotify resume error:', error);
    }
  }

  async stop(): Promise<void> {
    try {
      await this.pause();
      this.playbackState = 'stopped';
      this.notifyStateChange('stopped');
    } catch {
      // Ignore stop errors
    }
  }

  async nextTrack(): Promise<void> {
    await this.ensureToken();
    try {
      await this.apiPost('/me/player/next');
    } catch (error) {
      console.error('Spotify next error:', error);
    }
  }

  async previousTrack(): Promise<void> {
    await this.ensureToken();
    try {
      await this.apiPost('/me/player/previous');
    } catch (error) {
      console.error('Spotify previous error:', error);
    }
  }

  async setVolume(volume: number): Promise<void> {
    await this.ensureToken();
    const percent = Math.round(Math.max(0, Math.min(1, volume)) * 100);
    try {
      await this.apiPut(`/me/player/volume?volume_percent=${percent}`);
    } catch (error) {
      console.error('Spotify volume error:', error);
    }
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
    await this.ensureToken();
    try {
      const data = await this.apiGet('/me/playlists?limit=50');
      return (data.items || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        trackCount: p.tracks?.total || 0,
        imageUrl: p.images?.[0]?.url,
        source: 'spotify' as AudioSource,
      }));
    } catch (error) {
      console.error('Spotify playlists error:', error);
      return [];
    }
  }

  async searchTracks(query: string): Promise<TrackInfo[]> {
    await this.ensureToken();
    try {
      const data = await this.apiGet(`/search?q=${encodeURIComponent(query)}&type=track&limit=20`);
      return (data.tracks?.items || []).map((t: any) => this.mapTrack(t));
    } catch (error) {
      console.error('Spotify search error:', error);
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

  private async apiGet(path: string): Promise<any> {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (!response.ok) {
      const error: any = new Error(`Spotify API ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return response.json();
  }

  private async apiPut(path: string, body?: any): Promise<void> {
    await fetch(`${API_BASE}${path}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  private async apiPost(path: string, body?: any): Promise<void> {
    await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  private mapTrack(t: any): TrackInfo {
    return {
      id: t.id,
      name: t.name,
      artist: t.artists?.map((a: any) => a.name).join(', ') || 'Unknown',
      albumArt: t.album?.images?.[0]?.url,
      durationMs: t.duration_ms || 0,
      source: 'spotify',
    };
  }

  private async saveTokens(): Promise<void> {
    if (this.accessToken) await SecureStore.setItemAsync(SECURE_STORE_KEYS.accessToken, this.accessToken);
    if (this.refreshToken) await SecureStore.setItemAsync(SECURE_STORE_KEYS.refreshToken, this.refreshToken);
    await SecureStore.setItemAsync(SECURE_STORE_KEYS.expiresAt, String(this.expiresAt));
  }

  private async restoreTokens(): Promise<boolean> {
    try {
      const accessToken = await SecureStore.getItemAsync(SECURE_STORE_KEYS.accessToken);
      const refreshToken = await SecureStore.getItemAsync(SECURE_STORE_KEYS.refreshToken);
      const expiresAtStr = await SecureStore.getItemAsync(SECURE_STORE_KEYS.expiresAt);

      if (!accessToken) return false;

      this.accessToken = accessToken;
      this.refreshToken = refreshToken;
      this.expiresAt = expiresAtStr ? parseInt(expiresAtStr, 10) : 0;

      // If token expired, try refreshing
      if (Date.now() >= this.expiresAt) {
        if (this.refreshToken) {
          return await this.refreshAccessToken();
        }
        return false;
      }

      // Verify token still works
      try {
        await this.apiGet('/me');
        return true;
      } catch {
        if (this.refreshToken) {
          return await this.refreshAccessToken();
        }
        return false;
      }
    } catch {
      return false;
    }
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false;

    try {
      const response = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.refreshToken,
          client_id: CLIENT_ID,
        }).toString(),
      });

      if (!response.ok) return false;

      const data = await response.json();
      this.accessToken = data.access_token;
      if (data.refresh_token) this.refreshToken = data.refresh_token;
      this.expiresAt = Date.now() + (data.expires_in || 3600) * 1000;

      await this.saveTokens();
      return true;
    } catch {
      return false;
    }
  }

  private async ensureToken(): Promise<void> {
    if (Date.now() >= this.expiresAt - 60000) {
      if (this.refreshToken) {
        const refreshed = await this.refreshAccessToken();
        if (!refreshed) {
          this.connected = false;
          throw new Error('Spotify token expired');
        }
      }
    }
  }

  private openSpotifyApp(): void {
    const url = Platform.OS === 'ios' ? 'spotify://' : 'spotify://';
    Linking.canOpenURL(url).then(canOpen => {
      if (canOpen) {
        Linking.openURL(url);
      } else {
        Alert.alert('Spotify Not Installed', 'Please install the Spotify app from the App Store.');
      }
    });
  }

  private startPolling(): void {
    this.stopPolling();
    // Poll playback state every 3 seconds
    this.pollingInterval = setInterval(() => this.pollPlaybackState(), 3000);
  }

  private stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  private async pollPlaybackState(): Promise<void> {
    if (!this.connected || !this.accessToken) return;

    try {
      await this.ensureToken();
      const data = await this.apiGet('/me/player');

      const newState: PlaybackState = data.is_playing ? 'playing' : 'paused';
      if (newState !== this.playbackState) {
        this.playbackState = newState;
        this.notifyStateChange(newState);
      }

      if (data.item) {
        const newTrack = this.mapTrack(data.item);
        if (newTrack.id !== this.currentTrackInfo?.id) {
          this.currentTrackInfo = newTrack;
          this.notifyTrackChange(newTrack);
        }
      }
    } catch {
      // Silent fail on polling - don't spam errors
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
export const spotifyService = new SpotifyService();
