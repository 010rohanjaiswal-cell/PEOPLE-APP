/**
 * App Navigator - People App
 * Main navigation structure
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { addNotificationResponseListener } from '../utils/pushNotifications';
import * as Notifications from 'expo-notifications';
import {
  normalizeExpoPushData,
  resolvePushActionFromNotificationData,
} from './pushNotificationRoutes';

// Auth Screens
import LoginScreen from '../screens/auth/Login';
import OTPScreen from '../screens/auth/OTP';
import ProfileSetupScreen from '../screens/auth/ProfileSetup';

// Dashboard Screens
import ClientDashboard from '../screens/client/ClientDashboard';
import ClientIntro from '../screens/client/ClientIntro';
import VerificationScreen from '../screens/freelancer/Verification';
import FaceVerificationScreen from '../screens/freelancer/FaceVerification';
import FreelancerDashboard from '../screens/freelancer/FreelancerDashboard';
import FreelancerIntro from '../screens/freelancer/FreelancerIntro';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const { isAuthenticated, user, loading } = useAuth();
  const { isDark, colors: themeColors } = useTheme();
  const navigationRef = useRef(null);

  const navigationTheme = useMemo(
    () => ({
      ...(isDark ? DarkTheme : DefaultTheme),
      colors: {
        ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
        primary: themeColors.primary.main,
        background: themeColors.background,
        card: themeColors.cardBackground,
        text: themeColors.text.primary,
        border: themeColors.border,
        notification: themeColors.primary.main,
      },
    }),
    [isDark, themeColors]
  );

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

      const isAllowedToStay =
        (!isAuthenticated && (currentRoute === 'Login' || currentRoute === 'OTP')) ||
        (isAuthenticated &&
          user?.role === 'client' &&
          (currentRoute === 'ClientDashboard' ||
            currentRoute === 'ClientIntro' ||
            (currentRoute === 'ProfileSetup' && !user?.fullName))) ||
        (isAuthenticated &&
          user?.role === 'freelancer' &&
          user?.verificationStatus !== 'approved' &&
          (currentRoute === 'Verification' || currentRoute === 'FaceVerification')) ||
        (isAuthenticated &&
          user?.role === 'freelancer' &&
          user?.verificationStatus === 'approved' &&
          (currentRoute === 'FreelancerDashboard' || currentRoute === 'FreelancerIntro'));

      // Only navigate if we have a target and we're not already there,
      // AND we are not already on a valid screen for this auth state.
      if (targetRoute && currentRoute !== targetRoute && !isAllowedToStay) {
        console.log(`🔄 Navigating from ${currentRoute} to ${targetRoute}`);
        navigationRef.current.reset({
          index: 0,
          routes: [{ name: targetRoute }],
        });
      }
    }
  }, [isAuthenticated, user, loading]);

  // Push tap: route by notification type (tabs / modals); unmapped types open root dashboard only
  useEffect(() => {
    const handleNotificationData = (rawData) => {
      if (!navigationRef.current?.isReady() || !user) return;
      const normalized = normalizeExpoPushData(rawData || {});
      const action = resolvePushActionFromNotificationData(normalized, user?.role);
      if (user?.role === 'client') {
        if (action) {
          navigationRef.current.navigate('ClientDashboard', { pushAction: action });
        } else {
          navigationRef.current.navigate('ClientDashboard');
        }
        return;
      }
      if (user?.role === 'freelancer') {
        if (action) {
          navigationRef.current.navigate('FreelancerDashboard', { pushAction: action });
        } else {
          navigationRef.current.navigate('FreelancerDashboard');
        }
      }
    };

    const sub = addNotificationResponseListener(handleNotificationData);

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response || !user) return;
      const data = response.notification.request.content.data || {};
      handleNotificationData(data);
    });

    return () => sub.remove();
  }, [user?.role, user?._id, user?.id]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <NavigationContainer theme={navigationTheme} ref={navigationRef}>
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
          <>
            <Stack.Screen name="ClientIntro" component={ClientIntro} />
            <Stack.Screen name="ClientDashboard" component={ClientDashboard} />
          </>
        )}
        
        {/* Freelancer Screens - Available when authenticated */}
        {isAuthenticated && user?.role === 'freelancer' && (
          <>
            <Stack.Screen name="Verification" component={VerificationScreen} />
            <Stack.Screen name="FaceVerification" component={FaceVerificationScreen} />
            <Stack.Screen name="FreelancerIntro" component={FreelancerIntro} />
            <Stack.Screen name="FreelancerDashboard" component={FreelancerDashboard} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;

