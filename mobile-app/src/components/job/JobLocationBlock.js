/**
 * Shared job location UI: Delivery (from/to) vs single address.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import { isDeliveryJob } from '../../utils/jobDisplay';

const styles = StyleSheet.create({
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
});

/**
 * @param {object} props
 * @param {object} props.job
 * @param {object} [props.translated] — optional Hindi translations
 * @param {function} props.t — i18n
 */
export function JobLocationBlock({ job, translated, t }) {
  const tr = translated || {};
  const address = tr.address ?? job.address ?? '';
  const delivery = isDeliveryJob(job);
  const dFromA = tr.deliveryFromAddress ?? job.deliveryFromAddress;
  const dFromP = tr.deliveryFromPincode ?? job.deliveryFromPincode;
  const dToA = tr.deliveryToAddress ?? job.deliveryToAddress;
  const dToP = tr.deliveryToPincode ?? job.deliveryToPincode;

  if (delivery && (dFromA || dToA)) {
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

  return (
    <View style={styles.jobAddressRow}>
      <MaterialIcons name="location-on" size={16} color={colors.text.secondary} />
      <Text style={styles.jobAddress}>{address}</Text>
    </View>
  );
}

/**
 * Meta row: gender + pincode OR delivery pin route.
 */
export function JobMetaGenderOrDeliveryPins({ job, translated, t }) {
  const tr = translated || {};
  const pincode = tr.pincode ?? job.pincode ?? '';
  const delivery = isDeliveryJob(job);
  const dFromP = tr.deliveryFromPincode ?? job.deliveryFromPincode;
  const dToP = tr.deliveryToPincode ?? job.deliveryToPincode;

  if (delivery) {
    return (
      <View style={styles.jobMetaLeft}>
        <View style={styles.jobMeta}>
          <MaterialIcons name="local-shipping" size={16} color={colors.text.secondary} />
          <Text style={styles.jobMetaText}>
            {dFromP || '—'} → {dToP || '—'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.jobMetaLeft}>
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
