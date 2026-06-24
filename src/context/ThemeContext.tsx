import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { Appearance, ColorSchemeName, AccessibilityInfo } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemeName = "home" | "office" | "library" | "coffee" | "park";
type ThemeMode = "System Default" | "Light" | "Dark";

// Standard status colors (red/green) — used by default and in dark mode.
const STATUS_DEFAULT = {
  success: "#22C55E",
  error: "#EF4444",
  warning: "#F59E0B",
};
// Deuteranopia-safe status colors (blue/orange instead of green/red).
const STATUS_COLOR_BLIND = {
  success: "#2196F3",
  error: "#FF9800",
  warning: "#FFD54F",
};

// Light theme palettes for different environments
export const lightThemePalettes: Record<ThemeName, ThemePalette> = {
  home: {
    name: "Home",
    primary: "#FF7043", // Deep sunset orange
    background: "#FFCCBC", // Light sunset orange
    text: "#222", // dark text for light background
    card: "#FFF",
    surface: "#FFFFFF",
    surface2: "#FFF3E0",
    accent: "#FF7043",
    border: "#FFE0B2",
    textSecondary: "#666",
    ...STATUS_DEFAULT,
  },
  office: {
    name: "Office",
    background: "#F5F5F5", // Changed to grey
    card: "#FFFFFF",
    text: "#2C2C2C",
    primary: "#666666", // Changed to grey
    surface: "#FFFFFF",
    surface2: "#FAFAFA",
    secondary: "#888888",
    accent: "#666666",
    border: "#E0E0E0",
    textSecondary: "#757575",
    ...STATUS_DEFAULT,
  },
  park: {
    name: "Park/Outdoors",
    primary: "#388E3C", // Deep green
    background: "#E8F5E9", // Light green
    text: "#222", // dark text for light green
    card: "#FFF",
    surface: "#FFFFFF",
    surface2: "#F1F8E9",
    accent: "#388E3C",
    border: "#C8E6C9",
    textSecondary: "#666",
    ...STATUS_DEFAULT,
  },
  coffee: {
    name: "Coffee Shop",
    primary: "#6D4C41", // Deep coffee brown
    background: "#D7CCC8", // Light coffee/latte
    text: "#222", // dark text for latte background
    card: "#FFF",
    surface: "#FFFFFF",
    surface2: "#EFEBE9",
    accent: "#6D4C41",
    border: "#BCAAA4",
    textSecondary: "#666",
    ...STATUS_DEFAULT,
  },
  library: {
    name: "Library",
    background: "#E3F2FD", // Changed to blue
    card: "#FFFFFF",
    text: "#1565C0",
    primary: "#1976D2", // Changed to blue
    surface: "#FFFFFF",
    surface2: "#E1F5FE",
    secondary: "#42A5F5",
    accent: "#1976D2",
    border: "#BBDEFB",
    textSecondary: "#424242",
    ...STATUS_DEFAULT,
  },
};

// Dark theme palette (consistent across all environments)
const darkThemePalette: ThemePalette = {
  name: "Dark",
  primary: "#4CAF50",
  background: "#121212",
  card: "#242424",
  text: "#FFFFFF",
  surface: "#242424",
  surface2: "#2E2E2E",
  accent: "#4CAF50",
  secondary: "#66BB6A",
  border: "#404040",
  textSecondary: "#E8E8E8",
  ...STATUS_DEFAULT,
};

