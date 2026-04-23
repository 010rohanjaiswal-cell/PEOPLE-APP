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

const MOOD = [
  { value: 1, face: 'sentiment-very-dissatisfied', star: '#F97316' }, // orange-red
  { value: 2, face: 'sentiment-dissatisfied', star: '#F59E0B' }, // amber
  { value: 3, face: 'sentiment-neutral', star: '#EAB308' }, // yellow
  { value: 4, face: 'sentiment-satisfied', star: '#FACC15' }, // warm yellow
  { value: 5, face: 'favorite', star: '#FDE047' }, // yellow + heart vibe
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
            {MOOD.map((m) => {
              const active = rating === m.value;
              const dim = rating != null && rating !== undefined && rating !== m.value;
              return (
                <TouchableOpacity
                  key={m.value}
                  onPress={() => {
                    onSetRating(m.value);
                    if (m.value !== 1 && typeof onSetReason === 'function') onSetReason(null);
                  }}
                  activeOpacity={0.8}
                  disabled={submitting}
                  style={[styles.starTouch, dim && { opacity: 0.35 }]}
                >
                  <View style={styles.starWrap}>
                    <MaterialIcons name="star" size={54} color={m.star} />
                    <View style={styles.faceCenter}>
                      <MaterialIcons
                        name={m.face}
                        size={22}
                        color={m.value === 5 ? '#EF4444' : '#111827'}
                      />
                    </View>
                    {active ? <View style={styles.starRing} /> : null}
                  </View>
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

          <TouchableOpacity
            style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
            onPress={onSubmit}
            disabled={!canSubmit}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitText}>
                {needsReason ? (t('common.ok') || 'OK') : t('rating.submit')}
              </Text>
            )}
          </TouchableOpacity>
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
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: spacing.xl,
  },
  starTouch: {
    padding: 2,
  },
  starWrap: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  starRing: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'rgba(17, 24, 39, 0.12)',
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

