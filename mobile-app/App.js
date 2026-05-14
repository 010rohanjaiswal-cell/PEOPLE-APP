/**
 * App - People App
 * Main entry point
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DigiLockerProvider } from '@cashfreepayments/react-native-digilocker';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { SocketProvider } from './src/context/SocketContext';
import { UserProvider } from './src/context/UserContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { LocationProvider } from './src/context/LocationContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import { initializePhonePe } from './src/config/phonepe';
import { warmupBackend } from './src/api/client';
import {
  registerPushTokenAsync,
  ensureNotificationChannelAsync,
  subscribeForegroundNotificationVibration,
} from './src/utils/pushNotifications';

// Keep native splash visible until RN is ready (prevents a blank flash on launch).
void SplashScreen.preventAutoHideAsync().catch(() => {});

// Dev-only: surface stack trace for a noisy RN error that sometimes lacks one in Metro logs.
if (__DEV__) {
  const _origConsoleError = console.error;
  // Avoid double-wrapping on Fast Refresh.
  if (!_origConsoleError.__peopleAppWrapped) {
    const wrapped = (...args) => {
      try {
        const first = args?.[0];
        const msg = typeof first === 'string' ? first : '';
        if (msg.includes('Did not expect event target to be a number')) {
          _origConsoleError('PeopleApp debug stack for event-target error:\n' + new Error().stack);
        }
      } catch {
        // ignore
      }
      return _origConsoleError(...args);
    };
    wrapped.__peopleAppWrapped = true;
    console.error = wrapped;
  }
}

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} translucent={false} />;
}

// Inner component to access auth context
const AppContent = () => {
  const { user } = useAuth();
  const userId = useMemo(() => (user?._id || user?.id || null), [user?._id, user?.id]);
  const phonePeInitRef = useRef({ userId: null });

  useEffect(() => {
    ensureNotificationChannelAsync();
    const sub = subscribeForegroundNotificationVibration();
    return () => sub.remove();
  }, []);

  // Wake backend from cold start when user is logged in (Render free tier spins down after ~15 min)
  useEffect(() => {
    if (userId) {
      warmupBackend();
      registerPushTokenAsync(userId);
    }
  }, [userId]);

  // When app comes to foreground, ping backend and re-register push token (so token is set after backend deploy)
  useEffect(() => {
    if (!userId) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        warmupBackend();
        registerPushTokenAsync(userId);
      }
    });
    return () => sub?.remove();
  }, [userId]);

  // Initialize PhonePe SDK on app start or when user logs in
  useEffect(() => {
    // Generate flowId: Use user ID if available, otherwise auto-generate
    // flowId should be alphanumeric without special characters
    let flowId = null;
    if (userId) {
      // Use user ID as flowId (remove any special characters, keep alphanumeric only)
      flowId = userId.toString().replace(/[^a-zA-Z0-9]/g, '');
    }

    // Only initialize when userId changes (avoid loops from profile refresh updating user object)
    if (phonePeInitRef.current.userId === userId) return;
    phonePeInitRef.current.userId = userId;

    // Initialize PhonePe SDK asynchronously
    initializePhonePe(flowId).catch((error) => {
      console.error('Failed to initialize PhonePe SDK:', error);
      // App can continue without PhonePe SDK (will use web fallback)
    });
  }, [userId]); // only when identity changes

  return <AppNavigator />;
};

export default function App() {
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    // If you add async warmups (fonts, persisted state hydration, etc),
    // do them here and only then mark app ready.
    setAppReady(true);
  }, []);

  const onRootLayout = useCallback(() => {
    if (appReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [appReady]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider onLayout={onRootLayout}>
        <DigiLockerProvider>
          <AuthProvider>
            <SocketProvider>
              <LanguageProvider>
                <ThemeProvider>
                  <UserProvider>
                    <NotificationProvider>
                      <LocationProvider>
                        <ThemedStatusBar />
                        <AppContent />
                      </LocationProvider>
                    </NotificationProvider>
                  </UserProvider>
                </ThemeProvider>
              </LanguageProvider>
            </SocketProvider>
          </AuthProvider>
        </DigiLockerProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
