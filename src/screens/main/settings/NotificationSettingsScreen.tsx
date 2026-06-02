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
import { updateUserSettings } from "../../../utils/userSettings";
import * as Notifications from "expo-notifications";
import { Typography, Spacing, BorderRadius } from "../../../theme/premiumTheme";
import { StaggeredItem } from "../../../components/premium/StaggeredList";
import SettingsGroup from "./components/SettingsGroup";
import SettingsRow from "./components/SettingsRow";
import SettingsSectionHeader from "./components/SettingsSectionHeader";

const NotificationSettingsScreen = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const isDark = theme.isDark;
  const { updateProfile } = useConvexProfile();
  const { userId: clerkUserId } = useClerkAuth();

  // Master toggle
  const [notifications, setNotifications] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState<
    "granted" | "denied" | "undetermined"
  >("undetermined");

  // Reminders
  const [dailyReminder, setDailyReminder] = useState("08:00");
  const [sessionEndReminder, setSessionEndReminder] = useState(true);

  // Granular toggles
  const [notifFriendRequests, setNotifFriendRequests] = useState(true);
  const [notifFriendMessages, setNotifFriendMessages] = useState(true);
  const [notifStudyReminders, setNotifStudyReminders] = useState(true);
  const [notifWeeklyGoalReminders, setNotifWeeklyGoalReminders] =
    useState(true);
  const [weeklyGoalReminderDays, setWeeklyGoalReminderDays] = useState<
    string[]
  >(["Wednesday", "Thursday", "Friday", "Saturday"]);
  const [notifFocusSessionWarnings, setNotifFocusSessionWarnings] =
    useState(true);
  const [notifQRScans, setNotifQRScans] = useState(true);
  const [notifStudyRoomInvites, setNotifStudyRoomInvites] = useState(true);
  const [notifAppUpdates, setNotifAppUpdates] = useState(true);

  useEffect(() => {
    checkNotificationPermission();
  }, []);

  const checkNotificationPermission = async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setNotificationPermission(status);
    } catch (error) {
      // Error checking notification permission
      setNotificationPermission("undetermined");
    }
  };

  const requestNotificationPermission = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      setNotificationPermission(status);
      if (status === "granted") {
        setNotifications(true);
        Alert.alert("Success", "Notifications enabled!");
        if (clerkUserId) {
          await updateUserSettings(clerkUserId, {
            notifications_enabled: true,
          });
        }
      } else {
        Alert.alert(
          "Permission Denied",
          "Enable notifications in your device settings.",
        );
      }
    } catch (error) {
      // Error requesting notification permission
    }
  };

  const handleNotificationToggle = async (value: boolean) => {
    if (value && notificationPermission !== "granted") {
      await requestNotificationPermission();
    } else {
      setNotifications(value);
      try {
        if (clerkUserId) {
          await updateUserSettings(clerkUserId, {
            notifications_enabled: value,
          });
        }
        if (value && notificationPermission === "granted") {
          await scheduleDailyReminder(dailyReminder);
        } else if (!value) {
          await Notifications.cancelAllScheduledNotificationsAsync();
        }
      } catch (error) {
        // Error toggling notifications
      }
    }
  };

  const scheduleDailyReminder = async (time: string) => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      const [hours, minutes] = time.split(":").map(Number);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Time to Study!",
          body: "Ready to start your focus session? Let's build that streak!",
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: hours,
          minute: minutes,
        },
      });
    } catch (error) {
      // Error scheduling daily reminder
    }
  };

  const handleDailyReminderUpdate = () => {
    Alert.alert(
      "Daily Study Reminder",
      "Set your preferred time for daily study reminders",
      [
        {
          text: "Morning (8:00 AM)",
          onPress: () => updateDailyReminder("08:00"),
        },
        {
          text: "Afternoon (2:00 PM)",
          onPress: () => updateDailyReminder("14:00"),
        },
        {
          text: "Evening (6:00 PM)",
          onPress: () => updateDailyReminder("18:00"),
        },
        {
          text: "Custom Time",
          onPress: () => {
            Alert.prompt(
              "Custom Time",
              "Enter time in 12-hour format (e.g., 8:00 AM)",
              (time) => {
                if (!time) return;
                const match = time
                  .trim()
                  .match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)$/i);
                if (match) {
                  let hours = parseInt(match[1]);
                  const mins = match[2];
                  const period = match[3].toUpperCase();
                  if (period === "PM" && hours !== 12) hours += 12;
                  else if (period === "AM" && hours === 12) hours = 0;
                  updateDailyReminder(
                    `${hours.toString().padStart(2, "0")}:${mins}`,
                  );
                } else {
                  Alert.alert("Invalid Time", "Please use format like 8:00 AM");
                }
              },
              "plain-text",
              formatTime(dailyReminder),
            );
          },
        },
        { text: "Cancel", style: "cancel" },
      ],
    );
  };

  const updateDailyReminder = async (time: string) => {
    setDailyReminder(time);
    try {
      if (clerkUserId) {
        await updateUserSettings(clerkUserId, { daily_reminder: time } as any);
      }
      await updateProfile({ daily_reminder: time });
      if (notifications && notificationPermission === "granted") {
        await scheduleDailyReminder(time);
        Alert.alert("Updated", `Daily reminder set for ${formatTime(time)}`);
      }
    } catch (error) {
      // Error updating daily reminder
      Alert.alert("Error", "Failed to update daily reminder.");
    }
  };

  const handleSessionEndReminderToggle = async (value: boolean) => {
    setSessionEndReminder(value);
    try {
      if (clerkUserId) {
        await updateUserSettings(clerkUserId, {
          session_end_reminder: value,
        } as any);
      }
    } catch (error) {
      // Error updating session end reminder
      setSessionEndReminder(!value);
    }
  };

  const formatTime = (time24: string) => {
    const [h24, minutes] = time24.split(":");
    let hours = parseInt(h24);
    const period = hours >= 12 ? "PM" : "AM";
    if (hours > 12) hours -= 12;
    if (hours === 0) hours = 12;
    return `${hours}:${minutes} ${period}`;
  };

  const toggleDay = (day: string) => {
    if (weeklyGoalReminderDays.includes(day)) {
      setWeeklyGoalReminderDays(
        weeklyGoalReminderDays.filter((d) => d !== day),
      );
    } else {
      setWeeklyGoalReminderDays([...weeklyGoalReminderDays, day]);
    }
  };

  const borderColor = theme.border ?? (isDark ? "#2F2F2F" : "#E0E0E0");
  const permissionGranted = notificationPermission === "granted";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={theme.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        {/* Master Toggle */}
        <StaggeredItem index={0}>
          <SettingsGroup>
            <SettingsRow
              icon="notifications-outline"
              label="Notifications"
              description={
                permissionGranted
                  ? "Receive notifications from HikeWise"
                  : "Tap to enable notification permissions"
              }
              toggle
              toggleValue={notifications && permissionGranted}
              onToggleChange={handleNotificationToggle}
              isLast
            />
          </SettingsGroup>
        </StaggeredItem>

        {/* Reminders */}
        <StaggeredItem index={1}>
          <SettingsSectionHeader title="REMINDERS" />
          <SettingsGroup>
            <SettingsRow
              icon="alarm-outline"
              label="Daily Study Reminder"
              description={
                permissionGranted
                  ? `Scheduled for ${formatTime(dailyReminder)}`
                  : "Enable notifications first"
              }
              value={formatTime(dailyReminder)}
              onPress={handleDailyReminderUpdate}
              disabled={!notifications || !permissionGranted}
            />
            <SettingsRow
              icon="timer-outline"
              label="Session End Reminder"
              description="Notify 2 minutes before session ends"
              toggle
              toggleValue={sessionEndReminder}
              onToggleChange={handleSessionEndReminderToggle}
              isLast
            />
          </SettingsGroup>
        </StaggeredItem>

        {/* Social */}
        <StaggeredItem index={2}>
          <SettingsSectionHeader title="SOCIAL" />
          <SettingsGroup>
            <SettingsRow
              icon="person-add-outline"
              label="Friend Requests"
              description="When someone sends you a friend request"
              toggle
              toggleValue={notifFriendRequests}
              onToggleChange={setNotifFriendRequests}
            />
            <SettingsRow
              icon="chatbubble-outline"
              label="Friend Messages"
              description="When a friend sends you a message"
              toggle
              toggleValue={notifFriendMessages}
              onToggleChange={setNotifFriendMessages}
            />
            <SettingsRow
              icon="people-outline"
              label="Study Room Invites"
              description="When someone invites you to a study room"
              toggle
              toggleValue={notifStudyRoomInvites}
              onToggleChange={setNotifStudyRoomInvites}
            />
            <SettingsRow
              icon="qr-code-outline"
              label="QR Code Scans"
              description="When someone scans your QR code"
              toggle
              toggleValue={notifQRScans}
              onToggleChange={setNotifQRScans}
              isLast
            />
          </SettingsGroup>
        </StaggeredItem>

        {/* Goals & Focus */}
        <StaggeredItem index={3}>
          <SettingsSectionHeader title="GOALS & FOCUS" />
          <SettingsGroup>
            <SettingsRow
              icon="book-outline"
              label="Study Reminders"
              description="Scheduled reminders for study sessions"
              toggle
              toggleValue={notifStudyReminders}
              onToggleChange={setNotifStudyReminders}
            />
            <SettingsRow
              icon="flag-outline"
              label="Weekly Goal Reminders"
              description="Reminders when you're behind on your weekly goal"
              toggle
              toggleValue={notifWeeklyGoalReminders}
              onToggleChange={setNotifWeeklyGoalReminders}
            >
              {notifWeeklyGoalReminders && (
                <View style={{ marginTop: Spacing.sm }}>
                  <Text
                    style={[
                      styles.dayLabel,
                      { color: theme.textSecondary ?? "#666" },
                    ]}
                  >
                    Notify me on:
                  </Text>
                  <View style={styles.daysRow}>
                    {["Wednesday", "Thursday", "Friday", "Saturday"].map(
                      (day) => (
                        <TouchableOpacity
                          key={day}
                          onPress={() => toggleDay(day)}
                          style={[
                            styles.dayChip,
                            {
                              backgroundColor: weeklyGoalReminderDays.includes(
                                day,
                              )
                                ? theme.primary
                                : isDark
                                  ? "#2f2f2f"
                                  : "#F5F5F5",
                              borderColor: weeklyGoalReminderDays.includes(day)
                                ? theme.primary
                                : borderColor,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.dayChipText,
                              {
                                color: weeklyGoalReminderDays.includes(day)
                                  ? "#FFF"
                                  : theme.text,
                              },
                            ]}
                          >
                            {day.substring(0, 3)}
                          </Text>
                        </TouchableOpacity>
                      ),
                    )}
                  </View>
                </View>
              )}
            </SettingsRow>
            <SettingsRow
              icon="warning-outline"
              label="Focus Session Warnings"
              description="When you leave the app during a focus session"
              toggle
              toggleValue={notifFocusSessionWarnings}
              onToggleChange={setNotifFocusSessionWarnings}
              isLast
            />
          </SettingsGroup>
        </StaggeredItem>

        {/* General */}
        <StaggeredItem index={4}>
          <SettingsSectionHeader title="GENERAL" />
          <SettingsGroup>
            <SettingsRow
              icon="megaphone-outline"
              label="App Updates"
              description="News about new features and improvements"
              toggle
              toggleValue={notifAppUpdates}
              onToggleChange={setNotifAppUpdates}
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
  dayLabel: {
    ...Typography.caption,
    marginBottom: Spacing.xs,
  },
  daysRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  dayChip: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  dayChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
});

export default NotificationSettingsScreen;
