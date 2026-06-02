import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "../context/AuthContext";

const HEARTBEAT_INTERVAL_MS = 60_000; // 60 seconds

/**
 * Sends presence heartbeats to Convex while the app is in foreground.
 * Sets user offline when app backgrounds.
 * Must be rendered inside ConvexClientProvider and AuthProvider.
 */
export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const updatePresence = useMutation(api.users.updatePresence);
  const setOffline = useMutation(api.users.setOffline);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    if (!isAuthenticated) {
      // Clear interval if user logs out
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Send initial heartbeat
    updatePresence().catch(() => {});

    // Start heartbeat interval
    intervalRef.current = setInterval(() => {
      if (appStateRef.current === "active") {
        updatePresence().catch(() => {});
      }
    }, HEARTBEAT_INTERVAL_MS);

    // Listen for app state changes
    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (
          appStateRef.current === "active" &&
          nextState.match(/inactive|background/)
        ) {
          // App going to background
          setOffline().catch(() => {});
        } else if (
          appStateRef.current.match(/inactive|background/) &&
          nextState === "active"
        ) {
          // App coming to foreground
          updatePresence().catch(() => {});
        }
        appStateRef.current = nextState;
      },
    );

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      subscription.remove();
    };
  }, [isAuthenticated]);

  return <>{children}</>;
}
