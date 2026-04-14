import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useColorScheme as useSystemColorScheme, Platform } from 'react-native';
import { ThemeContextType, ThemeType } from '../types/theme';
import { getAuthUserId } from '../utils/authStorage';
import { getApiHeaders, API_BASE_URL } from '../constants/api';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useSystemColorScheme();
  const [theme, setThemeState] = useState<ThemeType>('system');
  const [isLoading, setIsLoading] = useState(true);

  // Load saved theme from storage and backend on mount.
  // FIX: Also add a 'storage' event listener so that when login.tsx calls
  // syncPostLoginState → localStorage.setItem('theme', ...) + fires StorageEvent,
  // ThemeContext immediately picks up the new value without needing a page reload.
  useEffect(() => {
    const loadTheme = async () => {
      try {
        let savedTheme: string | null = null;

        // First try local storage for immediate UI
        if (Platform.OS === 'web') {
          savedTheme = localStorage.getItem('theme');
        } else {
          savedTheme = await SecureStore.getItemAsync('theme');
        }

        if (savedTheme) {
          setThemeState(savedTheme as ThemeType);
        }

        // Then sync from backend (overrides local if different)
        const userId = await getAuthUserId();
        if (userId) {
          try {
            const response = await fetch(`${API_BASE_URL}/user/theme?user_id=${userId}`);
            if (response.ok) {
              const data = await response.json();
              if (data.theme_preference && data.theme_preference !== savedTheme) {
                const backendTheme = data.theme_preference as ThemeType;
                setThemeState(backendTheme);
                // Update local storage to match backend
                if (Platform.OS === 'web') {
                  localStorage.setItem('theme', backendTheme);
                } else {
                  await SecureStore.setItemAsync('theme', backendTheme);
                }
              }
            }
          } catch (error) {
            console.warn('Failed to load theme from backend:', error);
          }
        }
      } catch (error) {
        console.error('Failed to load theme from storage:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTheme();

    // FIX: storage event listener — fires when login.tsx's syncPostLoginState
    // calls localStorage.setItem('theme', ...) and dispatches a StorageEvent.
    // This makes the theme update immediately after fresh login without a
    // browser refresh. Note: StorageEvent only fires for changes made in OTHER
    // tabs normally, but login.tsx explicitly dispatches it via window.dispatchEvent
    // so it also fires in the same tab.
    if (Platform.OS === 'web') {
      const handleStorage = (e: StorageEvent) => {
        if (e.key === 'theme' && e.newValue) {
          console.log('[ThemeContext] storage event — applying theme:', e.newValue);
          setThemeState(e.newValue as ThemeType);
        }
      };
      window.addEventListener('storage', handleStorage);
      return () => window.removeEventListener('storage', handleStorage);
    }
  }, []);

  // Save theme to local storage AND backend DB
  const setTheme = async (newTheme: ThemeType) => {
    try {
      // 1. Update state immediately (optimistic)
      setThemeState(newTheme);

      // 2. Save to local storage
      if (Platform.OS === 'web') {
        localStorage.setItem('theme', newTheme);
      } else {
        await SecureStore.setItemAsync('theme', newTheme);
      }

      // 3. Persist to DB so it survives re-login / other devices
      const userId = await getAuthUserId();
      if (userId) {
        try {
          await fetch(`${API_BASE_URL}/user/theme`, {
            method: 'POST',
            headers: await getApiHeaders(),
            body: JSON.stringify({
              user_id: userId,
              theme_preference: newTheme,
            }),
          });
        } catch (error) {
          // Non-fatal — local state is already correct, DB will sync next load
          console.warn('[ThemeContext] Failed to save theme to DB:', error);
        }
      }
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  };

  // Determine if dark mode is active based on theme setting
  const isDarkMode = theme === 'system'
    ? systemColorScheme === 'dark'
    : theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, isDarkMode, setTheme, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};