/**
 * GpsBanner - Shows "Please turn on GPS" at top when permission is denied.
 * Does not block navigation; user can use the app.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as IntentLauncher from 'expo-intent-launcher';
import { colors, spacing, typography } from '../../theme';
import { useLocation } from '../../context/LocationContext';
import { useLanguage } from '../../context/LanguageContext';

export default function GpsBanner() {
  const { t } = useLanguage();
  const { gpsDenied, requestPermission } = useLocation();

  const showBanner = gpsDenied === true;

  if (!showBanner) return null;

  const handleEnable = async () => {
    const ok = await requestPermission();
    if (ok) return;

    // If permission was granted but services are still off, Android won't "enable GPS" for us.
    Alert.alert(
      t('common.error'),
      t('postJob.gpsToPostJob'),
      [
        {
          text: t('permissions.openSettings'),
          onPress: () => {
            if (Platform.OS === 'android') {
              IntentLauncher.startActivityAsync(
                IntentLauncher.ActivityAction.LOCATION_SOURCE_SETTINGS
              );
            } else {
              Linking.openSettings();
            }
          },
        },
        { text: t('common.ok'), style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.banner}>
        <MaterialIcons name="location-off" size={18} color={colors.background} />
        <Text style={styles.text} numberOfLines={3}>
          {t('permissions.locationBanner')}
        </Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={handleEnable}
        >
          <Text style={styles.settingsText}>{t('permissions.enable')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    maxWidth: '100%',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning?.main || '#E65100',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    borderRadius: 10,
    overflow: 'hidden',
  },
  text: {
    ...typography.small,
    color: colors.background,
    fontWeight: '600',
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
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
