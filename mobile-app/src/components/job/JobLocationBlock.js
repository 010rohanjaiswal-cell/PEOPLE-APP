/**
 * Shared job location UI: Delivery (from/to) vs single address.
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { spacing, typography } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { isDeliveryJob } from '../../utils/jobDisplay';

function createJobLocationBlockStyles(colors) {
  return StyleSheet.create({
    jobAddressRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: spacing.sm,
      gap: spacing.xs,
    },
    jobAddress: {
      ...typography.small,
      color: colors.text.primary,
      flex: 1,
    },
    deliveryBlock: {
      marginBottom: spacing.sm,
    },
    deliveryRouteLabel: {
      ...typography.small,
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: spacing.xs,
    },
    deliveryTextCol: {
      flex: 1,
    },
    deliverySubLabel: {
      ...typography.small,
      color: colors.text.secondary,
      marginTop: spacing.xs,
      marginBottom: 2,
    },
    jobMetaLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flexWrap: 'wrap',
    },
    jobMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    jobMetaText: {
      ...typography.small,
      color: colors.text.secondary,
    },
    deliveryBlockCompact: {
      marginBottom: spacing.xs,
    },
    jobAddressRowCompact: {
      marginBottom: spacing.xs,
    },
    jobAddressRowTight: {
      marginBottom: 0,
    },
    jobAddressCompact: {
      ...typography.small,
      fontSize: 12,
      lineHeight: 18,
      color: colors.text.primary,
      flex: 1,
    },
    deliverySubLabelCompact: {
      ...typography.small,
      fontSize: 11,
      color: colors.text.secondary,
      marginTop: 4,
      marginBottom: 0,
    },
    locationIconButton: {
      borderWidth: 1.5,
      borderColor: colors.primary.main,
      borderRadius: spacing.sm,
      padding: 5,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}

/**
 * @param {object} props
 * @param {object} props.job
 * @param {object} [props.translated] — optional Hindi translations
 * @param {function} props.t — i18n
 * @param {boolean} [props.compact] — tighter list-card layout (e.g. Available Jobs)
 * @param {function} [props.onLocationIconPress] — when set, location icon is tappable (e.g. open Maps)
 * @param {boolean} [props.hideLeadingIcon] — address text only (no pin before address)
 */
export function JobLocationBlock({ job, translated, t, compact = false, onLocationIconPress, hideLeadingIcon = false }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createJobLocationBlockStyles(colors), [colors]);
  const tr = translated || {};
  const address = tr.address ?? job.address ?? '';
  const delivery = isDeliveryJob(job);
  const dFromA = tr.deliveryFromAddress ?? job.deliveryFromAddress;
  const dFromP = tr.deliveryFromPincode ?? job.deliveryFromPincode;
  const dToA = tr.deliveryToAddress ?? job.deliveryToAddress;
  const dToP = tr.deliveryToPincode ?? job.deliveryToPincode;

  if (delivery && (dFromA || dToA)) {
    if (compact) {
      return (
        <View style={[styles.deliveryBlock, styles.deliveryBlockCompact]}>
          <View style={styles.deliveryTextCol}>
            <Text style={styles.deliverySubLabelCompact}>
              {t('jobs.fromShort')} · {dFromA || '—'} · {dFromP || '—'}
            </Text>
            <Text style={[styles.deliverySubLabelCompact, { marginTop: 6 }]}>
              {t('jobs.toShort')} · {dToA || '—'} · {dToP || '—'}
            </Text>
          </View>
        </View>
      );
    }
    return (
      <View style={styles.deliveryBlock}>
        <Text style={styles.deliveryRouteLabel}>{t('jobs.deliveryRoute')}</Text>
        <View style={styles.jobAddressRow}>
          <MaterialIcons name="trending-flat" size={16} color={colors.text.secondary} />
          <View style={styles.deliveryTextCol}>
            <Text style={[styles.deliverySubLabel, { marginTop: 0 }]}>{t('jobs.fromShort')}</Text>
            <Text style={styles.jobAddress}>
              {dFromA || '—'} · {dFromP || '—'}
            </Text>
            <Text style={styles.deliverySubLabel}>{t('jobs.toShort')}</Text>
            <Text style={styles.jobAddress}>
              {dToA || '—'} · {dToP || '—'}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (hideLeadingIcon) {
    return (
      <View style={[styles.jobAddressRow, compact && styles.jobAddressRowCompact]}>
        <Text style={compact ? styles.jobAddressCompact : styles.jobAddress} numberOfLines={compact ? 3 : undefined}>
          {address}
        </Text>
      </View>
    );
  }

  const iconSize = compact ? 15 : 16;
  const iconColor = onLocationIconPress ? colors.primary.main : colors.text.secondary;
  const iconEl = (
    <MaterialIcons name="location-on" size={iconSize} color={iconColor} />
  );

  return (
    <View style={[styles.jobAddressRow, compact && styles.jobAddressRowCompact]}>
      {onLocationIconPress ? (
        <Pressable
          onPress={onLocationIconPress}
          hitSlop={8}
          style={({ pressed }) => [styles.locationIconButton, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
          accessibilityLabel={t('jobs.openDirectionsA11y')}
        >
          {iconEl}
        </Pressable>
      ) : (
        iconEl
      )}
      <Text style={compact ? styles.jobAddressCompact : styles.jobAddress} numberOfLines={compact ? 3 : undefined}>
        {address}
      </Text>
    </View>
  );
}

/**
 * Meta row: gender + pincode OR delivery pin route.
 */
export function JobMetaGenderOrDeliveryPins({ job, translated, t, style }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createJobLocationBlockStyles(colors), [colors]);
  const tr = translated || {};
  const pincode = tr.pincode ?? job.pincode ?? '';
  const delivery = isDeliveryJob(job);
  const dFromP = tr.deliveryFromPincode ?? job.deliveryFromPincode;
  const dToP = tr.deliveryToPincode ?? job.deliveryToPincode;

  if (delivery) {
    return (
      <View style={[styles.jobMetaLeft, style]}>
        <View style={styles.jobMeta}>
          <Text style={styles.jobMetaText}>
            {dFromP || '—'} → {dToP || '—'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.jobMetaLeft, style]}>
      <View style={styles.jobMeta}>
        <MaterialIcons name="person" size={16} color={colors.text.secondary} />
        <Text style={styles.jobMetaText}>{t('gender.' + (job.gender || 'any'))}</Text>
      </View>
      <View style={styles.jobMeta}>
        <MaterialIcons name="location-on" size={16} color={colors.text.secondary} />
        <Text style={styles.jobMetaText}>{pincode}</Text>
      </View>
    </View>
  );
}
