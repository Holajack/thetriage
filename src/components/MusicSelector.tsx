// Create: src/components/MusicSelector.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBackgroundMusic, MusicTrack } from '../hooks/useBackgroundMusic';
import { useTheme } from '../context/ThemeContext';

const MusicSelector: React.FC = () => {
  const { theme } = useTheme();
  const {
    isPlaying,
    currentTrack,
    volume,
    isLoading,
    availableTracks,
    playTrack,
    stopPlayback,
    togglePlayback,
    updateVolume
  } = useBackgroundMusic();

  const groupedTracks = availableTracks.reduce((acc, track) => {
    if (!acc[track.category]) {
      acc[track.category] = [];
    }
    acc[track.category].push(track);
    return acc;
  }, {} as Record<string, MusicTrack[]>);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'lofi': return 'musical-notes';
      case 'nature': return 'leaf';
      case 'classical': return 'musical-note';
      case 'ambient': return 'radio';
      default: return 'musical-notes';
    }
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'lofi': return 'Lo-Fi';
      case 'nature': return 'Nature Sounds';
      case 'classical': return 'Classical';
      case 'ambient': return 'Ambient';
      default: return category;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Current Playing */}
      {currentTrack && (
        <View style={[styles.currentTrack, { backgroundColor: theme.surface }]}>
          <View style={styles.trackInfo}>
            <Text style={[styles.trackTitle, { color: theme.text }]}>
              {currentTrack.displayName}
            </Text>
            <Text style={[styles.trackCategory, { color: theme.textSecondary }]}>
              {getCategoryName(currentTrack.category)}
            </Text>
          </View>
          
          <View style={styles.controls}>
            <TouchableOpacity
              onPress={togglePlayback}
              style={[styles.controlButton, { backgroundColor: theme.primary }]}
              disabled={isLoading}
            >
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={20}
                color={theme.background}
              />
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={stopPlayback}
              style={[styles.controlButton, { backgroundColor: theme.error }]}
            >
              <Ionicons name="stop" size={20} color={theme.background} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Volume Control */}
      <View style={[styles.volumeContainer, { backgroundColor: theme.surface }]}>
        <Ionicons name="volume-low" size={20} color={theme.text} />
        <View style={styles.volumeSlider}>
          {[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0].map((level) => (
            <TouchableOpacity
              key={level}
              onPress={() => updateVolume(level)}
              style={[
                styles.volumeLevel,
                {
                  backgroundColor: volume >= level ? theme.primary : theme.border,
                  height: 8 + (level * 12) // Progressive height
                }
              ]}
            />
          ))}
        </View>
        <Ionicons name="volume-high" size={20} color={theme.text} />
      </View>

      {/* Track Categories */}
      <ScrollView style={styles.tracksContainer} showsVerticalScrollIndicator={false}>
        {Object.entries(groupedTracks).map(([category, tracks]) => (
          <View key={category} style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              <Ionicons
                name={getCategoryIcon(category) as any}
                size={20}
                color={theme.primary}
              />
              <Text style={[styles.categoryTitle, { color: theme.text }]}>
                {getCategoryName(category)}
              </Text>
            </View>
            
            <View style={styles.tracksList}>
              {tracks.map((track) => (
                <TouchableOpacity
                  key={track.id}
                  onPress={() => playTrack(track)}
                  style={[
                    styles.trackItem,
                    {
                      backgroundColor: currentTrack?.id === track.id ? theme.primaryLight : theme.surface,
                      borderColor: currentTrack?.id === track.id ? theme.primary : theme.border
                    }
                  ]}
                  disabled={isLoading}
                >
                  <View style={styles.trackContent}>
                    <Text style={[
                      styles.trackName,
                      { color: currentTrack?.id === track.id ? theme.primary : theme.text }
                    ]}>
                      {track.displayName}
                    </Text>
                    
                    {currentTrack?.id === track.id && isPlaying && (
                      <View style={styles.playingIndicator}>
                        <View style={[styles.soundWave, { backgroundColor: theme.primary }]} />
                        <View style={[styles.soundWave, { backgroundColor: theme.primary }]} />
                        <View style={[styles.soundWave, { backgroundColor: theme.primary }]} />
                      </View>
                    )}
                  </View>
                  
                  {isLoading && currentTrack?.id === track.id && (
                    <Ionicons name="hourglass" size={16} color={theme.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  currentTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  trackCategory: {
    fontSize: 14,
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    gap: 8,
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  volumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  volumeSlider: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'end',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    height: 24,
  },
  volumeLevel: {
    width: 4,
    borderRadius: 2,
  },
  tracksContainer: {
    flex: 1,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  tracksList: {
    gap: 8,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  trackContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trackName: {
    fontSize: 16,
  },
  playingIndicator: {
    flexDirection: 'row',
    alignItems: 'end',
    gap: 2,
  },
  soundWave: {
    width: 3,
    height: 12,
    borderRadius: 1.5,
    opacity: 0.8,
  },
});

export default MusicSelector;