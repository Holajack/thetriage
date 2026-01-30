import { Alert, Linking, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ConvexReactClient } from "convex/react";
import { api } from "../../convex/_generated/api";

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

let _convexClient: ConvexReactClient | null = null;

export function setConvexClient(client: ConvexReactClient) {
  _convexClient = client;
}

function getClient(): ConvexReactClient | null {
  return _convexClient;
}

// Track current DND state
let isDNDActive = false;
let originalNotificationHandler: any = null;

/**
 * Check if user has Auto DND enabled in settings
 */
export const isAutoDNDEnabled = async (): Promise<boolean> => {
  try {
    const client = getClient();
    if (!client) return false;

    const settings = await client.query(api.settings.get, {});
    return settings?.autoDndFocus || false;
  } catch (error) {
    console.error('Error checking auto DND setting:', error);
    return false;
  }
};

/**
 * Enable Focus Mode (suppress notifications)
 */
export const enableFocusMode = async () => {
  if (isDNDActive) return;

  try {
    // Save original notification handler
    originalNotificationHandler = Notifications.getNotificationChannelsAsync;

    // Set notification handler to suppress notifications during focus
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });

    isDNDActive = true;
    console.log('✅ Focus mode enabled - notifications suppressed');
  } catch (error) {
    console.error('Error enabling focus mode:', error);
  }
};

/**
 * Disable Focus Mode (restore notifications)
 */
export const disableFocusMode = async () => {
  if (!isDNDActive) return;

  try {
    // Restore original notification handler
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    isDNDActive = false;
    console.log('✅ Focus mode disabled - notifications restored');
  } catch (error) {
    console.error('Error disabling focus mode:', error);
  }
};

/**
 * Show reminder to enable system DND mode
 */
export const showDNDReminder = () => {
  Alert.alert(
    '🔕 Enable Do Not Disturb',
    'For the best focus experience, enable Do Not Disturb mode on your device.\n\nWould you like to open settings?',
    [
      {
        text: 'Not Now',
        style: 'cancel',
      },
      {
        text: 'Open Settings',
        onPress: () => openSystemSettings(),
      },
      {
        text: "Don't Ask Again",
        onPress: () => disableDNDReminder(),
      },
    ]
  );
};

/**
 * Open system settings for DND
 */
const openSystemSettings = async () => {
  try {
    if (Platform.OS === 'ios') {
      // iOS: Open Settings app
      await Linking.openSettings();
    } else if (Platform.OS === 'android') {
      // Android: Open DND settings
      await Linking.sendIntent('android.settings.ZEN_MODE_SETTINGS');
    }
  } catch (error) {
    console.error('Error opening system settings:', error);
    Alert.alert(
      'Settings',
      'Please manually enable Do Not Disturb in your device settings:\n\n' +
      (Platform.OS === 'ios'
        ? 'Settings > Focus > Do Not Disturb'
        : 'Settings > Sound > Do Not Disturb')
    );
  }
};

/**
 * Disable DND reminder (user opted out)
 */
const disableDNDReminder = async () => {
  try {
    // Store preference in AsyncStorage
    await AsyncStorage.setItem('@dnd_reminder_disabled', 'true');
    console.log('User opted out of DND reminders');
  } catch (error) {
    console.error('Error saving DND reminder preference:', error);
  }
};

/**
 * Start focus session with Auto DND
 */
export const startFocusSessionWithDND = async (showReminder: boolean = true) => {
  const autoDNDEnabled = await isAutoDNDEnabled();

  if (autoDNDEnabled) {
    // Suppress app notifications
    await enableFocusMode();

    // Show reminder to enable system DND (first time only)
    if (showReminder) {
      // Check if user opted out
      const disabled = await AsyncStorage.getItem('@dnd_reminder_disabled');
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
export const isDNDModeActive = (): boolean => {
  return isDNDActive;
};
