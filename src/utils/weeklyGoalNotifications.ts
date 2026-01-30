import * as Notifications from 'expo-notifications';
import { ConvexReactClient } from "convex/react";
import { api } from "../../convex/_generated/api";

/**
 * Weekly Goal Notification System
 *
 * Tracks user's weekly focus progress and sends notifications when they're
 * behind on their weekly goal, especially near the end of the week.
 */

let _convexClient: ConvexReactClient | null = null;

export function setConvexClient(client: ConvexReactClient) {
  _convexClient = client;
}

function getClient(): ConvexReactClient {
  if (!_convexClient) throw new Error("Convex client not initialized");
  return _convexClient;
}

interface WeeklyProgress {
  totalMinutes: number;
  goalHours: number;
  remainingHours: number;
  percentComplete: number;
  isOnTrack: boolean;
}

/**
 * Get the start and end of the current week (Sunday to Saturday)
 */
const getWeekBounds = (): { startOfWeek: Date; endOfWeek: Date } => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday

  // Get Sunday of current week
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - dayOfWeek);
  startOfWeek.setHours(0, 0, 0, 0);

  // Get Saturday of current week
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return { startOfWeek, endOfWeek };
};

/**
 * Calculate weekly progress for a user
 */
export const getWeeklyProgress = async (userId: string): Promise<WeeklyProgress | null> => {
  try {
    const client = getClient();

    // Get user's weekly goal from onboarding preferences
    const onboarding = await client.query(api.onboarding.get, {});
    const goalHours = onboarding?.weeklyFocusGoal || 10;

    const { startOfWeek, endOfWeek } = getWeekBounds();

    // Fetch all focus sessions
    const allSessions = await client.query(api.focusSessions.list, {});

    // Filter sessions for this week and completed status
    const sessions = (allSessions || []).filter((session: any) => {
      const sessionDate = new Date(session.startTime);
      return (
        session.status === 'completed' &&
        sessionDate >= startOfWeek &&
        sessionDate <= endOfWeek
      );
    });

    // Calculate total minutes from duration_seconds
    const totalMinutes = sessions.reduce((sum: number, session: any) => {
      const minutes = Math.floor((session.durationSeconds || 0) / 60);
      return sum + minutes;
    }, 0);

    const totalHours = totalMinutes / 60;
    const remainingHours = Math.max(0, goalHours - totalHours);
    const percentComplete = (totalHours / goalHours) * 100;
    const isOnTrack = percentComplete >= 70; // Consider on track if >= 70%

    return {
      totalMinutes,
      goalHours,
      remainingHours,
      percentComplete: Math.min(100, percentComplete),
      isOnTrack,
    };
  } catch (error) {
    console.error('Error calculating weekly progress:', error);
    return null;
  }
};

/**
 * Check if user needs a reminder and send notification
 */
export const checkAndSendWeeklyGoalReminder = async (userId: string): Promise<void> => {
  try {
    const progress = await getWeeklyProgress(userId);
    if (!progress) return;

    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
    const daysRemaining = 6 - dayOfWeek; // Days until Saturday

    // Only send reminders Thursday (4), Friday (5), or Saturday (6)
    if (dayOfWeek < 4) return;

    // Only send if behind on goal (< 70% complete)
    if (progress.isOnTrack) return;

    // Request notification permissions
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      console.log('Notification permission not granted');
      return;
    }

    // Create notification message
    let message = '';
    const hoursNeeded = Math.ceil(progress.remainingHours);

    if (dayOfWeek === 6) {
      // Saturday - last day
      message = `It's the last day of the week! You need ${hoursNeeded} more hours to reach your ${progress.goalHours}-hour goal. You can do this! 💪`;
    } else if (dayOfWeek === 5) {
      // Friday
      message = `Weekend is almost here! You need ${hoursNeeded} more hours to hit your weekly goal. Focus up! 🎯`;
    } else if (dayOfWeek === 4) {
      // Thursday
      message = `You're ${Math.floor(progress.percentComplete)}% towards your weekly goal. ${hoursNeeded} hours to go - let's make it happen! 🚀`;
    }

    // Schedule notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Weekly Goal Reminder',
        body: message,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { type: 'weekly_goal_reminder' },
      },
      trigger: {
        type: 'timeInterval',
        seconds: 2,
        repeats: false,
      } as any,
    });

    console.log(`📬 Weekly goal reminder sent: ${progress.percentComplete}% complete, ${hoursNeeded}h remaining`);
  } catch (error) {
    console.error('Error sending weekly goal reminder:', error);
  }
};

/**
 * Schedule daily check for weekly goal progress
 * This should be called when the app starts or when user logs in
 */
export const scheduleWeeklyGoalChecks = async (userId: string): Promise<void> => {
  try {
    // Cancel any existing weekly goal notifications
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const weeklyGoalNotifications = scheduled.filter(
      notif => notif.content.data?.type === 'weekly_goal_reminder'
    );

    for (const notif of weeklyGoalNotifications) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }

    // Schedule daily check at 6 PM for the rest of the week
    const now = new Date();
    const dayOfWeek = now.getDay();

    // Only schedule if it's Thursday, Friday, or Saturday
    if (dayOfWeek >= 4 && dayOfWeek <= 6) {
      const checkTime = new Date();
      checkTime.setHours(18, 0, 0, 0); // 6 PM

      // If it's already past 6 PM today, schedule for tomorrow
      if (now.getTime() > checkTime.getTime()) {
        checkTime.setDate(checkTime.getDate() + 1);
      }

      // Immediate check
      await checkAndSendWeeklyGoalReminder(userId);

      console.log(`📅 Scheduled weekly goal checks for user ${userId}`);
    }
  } catch (error) {
    console.error('Error scheduling weekly goal checks:', error);
  }
};

/**
 * Cancel all weekly goal notifications for a user
 */
export const cancelWeeklyGoalNotifications = async (): Promise<void> => {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const weeklyGoalNotifications = scheduled.filter(
      notif => notif.content.data?.type === 'weekly_goal_reminder'
    );

    for (const notif of weeklyGoalNotifications) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }

    console.log('📭 Cancelled all weekly goal notifications');
  } catch (error) {
    console.error('Error cancelling weekly goal notifications:', error);
  }
};

/**
 * Check if it's near the end of the week (Thursday onwards)
 */
export const isNearEndOfWeek = (): boolean => {
  const dayOfWeek = new Date().getDay();
  return dayOfWeek >= 4 && dayOfWeek <= 6; // Thursday (4), Friday (5), Saturday (6)
};
