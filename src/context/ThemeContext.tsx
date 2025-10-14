import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';

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
  setThemeName: (name: ThemeName) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setFontSize: (size: number) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [themeName, setThemeName] = useState<ThemeName>('park');
  const [themeMode, setThemeMode] = useState<ThemeMode>('System Default');
  const [fontSize, setFontSize] = useState<number>(16); // Base font size
  const [systemColorScheme, setSystemColorScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme()
  );

  // Listen for system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColorScheme(colorScheme);
    });

    return () => subscription.remove();
  }, []);

  // Get the appropriate theme based on mode and environment
  const getTheme = (): ThemePalette & { isDark: boolean } => {
    let baseTheme: ThemePalette;
    let isDark = false;
    
    if (themeMode === 'Dark') {
      baseTheme = darkThemePalette;
      isDark = true;
    } else if (themeMode === 'Light') {
      baseTheme = lightThemePalettes[themeName];
      isDark = false;
    } else {
      // System Default - use system preference
      if (systemColorScheme === 'dark') {
        baseTheme = darkThemePalette;
        isDark = true;
      } else {
        baseTheme = lightThemePalettes[themeName];
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
      setThemeName, 
      setThemeMode,
      setFontSize
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