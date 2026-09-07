import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedButton } from "./premium/AnimatedButton";
import { isValidBirthMonthYear, MINIMUM_AGE } from "../../convex/age";
import type { PendingBirth } from "../utils/ageGate";

const GRADIENT = ["#0F2419", "#1B4A3A", "#2E5D4F", "#1B4A3A"] as const;

type AgeGateFormProps = {
  title: string;
  subtitle: string;
  onSubmit: (birth: PendingBirth) => Promise<void> | void;
  submitting?: boolean;
  error?: string | null;
  onBack?: () => void;
};

/**
 * Neutral birth month and year question. It deliberately says nothing about a
 * minimum age before the answer is given, so the answer is not steered.
 */
export function AgeGateForm({
  title,
  subtitle,
  onSubmit,
  submitting = false,
  error,
  onBack,
}: AgeGateFormProps) {
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleContinue = async () => {
    const birthMonth = Number(month);
    const birthYear = Number(year);
    if (!isValidBirthMonthYear(birthYear, birthMonth)) {
      setValidationError(
        "Enter the month as 1 to 12 and the year as 4 digits.",
      );
      return;
    }
    setValidationError(null);
    await onSubmit({ birthYear, birthMonth });
  };

  const shownError = validationError ?? error ?? null;

  return (
    <LinearGradient
      colors={[...GRADIENT]}
      locations={[0, 0.3, 0.7, 1]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        >
          <View style={styles.header}>
            {onBack && (
              <TouchableOpacity
                onPress={onBack}
                style={styles.backButton}
                accessibilityRole="button"
                accessibilityLabel="Back"
              >
                <Ionicons name="arrow-back" size={24} color="#E8F5E9" />
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.headerTitle}>{title}</Text>
            <Text style={styles.headerSubtitle}>{subtitle}</Text>
          </View>

          <View style={styles.row}>
            <View style={styles.field}>
              <Text style={styles.inputLabel}>Birth month</Text>
              <TextInput
                style={styles.input}
                value={month}
                onChangeText={setMonth}
                placeholder="MM"
                placeholderTextColor="#B8E6C1"
                keyboardType="number-pad"
                maxLength={2}
                accessibilityLabel="Birth month"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.inputLabel}>Birth year</Text>
              <TextInput
                style={styles.input}
                value={year}
                onChangeText={setYear}
                placeholder="YYYY"
                placeholderTextColor="#B8E6C1"
                keyboardType="number-pad"
                maxLength={4}
                accessibilityLabel="Birth year"
              />
            </View>
          </View>

          {shownError && <Text style={styles.error}>{shownError}</Text>}

          <Text style={styles.footnote}>
            We only keep the month and year, and we use it to set up the right
            account for your age.
          </Text>

          <AnimatedButton
            title="Continue"
            onPress={handleContinue}
            loading={submitting}
            disabled={submitting || month.length === 0 || year.length < 4}
          />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

type NotYetViewProps = {
  onDone: () => Promise<void> | void;
  busy?: boolean;
  error?: string | null;
};

/** Shown once someone under the minimum age has answered. No second try. */
export function NotYetView({ onDone, busy = false, error }: NotYetViewProps) {
  return (
    <LinearGradient
      colors={[...GRADIENT]}
      locations={[0, 0.3, 0.7, 1]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Ionicons name="leaf-outline" size={56} color="#B8E6C1" />
          <Text style={styles.headerTitle}>Not just yet</Text>
          <Text style={styles.headerSubtitle}>
            HikeWise is for students {MINIMUM_AGE} and up. Thanks for checking
            us out, and come back when it is your turn on the trail.
          </Text>
          {error && <Text style={styles.error}>{error}</Text>}
          <View style={styles.doneButton}>
            <AnimatedButton title="OK" onPress={onDone} loading={busy} />
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 120,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  header: { marginBottom: 24, alignItems: "center" },
  backButton: {
    position: "absolute",
    top: 0,
    left: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  backButtonText: {
    color: "#E8F5E9",
    fontSize: 16,
    marginLeft: 6,
    fontWeight: "500",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#E8F5E9",
    textAlign: "center",
    marginTop: 40,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#B8E6C1",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  row: { flexDirection: "row", gap: 12, marginBottom: 12 },
  field: { flex: 1 },
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#E8F5E9",
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    color: "#E8F5E9",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    fontSize: 18,
    borderWidth: 1,
    borderColor: "rgba(232, 245, 233, 0.2)",
    width: "100%",
  },
  error: {
    color: "#FFAB91",
    fontSize: 14,
    textAlign: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  footnote: {
    color: "#B8E6C1",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    marginVertical: 20,
    paddingHorizontal: 8,
  },
  doneButton: { marginTop: 28, width: "100%" },
});
