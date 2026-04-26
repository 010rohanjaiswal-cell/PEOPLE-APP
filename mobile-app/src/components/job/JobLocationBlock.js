import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { spacing, typography } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { isDeliveryJob } from '../../utils/jobDisplay';

function safeT(t) {
  return typeof t === 'function' ? t : (key) => key;
}

function normalizePincode(v) {
  if (v == null) return '';
  const s = String(v).trim();
  return s;
}

function getJobField(job, translated, key) {
  const tv = translated && translated[key] != null ? translated[key] : null;
  if (tv != null && String(tv).trim() !== '') return String(tv);
  const jv = job && job[key] != null ? job[key] : '';
  return String(jv || '');
}

function createStyles(colors, compact) {
  const rowGap = compact ? spacing.xs : spacing.sm;
  const iconSize = compact ? 16 : 18;
  return StyleSheet.create({
    container: {
      marginTop: compact ? spacing.xs : spacing.sm,
      marginBottom: compact ? spacing.xs : spacing.sm,
      gap: rowGap,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.xs,
    },
    icon: {
      marginTop: 1,
      width: iconSize,
    },
    textWrap: {
      flex: 1,
      minWidth: 0,
    },
    primaryText: {
      ...typography.small,
      color: colors.text.primary,
      lineHeight: compact ? 18 : 20,
    },
    secondaryText: {
      ...typography.small,
      color: colors.text.secondary,
      marginTop: 2,
      lineHeight: compact ? 18 : 20,
    },
    deliveryLegLabel: {
      ...typography.small,
      color: colors.text.secondary,
      fontWeight: '600',
      marginBottom: 2,
    },
  });
}

export const JobLocationBlock = memo(
  ({ job, translated, t, compact = false, hideLeadingIcon = false }) => {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors, compact), [colors, compact]);
    const tt = safeT(t);

    const delivery = isDeliveryJob(job);

    if (delivery) {
      const fromAddress = getJobField(job, translated, 'deliveryFromAddress');
      const fromPin = normalizePincode(getJobField(job, translated, 'deliveryFromPincode'));
      const toAddress = getJobField(job, translated, 'deliveryToAddress');
      const toPin = normalizePincode(getJobField(job, translated, 'deliveryToPincode'));

      const fromLine = [fromAddress, fromPin].filter(Boolean).join(fromAddress && fromPin ? ' • ' : '');
      const toLine = [toAddress, toPin].filter(Boolean).join(toAddress && toPin ? ' • ' : '');

      if (!fromLine && !toLine) return null;

      return (
        <View style={styles.container}>
          <View style={styles.row}>
            {!hideLeadingIcon ? (
              <MaterialIcons
                name="local-shipping"
                size={compact ? 16 : 18}
                color={colors.text.secondary}
                style={styles.icon}
              />
            ) : null}
            <View style={styles.textWrap}>
              {fromLine ? (
                <>
                  <Text style={styles.deliveryLegLabel}>{tt('jobs.deliveryFromHeading')}</Text>
                  <Text style={styles.primaryText}>{fromLine}</Text>
                </>
              ) : null}
              {toLine ? (
                <>
                  <Text style={[styles.deliveryLegLabel, { marginTop: fromLine ? rowGap : 0 }]}>
                    {tt('jobs.deliveryToHeading')}
                  </Text>
                  <Text style={styles.primaryText}>{toLine}</Text>
                </>
              ) : null}
            </View>
          </View>
        </View>
      );
    }

    const address = getJobField(job, translated, 'address');
    const pincode = normalizePincode(getJobField(job, translated, 'pincode'));
    const locationLine = [address, pincode].filter(Boolean).join(address && pincode ? ' • ' : '');
    if (!locationLine) return null;

    return (
      <View style={styles.container}>
        <View style={styles.row}>
          {!hideLeadingIcon ? (
            <MaterialIcons
              name="location-on"
              size={compact ? 16 : 18}
              color={colors.text.secondary}
              style={styles.icon}
            />
          ) : null}
          <View style={styles.textWrap}>
            <Text style={styles.primaryText}>{locationLine}</Text>
          </View>
        </View>
      </View>
    );
  }
);

export const JobMetaGenderOrDeliveryPins = memo(({ job, translated, t, style }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors, true), [colors]);
  const tt = safeT(t);
  const delivery = isDeliveryJob(job);

  if (delivery) {
    const fromPin = normalizePincode(getJobField(job, translated, 'deliveryFromPincode'));
    const toPin = normalizePincode(getJobField(job, translated, 'deliveryToPincode'));
    const route = `${fromPin || '—'} → ${toPin || '—'}`;
    return (
      <View style={[styles.row, style]}>
        <MaterialIcons name="local-shipping" size={16} color={colors.text.secondary} />
        <Text style={styles.secondaryText}>{route}</Text>
      </View>
    );
  }

  const gender = String(job?.gender || 'any').toLowerCase();
  return (
    <View style={[styles.row, style]}>
      <MaterialIcons name="person" size={16} color={colors.text.secondary} />
      <Text style={styles.secondaryText}>{tt('gender.' + gender)}</Text>
    </View>
  );
});