// Color blind friendly palettes (avoiding red-green, using blue-orange-yellow palette)
const colorBlindLightPalettes: Record<ThemeName, ThemePalette> = {
  home: {
    name: "Home",
    primary: "#FF9800", // True orange (color blind safe)
    background: "#FFE0B2",
    text: "#222",
    card: "#FFF",
    surface: "#FFFFFF",
    surface2: "#FFF3E0",
    accent: "#FF9800",
    border: "#FFCC80",
    textSecondary: "#666",
    ...STATUS_COLOR_BLIND,
  },
  office: {
    name: "Office",
    background: "#F5F5F5",
    card: "#FFFFFF",
    text: "#2C2C2C",
    primary: "#666666",
    surface: "#FFFFFF",
    surface2: "#FAFAFA",
    secondary: "#888888",
    accent: "#666666",
    border: "#E0E0E0",
    textSecondary: "#757575",
    ...STATUS_COLOR_BLIND,
  },
  park: {
    name: "Park/Outdoors",
    primary: "#0097A7", // Cyan instead of green (color blind safe)
    background: "#B2EBF2",
    text: "#222",
    card: "#FFF",
    surface: "#FFFFFF",
    surface2: "#E0F7FA",
    accent: "#00ACC1",
    border: "#80DEEA",
    textSecondary: "#666",
    ...STATUS_COLOR_BLIND,
  },
  coffee: {
    name: "Coffee Shop",
    primary: "#8D6E63", // Adjusted brown
    background: "#D7CCC8",
    text: "#222",
    card: "#FFF",
    surface: "#FFFFFF",
    surface2: "#EFEBE9",
    accent: "#A1887F",
    border: "#BCAAA4",
    textSecondary: "#666",
    ...STATUS_COLOR_BLIND,
  },
  library: {
    name: "Library",
    background: "#E3F2FD",
    card: "#FFFFFF",
    text: "#1565C0",
    primary: "#1976D2",
    surface: "#FFFFFF",
    surface2: "#E1F5FE",
    secondary: "#42A5F5",
    accent: "#1976D2",
    border: "#BBDEFB",
    textSecondary: "#424242",
    ...STATUS_COLOR_BLIND,
  },
};

const colorBlindDarkPalette: ThemePalette = {
  name: "Dark",
  primary: "#2196F3", // Blue instead of green (color blind safe)
  background: "#121212",
  card: "#242424",
  text: "#FFFFFF",
  surface: "#242424",
  surface2: "#2E2E2E",
  accent: "#2196F3",
  secondary: "#64B5F6",
  border: "#404040",
  textSecondary: "#E8E8E8",
  ...STATUS_COLOR_BLIND,
};

// For backwards compatibility
export const themePalettes = lightThemePalettes;

export type ThemePalette = {
  name: string;
  primary: string;
  background: string;
  text: string;
  card: string;
  accent: string;
  surface?: string;
  surface2?: string;
  border?: string;
  textSecondary?: string;
  textTertiary?: string;
  secondary?: string;
  // Status colors (deuteranopia-safe variants applied automatically when colorBlindMode is on)
  success?: string;
  error?: string;
  warning?: string;
};

