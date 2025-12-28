/**
 * App - People App
 * Main entry point
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { UserProvider } from './src/context/UserContext';
import AppNavigator from './src/navigation/AppNavigator';
import { initializePhonePe } from './src/config/phonepe';

// Inner component to access auth context
const AppContent = () => {
  const { user } = useAuth();

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
          <StatusBar style="dark" translucent={false} />
          <AppContent />
        </UserProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
