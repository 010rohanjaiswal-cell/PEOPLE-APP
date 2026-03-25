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

const RatingModal = ({ visible, userName, rating, onSetRating, onSubmit, submitting }) => {
  const { t } = useLanguage();

  const title = useMemo(() => t('rating.title'), [t]);
  const subtitle = useMemo(() => {
    const base = t('rating.subtitle');
    if (!userName) return base;
    return `${base} ${userName}`;
  }, [t, userName]);

  const canSubmit = rating !== null && rating !== undefined && !submitting;

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
            <TouchableOpacity
              style={[styles.zeroPill, rating === 0 && styles.zeroPillActive]}
              onPress={() => onSetRating(0)}
              activeOpacity={0.8}
              disabled={submitting}
            >
              <View style={styles.zeroIconRow}>
                <MaterialIcons
                  name="remove"
                  size={18}
                  color={rating === 0 ? colors.error.main : colors.error.dark}
                />
                <MaterialIcons
                  name="star-border"
                  size={20}
                  color={rating === 0 ? colors.error.main : colors.error.dark}
                />
              </View>
            </TouchableOpacity>

            {Array.from({ length: 5 }).map((_, idx) => {
              const starValue = idx + 1;
              const filled = rating != null && rating >= starValue;
              return (
                <TouchableOpacity
                  key={starValue}
                  onPress={() => onSetRating(starValue)}
                  activeOpacity={0.8}
                  disabled={submitting}
                  style={styles.starTouch}
                >
                  <MaterialIcons
                    name={filled ? 'star' : 'star-border'}
                    size={34}
                    color={filled ? colors.warning.main : colors.text.muted}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
            onPress={onSubmit}
            disabled={!canSubmit}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitText}>{t('rating.submit')}</Text>
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
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  starTouch: {
    padding: 2,
  },
  zeroPill: {
    borderWidth: 1,
    borderColor: colors.error.main,
    backgroundColor: colors.background,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
  },
  zeroPillActive: {
    borderColor: colors.error.main,
    backgroundColor: colors.error.light,
  },
  zeroIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
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
});

export default RatingModal;

