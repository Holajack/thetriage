import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { useTheme } from "../../../context/ThemeContext";
import { Typography, Spacing, BorderRadius } from "../../../theme/premiumTheme";
import { StaggeredItem } from "../../../components/premium/StaggeredList";
import SettingsGroup from "./components/SettingsGroup";
import SettingsSectionHeader from "./components/SettingsSectionHeader";
import { WALKTHROUGH_SCREENS } from "../../../config/walkthroughSteps";
import { resetWalkthrough } from "../../../hooks/useScreenWalkthrough";

const SCREEN_ICONS: Record<string, string> = {
  home: "home-outline",
  focus_prep: "rocket-outline",
  study_session: "timer-outline",
  profile: "person-circle-outline",
  bonuses: "gift-outline",
  community: "people-outline",
};

const ReplayWalkthroughScreen = () => {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const isDark = theme.isDark;

  const handleReplay = async (screen: (typeof WALKTHROUGH_SCREENS)[number]) => {
    try {
      await resetWalkthrough(screen.id);
      navigation.dispatch(
        CommonActions.navigate({
          name: screen.navigateTo,
          params: { _replayWalkthrough: true },
        }),
      );
    } catch (error) {
      // Failed to replay walkthrough
      Alert.alert("Error", "Could not replay walkthrough. Please try again.");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={theme.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>
          Replay Walkthroughs
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        <StaggeredItem index={0}>
          <Text
            style={[styles.subtitle, { color: theme.textSecondary ?? "#666" }]}
          >
            Pick a screen to revisit its walkthrough. We'll take you there and
            play the tour from the start.
          </Text>
        </StaggeredItem>

        <StaggeredItem index={1}>
          <SettingsSectionHeader title="SCREENS" />
          <SettingsGroup>
            {WALKTHROUGH_SCREENS.map((screen, index) => {
              const isLast = index === WALKTHROUGH_SCREENS.length - 1;
              return (
                <TouchableOpacity
                  key={screen.id}
                  style={[
                    styles.row,
                    !isLast && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor:
                        theme.border ?? (isDark ? "#2F2F2F" : "#E0E0E0"),
                    },
                  ]}
                  onPress={() => handleReplay(screen)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: `${theme.primary}15` },
                    ]}
                  >
                    <Ionicons
                      name={
                        (SCREEN_ICONS[screen.id] ??
                          "play-circle-outline") as any
                      }
                      size={20}
                      color={theme.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowLabel, { color: theme.text }]}>
                      {screen.label}
                    </Text>
                    <Text
                      style={[
                        styles.rowDesc,
                        { color: theme.textSecondary ?? "#666" },
                      ]}
                    >
                      Tap to replay this tour
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={theme.textSecondary ?? "#999"}
                  />
                </TouchableOpacity>
              );
            })}
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
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  subtitle: {
    ...Typography.bodySmall,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
    lineHeight: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    ...Typography.body,
    fontWeight: "500",
  },
  rowDesc: {
    ...Typography.caption,
    marginTop: 2,
  },
});

export default ReplayWalkthroughScreen;
