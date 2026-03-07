/**
 * App - People App
 * Main entry point
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { UserProvider } from './src/context/UserContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { LocationProvider } from './src/context/LocationContext';
import AppNavigator from './src/navigation/AppNavigator';
import { initializePhonePe } from './src/config/phonepe';
import { warmupBackend } from './src/api/client';
import { registerPushTokenAsync } from './src/utils/pushNotifications';

// Inner component to access auth context
const AppContent = () => {
  const { user } = useAuth();

  // Wake backend from cold start when user is logged in (Render free tier spins down after ~15 min)
  useEffect(() => {
    if (user) {
      warmupBackend();
      registerPushTokenAsync();
    }
  }, [user]);

  // When app comes to foreground, ping backend so it stays warm (or wakes if it spun down)
  useEffect(() => {
    if (!user) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') warmupBackend();
    });
    return () => sub?.remove();
  }, [user]);

  // Initialize PhonePe SDK on app start or when user logs in
  useEffect(() => {
    // Generate flowId: Use user ID if available, otherwise auto-generate
    // flowId should be alphanumeric without special characters
    let flowId = null;
    if (user && user._id) {
      // Use user ID as flowId (remove any special characters, keep alphanumeric only)
      flowId = user._id.toString().replace(/[^a-zA-Z0-9]/g, '');
    }

    // Initialize PhonePe SDK asynchronously
    initializePhonePe(flowId).catch((error) => {
      console.error('Failed to initialize PhonePe SDK:', error);
      // App can continue without PhonePe SDK (will use web fallback)
    });
  }, [user]); // Re-initialize if user changes

  return <AppNavigator />;
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <UserProvider>
          <NotificationProvider>
            <LocationProvider>
              <StatusBar style="dark" translucent={false} />
              <AppContent />
            </LocationProvider>
          </NotificationProvider>
        </UserProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
