import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { spacing, typography } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

const SUPPORT_PHONE = '+917021098460';

function createStyles(colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: spacing.lg,
      gap: spacing.lg,
    },
    title: {
      ...typography.h2,
      color: colors.text.primary,
    },
    subtitle: {
      ...typography.body,
      color: colors.text.secondary,
      marginTop: spacing.xs,
    },
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      gap: spacing.md,
    },
    actionRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    action: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      borderRadius: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    actionPrimary: {
      backgroundColor: colors.primary.main,
      borderColor: colors.primary.main,
    },
    actionText: {
      ...typography.button,
      color: colors.text.primary,
    },
    actionTextPrimary: {
      color: '#FFFFFF',
    },
    phoneHint: {
      ...typography.small,
      color: colors.text.muted,
      textAlign: 'center',
      marginTop: spacing.xs,
    },
  });
}

export default function Support({ onNavigate }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleCall = () => {
    Linking.openURL(`tel:${SUPPORT_PHONE}`);
  };

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.title}>{t('support.title')}</Text>
        <Text style={styles.subtitle}>{t('support.subtitle')}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.action} onPress={handleCall} activeOpacity={0.85}>
            <MaterialIcons name="phone" size={20} color={colors.text.primary} />
            <Text style={styles.actionText}>{t('support.callToUs')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.action, styles.actionPrimary]}
            onPress={() => onNavigate?.('SupportChat')}
            activeOpacity={0.85}
          >
            <MaterialIcons name="chat" size={20} color="#FFFFFF" />
            <Text style={[styles.actionText, styles.actionTextPrimary]}>{t('support.chatWithUs')}</Text>
          </TouchableOpacity>
        </View>

        {/* Phone hint intentionally hidden to keep buttons compact */}
      </View>
    </View>
  );
}

