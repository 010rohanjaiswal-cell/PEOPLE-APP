/**
 * GpsBanner - Shows "Please turn on GPS" at top when permission is denied.
 * Does not block navigation; user can use the app.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import { useLocation } from '../../context/LocationContext';
import { useLanguage } from '../../context/LanguageContext';

export default function GpsBanner() {
  const { t } = useLanguage();
  const { gpsDenied, gpsUnknown } = useLocation();

  const showBanner = gpsDenied === true;

  if (!showBanner) return null;

  return (
    <View style={styles.wrapper}>
      <View style={styles.banner}>
        <MaterialIcons name="location-off" size={18} color={colors.background} />
        <Text style={styles.text} numberOfLines={3}>
          {t('permissions.locationBanner')}
        </Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => Linking.openSettings()}
        >
          <Text style={styles.settingsText}>{t('permissions.openSettings')}</Text>
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
