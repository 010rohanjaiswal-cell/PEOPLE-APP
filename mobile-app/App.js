/**
 * App - People App
 * Main entry point
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { UserProvider } from './src/context/UserContext';
import AppNavigator from './src/navigation/AppNavigator';
import { initializePhonePe } from './src/config/phonepe';

export default function App() {
  // Initialize PhonePe SDK on app start
  useEffect(() => {
    // Initialize PhonePe SDK asynchronously
    initializePhonePe().catch((error) => {
      console.error('Failed to initialize PhonePe SDK:', error);
      // App can continue without PhonePe SDK (will use web fallback)
    });
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <UserProvider>
          <StatusBar style="dark" translucent={false} />
          <AppNavigator />
        </UserProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
