import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../../../context/ThemeContext";
import { useConvexProfile } from "../../../hooks/useConvex";
import { useAuth as useClerkAuth } from "@clerk/clerk-expo";
import { useBackgroundMusic } from "../../../hooks/useBackgroundMusic";
import { saveMusicPreferences } from "../../../utils/musicPreferences";
import {
  getUserSettings,
  updateUserSettings,
} from "../../../utils/userSettings";
import { appleMusicService } from "../../../services/appleMusic/AppleMusicService";
import { Typography, Spacing, BorderRadius } from "../../../theme/premiumTheme";
import { StaggeredItem } from "../../../components/premium/StaggeredList";
import SettingsGroup from "./components/SettingsGroup";
import SettingsRow from "./components/SettingsRow";
import SettingsSectionHeader from "./components/SettingsSectionHeader";

const SOUND_OPTIONS = [
  "Lo-Fi",
  "Nature",
  "Classical",
  "Jazz Ambient",
  "Ambient",
];

// Beta gate for Apple Music. Flip to true when the integration ships.
const BETA_FEATURES = {
  appleMusic: false,
};

const SoundSettingsScreen = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const isDark = theme.isDark;
  const { profile } = useConvexProfile();
  const { userId: clerkUserId } = useClerkAuth();
  const { playPreview, stopPreview, isPlaying, isPreviewMode, currentTrack } =
    useBackgroundMusic();
  const [selectedSound, setSelectedSound] = useState("Lo-Fi");
  const [autoPlaySound, setAutoPlaySound] = useState(false);
  const [appleMusicConnected, setAppleMusicConnected] = useState(false);

  useEffect(() => {
    if (profile) {
      setSelectedSound(profile.soundPreference || "Lo-Fi");
    }
    // Load auto-play setting from saved user settings
    getUserSettings().then((settings) => {
      if (settings?.auto_play_sound !== undefined) {
        setAutoPlaySound(settings.auto_play_sound);
      }
    });
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
      if (!clerkUserId) throw new Error("No authenticated user");
      await saveMusicPreferences(clerkUserId, {
        sound_preference: preference,
        auto_play_sound: autoPlaySound,
      });
      await playPreview(preference);
    } catch (error) {
      // Error saving sound preference
      Alert.alert(
        "Error",
        "Failed to save sound preference. Please try again.",
      );
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
      // Error in preview sound
      Alert.alert("Preview Error", "Unable to play preview.");
    }
  };

  const handleAutoPlayToggle = async (value: boolean) => {
    setAutoPlaySound(value);
    try {
      if (!clerkUserId) throw new Error("No authenticated user");
      await updateUserSettings(clerkUserId, { auto_play_sound: value });
    } catch (error) {
      // Error saving auto-play setting
      Alert.alert("Error", "Failed to save auto-play setting.");
      setAutoPlaySound(!value);
    }
  };

  // Load connection states on mount
  useEffect(() => {
    setAppleMusicConnected(appleMusicService.isConnected());
  }, []);

  const handleAppleMusicConnection = async () => {
    if (appleMusicConnected) {
      Alert.alert(
        "Disconnect Apple Music",
        "Are you sure you want to disconnect Apple Music?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Disconnect",
            style: "destructive",
            onPress: async () => {
              await appleMusicService.disconnect();
              setAppleMusicConnected(false);
              if (clerkUserId) {
                await updateUserSettings(clerkUserId, {
                  appleMusicConnected: false,
                } as any);
              }
            },
          },
        ],
      );
    } else {
      const connected = await appleMusicService.connect();
      setAppleMusicConnected(connected);
      if (connected && clerkUserId) {
        await updateUserSettings(clerkUserId, {
          appleMusicConnected: true,
        } as any);
      }
    }
  };

  const borderColor = theme.border ?? (isDark ? "#2F2F2F" : "#E0E0E0");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={theme.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Sound</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
                    <View
                      style={[
                        styles.radioDot,
                        { backgroundColor: theme.primary },
                      ]}
                    />
                  )}
                </View>
                <Text
                  style={[
                    styles.soundLabel,
                    {
                      color:
                        selectedSound === option ? theme.primary : theme.text,
                    },
                  ]}
                >
                  {option}
                </Text>
                <TouchableOpacity
                  onPress={() => handlePreviewSound(option)}
                  style={[
                    styles.previewBtn,
                    { backgroundColor: isDark ? "#2f2f2f" : "#F5F5F5" },
                    isPreviewMode &&
                      currentTrack?.category === option && {
                        backgroundColor: `${theme.primary}22`,
                      },
                  ]}
                >
                  <Ionicons
                    name={
                      isPreviewMode && currentTrack?.category === option
                        ? "stop-circle"
                        : "play-circle-outline"
                    }
                    size={22}
                    color={
                      isPreviewMode && currentTrack?.category === option
                        ? "#E57373"
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
                !BETA_FEATURES.appleMusic && styles.serviceRowDisabled,
              ]}
            >
              <Ionicons
                name="logo-apple"
                size={22}
                color={
                  BETA_FEATURES.appleMusic
                    ? theme.primary
                    : (theme.textTertiary ?? "#9E9E9E")
                }
                style={styles.serviceIcon}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.serviceLabel,
                    {
                      color: BETA_FEATURES.appleMusic
                        ? theme.text
                        : (theme.textSecondary ?? "#999"),
                    },
                  ]}
                >
                  Apple Music
                </Text>
                <Text
                  style={[
                    styles.serviceDesc,
                    { color: theme.textSecondary ?? "#666" },
                  ]}
                >
                  {BETA_FEATURES.appleMusic
                    ? appleMusicConnected
                      ? "Connected"
                      : "Connect your account"
                    : "Available in a future update"}
                </Text>
              </View>
              {BETA_FEATURES.appleMusic ? (
                <TouchableOpacity
                  onPress={handleAppleMusicConnection}
                  style={[
                    styles.connectBtn,
                    {
                      backgroundColor: appleMusicConnected
                        ? isDark
                          ? "#2f2f2f"
                          : "#F5F5F5"
                        : "#007AFF",
                      borderWidth: appleMusicConnected ? 1 : 0,
                      borderColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.connectBtnText,
                      { color: appleMusicConnected ? theme.text : "#FFF" },
                    ]}
                  >
                    {appleMusicConnected ? "Disconnect" : "Connect"}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View
                  style={[
                    styles.comingSoonPill,
                    {
                      backgroundColor: isDark ? "#2f2f2f" : "#EEE",
                      borderColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.comingSoonText,
                      { color: theme.textSecondary ?? "#666" },
                    ]}
                  >
                    Coming Soon
                  </Text>
                </View>
              )}
            </View>
          </SettingsGroup>
        </StaggeredItem>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...Typography.h2,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  soundRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  radio: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  radioDot: {
    height: 10,
    width: 10,
    borderRadius: 5,
  },
  soundLabel: {
    ...Typography.body,
    fontWeight: "500",
    flex: 1,
  },
  previewBtn: {
    padding: 4,
    borderRadius: BorderRadius.xs,
  },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  serviceRowDisabled: {
    opacity: 0.6,
  },
  serviceIcon: {
    marginRight: Spacing.sm,
  },
  comingSoonPill: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  comingSoonText: {
    ...Typography.caption,
    fontWeight: "600",
  },
  serviceLabel: {
    ...Typography.body,
    fontWeight: "500",
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
    alignItems: "center",
  },
  connectBtnText: {
    ...Typography.bodySmall,
    fontWeight: "600",
  },
});

export default SoundSettingsScreen;
