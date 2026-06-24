/**
 * Music Provider Abstraction Types
 *
 * Common interface for all music sources (local, Apple Music).
 * The useBackgroundMusic hook routes playback through the active provider.
 */

export type AudioSource = "local" | "apple-music";
export type PlaybackState =
  | "idle"
  | "loading"
  | "playing"
  | "paused"
  | "stopped"
  | "error";

export interface TrackInfo {
  id: string;
  name: string;
  artist: string;
  albumArt?: string;
  durationMs: number;
  source: AudioSource;
}

export interface PlaylistInfo {
  id: string;
  name: string;
  trackCount: number;
  imageUrl?: string;
  source: AudioSource;
}

export interface MusicProvider {
  readonly source: AudioSource;

  // Connection lifecycle
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // Playback control
  play(options: {
    category?: string;
    playlistId?: string;
    trackId?: string;
  }): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<void>;
  nextTrack(): Promise<void>;
  previousTrack(): Promise<void>;
  setVolume(volume: number): Promise<void>;

  // State queries
  getCurrentTrack(): TrackInfo | null;
  getPlaybackState(): PlaybackState;

  // Playlist browsing (for streaming services)
  getPlaylists?(): Promise<PlaylistInfo[]>;
  searchTracks?(query: string): Promise<TrackInfo[]>;

  // Event callbacks
  onStateChange(callback: (state: PlaybackState) => void): () => void;
  onTrackChange(callback: (track: TrackInfo | null) => void): () => void;
}
