/**
 * Badge Component - People App
 * For status indicators
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';

const Badge = ({ children, variant = 'default', style, textStyle }) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return {
          backgroundColor: colors.success.light,
          borderColor: colors.success.main,
        };
      case 'error':
        return {
          backgroundColor: colors.error.light,
          borderColor: colors.error.main,
        };
      case 'warning':
        return {
          backgroundColor: colors.warning.light,
          borderColor: colors.warning.main,
        };
      case 'pending':
        return {
          backgroundColor: colors.pending.light,
          borderColor: colors.pending.main,
        };
      default:
        return {
          backgroundColor: colors.primary.light,
          borderColor: colors.primary.main,
        };
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'success':
        return colors.success.dark;
      case 'error':
        return colors.error.dark;
      case 'warning':
        return colors.warning.main;
      case 'pending':
        return colors.pending.main;
      default:
        return colors.primary.main;
    }
  };

  return (
    <View style={[styles.badge, getVariantStyles(), style]}>
      <Text style={[styles.text, { color: getTextColor() }, textStyle]}>
        {children}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.borderRadius.button,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: typography.small.fontSize,
    fontWeight: '600',
  },
});

export default Badge;

