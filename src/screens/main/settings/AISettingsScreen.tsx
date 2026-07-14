import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useTheme } from "../../../context/ThemeContext";
import { useSubscriptionTier } from "../../../hooks/useSubscriptionTier";
import { Typography, Spacing, BorderRadius } from "../../../theme/premiumTheme";
import { StaggeredItem } from "../../../components/premium/StaggeredList";
import SettingsGroup from "./components/SettingsGroup";
import SettingsRow from "./components/SettingsRow";
import SettingsSectionHeader from "./components/SettingsSectionHeader";

/**
 * AI Integration settings.
 *
 * Assistant access is decided by subscription tier alone (Patrick: Basic+,
 * Nora: Elite — enforced server-side in convex/tiers.ts). The only user
 * choices here are Nora's two privacy toggles, persisted in Convex
 * userSettings and enforced in convex/noraChat.ts.
 */
const AISettingsScreen = () => {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const { currentTier, isElite, hasNoraAccess, hasPatrickAccess } =
    useSubscriptionTier();

  const settings = useQuery(api.settings.get);
  const updateSettings = useMutation(api.settings.update);

  // Hydrated from Convex; defaults match the backend (noraChat.ts)
  const noraAppAccess = settings?.noraAppAccess ?? true;
  const noraTrainingConsent = settings?.noraTrainingConsent ?? false;

  const goToPlans = () => navigation.navigate("Subscription");

  const requireElite = (featureName: string) => {
    Alert.alert(
      "Elite Feature",
      `${featureName} is part of Nora, which is available on the Elite plan.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "View Plans", onPress: goToPlans },
      ],
    );
  };

  const handleToggle = async (
    key: "noraAppAccess" | "noraTrainingConsent",
    value: boolean,
  ) => {
    if (!isElite) {
      requireElite("This setting");
      return;
    }
    try {
      await updateSettings({ [key]: value });
    } catch (error) {
      console.error("[AISettings] failed to update", key, error);
      Alert.alert("Error", "Failed to update setting. Please try again.");
    }
  };

  const tierConfig = isElite
    ? {
        label: "Elite Plan",
        color: "#2E7D32",
        bg: "#E8F5E9",
        icon: "star" as const,
        desc: "Full access to Nora — with memory, PDF analysis, and app-aware study support — plus Patrick.",
      }
    : hasPatrickAccess
      ? {
          label: currentTier === "pro" ? "Pro Plan" : "Basic Plan",
          color: "#F57C00",
          bg: "#FFF3E0",
          icon: "sparkles" as const,
          desc: "Patrick, your AI study coach, is included. Upgrade to Elite to unlock Nora.",
        }
      : {
          label: "No Membership",
          color: "#EF5350",
          bg: "#FFEBEE",
          icon: "lock-closed" as const,
          desc: "Subscribe to unlock Patrick (Basic and above) or Nora (Elite).",
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
          AI Integration
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        {/* Tier Badge */}
        <StaggeredItem index={0}>
          <View
            style={[
              styles.tierBadge,
              {
                backgroundColor: tierConfig.bg,
                borderLeftColor: tierConfig.color,
              },
            ]}
          >
            <Ionicons
              name={tierConfig.icon}
              size={24}
              color={tierConfig.color}
            />
            <View style={{ flex: 1, marginLeft: Spacing.sm }}>
              <Text style={[styles.tierLabel, { color: tierConfig.color }]}>
                {tierConfig.label}
              </Text>
              <Text style={[styles.tierDesc, { color: tierConfig.color }]}>
                {tierConfig.desc}
              </Text>
              {!isElite && (
                <TouchableOpacity
                  onPress={goToPlans}
                  style={[
                    styles.upgradeBtn,
                    { backgroundColor: tierConfig.color },
                  ]}
                >
                  <Text style={styles.upgradeBtnText}>View Plans</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </StaggeredItem>

        {/* Assistants — access is tier-based, shown here for clarity */}
        <StaggeredItem index={1}>
          <SettingsSectionHeader title="YOUR ASSISTANTS" />
          <SettingsGroup>
            <SettingsRow
              icon="sparkles-outline"
              label="Nora"
              description={
                hasNoraAccess
                  ? "Your full AI companion: web research, PDF analysis, voice, and memory that learns with you."
                  : "Elite only — web research, PDF analysis, voice, and memory that learns with you."
              }
              value={hasNoraAccess ? "Included" : "Elite"}
              onPress={hasNoraAccess ? undefined : goToPlans}
            />
            <SettingsRow
              icon="chatbubble-ellipses-outline"
              label="Patrick"
              description={
                hasPatrickAccess
                  ? "Your everyday study coach for planning, focus, and motivation."
                  : "Included with every membership (Basic and above)."
              }
              value={hasPatrickAccess ? "Included" : "Basic+"}
              onPress={hasPatrickAccess ? undefined : goToPlans}
              isLast
            />
          </SettingsGroup>
        </StaggeredItem>

        {/* Nora privacy toggles */}
        <StaggeredItem index={2}>
          <SettingsSectionHeader title="NORA PRIVACY" />
          <SettingsGroup>
            <SettingsRow
              icon="key-outline"
              label="App Access & Memory"
              description="Gives Nora complete access to this app — and only this app. She learns alongside you as you study. None of this data is used to train Nora."
              toggle
              toggleValue={isElite && noraAppAccess}
              onToggleChange={(v) => handleToggle("noraAppAccess", v)}
              disabled={!isElite}
            />
            <SettingsRow
              icon="school-outline"
              label="Help Improve Nora"
              description="We use your conversations to train Nora only — so she gets better at learning you and the AI system improves. Off by default."
              toggle
              toggleValue={isElite && noraTrainingConsent}
              onToggleChange={(v) => handleToggle("noraTrainingConsent", v)}
              disabled={!isElite}
              isLast
            />
          </SettingsGroup>
          <Text style={[styles.footnote, { color: theme.textSecondary }]}>
            Turning off App Access & Memory means Nora stops reading your app
            data and stops learning new things about you. What she has already
            learned stays until you clear it from her memory.
          </Text>
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
  tierBadge: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
    borderLeftWidth: 4,
  },
  tierLabel: {
    ...Typography.bodySmall,
    fontWeight: "700",
    marginBottom: 4,
  },
  tierDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  upgradeBtn: {
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    alignSelf: "flex-start",
    marginTop: Spacing.xs,
  },
  upgradeBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 13,
  },
  footnote: {
    fontSize: 12,
    lineHeight: 17,
    paddingHorizontal: Spacing.sm,
    marginTop: Spacing.xs,
  },
});

export default AISettingsScreen;
