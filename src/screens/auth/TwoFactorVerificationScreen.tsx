import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import {
  useNavigation,
  useRoute,
  CommonActions,
} from "@react-navigation/native";
import { useSignIn } from "@clerk/clerk-expo";
import { AnimatedButton } from "../../components/premium/AnimatedButton";
import {
  useEntranceAnimation,
  useFloatingAnimation,
  useSuccessAnimation,
  triggerHaptic,
} from "../../utils/animationUtils";

const TwoFactorVerificationScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { email } = route.params || {};
  const { signIn, setActive, isLoaded } = useSignIn();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Entrance animations
  const headerAnimation = useEntranceAnimation(0);
  const iconAnimation = useEntranceAnimation(100);
  const contentAnimation = useEntranceAnimation(200);
  const inputAnimation = useEntranceAnimation(300);
  const buttonAnimation = useEntranceAnimation(400);
  const floatingAnimation = useFloatingAnimation();
  const { animatedStyle: successStyle, celebrate } = useSuccessAnimation();

  const handleVerify = useCallback(async () => {
    if (!isLoaded || !signIn) {
      setError("Verification is not ready. Please try again.");
      return;
    }

    if (!code.trim()) {
      setError("Please enter the verification code.");
      triggerHaptic("error");
      return;
    }

    setLoading(true);
    setMessage("");
    setError("");
    triggerHaptic("buttonPress");

    try {
      // Attempt to verify the sign-in with the TOTP code
      const result = await signIn.attemptSecondFactor({
        strategy: "totp",
        code: code.trim(),
      });

      if (result.status === "complete") {
        // Try to set the active session
        try {
          await setActive({ session: result.createdSessionId });
        } catch (setActiveError: any) {
          // Handle known React Native incompatibility with document.hasFocus
          // Session is likely still active even if this throws
        }

        triggerHaptic("success");
        celebrate();

        // Navigate to Main screen
        navigation.dispatch(
          CommonActions.reset({ index: 0, routes: [{ name: "Main" }] }),
        );
      } else {
        // Handle other statuses
        setError(`Verification incomplete. Status: ${result.status}`);
        triggerHaptic("error");
      }
    } catch (err: any) {
      // Check if this is the hasFocus error after successful verification
      if (err?.message?.includes("hasFocus")) {
        triggerHaptic("success");
        celebrate();
        navigation.dispatch(
          CommonActions.reset({ index: 0, routes: [{ name: "Main" }] }),
        );
        return;
      }

      const errorMessage =
        err?.errors?.[0]?.message ||
        err?.message ||
        "Verification failed. Please check your code and try again.";
      setError(errorMessage);
      triggerHaptic("error");
    } finally {
      setLoading(false);
    }
  }, [isLoaded, signIn, setActive, code, navigation, celebrate]);

  return (
    <LinearGradient
      colors={["#0F2419", "#1B4A3A", "#2E5D4F", "#1B4A3A"]}
      locations={[0, 0.3, 0.7, 1]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoid}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Animated.View style={headerAnimation}>
                <TouchableOpacity
                  onPress={() => {
                    triggerHaptic("buttonPress");
                    navigation.goBack();
                  }}
                  style={styles.backButton}
                >
                  <Text style={styles.backArrow}>{"<"} </Text>
                  <Text style={styles.backText}>Back to Login</Text>
                </TouchableOpacity>
              </Animated.View>

              <View style={styles.content}>
                <Animated.View style={[iconAnimation, floatingAnimation]}>
                  <Ionicons
                    name="key-outline"
                    size={60}
                    color="#4CAF50"
                    style={styles.icon}
                  />
                </Animated.View>

                <Animated.View style={contentAnimation}>
                  <Text style={styles.title}>Two-Factor Authentication</Text>
                  <Text style={styles.subtitle}>
                    Enter the code from your authenticator app
                  </Text>
                  {email && <Text style={styles.email}>{email}</Text>}
                  <Text style={styles.info}>
                    Open your authenticator app (like Google Authenticator or
                    Authy) and enter the 6-digit code.
                  </Text>
                </Animated.View>

                <Animated.View style={[inputAnimation, styles.inputContainer]}>
                  <TextInput
                    style={styles.codeInput}
                    value={code}
                    onChangeText={setCode}
                    placeholder="000000"
                    placeholderTextColor="#B8E6C1"
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus={true}
                    textContentType="oneTimeCode"
                    returnKeyType="done"
                    onSubmitEditing={handleVerify}
                  />
                </Animated.View>

                {error ? (
                  <Animated.View
                    entering={FadeIn}
                    exiting={FadeOut}
                    style={styles.fullWidth}
                  >
                    <Text style={styles.error}>{error}</Text>
                  </Animated.View>
                ) : null}

                {message ? (
                  <Animated.View
                    style={[successStyle, styles.fullWidth]}
                    entering={FadeIn}
                    exiting={FadeOut}
                  >
                    <View style={styles.successContainer}>
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color="#4CAF50"
                      />
                      <Text style={styles.success}>{message}</Text>
                    </View>
                  </Animated.View>
                ) : null}

                <Animated.View
                  style={[buttonAnimation, styles.buttonContainer]}
                >
                  <AnimatedButton
                    title="Verify & Sign In"
                    onPress={handleVerify}
                    variant="primary"
                    size="large"
                    disabled={loading || !code.trim()}
                    loading={loading}
                    gradient={true}
                    gradientColors={["#4CAF50", "#45A049"]}
                    fullWidth={true}
                    hapticFeedback={true}
                  />

                  <Text style={styles.helpText}>
                    Don't have access to your authenticator app?{"\n"}
                    Contact support for help recovering your account.
                  </Text>
                </Animated.View>
              </View>
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 40,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  backArrow: {
    fontSize: 18,
    color: "#E8F5E9",
    marginRight: 8,
  },
  backText: {
    color: "#E8F5E9",
    fontWeight: "500",
    fontSize: 16,
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#E8F5E9",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#B8E6C1",
    marginBottom: 8,
    textAlign: "center",
  },
  email: {
    fontSize: 18,
    color: "#4CAF50",
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  info: {
    fontSize: 15,
    color: "#B8E6C1",
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 22,
  },
  inputContainer: {
    width: "100%",
    marginBottom: 16,
  },
  codeInput: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(232, 245, 233, 0.3)",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 24,
    fontWeight: "600",
    color: "#E8F5E9",
    textAlign: "center",
    letterSpacing: 8,
  },
  fullWidth: {
    width: "100%",
  },
  buttonContainer: {
    width: "100%",
    alignItems: "center",
  },
  helpText: {
    marginTop: 20,
    color: "#B8E6C1",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    opacity: 0.8,
  },
  error: {
    color: "#FF6B6B",
    marginBottom: 12,
    textAlign: "center",
    backgroundColor: "rgba(255, 107, 107, 0.1)",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 107, 0.3)",
    width: "100%",
  },
  success: {
    color: "#4CAF50",
    textAlign: "center",
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 8,
    flex: 1,
  },
  successContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(76, 175, 80, 0.3)",
    marginBottom: 12,
    width: "100%",
  },
});

export default TwoFactorVerificationScreen;
