/**
 * LocationContext - People App
 * Tracks GPS/location permission. Does not block app if denied.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';

const LocationContext = createContext(null);

export function LocationProvider({ children }) {
  const [gpsEnabled, setGpsEnabled] = useState(null); // null = not checked yet

  const checkPermission = useCallback(async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setGpsEnabled(status === 'granted');
      return status === 'granted';
    } catch (err) {
      console.error('LocationContext checkPermission:', err);
      setGpsEnabled(false);
      return false;
    }
  }, []);

  // Ask for permission once when first needed (only if undetermined)
  const requestPermission = useCallback(async () => {
    try {
      let { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'undetermined') {
        status = (await Location.requestForegroundPermissionsAsync()).status;
      }
      setGpsEnabled(status === 'granted');
      return status === 'granted';
    } catch (err) {
      console.error('LocationContext requestPermission:', err);
      setGpsEnabled(false);
      return false;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (!mounted) return;
        if (status === 'granted') {
          setGpsEnabled(true);
          return;
        }
        if (status === 'undetermined') {
          const newStatus = (await Location.requestForegroundPermissionsAsync()).status;
          if (!mounted) return;
          setGpsEnabled(newStatus === 'granted');
          return;
        }
        setGpsEnabled(false);
      } catch (err) {
        if (mounted) setGpsEnabled(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Re-check when app comes to foreground (e.g. user enabled in Settings)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        checkPermission();
      }
    });
    return () => sub?.remove();
  }, [checkPermission]);

  const value = {
    gpsEnabled: gpsEnabled === true,
    gpsDenied: gpsEnabled === false,
    gpsUnknown: gpsEnabled === null,
    checkPermission,
    requestPermission,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) {
    throw new Error('useLocation must be used within LocationProvider');
  }
  return ctx;
}

export default LocationContext;
