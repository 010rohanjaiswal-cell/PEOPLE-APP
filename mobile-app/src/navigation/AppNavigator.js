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

  // Determine initial route based on auth state and user data
  const getInitialRouteName = () => {
    if (!isAuthenticated) {
      return 'Login';
    }
    
    if (!user?.fullName) {
      return 'ProfileSetup';
    }
    
    if (user?.role === 'client') {
      return 'ClientDashboard';
    }
    
    if (user?.role === 'freelancer') {
      return 'Verification';
    }
    
    // Fallback
    return 'Login';
  };

  return (
    <NavigationContainer>
      <Stack.Navigator 
        screenOptions={{ headerShown: false }}
        initialRouteName={getInitialRouteName()}
      >
        {/* Auth Screens - Always available */}
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="OTP" component={OTPScreen} />
        <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
        
        {/* Client Dashboard - Available when authenticated */}
        {isAuthenticated && (
          <Stack.Screen name="ClientDashboard" component={ClientDashboard} />
        )}
        
        {/* Freelancer Screens - Available when authenticated */}
        {isAuthenticated && (
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

