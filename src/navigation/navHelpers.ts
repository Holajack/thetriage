// Direction-aware navigation helpers for tab transitions.
// Extracted from MainNavigator so tab screens and BottomTabBar can import these
// without creating an import cycle back through the navigator.

// Tab screens in left-to-right order as they appear in the bottom bar
export const TAB_ORDER: Record<string, number> = {
  Leaderboard: 0,
  SessionHistory: 1,
  Results: 2,
  Bonuses: 3,
  Community: 4,
};

// Module-level direction flag. Set synchronously by BottomTabBar before dispatching
// navigation, then read by MainNavigator's screenOptions at the next render. Using a
// module-level variable instead of route params is more reliable: replace() doesn't
// always wire fresh params into screenOptions before the first frame, which is why the
// "right-to-left" animation occasionally inherited the wrong direction.
let pendingSlideLeft = false;

export function setPendingSlideLeft(value: boolean) {
  pendingSlideLeft = value;
}

export function getPendingSlideLeft(): boolean {
  return pendingSlideLeft;
}

/**
 * Navigate back to Home with the correct left-to-right slide animation.
 * Call this from tab screens' onClose instead of navigation.navigate('Home').
 */
export function navigateHomeWithSlide(navigation: any) {
  setPendingSlideLeft(true);
  navigation.navigate("Home");
  requestAnimationFrame(() => {
    setPendingSlideLeft(false);
  });
}
