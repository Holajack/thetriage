import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeName = 'home' | 'office' | 'library' | 'coffee' | 'park';
export type ThemeMode = 'System Default' | 'Light' | 'Dark';

// Light theme palettes for different environments
export const lightThemePalettes: Record<ThemeName, ThemePalette> = {
  home: {
    name: 'Home',
    primary: '#FF7043', // Deep sunset orange
    background: '#FFCCBC', // Light sunset orange
    text: '#222', // dark text for light background
    card: '#FFF',
    surface: '#FFFFFF',
    surface2: '#FFF3E0',
    accent: '#FF7043',
    border: '#FFE0B2',
    textSecondary: '#666',
  },
  office: {
    name: 'Office',
    background: '#F5F5F5', // Changed to grey
    card: '#FFFFFF',
    text: '#2C2C2C',
    primary: '#666666', // Changed to grey
    surface: '#FFFFFF',
    surface2: '#FAFAFA',
    secondary: '#888888',
    accent: '#666666',
    border: '#E0E0E0',
    textSecondary: '#757575',
  },
  park: {
    name: 'Park/Outdoors',
    primary: '#388E3C', // Deep green
    background: '#E8F5E9', // Light green
    text: '#222', // dark text for light green
    card: '#FFF',
    surface: '#FFFFFF',
    surface2: '#F1F8E9',
    accent: '#388E3C',
    border: '#C8E6C9',
    textSecondary: '#666',
  },
  coffee: {
    name: 'Coffee Shop',
    primary: '#6D4C41', // Deep coffee brown
    background: '#D7CCC8', // Light coffee/latte
    text: '#222', // dark text for latte background
    card: '#FFF',
    surface: '#FFFFFF',
    surface2: '#EFEBE9',
    accent: '#6D4C41',
    border: '#BCAAA4',
    textSecondary: '#666',
  },
  library: {
    name: 'Library',
    background: '#E3F2FD', // Changed to blue
    card: '#FFFFFF',
    text: '#1565C0',
    primary: '#1976D2', // Changed to blue
    surface: '#FFFFFF',
    surface2: '#E1F5FE',
    secondary: '#42A5F5',
    accent: '#1976D2',
    border: '#BBDEFB',
    textSecondary: '#424242',
  },
};

// Dark theme palette (consistent across all environments)
export const darkThemePalette: ThemePalette = {
  name: 'Dark',
  primary: '#4CAF50',
  background: '#121212',
  card: '#1E1E1E',
  text: '#FFFFFF',
  surface: '#1E1E1E',
  surface2: '#2C2C2C',
  accent: '#4CAF50',
  secondary: '#66BB6A',
  border: '#333333',
  textSecondary: '#AAAAAA',
};

// Color blind friendly palettes (avoiding red-green, using blue-orange-yellow palette)
export const colorBlindLightPalettes: Record<ThemeName, ThemePalette> = {
  home: {
    name: 'Home',
    primary: '#FF9800', // True orange (color blind safe)
    background: '#FFE0B2',
    text: '#222',
    card: '#FFF',
    surface: '#FFFFFF',
    surface2: '#FFF3E0',
    accent: '#FF9800',
    border: '#FFCC80',
    textSecondary: '#666',
  },
  office: {
    name: 'Office',
    background: '#F5F5F5',
    card: '#FFFFFF',
    text: '#2C2C2C',
    primary: '#666666',
    surface: '#FFFFFF',
    surface2: '#FAFAFA',
    secondary: '#888888',
    accent: '#666666',
    border: '#E0E0E0',
    textSecondary: '#757575',
  },
  park: {
    name: 'Park/Outdoors',
    primary: '#0097A7', // Cyan instead of green (color blind safe)
    background: '#B2EBF2',
    text: '#222',
    card: '#FFF',
    surface: '#FFFFFF',
    surface2: '#E0F7FA',
    accent: '#00ACC1',
    border: '#80DEEA',
    textSecondary: '#666',
  },
  coffee: {
    name: 'Coffee Shop',
    primary: '#8D6E63', // Adjusted brown
    background: '#D7CCC8',
    text: '#222',
    card: '#FFF',
    surface: '#FFFFFF',
    surface2: '#EFEBE9',
    accent: '#A1887F',
    border: '#BCAAA4',
    textSecondary: '#666',
  },
  library: {
    name: 'Library',
    background: '#E3F2FD',
    card: '#FFFFFF',
    text: '#1565C0',
    primary: '#1976D2',
    surface: '#FFFFFF',
    surface2: '#E1F5FE',
    secondary: '#42A5F5',
    accent: '#1976D2',
    border: '#BBDEFB',
    textSecondary: '#424242',
  },
};

