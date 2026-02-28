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

  // Call this to show the system "Allow location?" dialog. Safe to call multiple times.
  const requestPermission = useCallback(async () => {
    try {
      let { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
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

  // On mount only CHECK permission; do NOT request here. Request is triggered only when
  // user lands on Client/Freelancer dashboard (so the "Allow location?" dialog appears
  // at the right moment and not in a loop or on splash/auth screen).
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (!mounted) return;
        setGpsEnabled(status === 'granted');
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

  /** Get current coordinates (for filtering jobs by state). Returns null if permission denied or error. */
  const getCurrentCoords = useCallback(async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') return null;
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        maximumAge: 60000,
        timeInterval: 10000,
      });
      if (loc?.coords) return { lat: loc.coords.latitude, lng: loc.coords.longitude };
      return null;
    } catch (err) {
      console.error('LocationContext getCurrentCoords:', err);
      return null;
    }
  }, []);

  const value = {
    gpsEnabled: gpsEnabled === true,
    gpsDenied: gpsEnabled === false,
    gpsUnknown: gpsEnabled === null,
    checkPermission,
    requestPermission,
    getCurrentCoords,
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
