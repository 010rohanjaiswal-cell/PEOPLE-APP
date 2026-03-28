/**
 * App - People App
 * Main entry point
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DigiLockerProvider } from '@cashfreepayments/react-native-digilocker';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { UserProvider } from './src/context/UserContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { LocationProvider } from './src/context/LocationContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import { initializePhonePe } from './src/config/phonepe';
import { warmupBackend } from './src/api/client';
import { registerPushTokenAsync, ensureNotificationChannelAsync } from './src/utils/pushNotifications';

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
  }, []);

  // Wake backend from cold start when user is logged in (Render free tier spins down after ~15 min)
  useEffect(() => {
    if (userId) {
      warmupBackend();
      registerPushTokenAsync();
    }
  }, [userId]);

  // When app comes to foreground, ping backend and re-register push token (so token is set after backend deploy)
  useEffect(() => {
    if (!userId) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        warmupBackend();
        registerPushTokenAsync();
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
  return (
    <SafeAreaProvider>
      <DigiLockerProvider>
      <AuthProvider>
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
      </AuthProvider>
      </DigiLockerProvider>
    </SafeAreaProvider>
  );
}
