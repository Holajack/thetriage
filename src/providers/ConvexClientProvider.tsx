import React, { useEffect, useMemo } from 'react';
import { ConvexReactClient } from 'convex/react';
import { useAuth } from '@clerk/clerk-expo';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { setConvexClient as setMessagingClient } from '../utils/convexMessagingService';
import { setConvexClient as setStudyRoomClient } from '../utils/convexStudyRoomService';
import { setConvexClient as setFriendClient } from '../utils/convexFriendRequestService';
import { setConvexClient as setAIChatClient } from '../utils/convexAIChatService';
import { setConvexClient as setInventoryClient } from '../utils/inventoryService';
import { setConvexClient as setUserSettingsClient } from '../utils/userSettings';
import { setConvexClient as setMusicPrefsClient } from '../utils/musicPreferences';
import { setConvexClient as setDoNotDisturbClient } from '../utils/doNotDisturb';
import { setConvexClient as setWeeklyGoalClient } from '../utils/weeklyGoalNotifications';
// RevenueCat import deferred — react-native-purchases not yet installed
// import { setConvexClient as setRevenueCatClient } from '../services/revenuecat';
import { setConvexClient as setCreateUserDataClient } from '../utils/createUserData';
import { setConvexClient as setUserAppDataClient } from '../utils/userAppDataWrapper';
import { setConvexClient as setQrAcceptanceClient } from '../utils/qrAcceptanceService';

interface ConvexClientProviderProps {
  children: React.ReactNode;
}

/**
 * ConvexClientProvider wraps the app with Convex database access.
 * Integrates with Clerk for authenticated queries and mutations.
 *
 * Note: This provider should be nested inside ClerkProvider so
 * it can access the Clerk auth context.
 */
export function ConvexClientProvider({ children }: ConvexClientProviderProps) {
  // Create Convex client lazily inside the component to avoid module-load errors
  const convex = useMemo(() => {
    const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;

    // Validate URL
    if (!convexUrl || convexUrl.trim() === '' || !convexUrl.startsWith('http')) {
      console.warn(
        'Missing or invalid EXPO_PUBLIC_CONVEX_URL in environment variables. ' +
        'Convex database will not work until this is configured. ' +
        `Current value: "${convexUrl || '(not set)'}"`
      );
      return null;
    }

    try {
      return new ConvexReactClient(convexUrl);
    } catch (error) {
      console.error('Failed to create Convex client:', error);
      return null;
    }
  }, []);

  // Share the Convex client with imperative service modules
  useEffect(() => {
    if (convex) {
      setMessagingClient(convex);
      setStudyRoomClient(convex);
      setFriendClient(convex);
      setAIChatClient(convex);
      setInventoryClient(convex);
      setUserSettingsClient(convex);
      setMusicPrefsClient(convex);
      setDoNotDisturbClient(convex);
      setWeeklyGoalClient(convex);
      // setRevenueCatClient(convex); // Deferred — react-native-purchases not yet installed
      setCreateUserDataClient(convex);
      setUserAppDataClient(convex);
      setQrAcceptanceClient(convex);
    }
  }, [convex]);

  // If no valid Convex client, render children without Convex (for development)
  if (!convex) {
    return <>{children}</>;
  }

  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}

export default ConvexClientProvider;
