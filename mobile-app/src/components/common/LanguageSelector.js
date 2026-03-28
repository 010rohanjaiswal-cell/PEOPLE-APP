/**
 * Language Selector - Dropdown to switch app language (EN / Hindi)
 * Renders beside the notification bell in client and freelancer headers.
 */

import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { spacing, typography } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

const LANGUAGES = [
  { code: 'en', labelKey: 'en' },
  { code: 'hi', labelKey: 'hi' },
];

function createLanguageSelectorStyles(colors) {
  return StyleSheet.create({
    trigger: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      marginRight: spacing.xs,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      backgroundColor: colors.cardBackground,
    },
    triggerText: {
      ...typography.small,
      color: colors.text.primary,
      marginLeft: 4,
      maxWidth: 56,
    },
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    dropdown: {
      backgroundColor: colors.cardBackground,
      borderRadius: spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      minWidth: 160,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    optionActive: {
      backgroundColor: colors.primary.light,
    },
    optionLast: {
      borderBottomWidth: 0,
    },
    optionText: {
      ...typography.body,
      color: colors.text.primary,
    },
    optionTextActive: {
      color: colors.text.primary,
      fontWeight: '600',
    },
  });
}

const LanguageSelector = ({ style }) => {
  const { locale, setLocale, t } = useLanguage();
  const { colors } = useTheme();
  const styles = useMemo(() => createLanguageSelectorStyles(colors), [colors]);
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const currentLabel = locale === 'hi' ? t('languages.hi') : t('languages.en');

  const handleSelect = (code) => {
    setLocale(code);
    setDropdownVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setDropdownVisible(true)}
        style={[styles.trigger, style]}
        activeOpacity={0.7}
      >
        <MaterialIcons name="language" size={22} color={colors.text.primary} />
        <Text style={styles.triggerText} numberOfLines={1}>
          {currentLabel}
        </Text>
        <MaterialIcons name="arrow-drop-down" size={20} color={colors.text.secondary} />
      </TouchableOpacity>

      <Modal
        visible={dropdownVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setDropdownVisible(false)}>
          <Pressable style={styles.dropdown} onPress={(e) => e.stopPropagation()}>
            {LANGUAGES.map(({ code, labelKey }, index) => (
              <TouchableOpacity
                key={code}
                style={[
                  styles.option,
                  locale === code && styles.optionActive,
                  index === LANGUAGES.length - 1 && styles.optionLast,
                ]}
                onPress={() => handleSelect(code)}
                activeOpacity={0.7}
              >
                <Text style={[styles.optionText, locale === code && styles.optionTextActive]}>
                  {t('languages.' + labelKey)}
                </Text>
                {locale === code && (
                  <MaterialIcons name="check" size={20} color={colors.primary.main} />
                )}
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

export default LanguageSelector;
