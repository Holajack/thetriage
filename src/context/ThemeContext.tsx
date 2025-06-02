import React, { createContext, useContext, useState, ReactNode } from 'react';

export type ThemeName = 'home' | 'office' | 'library' | 'coffee' | 'park';

export const themePalettes = {
  home: {
    name: 'Home',
    primary: '#FF7043', // Deep sunset orange
    background: '#FFCCBC', // Light sunset orange
    text: '#222', // dark text for light background
    card: '#FFF',
    accent: '#FF7043',
  },
  office: {
    name: 'Office',
    primary: '#1976D2', // Deep blue
    background: '#BBDEFB', // Light blue
    text: '#222', // dark text for light blue background
    card: '#FFF',
    accent: '#1976D2',
  },
  park: {
    name: 'Park/Outdoors',
    primary: '#388E3C', // Deep green
    background: '#E8F5E9', // Light green
    text: '#222', // dark text for light green
    card: '#FFF',
    accent: '#388E3C',
  },
  coffee: {
    name: 'Coffee Shop',
    primary: '#6D4C41', // Deep coffee brown
    background: '#D7CCC8', // Light coffee/latte
    text: '#222', // dark text for latte background
    card: '#FFF',
    accent: '#6D4C41',
  },
  library: {
    name: 'Library',
    primary: '#424242', // Deep grey
    background: '#F5F5F5', // Light grey
    text: '#222', // dark text for light grey
    card: '#FFF',
    accent: '#424242',
  },
};

export type ThemePalette = typeof themePalettes.home;

interface ThemeContextType {
  theme: ThemePalette;
  themeName: ThemeName;
  setThemeName: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [themeName, setThemeName] = useState<ThemeName>('park');
  const theme = themePalettes[themeName];
  return (
    <ThemeContext.Provider value={{ theme, themeName, setThemeName }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
} 