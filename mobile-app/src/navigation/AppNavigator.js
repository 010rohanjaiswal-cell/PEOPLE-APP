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

// Dashboard Screens
import ClientDashboard from '../screens/client/ClientDashboard';
import VerificationScreen from '../screens/freelancer/Verification';
import FreelancerDashboard from '../screens/freelancer/FreelancerDashboard';

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
            {/* Profile Setup - shown if user doesn't have fullName */}
            {!user?.fullName && (
              <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
            )}
            
            {/* Dashboards - shown if user has fullName (profilePhoto is optional for now) */}
            {user?.fullName && (
              <>
                {user?.role === 'client' ? (
                  // Client Dashboard
                  <Stack.Screen name="ClientDashboard" component={ClientDashboard} />
                ) : user?.role === 'freelancer' ? (
                  // Freelancer navigation: Check verification status
                  // Verification screen will check status and navigate to dashboard if approved
                  // For now, show both screens - Verification will handle navigation
                  <>
                    <Stack.Screen name="Verification" component={VerificationScreen} />
                    <Stack.Screen name="FreelancerDashboard" component={FreelancerDashboard} />
                  </>
                ) : null}
              </>
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;

