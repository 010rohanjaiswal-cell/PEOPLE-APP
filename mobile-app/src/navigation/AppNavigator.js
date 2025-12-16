/**
 * App Navigator - People App
 * Main navigation structure
 */

import React, { useEffect, useRef } from 'react';
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
  const navigationRef = useRef(null);

  // Determine initial route based on auth state and user data
  const getInitialRouteName = () => {
    if (!isAuthenticated) {
      return 'Login';
    }

    // Freelancer:
    // - If verification approved: go to FreelancerDashboard
    // - Otherwise: go to Verification flow (handles pending/rejected/new)
    if (user?.role === 'freelancer') {
      if (user?.verificationStatus === 'approved') {
        return 'FreelancerDashboard';
      }
      return 'Verification';
    }

    // Client: require profile setup if fullName missing
    if (user?.role === 'client' && !user?.fullName) {
      return 'ProfileSetup';
    }

    if (user?.role === 'client') {
      return 'ClientDashboard';
    }

    // Fallback
    return 'Login';
  };

  // Navigate when auth state changes
  useEffect(() => {
    if (!loading && navigationRef.current?.isReady()) {
      const currentRoute = navigationRef.current.getCurrentRoute()?.name;
      let targetRoute = null;

      if (!isAuthenticated) {
        targetRoute = 'Login';
      } else if (user?.role === 'freelancer') {
        // Freelancer routing based on verification status
        if (user?.verificationStatus === 'approved') {
          targetRoute = 'FreelancerDashboard';
        } else {
          targetRoute = 'Verification';
        }
      } else if (user?.role === 'client' && !user?.fullName) {
        targetRoute = 'ProfileSetup';
      } else if (user?.role === 'client') {
        targetRoute = 'ClientDashboard';
      }

      // Only navigate if we have a target and we're not already there
      if (targetRoute && currentRoute !== targetRoute) {
        console.log(`🔄 Navigating from ${currentRoute} to ${targetRoute}`);
        navigationRef.current.reset({
          index: 0,
          routes: [{ name: targetRoute }],
        });
      }
    }
  }, [isAuthenticated, user, loading]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator 
        screenOptions={{ headerShown: false }}
        initialRouteName={getInitialRouteName()}
      >
        {/* Auth Screens - Always available */}
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="OTP" component={OTPScreen} />
        {user?.role === 'client' && (
          <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
        )}
        
        {/* Client Dashboard - Available when authenticated */}
        {isAuthenticated && user?.role === 'client' && (
          <Stack.Screen name="ClientDashboard" component={ClientDashboard} />
        )}
        
        {/* Freelancer Screens - Available when authenticated */}
        {isAuthenticated && user?.role === 'freelancer' && (
          <>
            <Stack.Screen name="Verification" component={VerificationScreen} />
            <Stack.Screen name="FreelancerDashboard" component={FreelancerDashboard} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;

