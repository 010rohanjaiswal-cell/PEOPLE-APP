/**
 * GpsBanner - Shows "Please turn on GPS" at top when permission is denied.
 * Does not block navigation; user can use the app.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import { useLocation } from '../../context/LocationContext';

export default function GpsBanner() {
  const { gpsDenied, gpsUnknown, requestPermission, checkPermission } = useLocation();

  // Ask once when banner would be shown (permission not granted)
  useEffect(() => {
    if (gpsUnknown) return;
    if (!gpsDenied) return;
    // Already denied or not granted - no auto request; user can tap Open Settings
  }, [gpsDenied, gpsUnknown]);

  const showBanner = gpsDenied === true; // gpsUnknown = still checking, don't show banner yet

  if (!showBanner) return null;

  return (
    <View style={styles.banner}>
      <MaterialIcons name="location-off" size={18} color={colors.background} />
      <Text style={styles.text}>Please turn on GPS</Text>
      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => Linking.openSettings()}
      >
        <Text style={styles.settingsText}>Open Settings</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.warning?.main || '#E65100',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  text: {
    ...typography.small,
    color: colors.background,
    fontWeight: '600',
  },
  settingsButton: {
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
  },
  settingsText: {
    ...typography.small,
    color: colors.background,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
