import { Alert, Linking, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../../convex/_generated/api";
import { getConvexClient } from "./convexClient";

/**
 * Do Not Disturb Utility
 *
 * Note: Due to iOS and Android restrictions, apps cannot programmatically
 * enable system-level DND mode. This utility provides the best possible
 * alternative by:
 * 1. Suppressing app notifications during focus sessions
 * 2. Reminding users to enable DND manually
 * 3. Providing quick access to system settings
 */

// Track current DND state
let isDNDActive = false;
let originalNotificationHandler: any = null;

/**
 * Check if user has Auto DND enabled in settings
 */
const isAutoDNDEnabled = async (): Promise<boolean> => {
  try {
    const client = getConvexClient();
    const settings = await client.query(api.settings.get, {});
    return settings?.autoDndFocus || false;
  } catch {
    return false;
  }
};

/**
 * Enable Focus Mode (suppress notifications)
 */
const enableFocusMode = async () => {
  if (isDNDActive) return;

  try {
    // Save original notification handler
    originalNotificationHandler = Notifications.getNotificationChannelsAsync;

    // Set notification handler to suppress notifications during focus
    Notifications.setNotificationHandler({
      handleNotification: async () =>
        ({
          shouldShowAlert: false,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }) as Notifications.NotificationBehavior,
    });

    isDNDActive = true;
  } catch {
    // Error enabling focus mode
  }
};

/**
 * Disable Focus Mode (restore notifications)
 */
const disableFocusMode = async () => {
  if (!isDNDActive) return;

  try {
    // Restore original notification handler
    Notifications.setNotificationHandler({
      handleNotification: async () =>
        ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }) as Notifications.NotificationBehavior,
    });

    isDNDActive = false;
  } catch {
    // Error disabling focus mode
  }
};

/**
 * Show reminder to enable system DND mode
 */
const showDNDReminder = () => {
  Alert.alert(
    "🔕 Enable Do Not Disturb",
    "For the best focus experience, enable Do Not Disturb mode on your device.\n\nWould you like to open settings?",
    [
      {
        text: "Not Now",
        style: "cancel",
      },
      {
        text: "Open Settings",
        onPress: () => openSystemSettings(),
      },
      {
        text: "Don't Ask Again",
        onPress: () => disableDNDReminder(),
      },
    ],
  );
};

/**
 * Open system settings for DND
 */
const openSystemSettings = async () => {
  try {
    if (Platform.OS === "ios") {
      // iOS: Open Settings app
      await Linking.openSettings();
    } else if (Platform.OS === "android") {
      // Android: Open DND settings
      await Linking.sendIntent("android.settings.ZEN_MODE_SETTINGS");
    }
  } catch {
    Alert.alert(
      "Settings",
      "Please manually enable Do Not Disturb in your device settings:\n\n" +
        (Platform.OS === "ios"
          ? "Settings > Focus > Do Not Disturb"
          : "Settings > Sound > Do Not Disturb"),
    );
  }
};

/**
 * Disable DND reminder (user opted out)
 */
const disableDNDReminder = async () => {
  try {
    // Store preference in AsyncStorage
    await AsyncStorage.setItem("@dnd_reminder_disabled", "true");
  } catch {
    // Error saving DND reminder preference
  }
};

/**
 * Start focus session with Auto DND
 */
export const startFocusSessionWithDND = async (
  showReminder: boolean = true,
) => {
  const autoDNDEnabled = await isAutoDNDEnabled();

  if (autoDNDEnabled) {
    // Suppress app notifications
    await enableFocusMode();

    // Show reminder to enable system DND (first time only)
    if (showReminder) {
      // Check if user opted out
      const disabled = await AsyncStorage.getItem("@dnd_reminder_disabled");
      if (!disabled) {
        setTimeout(() => {
          showDNDReminder();
        }, 1000); // Show after 1 second to not interrupt session start
      }
    }
  }
};

/**
 * End focus session and restore notifications
 */
export const endFocusSessionWithDND = async () => {
  await disableFocusMode();
};

/**
 * Get current DND state
 */
const isDNDModeActive = (): boolean => {
  return isDNDActive;
};
