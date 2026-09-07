import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import {
  OnboardingStackParamList,
  RootStackParamList,
} from "../../navigation/types";
import { AgeGateForm, NotYetView } from "../../components/AgeGateForm";
import { ageBandFromBirth } from "../../../convex/age";
import {
  markAgeDenied,
  savePendingBirth,
  wasAgeDenied,
  type PendingBirth,
} from "../../utils/ageGate";

type AgeGateNavigationProp = NativeStackNavigationProp<
  OnboardingStackParamList,
  "AgeGate"
>;

/**
 * First onboarding step, before any account exists. Under the minimum age no
 * email is collected and the device remembers the answer.
 */
export default function AgeGateScreen() {
  const navigation = useNavigation<AgeGateNavigationProp>();
  const rootNavigation =
    navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
  const [denied, setDenied] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    wasAgeDenied().then(setDenied, () => setDenied(false));
  }, []);

  const handleSubmit = async ({ birthYear, birthMonth }: PendingBirth) => {
    setError(null);
    try {
      if (ageBandFromBirth(birthYear, birthMonth) === "under14") {
        await markAgeDenied();
        setDenied(true);
        return;
      }
      await savePendingBirth({ birthYear, birthMonth });
      navigation.navigate("AccountCreation");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Something went wrong. Try again.",
      );
    }
  };

  if (denied === null) {
    return (
      <LinearGradient
        colors={["#0F2419", "#1B4A3A", "#2E5D4F", "#1B4A3A"]}
        style={styles.blank}
      >
        <View />
      </LinearGradient>
    );
  }

  if (denied) {
    return <NotYetView onDone={() => rootNavigation?.navigate("Landing")} />;
  }

  return (
    <AgeGateForm
      title="Before we start"
      subtitle="When were you born?"
      onSubmit={handleSubmit}
      error={error}
      onBack={() => navigation.goBack()}
    />
  );
}

const styles = StyleSheet.create({
  blank: { flex: 1 },
});
