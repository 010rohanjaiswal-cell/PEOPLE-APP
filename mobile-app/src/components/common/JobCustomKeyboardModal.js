import React, { useMemo, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { spacing, typography } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

function createStyles(colors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.cardBackground,
      borderTopLeftRadius: spacing.lg,
      borderTopRightRadius: spacing.lg,
      paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.lg,
      paddingTop: spacing.md,
      paddingHorizontal: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    title: {
      ...typography.h3,
      color: colors.text.primary,
      flex: 1,
      textAlign: 'center',
    },
    headerBtn: {
      padding: spacing.xs,
      borderRadius: spacing.sm,
      backgroundColor: colors.inputBackground ?? colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      minWidth: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    langRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    langBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.inputBackground ?? colors.background,
    },
    langBtnActive: {
      borderColor: colors.primary.main,
      backgroundColor: colors.primary.light,
    },
    langText: {
      ...typography.body,
      color: colors.text.secondary,
      fontWeight: '700',
    },
    langTextActive: {
      color: colors.primary.main,
    },
    keyboard: {
      gap: spacing.sm,
    },
    row: {
      flexDirection: 'row',
      gap: spacing.sm,
      justifyContent: 'center',
      flexWrap: 'nowrap',
    },
    key: {
      minWidth: 34,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      borderRadius: spacing.sm,
      backgroundColor: colors.inputBackground ?? colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    keyWide: {
      minWidth: 120,
      flexGrow: 1,
    },
    keyDanger: {
      backgroundColor: colors.error.light,
      borderColor: colors.error.main,
    },
    keyPrimary: {
      backgroundColor: colors.primary.main,
      borderColor: colors.primary.main,
    },
    keyText: {
      ...typography.body,
      color: colors.text.primary,
      fontWeight: '800',
    },
    keyTextPrimary: {
      color: '#FFFFFF',
    },
  });
}

function clampRepeatedChars(nextText) {
  // If adding created 3+ repeated chars, refuse by returning null
  return /(.)\1{2,}/.test(String(nextText || '').toLowerCase()) ? null : nextText;
}

export default function JobCustomKeyboardModal({
  visible,
  title = 'Keyboard',
  value,
  onChange,
  onClose,
  maxLen = 120,
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [lang, setLang] = useState('en'); // 'en' | 'hi'

  const enRows = useMemo(
    () => [
      ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
      ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
      ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
    ],
    []
  );

  // A compact Hindi (Devanagari) set. Not a full IME; supports basic typing.
  const hiRows = useMemo(
    () => [
      ['अ', 'आ', 'इ', 'ई', 'उ', 'ऊ', 'ए', 'ऐ', 'ओ', 'औ'],
      ['क', 'ख', 'ग', 'घ', 'च', 'छ', 'ज', 'झ', 'ट', 'ठ'],
      ['ड', 'ढ', 'त', 'थ', 'द', 'ध', 'न', 'प', 'फ', 'ब'],
      ['भ', 'म', 'य', 'र', 'ल', 'व', 'श', 'ष', 'स', 'ह'],
    ],
    []
  );

  const rows = lang === 'hi' ? hiRows : enRows;

  const pressChar = (ch) => {
    const current = String(value || '');
    const next = (current + ch).slice(0, maxLen);
    const clamped = clampRepeatedChars(next);
    if (clamped == null) return;
    onChange(clamped);
  };

  const backspace = () => {
    const current = String(value || '');
    if (!current) return;
    onChange(current.slice(0, -1));
  };

  const space = () => pressChar(' ');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.headerBtn} onPress={backspace} accessibilityLabel="Backspace">
              <MaterialIcons name="backspace" size={20} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity style={[styles.headerBtn, styles.keyPrimary]} onPress={onClose} accessibilityLabel="Done">
              <MaterialIcons name="check" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.langRow}>
            <TouchableOpacity
              style={[styles.langBtn, lang === 'en' && styles.langBtnActive]}
              onPress={() => setLang('en')}
            >
              <Text style={[styles.langText, lang === 'en' && styles.langTextActive]}>EN</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langBtn, lang === 'hi' && styles.langBtnActive]}
              onPress={() => setLang('hi')}
            >
              <Text style={[styles.langText, lang === 'hi' && styles.langTextActive]}>हिं</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.keyboard}>
            {rows.map((row, idx) => (
              <View key={idx} style={styles.row}>
                {row.map((k) => (
                  <TouchableOpacity key={k} style={styles.key} onPress={() => pressChar(k)}>
                    <Text style={styles.keyText}>{k}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}

            <View style={styles.row}>
              <TouchableOpacity style={[styles.key, styles.keyWide]} onPress={space}>
                <Text style={styles.keyText}>space</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.key, styles.keyDanger]} onPress={() => onChange('')}>
                <Text style={styles.keyText}>clear</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