export const colorBlindDarkPalette: ThemePalette = {
  name: 'Dark',
  primary: '#2196F3', // Blue instead of green (color blind safe)
  background: '#121212',
  card: '#1E1E1E',
  text: '#FFFFFF',
  surface: '#1E1E1E',
  surface2: '#2C2C2C',
  accent: '#2196F3',
  secondary: '#64B5F6',
  border: '#333333',
  textSecondary: '#AAAAAA',
};

// For backwards compatibility
export const themePalettes = lightThemePalettes;

export type ThemePalette = typeof lightThemePalettes.home & {
  surface?: string;
  surface2?: string; 
  border?: string;
  textSecondary?: string;
  secondary?: string;
};

interface ThemeContextType {
  theme: ThemePalette & { isDark: boolean };
  themeName: ThemeName;
  themeMode: ThemeMode;
  fontSize: number;
  colorBlindMode: boolean;
  setThemeName: (name: ThemeName) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setFontSize: (size: number) => void;
  setColorBlindMode: (enabled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [themeName, setThemeName] = useState<ThemeName>('park');
  const [themeMode, setThemeMode] = useState<ThemeMode>('System Default');
  const [fontSize, setFontSize] = useState<number>(16); // Base font size
  const [colorBlindMode, setColorBlindMode] = useState<boolean>(false); // Color blind mode toggle
  const [systemColorScheme, setSystemColorScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme()
  );
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved theme preferences on mount
  useEffect(() => {
    const loadThemePreferences = async () => {
      try {
        const savedThemeName = await AsyncStorage.getItem('@theme_name');
        const savedThemeMode = await AsyncStorage.getItem('@theme_mode');
        const savedFontSize = await AsyncStorage.getItem('@font_size');
        const savedColorBlindMode = await AsyncStorage.getItem('@color_blind_mode');

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
          setColorBlindMode(savedColorBlindMode === 'true');
        }

        console.log('✅ Theme preferences loaded:', {
          themeName: savedThemeName || 'park (default)',
          themeMode: savedThemeMode || 'System Default',
          fontSize: savedFontSize || '16 (default)',
          colorBlindMode: savedColorBlindMode || 'false (default)'
        });
      } catch (error) {
        console.error('Error loading theme preferences:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadThemePreferences();
  }, []);

  // Save theme name when it changes
  useEffect(() => {
    if (isLoaded) {
      AsyncStorage.setItem('@theme_name', themeName)
        .then(() => console.log('💾 Theme name saved:', themeName))
        .catch(error => console.error('Error saving theme name:', error));
    }
  }, [themeName, isLoaded]);

  // Save theme mode when it changes
  useEffect(() => {
    if (isLoaded) {
      AsyncStorage.setItem('@theme_mode', themeMode)
        .then(() => console.log('💾 Theme mode saved:', themeMode))
        .catch(error => console.error('Error saving theme mode:', error));
    }
  }, [themeMode, isLoaded]);

  // Save font size when it changes
  useEffect(() => {
    if (isLoaded) {
      AsyncStorage.setItem('@font_size', fontSize.toString())
        .then(() => console.log('💾 Font size saved:', fontSize))
        .catch(error => console.error('Error saving font size:', error));
    }
  }, [fontSize, isLoaded]);

  // Save color blind mode when it changes
  useEffect(() => {
    if (isLoaded) {
      AsyncStorage.setItem('@color_blind_mode', colorBlindMode.toString())
        .then(() => console.log('💾 Color blind mode saved:', colorBlindMode))
        .catch(error => console.error('Error saving color blind mode:', error));
    }
  }, [colorBlindMode, isLoaded]);

  // Listen for system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColorScheme(colorScheme);
    });

    return () => subscription.remove();
  }, []);

  // Get the appropriate theme based on mode, environment, and color blind mode
  const getTheme = (): ThemePalette & { isDark: boolean } => {
    let baseTheme: ThemePalette;
    let isDark = false;

    if (themeMode === 'Dark') {
      // Use color blind dark palette if enabled, otherwise use regular dark palette
      baseTheme = colorBlindMode ? colorBlindDarkPalette : darkThemePalette;
      isDark = true;
    } else if (themeMode === 'Light') {
      // Use color blind light palette if enabled, otherwise use regular light palette
      baseTheme = colorBlindMode ? colorBlindLightPalettes[themeName] : lightThemePalettes[themeName];
      isDark = false;
    } else {
      // System Default - use system preference
      if (systemColorScheme === 'dark') {
        baseTheme = colorBlindMode ? colorBlindDarkPalette : darkThemePalette;
        isDark = true;
      } else {
        baseTheme = colorBlindMode ? colorBlindLightPalettes[themeName] : lightThemePalettes[themeName];
        isDark = false;
      }
    }

    return { ...baseTheme, isDark };
  };

  const theme = getTheme();

  return (
    <ThemeContext.Provider value={{
      theme,
      themeName,
      themeMode,
      fontSize,
      colorBlindMode,
      setThemeName,
      setThemeMode,
      setFontSize,
      setColorBlindMode
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}