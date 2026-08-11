import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

/**
 * Keep `users.lastSeen` current.
 *
 * Nothing anywhere called updatePresence, so lastSeen was permanently undefined
 * — which silently made the daily notification cron (which selects users seen in
 * the last 30 days) deliver to ZERO users, forever. It also made "who is online"
 * always false.
 *
 * Mount once, at the app root, inside the Convex + auth providers.
 */
const HEARTBEAT_MS = 60_000;

export function usePresence() {
  const { isAuthenticated } = useConvexAuth();
  const updatePresence = useMutation(api.users.updatePresence);
  const setOffline = useMutation(api.users.setOffline);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    const beat = () => {
      updatePresence({}).catch(() => {
        // Presence is best-effort; never surface it to the user.
      });
    };

    beat();
    timerRef.current = setInterval(beat, HEARTBEAT_MS);

    const onAppStateChange = (next: AppStateStatus) => {
      if (next === "active") {
        beat();
      } else if (next === "background" || next === "inactive") {
        setOffline({}).catch(() => {});
      }
    };

    const sub = AppState.addEventListener("change", onAppStateChange);

    return () => {
      sub.remove();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setOffline({}).catch(() => {});
    };
  }, [isAuthenticated, updatePresence, setOffline]);
}
