/**
 * LocationContext - People App
 * Tracks location permission AND device location services (GPS) on/off.
 * gpsEnabled = permission granted AND Location.hasServicesEnabledAsync().
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';

const LocationContext = createContext(null);

async function computeLocationReady() {
  const { status } = await Location.getForegroundPermissionsAsync();
  if (status !== 'granted') return false;
  return Location.hasServicesEnabledAsync();
}

export function LocationProvider({ children }) {
  const [gpsEnabled, setGpsEnabled] = useState(null); // null = not checked yet

  const checkPermission = useCallback(async () => {
    try {
      const ok = await computeLocationReady();
      setGpsEnabled(ok);
      return ok;
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
      if (status !== 'granted') {
        setGpsEnabled(false);
        return false;
      }
      const servicesOn = await Location.hasServicesEnabledAsync();
      setGpsEnabled(servicesOn);
      return servicesOn;
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
        const ok = await computeLocationReady();
        if (!mounted) return;
        setGpsEnabled(ok);
      } catch (err) {
        if (mounted) setGpsEnabled(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Re-check on any app state change (Settings, quick settings, control center) and
  // poll while foregrounded so GPS / permission toggles update the banner without reload.
  useEffect(() => {
    let intervalId = null;
    const POLL_MS = 1500;

    const startPolling = () => {
      if (intervalId) return;
      intervalId = setInterval(() => {
        checkPermission();
      }, POLL_MS);
    };
    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const sub = AppState.addEventListener('change', (nextState) => {
      checkPermission();
      if (nextState === 'active') {
        startPolling();
      } else {
        stopPolling();
      }
    });

    if (AppState.currentState === 'active') {
      startPolling();
    }

    return () => {
      sub?.remove();
      stopPolling();
    };
  }, [checkPermission]);

  /** Get current coordinates (for filtering jobs by state). Returns null if permission denied or error. */
  const getCurrentCoords = useCallback(async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') return null;
      const servicesOn = await Location.hasServicesEnabledAsync();
      if (!servicesOn) return null;
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
