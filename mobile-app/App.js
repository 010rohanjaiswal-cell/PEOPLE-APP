/**
 * App - People App
 * Main entry point
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { UserProvider } from './src/context/UserContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
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
