/**
 * Widget Data Sync Utility
 *
 * Syncs app data with iOS widgets via App Groups shared UserDefaults.
 * Uses expo-sharing and AsyncStorage to bridge data.
 *
 * Based on Chris Ro's widget retention strategy:
 * "Adding widgets to my apps DOUBLED my retention rates."
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules } from 'react-native';

// Widget data structure (mirrors iOS TriageWidgetData)
export interface WidgetData {
  currentStreak: number;
  totalFocusMinutes: number;
  dailyGoalMinutes: number;
  dailyProgressMinutes: number;
  weeklyGoalMinutes: number;
  weeklyProgressMinutes: number;
  nextSessionTime: string | null; // ISO string
  motivationalQuote: string;
  quoteAuthor: string;
}

// App Group identifier - must match iOS configuration
const APP_GROUP_ID = 'group.com.thetriage.app';

// Keys for shared data
const WIDGET_KEYS = {
  currentStreak: 'currentStreak',
  totalFocusMinutes: 'totalFocusMinutes',
  dailyGoalMinutes: 'dailyGoalMinutes',
  dailyProgressMinutes: 'dailyProgressMinutes',
  weeklyGoalMinutes: 'weeklyGoalMinutes',
  weeklyProgressMinutes: 'weeklyProgressMinutes',
  nextSessionTime: 'nextSessionTime',
  motivationalQuote: 'motivationalQuote',
  quoteAuthor: 'quoteAuthor',
};

/**
 * Sync widget data to iOS shared UserDefaults
 * This requires a native module bridge for production use.
 * For now, we store in AsyncStorage and the native bridge reads it.
 */
export async function syncWidgetData(data: Partial<WidgetData>): Promise<void> {
  if (Platform.OS !== 'ios') {
    return; // Widgets only on iOS
  }

  try {
    // Store in AsyncStorage for the native bridge
    const storagePromises = Object.entries(data).map(([key, value]) => {
      if (value !== undefined && value !== null) {
        const stringValue = typeof value === 'string' ? value : String(value);
        return AsyncStorage.setItem(`widget_${key}`, stringValue);
      }
      return Promise.resolve();
    });

    await Promise.all(storagePromises);

    // Try to use native module if available (will be added later)
    if (NativeModules.WidgetSync) {
      await NativeModules.WidgetSync.syncData(data);
    }

    console.log('[Widget] Data synced:', Object.keys(data));
  } catch (error) {
    console.warn('[Widget] Failed to sync data:', error);
  }
}

/**
 * Update streak count in widget
 */
export async function updateWidgetStreak(streak: number): Promise<void> {
  await syncWidgetData({ currentStreak: streak });
}

/**
 * Update daily progress in widget
 */
export async function updateWidgetDailyProgress(
  progressMinutes: number,
  goalMinutes: number
): Promise<void> {
  await syncWidgetData({
    dailyProgressMinutes: progressMinutes,
    dailyGoalMinutes: goalMinutes,
  });
}

/**
 * Update weekly progress in widget
 */
export async function updateWidgetWeeklyProgress(
  progressMinutes: number,
  goalMinutes: number
): Promise<void> {
  await syncWidgetData({
    weeklyProgressMinutes: progressMinutes,
    weeklyGoalMinutes: goalMinutes,
  });
}

/**
 * Update total focus time in widget
 */
export async function updateWidgetTotalFocus(totalMinutes: number): Promise<void> {
  await syncWidgetData({ totalFocusMinutes: totalMinutes });
}

/**
 * Update next session time in widget
 */
export async function updateWidgetNextSession(date: Date | null): Promise<void> {
  await syncWidgetData({
    nextSessionTime: date ? date.toISOString() : null,
  });
}

/**
 * Update motivational quote in widget
 */
export async function updateWidgetQuote(quote: string, author: string): Promise<void> {
  await syncWidgetData({
    motivationalQuote: quote,
    quoteAuthor: author,
  });
}

/**
 * Sync all widget data at once (call after session completion)
 */
export async function syncAllWidgetData(data: WidgetData): Promise<void> {
  await syncWidgetData(data);
}

/**
 * Force widget refresh (requires iOS 14+)
 * Uses WidgetKit.reloadAllTimelines()
 */
export async function refreshWidgets(): Promise<void> {
  if (Platform.OS !== 'ios') {
    return;
  }

  try {
    if (NativeModules.WidgetSync?.reloadWidgets) {
      await NativeModules.WidgetSync.reloadWidgets();
      console.log('[Widget] Widgets refreshed');
    }
  } catch (error) {
    console.warn('[Widget] Failed to refresh widgets:', error);
  }
}

/**
 * Hook to sync widget data after each focus session
 * Call this in StudySessionScreen when session completes
 */
export async function onSessionComplete(sessionData: {
  durationMinutes: number;
  streak: number;
  totalMinutes: number;
  dailyProgress: number;
  dailyGoal: number;
  weeklyProgress: number;
  weeklyGoal: number;
}): Promise<void> {
  await syncAllWidgetData({
    currentStreak: sessionData.streak,
    totalFocusMinutes: sessionData.totalMinutes,
    dailyGoalMinutes: sessionData.dailyGoal,
    dailyProgressMinutes: sessionData.dailyProgress,
    weeklyGoalMinutes: sessionData.weeklyGoal,
    weeklyProgressMinutes: sessionData.weeklyProgress,
    nextSessionTime: null, // Clear after session
    motivationalQuote: '', // Will be set separately
    quoteAuthor: '',
  });

  await refreshWidgets();
}

export default {
  syncWidgetData,
  updateWidgetStreak,
  updateWidgetDailyProgress,
  updateWidgetWeeklyProgress,
  updateWidgetTotalFocus,
  updateWidgetNextSession,
  updateWidgetQuote,
  syncAllWidgetData,
  refreshWidgets,
  onSessionComplete,
};
