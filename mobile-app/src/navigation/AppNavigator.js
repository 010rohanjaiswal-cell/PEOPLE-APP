/**
 * App Navigator - People App
 * Main navigation structure
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { clientNeedsProfileSetup } from '../utils/clientProfileGate';
import { hasSeenIntro } from '../utils/introSeen';
import { resolveAuthenticatedRoute } from '../utils/resolveAuthenticatedRoute';

// Auth Screens
import AuthWelcomeScreen from '../screens/auth/AuthWelcome';
import LoginScreen from '../screens/auth/Login';
import OTPScreen from '../screens/auth/OTP';
import ProfileSetupScreen from '../screens/auth/ProfileSetup';
import { hasSeenAuthWelcome } from '../utils/authWelcomeSeen';

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
  const [navReady, setNavReady] = useState(false);
  const [authEntryRoute, setAuthEntryRoute] = useState('AuthWelcome');
  const [authBootstrapped, setAuthBootstrapped] = useState(false);
  /** Avoid racing ClientDashboard mount + dashboard intro reset on first login. */
  const [introGate, setIntroGate] = useState({ ready: true, showIntro: false });

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

  useEffect(() => {
    if (loading || isAuthenticated) {
      setAuthBootstrapped(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const seen = await hasSeenAuthWelcome();
      if (!cancelled) {
        setAuthEntryRoute(seen ? 'Login' : 'AuthWelcome');
        setAuthBootstrapped(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !user?.role) {
      setIntroGate({ ready: true, showIntro: false });
      return;
    }

    const role = user.role;
    const needsIntroCheck =
      (role === 'client' && !clientNeedsProfileSetup(user)) ||
      (role === 'freelancer' && user.verificationStatus === 'approved');

    if (!needsIntroCheck) {
      setIntroGate({ ready: true, showIntro: false });
      return;
    }

    let cancelled = false;
    setIntroGate({ ready: false, showIntro: false });
    (async () => {
      const seen = await hasSeenIntro(user, role);
      if (!cancelled) {
        setIntroGate({ ready: true, showIntro: !seen });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    isAuthenticated,
    user?._id,
    user?.id,
    user?.role,
    user?.verificationStatus,
    user?.fullName,
    user?.profilePhoto,
  ]);

  // Navigate when auth state changes
  useEffect(() => {
    if (!loading && navReady && introGate.ready && navigationRef.current?.isReady()) {
      const currentRoute = navigationRef.current.getCurrentRoute()?.name;
      let targetRoute = null;

      if (!isAuthenticated) {
        targetRoute = authEntryRoute;
      } else {
        targetRoute = resolveAuthenticatedRoute(user, introGate);
      }

      const clientIncomplete = user?.role === 'client' && clientNeedsProfileSetup(user);

      const isAllowedToStay =
        (!isAuthenticated &&
          (currentRoute === 'AuthWelcome' || currentRoute === 'Login' || currentRoute === 'OTP')) ||
        (isAuthenticated &&
          user?.role === 'client' &&
          ((!clientIncomplete &&
            (currentRoute === 'ClientDashboard' || currentRoute === 'ClientIntro')) ||
            (clientIncomplete && currentRoute === 'ProfileSetup'))) ||
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
  }, [isAuthenticated, user, loading, navReady, authEntryRoute, introGate.ready, introGate.showIntro]);

  // Push tap: route by notification type (tabs / modals); unmapped types open root dashboard only
  useEffect(() => {
    const handleNotificationData = (rawData) => {
      if (!navigationRef.current?.isReady() || !user) return;
      const normalized = normalizeExpoPushData(rawData || {});
      const action = resolvePushActionFromNotificationData(normalized, user?.role);
      if (user?.role === 'client') {
        if (clientNeedsProfileSetup(user)) {
          navigationRef.current.reset({
            index: 0,
            routes: [{ name: 'ProfileSetup' }],
          });
          return;
        }
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
  }, [user]);

  if (loading || (!isAuthenticated && !authBootstrapped)) {
    return <LoadingSpinner />;
  }

  if (isAuthenticated && !introGate.ready) {
    return <LoadingSpinner />;
  }

  const initialRouteName = isAuthenticated
    ? resolveAuthenticatedRoute(user, introGate)
    : authEntryRoute;

  return (
    <NavigationContainer
      theme={navigationTheme}
      ref={navigationRef}
      onReady={() => setNavReady(true)}
    >
      <Stack.Navigator 
        screenOptions={{ headerShown: false }}
        initialRouteName={initialRouteName}
      >
        {/* Auth Screens - Always available */}
        <Stack.Screen name="AuthWelcome" component={AuthWelcomeScreen} />
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

