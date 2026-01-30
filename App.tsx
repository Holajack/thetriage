// URL polyfill MUST be the very first import - before ANY executable code
import 'react-native-url-polyfill/auto';

// NOW it's safe to log (after polyfill is loaded)
console.log("CLERK KEY =", process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY);
console.log("CONVEX URL =", JSON.stringify(process.env.EXPO_PUBLIC_CONVEX_URL));
console.log("ENV KEYS =", Object.keys(process.env || {}));

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider } from './src/context/ThemeContext';
import { QRAcceptanceProvider } from './src/context/QRAcceptanceContext';
import * as SplashScreen from 'expo-splash-screen';
import { LogBox, Text, View } from 'react-native';
import { StartupErrorBoundary } from './src/components/StartupErrorBoundary';
import { ClerkProvider, ClerkLoaded } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';

// DEBUG flag no longer needed - OBJLoader URL error was fixed with React.lazy()
// const DEBUG_SKIP_NAVIGATOR = false;

// Custom token cache using expo-secure-store directly
// This avoids potential initialization issues with the built-in tokenCache module
const tokenCache = {
  async getToken(key: string): Promise<string | null> {
    try {
      const item = await SecureStore.getItemAsync(key);
      if (item) {
        console.log(`TokenCache: Retrieved token for key: ${key.substring(0, 10)}...`);
      }
      return item;
    } catch (error) {
      console.error('TokenCache: Error getting token:', error);
      return null;
    }
  },
  async saveToken(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
      console.log(`TokenCache: Saved token for key: ${key.substring(0, 10)}...`);
    } catch (error) {
      console.error('TokenCache: Error saving token:', error);
    }
  },
  async clearToken(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
      console.log(`TokenCache: Cleared token for key: ${key.substring(0, 10)}...`);
    } catch (error) {
      console.error('TokenCache: Error clearing token:', error);
    }
  },
};

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error(
    'Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env',
  );
}

import { ConvexClientProvider } from './src/providers/ConvexClientProvider';

// Ignore specific warnings
LogBox.ignoreLogs([
  'Warning: useInsertionEffect must not schedule updates.',
  'ViewManagerAdapter_ExpoLinearGradient',
  'useInsertionEffect must not schedule updates'
]);

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function App() {
  useEffect(() => {
    // Prepare app and let our custom splash screen handle the timing
    const prepare = async () => {
      try {
        // Add any initialization logic here
        await new Promise(resolve => setTimeout(resolve, 500)); // Shorter delay for mobile
      } catch (e) {
        console.warn('App: Initialization error:', e);
      }
    };

    prepare();
  }, []);

  // ============================================================
  // STEP 2g: Adding RootNavigator (FINAL TEST)
  // ============================================================
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StartupErrorBoundary>
          <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
            <ClerkLoaded>
              <ConvexClientProvider>
                <ThemeProvider>
                  <AuthProvider>
                    <QRAcceptanceProvider>
                      <StatusBar style="auto" />
                      <RootNavigator />
                    </QRAcceptanceProvider>
                  </AuthProvider>
                </ThemeProvider>
              </ConvexClientProvider>
            </ClerkLoaded>
          </ClerkProvider>
        </StartupErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );

  /* ORIGINAL CODE - PRESERVED FOR STEP 2
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StartupErrorBoundary>
          <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
            <ClerkLoaded>
              <ThemeProvider>
                <AuthProvider>
                  <QRAcceptanceProvider>
                    <StatusBar style="auto" />
                    {DEBUG_SKIP_NAVIGATOR ? (
                      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a2e' }}>
                        <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>✅ App Loaded!</Text>
                        <Text style={{ color: '#aaa', fontSize: 16, marginTop: 10 }}>Clerk + Providers working</Text>
                        <Text style={{ color: '#aaa', fontSize: 14, marginTop: 20 }}>RootNavigator is disabled for testing</Text>
                      </View>
                    ) : (
                      <RootNavigator />
                    )}
                  </QRAcceptanceProvider>
                </AuthProvider>
              </ThemeProvider>
            </ClerkLoaded>
          </ClerkProvider>
        </StartupErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
  */
}
