/**
 * Button Component - People App
 * Supports multiple variants and sizes
 */

import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../../theme';

const Button = ({
  children,
  variant = 'default',
  size = 'default',
  loading = false,
  disabled = false,
  onPress,
  style,
  textStyle,
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'destructive':
        return {
          backgroundColor: colors.error.main,
          borderColor: colors.error.main,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: colors.inputBorder,
        };
      case 'secondary':
        return {
          backgroundColor: colors.text.muted,
          borderColor: colors.text.muted,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderWidth: 0,
        };
      case 'link':
        return {
          backgroundColor: 'transparent',
          borderWidth: 0,
        };
      default:
        return {
          backgroundColor: colors.primary.main,
          borderColor: colors.primary.main,
        };
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'outline':
        return colors.text.primary;
      case 'ghost':
        return colors.text.primary;
      case 'link':
        return colors.primary.main;
      default:
        return '#FFFFFF';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          height: 36,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
        };
      case 'lg':
        return {
          height: 44,
          paddingHorizontal: spacing.xxl,
          paddingVertical: spacing.md,
        };
      case 'icon':
        return {
          height: 40,
          width: 40,
          padding: 0,
        };
      default:
        return {
          height: 40,
          paddingHorizontal: spacing.buttonPadding.horizontal,
          paddingVertical: spacing.buttonPadding.vertical,
        };
    }
  };

  const buttonStyles = [
    styles.button,
    getVariantStyles(),
    getSizeStyles(),
    disabled && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    { color: getTextColor() },
    size === 'sm' && styles.textSm,
    size === 'lg' && styles.textLg,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <Text style={textStyles}>{children}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: spacing.borderRadius.button,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  disabled: {
    backgroundColor: colors.text.muted,
    borderColor: colors.text.muted,
    opacity: 0.5,
  },
  text: {
    fontSize: typography.button.fontSize,
    fontWeight: typography.button.fontWeight,
    lineHeight: typography.button.lineHeight,
  },
  textSm: {
    fontSize: 12,
  },
  textLg: {
    fontSize: 16,
  },
});

export default Button;

