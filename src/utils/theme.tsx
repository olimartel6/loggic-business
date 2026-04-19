import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

const dark = {
  bg: '#0f0f1a',
  card: '#1a1a2e',
  border: '#2a2a4a',
  text: '#fff',
  textSecondary: '#888',
  textMuted: '#666',
  accent: '#4f46e5',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  cyan: '#06b6d4',
};

const light = {
  bg: '#f5f5f7',
  card: '#ffffff',
  border: '#e5e5ea',
  text: '#1c1c1e',
  textSecondary: '#6e6e73',
  textMuted: '#aeaeb2',
  accent: '#4f46e5',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  cyan: '#06b6d4',
};

export type Theme = typeof dark;

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: dark,
  isDark: true,
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    SecureStore.getItemAsync('theme').then(v => {
      if (v === 'light') setIsDark(false);
    });
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    SecureStore.setItemAsync('theme', next ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme: isDark ? dark : light, isDark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
