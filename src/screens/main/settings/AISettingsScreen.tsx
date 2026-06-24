import React, { useState } from "react";
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
import { useTheme } from "../../../context/ThemeContext";
import { useConvexProfile } from "../../../hooks/useConvex";
import { useSubscriptionTier } from "../../../hooks/useSubscriptionTier";
import { useAuth as useClerkAuth } from "@clerk/clerk-expo";
import { updateUserSettings } from "../../../utils/userSettings";
import { Typography, Spacing, BorderRadius } from "../../../theme/premiumTheme";
import { StaggeredItem } from "../../../components/premium/StaggeredList";
import SettingsGroup from "./components/SettingsGroup";
import SettingsRow from "./components/SettingsRow";
import SettingsSectionHeader from "./components/SettingsSectionHeader";

const AISettingsScreen = () => {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const isDark = theme.isDark;
  const { profile } = useConvexProfile();
  const { userId: clerkUserId } = useClerkAuth();
  const { isElite, isPremium, hasAIAccess } = useSubscriptionTier();

  const [noraEnabled, setNoraEnabled] = useState(true);
  const [patrickEnabled, setPatrickEnabled] = useState(false);
  const [insightsEnabled, setInsightsEnabled] = useState(true);
  const [personalizedResponses, setPersonalizedResponses] = useState(true);

  const handleAIToggle = async (
    aiType: "nora" | "patrick" | "insights",
    value: boolean,
  ) => {
    if (!hasAIAccess) {
      Alert.alert(
        "Subscription Required",
        "AI features require a Premium or Elite subscription.",
        [
          { text: "Maybe Later", style: "cancel" },
          {
            text: "View Plans",
            onPress: () => navigation.navigate("Subscription"),
          },
        ],
      );
      return;
    }

    if (isPremium && aiType === "nora") {
      Alert.alert(
        "Elite Feature",
        "Nora AI with full contextual access is an Elite-only feature.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Upgrade to Elite",
            onPress: () => navigation.navigate("Subscription"),
          },
        ],
      );
      return;
    }

    try {
      if (!clerkUserId) return;
      const updateData: any = { [`${aiType}_enabled`]: value };

      if (isElite && value) {
        if (aiType === "nora") updateData.patrick_enabled = false;
        else if (aiType === "patrick") updateData.nora_enabled = false;
      }

      await updateUserSettings(clerkUserId, updateData);

      if (aiType === "nora") {
        setNoraEnabled(value);
        if (value && isElite) setPatrickEnabled(false);
      }
      if (aiType === "patrick") {
        setPatrickEnabled(value);
        if (value && isElite) setNoraEnabled(false);
      }
      if (aiType === "insights") setInsightsEnabled(value);

      const names = {
        nora: "Nora AI",
        patrick: "Patrick AI",
        insights: "AI Insights",
      };
      Alert.alert(
        "Updated",
        `${names[aiType]} ${value ? "enabled" : "disabled"}`,
      );
    } catch (error) {
      // Error updating AI setting
      Alert.alert("Error", "Failed to update AI setting.");
      if (aiType === "nora") setNoraEnabled(!value);
      if (aiType === "patrick") setPatrickEnabled(!value);
      if (aiType === "insights") setInsightsEnabled(!value);
    }
  };

  const handlePersonalizationToggle = async (value: boolean) => {
    if (!isElite) {
      Alert.alert(
        "Elite Feature",
        "Personalized AI responses require an Elite subscription.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Upgrade to Elite",
            onPress: () => navigation.navigate("Subscription"),
          },
        ],
      );
      return;
    }
    try {
      if (!clerkUserId) return;
      await updateUserSettings(clerkUserId, {
        personalized_responses: value,
      } as any);
      setPersonalizedResponses(value);
    } catch (error) {
      // Error updating personalization
      Alert.alert("Error", "Failed to update setting.");
      setPersonalizedResponses(!value);
    }
  };

  const tierConfig = !hasAIAccess
    ? {
        label: "Free Plan",
        color: "#EF5350",
        bg: "#FFEBEE",
        icon: "lock-closed" as const,
        desc: "Upgrade to Premium or Elite to access AI features.",
      }
    : isElite
      ? {
          label: "Elite Plan",
          color: "#2E7D32",
          bg: "#E8F5E9",
          icon: "star" as const,
          desc: "Full access to Nora, Patrick, and AI insights.",
        }
      : {
          label: "Premium Plan",
          color: "#F57C00",
          bg: "#FFF3E0",
          icon: "sparkles" as const,
          desc: "Access to Patrick and basic AI insights. Upgrade to Elite for Nora.",
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
              {!hasAIAccess && (
                <TouchableOpacity
                  onPress={() => navigation.navigate("Subscription")}
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

        {/* AI Assistants */}
        <StaggeredItem index={1}>
          <SettingsSectionHeader title="AI ASSISTANTS" />
          <SettingsGroup>
            <SettingsRow
              icon="hardware-chip-outline"
              label="Nora AI"
              description={
                isElite && patrickEnabled
                  ? "Full contextual AI (disabled - Patrick is active)"
                  : "Full contextual AI with PDF analysis and insights"
              }
              toggle
              toggleValue={isElite && noraEnabled}
              onToggleChange={(v) => handleAIToggle("nora", v)}
              disabled={!isElite || patrickEnabled}
            />
            <SettingsRow
              icon="chatbubble-ellipses-outline"
              label="Patrick AI"
              description={
                isElite && noraEnabled
                  ? "General Q&A assistant (disabled - Nora is active)"
                  : "General Q&A assistant for study questions"
              }
              toggle
              toggleValue={hasAIAccess && patrickEnabled}
              onToggleChange={(v) => handleAIToggle("patrick", v)}
              disabled={!hasAIAccess || (isElite && noraEnabled)}
              isLast
            />
          </SettingsGroup>
        </StaggeredItem>

        {/* Features */}
        <StaggeredItem index={2}>
          <SettingsSectionHeader title="FEATURES" />
          <SettingsGroup>
            <SettingsRow
              icon="bulb-outline"
              label="AI Insights"
              description={
                isElite
                  ? "Full AI-powered study insights and suggestions"
                  : "Basic AI insights for study sessions"
              }
              toggle
              toggleValue={hasAIAccess && insightsEnabled}
              onToggleChange={(v) => handleAIToggle("insights", v)}
              disabled={!hasAIAccess}
            />
            <SettingsRow
              icon="star-outline"
              label="Personalized Responses"
              description="AI learns from your study habits for tailored recommendations"
              toggle
              toggleValue={isElite && personalizedResponses}
              onToggleChange={handlePersonalizationToggle}
              disabled={!isElite}
              isLast
            />
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
});

export default AISettingsScreen;
