/**
 * App Navigator - People App
 * Main navigation structure
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';

// Auth Screens
import LoginScreen from '../screens/auth/Login';
import OTPScreen from '../screens/auth/OTP';
import ProfileSetupScreen from '../screens/auth/ProfileSetup';

// Dashboard Screens (to be created in Phase 3 & 4)
// import ClientDashboard from '../screens/client/ClientDashboard';
// import FreelancerDashboard from '../screens/freelancer/FreelancerDashboard';
// import VerificationScreen from '../screens/freelancer/Verification';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          // Auth Stack
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="OTP" component={OTPScreen} />
            <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
          </>
        ) : (
          // Authenticated Stack
          <>
            {user?.role === 'client' ? (
              // Client Stack - Placeholder will be replaced in Phase 3
              <Stack.Screen name="ClientDashboard">
                {() => <LoadingSpinner />}
              </Stack.Screen>
            ) : user?.role === 'freelancer' ? (
              // Freelancer Stack - Placeholder will be replaced in Phase 4
              <>
                <Stack.Screen name="Verification">
                  {() => <LoadingSpinner />}
                </Stack.Screen>
                <Stack.Screen name="FreelancerDashboard">
                  {() => <LoadingSpinner />}
                </Stack.Screen>
              </>
            ) : null}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;

