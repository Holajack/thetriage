/**
 * Client-side Nora notification scheduling.
 *
 * Queries Convex for pending notifications and schedules them
 * as local push notifications via Expo Notifications.
 */
import * as Notifications from "expo-notifications";
import { ConvexReactClient } from "convex/react";
import { api } from "../../convex/_generated/api";

/**
 * Schedule Nora notifications from Convex data.
 * Call on app launch / Nora screen mount.
 */
export async function scheduleNoraNotifications(
  convexClient: ConvexReactClient,
): Promise<void> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;

    // Fetch unread notifications from Convex
    const notifications = await convexClient.query(
      api.noraNotifications.getNotifications,
    );

    if (!notifications || notifications.length === 0) return;

    // Schedule each unsent notification as a local push
    for (const notif of notifications) {
      if (notif.sentAt) continue; // Already sent

      const scheduledDate = new Date(notif.scheduledFor);
      const now = new Date();

      // Only schedule future notifications or recent ones (within 1 hour)
      if (scheduledDate.getTime() < now.getTime() - 3600000) continue;

      const trigger =
        scheduledDate > now
          ? ({
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: scheduledDate,
            } as const)
          : null;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: notif.title,
          body: notif.body,
          data: {
            type: "nora_notification",
            notificationId: notif._id,
            notificationType: notif.type,
          },
        },
        trigger,
      });
    }
  } catch (error) {
    // Failed to schedule Nora notifications
  }
}

/**
 * Handle a notification tap that opens the Nora chat screen.
 */
export function isNoraNotification(
  notification: Notifications.Notification,
): boolean {
  return notification.request.content.data?.type === "nora_notification";
}
