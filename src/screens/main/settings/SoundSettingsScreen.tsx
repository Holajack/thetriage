import React, { useState, useEffect } from 'react';
import { View, Text, Switch, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../context/ThemeContext';
import { useConvexProfile } from '../../../hooks/useConvex';
import { useAuth as useClerkAuth } from '@clerk/clerk-expo';
import { useBackgroundMusic } from '../../../hooks/useBackgroundMusic';
import { saveMusicPreferences } from '../../../utils/musicPreferences';
import { updateUserSettings } from '../../../utils/userSettings';
import { Typography, Spacing, BorderRadius } from '../../../theme/premiumTheme';
import { StaggeredItem } from '../../../components/premium/StaggeredList';
import SettingsGroup from './components/SettingsGroup';
import SettingsRow from './components/SettingsRow';
import SettingsSectionHeader from './components/SettingsSectionHeader';

const SOUND_OPTIONS = ['Lo-Fi', 'Nature', 'Classical', 'Jazz Ambient', 'Ambient'];

const SoundSettingsScreen = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const isDark = theme.isDark;
  const { profile } = useConvexProfile();
  const { userId: clerkUserId } = useClerkAuth();
  const { playPreview, stopPreview, isPlaying, isPreviewMode, currentTrack } = useBackgroundMusic();

  const [selectedSound, setSelectedSound] = useState('Lo-Fi');
  const [autoPlaySound, setAutoPlaySound] = useState(false);
  const [appleMusicConnected, setAppleMusicConnected] = useState(false);
  const [spotifyConnected, setSpotifyConnected] = useState(false);

  useEffect(() => {
    if (profile) {
      setSelectedSound(profile.soundPreference || 'Lo-Fi');
    }
  }, [profile]);

  // Stop preview on unmount
  useEffect(() => {
    return () => {
      if (isPreviewMode) {
        stopPreview();
      }
    };
  }, [isPreviewMode]);

  const handleSoundPreferenceChange = async (preference: string) => {
    if (isPlaying && isPreviewMode) {
      await stopPreview();
    }
    setSelectedSound(preference);
    try {
      if (!clerkUserId) throw new Error('No authenticated user');
      await saveMusicPreferences(clerkUserId, {
        sound_preference: preference,
        auto_play_sound: autoPlaySound,
      });
      await playPreview(preference);
    } catch (error) {
      console.error('Error saving sound preference:', error);
      Alert.alert('Error', 'Failed to save sound preference. Please try again.');
    }
  };

  const handlePreviewSound = async (soundOption: string) => {
    try {
      if (isPreviewMode && currentTrack) {
        await stopPreview();
      } else {
        await playPreview(soundOption);
      }
    } catch (error) {
      console.error('Error in preview sound:', error);
      Alert.alert('Preview Error', 'Unable to play preview.');
    }
  };

  const handleAutoPlayToggle = async (value: boolean) => {
    setAutoPlaySound(value);
    try {
      if (!clerkUserId) throw new Error('No authenticated user');
      await updateUserSettings(clerkUserId, { auto_play_sound: value });
    } catch (error) {
      console.error('Error saving auto-play setting:', error);
      Alert.alert('Error', 'Failed to save auto-play setting.');
      setAutoPlaySound(!value);
    }
  };

  const handleAppleMusicConnection = () => {
    if (appleMusicConnected) {
      Alert.alert('Disconnect Apple Music', 'Are you sure you want to disconnect Apple Music?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Disconnect', style: 'destructive', onPress: () => setAppleMusicConnected(false) },
      ]);
    } else {
      Alert.alert(
        'Apple Music Integration',
        'Apple Music integration is coming soon! This will allow you to play your Apple Music library during focus sessions.',
        [{ text: 'OK', onPress: () => setAppleMusicConnected(true) }]
      );
    }
  };

  const handleSpotifyConnection = () => {
    if (spotifyConnected) {
      Alert.alert('Disconnect Spotify', 'Are you sure you want to disconnect Spotify?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Disconnect', style: 'destructive', onPress: () => setSpotifyConnected(false) },
      ]);
    } else {
      Alert.alert(
        'Spotify Integration',
        'Spotify integration is coming soon! This will allow you to play your Spotify playlists during focus sessions.',
        [{ text: 'OK', onPress: () => setSpotifyConnected(true) }]
      );
    }
  };

  const borderColor = theme.border ?? (isDark ? '#2F2F2F' : '#E0E0E0');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Sound</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* Focus Sound */}
        <StaggeredItem index={0}>
          <SettingsSectionHeader title="FOCUS SOUND" />
          <SettingsGroup>
            {SOUND_OPTIONS.map((option, index) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.soundRow,
                  index < SOUND_OPTIONS.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: borderColor,
                  },
                ]}
                onPress={() => handleSoundPreferenceChange(option)}
                activeOpacity={0.7}
              >
                <View style={[styles.radio, { borderColor: theme.primary }]}>
                  {selectedSound === option && (
                    <View style={[styles.radioDot, { backgroundColor: theme.primary }]} />
                  )}
                </View>
                <Text
                  style={[
                    styles.soundLabel,
                    { color: selectedSound === option ? theme.primary : theme.text },
                  ]}
                >
                  {option}
                </Text>
                <TouchableOpacity
                  onPress={() => handlePreviewSound(option)}
                  style={[
                    styles.previewBtn,
                    { backgroundColor: isDark ? '#2f2f2f' : '#F5F5F5' },
                    isPreviewMode && currentTrack?.category === option && {
                      backgroundColor: `${theme.primary}22`,
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      isPreviewMode && currentTrack?.category === option
                        ? 'stop-circle'
                        : 'play-circle-outline'
                    }
                    size={22}
                    color={
                      isPreviewMode && currentTrack?.category === option
                        ? '#E57373'
                        : theme.primary
                    }
                  />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </SettingsGroup>
        </StaggeredItem>

        {/* Playback */}
        <StaggeredItem index={1}>
          <SettingsSectionHeader title="PLAYBACK" />
          <SettingsGroup>
            <SettingsRow
              icon="musical-note-outline"
              label="Auto-Play Sound"
              description="Start music when focus session begins"
              toggle
              toggleValue={autoPlaySound}
              onToggleChange={handleAutoPlayToggle}
              isLast
            />
          </SettingsGroup>
        </StaggeredItem>

        {/* Music Services */}
        <StaggeredItem index={2}>
          <SettingsSectionHeader title="MUSIC SERVICES" />
          <SettingsGroup>
            <View
              style={[
                styles.serviceRow,
                { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: borderColor },
              ]}
            >
              <Ionicons name="logo-apple" size={22} color={theme.primary} style={styles.serviceIcon} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.serviceLabel, { color: theme.text }]}>Apple Music</Text>
                <Text style={[styles.serviceDesc, { color: theme.textSecondary ?? '#666' }]}>
                  {appleMusicConnected ? 'Connected' : 'Connect your account'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleAppleMusicConnection}
                style={[
                  styles.connectBtn,
                  {
                    backgroundColor: appleMusicConnected ? (isDark ? '#2f2f2f' : '#F5F5F5') : '#007AFF',
                    borderWidth: appleMusicConnected ? 1 : 0,
                    borderColor,
                  },
                ]}
              >
                <Text style={[styles.connectBtnText, { color: appleMusicConnected ? theme.text : '#FFF' }]}>
                  {appleMusicConnected ? 'Disconnect' : 'Connect'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.serviceRow}>
              <Ionicons name="musical-notes-outline" size={22} color="#1DB954" style={styles.serviceIcon} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.serviceLabel, { color: theme.text }]}>Spotify</Text>
                <Text style={[styles.serviceDesc, { color: theme.textSecondary ?? '#666' }]}>
                  {spotifyConnected ? 'Connected' : 'Connect your account'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleSpotifyConnection}
                style={[
                  styles.connectBtn,
                  {
                    backgroundColor: spotifyConnected ? (isDark ? '#2f2f2f' : '#F5F5F5') : '#1DB954',
                    borderWidth: spotifyConnected ? 1 : 0,
                    borderColor,
                  },
                ]}
              >
                <Text style={[styles.connectBtnText, { color: spotifyConnected ? theme.text : '#FFF' }]}>
                  {spotifyConnected ? 'Disconnect' : 'Connect'}
                </Text>
              </TouchableOpacity>
            </View>
          </SettingsGroup>
        </StaggeredItem>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...Typography.h2,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
  },
  soundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  radio: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  radioDot: {
    height: 10,
    width: 10,
    borderRadius: 5,
  },
  soundLabel: {
    ...Typography.body,
    fontWeight: '500',
    flex: 1,
  },
  previewBtn: {
    padding: 4,
    borderRadius: BorderRadius.xs,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  serviceIcon: {
    marginRight: Spacing.sm,
  },
  serviceLabel: {
    ...Typography.body,
    fontWeight: '500',
  },
  serviceDesc: {
    ...Typography.caption,
    marginTop: 2,
  },
  connectBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    minWidth: 90,
    alignItems: 'center',
  },
  connectBtnText: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
});

export default SoundSettingsScreen;