interface ThemeContextType {
  theme: ThemePalette & { isDark: boolean };
  isDark: boolean;
  themeName: ThemeName;
  themeMode: ThemeMode;
  fontSize: number;
  colorBlindMode: boolean;
  reduceMotion: boolean;
  setThemeName: (name: ThemeName) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setFontSize: (size: number) => void;
  setColorBlindMode: (enabled: boolean) => void;
  setReduceMotion: (enabled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [themeName, setThemeName] = useState<ThemeName>("park");
  const [themeMode, setThemeMode] = useState<ThemeMode>("System Default");
  const [fontSize, setFontSize] = useState<number>(16); // Base font size
  const [colorBlindMode, setColorBlindMode] = useState<boolean>(false); // Color blind mode toggle
  const [reduceMotion, setReduceMotion] = useState<boolean>(false); // App-level reduce motion toggle
  const [systemColorScheme, setSystemColorScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme(),
  );
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved theme preferences on mount
  useEffect(() => {
    const loadThemePreferences = async () => {
      try {
        const savedThemeName = await AsyncStorage.getItem("@theme_name");
        const savedThemeMode = await AsyncStorage.getItem("@theme_mode");
        const savedFontSize = await AsyncStorage.getItem("@font_size");
        const savedColorBlindMode =
          await AsyncStorage.getItem("@color_blind_mode");
        const savedReduceMotion = await AsyncStorage.getItem("@reduce_motion");

        if (savedThemeName) {
          setThemeName(savedThemeName as ThemeName);
        }
        if (savedThemeMode) {
          setThemeMode(savedThemeMode as ThemeMode);
        }
        if (savedFontSize) {
          setFontSize(parseInt(savedFontSize, 10));
        }
        if (savedColorBlindMode) {
          setColorBlindMode(savedColorBlindMode === "true");
        }
        if (savedReduceMotion) {
          setReduceMotion(savedReduceMotion === "true");
        }

        // Honor the OS-level Reduce Motion accessibility setting too.
        try {
          const osReduce = await AccessibilityInfo.isReduceMotionEnabled();
          if (osReduce) setReduceMotion(true);
        } catch {}
      } catch (error) {
        // Failed to load theme preferences — using defaults
      } finally {
        setIsLoaded(true);
      }
    };

    loadThemePreferences();
  }, []);

  // Save theme name when it changes
  useEffect(() => {
    if (isLoaded) {
      AsyncStorage.setItem("@theme_name", themeName).catch(() => {});
    }
  }, [themeName, isLoaded]);

  // Save theme mode when it changes
  useEffect(() => {
    if (isLoaded) {
      AsyncStorage.setItem("@theme_mode", themeMode).catch(() => {});
    }
  }, [themeMode, isLoaded]);

  // Save font size when it changes
  useEffect(() => {
    if (isLoaded) {
      AsyncStorage.setItem("@font_size", fontSize.toString()).catch(() => {});
    }
  }, [fontSize, isLoaded]);

  // Save color blind mode when it changes
  useEffect(() => {
    if (isLoaded) {
      AsyncStorage.setItem(
        "@color_blind_mode",
        colorBlindMode.toString(),
      ).catch(() => {});
    }
  }, [colorBlindMode, isLoaded]);

  // Save reduce motion when it changes
  useEffect(() => {
    if (isLoaded) {
      AsyncStorage.setItem("@reduce_motion", reduceMotion.toString()).catch(
        () => {},
      );
    }
  }, [reduceMotion, isLoaded]);

  // Listen for system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColorScheme(colorScheme);
    });

    return () => subscription.remove();
  }, []);

  // Track OS reduce-motion changes
  useEffect(() => {
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (enabled) => {
        // OS toggle wins — turning it ON forces app reduce motion ON.
        if (enabled) setReduceMotion(true);
      },
    );
    return () => sub.remove();
  }, []);

  // Get the appropriate theme based on mode, environment, and color blind mode
  const getTheme = (): ThemePalette & { isDark: boolean } => {
    let baseTheme: ThemePalette;
    let isDark = false;

    if (themeMode === "Dark") {
      // Use color blind dark palette if enabled, otherwise use regular dark palette
      baseTheme = colorBlindMode ? colorBlindDarkPalette : darkThemePalette;
      isDark = true;
    } else if (themeMode === "Light") {
      // Use color blind light palette if enabled, otherwise use regular light palette
      baseTheme = colorBlindMode
        ? colorBlindLightPalettes[themeName]
        : lightThemePalettes[themeName];
      isDark = false;
    } else {
      // System Default - use system preference
      if (systemColorScheme === "dark") {
        baseTheme = colorBlindMode ? colorBlindDarkPalette : darkThemePalette;
        isDark = true;
      } else {
        baseTheme = colorBlindMode
          ? colorBlindLightPalettes[themeName]
          : lightThemePalettes[themeName];
        isDark = false;
      }
    }

    return { ...baseTheme, isDark };
  };

  const theme = getTheme();

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark: theme.isDark,
        themeName,
        themeMode,
        fontSize,
        colorBlindMode,
        reduceMotion,
        setThemeName,
        setThemeMode,
        setFontSize,
        setColorBlindMode,
        setReduceMotion,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
