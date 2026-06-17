/**
 * Modal picker for Delivery / Mechanic sub-categories.
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { spacing, typography } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  getSubcategoriesForParent,
  iconForSubcategory,
  labelForJobCategory,
} from '../../constants/categorySubcategories';

function createStyles(colors) {
  return StyleSheet.create({
    wrap: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    sheet: {
      backgroundColor: colors.cardBackground,
      borderTopLeftRadius: spacing.lg,
      borderTopRightRadius: spacing.lg,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      maxHeight: '58%',
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
      fontWeight: '800',
      flex: 1,
      textAlign: 'center',
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    tileWrap: {
      width: '47%',
      marginBottom: spacing.md,
    },
    tile: {
      aspectRatio: 1,
      borderRadius: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xs,
    },
    tileActive: {
      borderColor: colors.primary.main,
      backgroundColor: colors.primary.light,
    },
    tileIcon: {
      width: 56,
      height: 56,
    },
    tileLabel: {
      marginTop: spacing.sm,
      ...typography.small,
      color: colors.text.primary,
      fontWeight: '700',
      textAlign: 'center',
    },
  });
}

const MainCategorySubcategoryModal = ({
  visible,
  parentCategory,
  selectedValues = [],
  multiSelect = false,
  onSelect,
  onClose,
}) => {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const sheetBottomPad = spacing.xl + Math.max(insets.bottom, spacing.md);

  const options = getSubcategoriesForParent(parentCategory);
  const title =
    parentCategory === 'Delivery'
      ? t('postJob.selectDeliveryType')
      : parentCategory === 'Mechanic'
        ? t('postJob.selectMechanicType')
        : '';

  const isActive = (sub) => selectedValues.includes(sub);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.wrap}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.cancel')} />
        <View style={[styles.sheet, { paddingBottom: sheetBottomPad, marginBottom: spacing.sm }]}>
          <View style={styles.header}>
            <View style={{ width: 28 }} />
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <MaterialIcons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.grid}>
            {options.map((sub) => {
              const iconSrc = iconForSubcategory(sub);
              const active = isActive(sub);
              return (
                <View key={sub} style={styles.tileWrap}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={[styles.tile, active && styles.tileActive]}
                    onPress={() => onSelect(sub)}
                  >
                    {iconSrc ? (
                      <Image source={iconSrc} style={styles.tileIcon} resizeMode="contain" />
                    ) : (
                      <MaterialIcons name="category" size={48} color={colors.primary.main} />
                    )}
                    <Text style={styles.tileLabel} numberOfLines={2}>
                      {labelForJobCategory(t, sub)}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          {multiSelect ? (
            <Text style={{ ...typography.small, color: colors.text.secondary, textAlign: 'center', marginTop: spacing.xs }}>
              {t('jobs.categoryMultiSelectHint') || 'Tap to toggle. Long press for multi-select.'}
            </Text>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

export default MainCategorySubcategoryModal;
