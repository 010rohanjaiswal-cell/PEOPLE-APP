/**
 * Rating Modal - People App
 * Mandatory 0–5 rating; no cancel.
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import { useLanguage } from '../../context/LanguageContext';

// Visual style:
// - 1-star: neon red
// - 2–5: neon yellow (filled). We'll dim non-selected stars after selection.
const STARS = [
  { value: 1, color: '#FF1744', label: 'Worse' }, // neon red
  // 2..5: gradient yellow -> green
  { value: 2, color: '#FDE047', label: 'Normal' }, // neon-ish yellow
  { value: 3, color: '#BEF264', label: 'Good' }, // yellow-green
  { value: 4, color: '#4ADE80', label: 'Happy' }, // green
  { value: 5, color: '#22C55E', label: 'Excellent' }, // deeper green
];

const ONE_STAR_REASONS = [
  'Freelancer seems fraud and suspicious',
  'Freelancer is not responding',
  'Freelancer asked extra money than job amount',
  'Freelancer behaviour was not good/ worse',
  'Freelancer took more time than normal to work done',
];

const RatingModal = ({
  visible,
  userName,
  rating,
  onSetRating,
  reason,
  onSetReason,
  onSubmit,
  submitting,
}) => {
  const { t } = useLanguage();

  const title = useMemo(() => t('rating.title'), [t]);
  const subtitle = useMemo(() => {
    const base = t('rating.subtitle');
    if (!userName) return base;
    return `${base} ${userName}`;
  }, [t, userName]);

  const needsReason = rating === 1;
  const hasReason = !needsReason || (reason != null && String(reason).trim().length > 0);
  const canSubmit = rating !== null && rating !== undefined && hasReason && !submitting;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        // Required modal: do nothing on back.
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          <View style={styles.starsRow}>
            {STARS.map((m) => {
              const active = rating === m.value;
              const selected = rating != null && rating !== undefined;
              const dim = selected && rating !== m.value;
              return (
                <TouchableOpacity
                  key={m.value}
                  onPress={() => {
                    onSetRating(m.value);
                    if (m.value !== 1 && typeof onSetReason === 'function') onSetReason(null);
                    // Yellow stars (2..5): submit immediately (no button).
                    if (m.value !== 1 && typeof onSubmit === 'function' && !submitting) {
                      onSubmit(m.value, null);
                    }
                  }}
                  activeOpacity={0.8}
                  disabled={submitting}
                  style={[styles.starCol, dim && { opacity: 0.25 }]}
                >
                  <MaterialIcons
                    name={m.value === 1 ? (active ? 'star' : 'star-border') : 'star'}
                    size={34}
                    color={m.color}
                  />
                  <Text style={styles.starLabel}>{m.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {needsReason ? (
            <View style={styles.reasonBlock}>
              <Text style={styles.reasonTitle}>{t('rating.oneStarTitle') || 'Tell us what went wrong'}</Text>
              {ONE_STAR_REASONS.map((r) => {
                const active = String(reason || '') === r;
                return (
                  <TouchableOpacity
                    key={r}
                    activeOpacity={0.85}
                    disabled={submitting}
                    onPress={() => typeof onSetReason === 'function' && onSetReason(r)}
                    style={[styles.reasonRow, active && styles.reasonRowActive]}
                  >
                    <View style={[styles.radioOuter, active && styles.radioOuterActive]}>
                      {active ? <View style={styles.radioInner} /> : null}
                    </View>
                    <Text style={[styles.reasonText, active && styles.reasonTextActive]}>{r}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          {needsReason ? (
            <TouchableOpacity
              style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
              onPress={() => typeof onSubmit === 'function' && onSubmit(1, reason)}
              disabled={!canSubmit}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitText}>{t('common.ok') || 'OK'}</Text>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modal: {
    width: '92%',
    maxWidth: 420,
    backgroundColor: colors.cardBackground,
    borderRadius: spacing.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    flexWrap: 'nowrap',
    gap: 10,
    marginBottom: spacing.xl,
  },
  starCol: {
    width: 62,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  starLabel: {
    ...typography.small,
    color: colors.text.secondary,
    marginTop: 6,
    fontSize: 11,
    lineHeight: 12,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: colors.primary.main,
    borderRadius: spacing.sm,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  submitButtonDisabled: {
    backgroundColor: colors.text.muted,
  },
  submitText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  reasonBlock: {
    marginTop: -spacing.sm,
    marginBottom: spacing.lg,
  },
  reasonTitle: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '700',
    marginBottom: spacing.sm,
    textAlign: 'left',
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  reasonRowActive: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.light,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.text.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: colors.primary.main,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary.main,
  },
  reasonText: {
    ...typography.body,
    color: colors.text.primary,
    flex: 1,
  },
  reasonTextActive: {
    fontWeight: '600',
  },
});

export default RatingModal;

