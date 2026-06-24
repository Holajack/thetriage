import { useState, useEffect, useCallback, useRef } from "react";
import { View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LayoutRect } from "../components/InteractiveWalkthrough";

const STORAGE_PREFIX = "@walkthrough_done_";

interface UseScreenWalkthroughOptions {
  /** Force-show the walkthrough regardless of AsyncStorage */
  forceShow?: boolean;
  /** Delay (ms) before measuring elements and showing walkthrough */
  delay?: number;
  /** Whether the screen is ready for measurement (e.g. data loaded) */
  ready?: boolean;
}

export function useScreenWalkthrough(
  screenId: string,
  refs: Record<string, React.RefObject<View | null>>,
  options: UseScreenWalkthroughOptions = {},
) {
  const { forceShow = false, delay = 800, ready = true } = options;
  const [visible, setVisible] = useState(false);
  const [measurements, setMeasurements] = useState<Record<string, LayoutRect>>(
    {},
  );
  const hasChecked = useRef(false);

  useEffect(() => {
    if (!ready || hasChecked.current) return;
    hasChecked.current = true;

    const check = async () => {
      if (!forceShow) {
        const done = await AsyncStorage.getItem(`${STORAGE_PREFIX}${screenId}`);
        if (done === "true") return;
      }

      // Wait for layout to settle, then measure
      const timer = setTimeout(() => {
        const refEntries = Object.entries(refs);
        if (refEntries.length === 0) {
          // No refs to measure — just show it
          setVisible(true);
          return;
        }

        const measured: Record<string, LayoutRect> = {};
        let count = 0;
        const total = refEntries.length;

        refEntries.forEach(([key, ref]) => {
          if (ref.current) {
            ref.current.measureInWindow((x, y, w, h) => {
              measured[key] = { x, y, width: w, height: h };
              count++;
              if (count === total) {
                setMeasurements(measured);
                setVisible(true);
              }
            });
          } else {
            // Ref not attached — count it as done with zero rect
            count++;
            if (count === total) {
              setMeasurements(measured);
              setVisible(true);
            }
          }
        });
      }, delay);

      return () => clearTimeout(timer);
    };

    check();
  }, [ready, screenId, forceShow, delay]);

  const remeasure = useCallback(() => {
    const refEntries = Object.entries(refs);
    if (refEntries.length === 0) return;

    const measured: Record<string, LayoutRect> = {};
    let count = 0;
    const total = refEntries.length;

    refEntries.forEach(([key, ref]) => {
      if (ref.current) {
        ref.current.measureInWindow((x, y, w, h) => {
          measured[key] = { x, y, width: w, height: h };
          count++;
          if (count === total) setMeasurements(measured);
        });
      } else {
        count++;
        if (count === total) setMeasurements(measured);
      }
    });
  }, []);

  const complete = useCallback(async () => {
    setVisible(false);
    await AsyncStorage.setItem(`${STORAGE_PREFIX}${screenId}`, "true");
  }, [screenId]);

  const reset = useCallback(async () => {
    hasChecked.current = false;
    await AsyncStorage.removeItem(`${STORAGE_PREFIX}${screenId}`);
  }, [screenId]);

  return { visible, measurements, complete, reset, remeasure };
}

/** Reset a specific walkthrough so it shows again next time */
export async function resetWalkthrough(screenId: string) {
  await AsyncStorage.removeItem(`${STORAGE_PREFIX}${screenId}`);
}

/** Reset all walkthroughs */
async function resetAllWalkthroughs() {
  const keys = await AsyncStorage.getAllKeys();
  const walkthroughKeys = keys.filter((k) => k.startsWith(STORAGE_PREFIX));
  if (walkthroughKeys.length > 0) {
    await AsyncStorage.multiRemove(walkthroughKeys);
  }
}
