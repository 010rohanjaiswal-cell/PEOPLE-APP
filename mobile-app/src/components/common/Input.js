/**
 * Input Component - People App
 */

import React, { useMemo } from 'react';
import { View, TextInput, Text, StyleSheet, Platform, Pressable } from 'react-native';
import { spacing, typography } from '../../theme';
import lightColors from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';

function createInputStyles(colors) {
  return StyleSheet.create({
    container: {
      marginBottom: spacing.md,
    },
    label: {
      fontSize: typography.body.fontSize,
      fontWeight: '500',
      color: colors.text.primary,
      marginBottom: spacing.xs,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: spacing.borderRadius.input,
      backgroundColor: colors.inputBackground ?? colors.background,
    },
    inputContainerElevated: {
      borderWidth: 0,
      backgroundColor: colors.cardBackground,
      ...Platform.select({
        ios: {
          shadowColor: '#0f172a',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.12,
          shadowRadius: 12,
        },
        android: {
          elevation: 8,
        },
        default: {},
      }),
    },
    input: {
      flex: 1,
      fontSize: typography.body.fontSize,
      color: colors.text.primary,
      paddingHorizontal: spacing.inputPadding.horizontal,
      paddingVertical: spacing.inputPadding.vertical,
      minHeight: 40,
    },
    inputWithLeftIcon: {
      paddingLeft: spacing.xs,
    },
    inputWithRightIcon: {
      paddingRight: spacing.xs,
    },
    inputMultiline: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    inputError: {
      borderWidth: 1,
      borderColor: colors.error.main,
    },
    inputDisabled: {
      backgroundColor: colors.border,
      opacity: 0.5,
    },
    leftIcon: {
      paddingLeft: spacing.inputPadding.horizontal,
    },
    rightIcon: {
      paddingRight: spacing.inputPadding.horizontal,
    },
    errorText: {
      fontSize: typography.small.fontSize,
      color: colors.error.main,
      marginTop: spacing.xs,
    },
  });
}

const Input = ({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  disabled = false,
  multiline = false,
  numberOfLines = 1,
  keyboardType = 'default',
  secureTextEntry = false,
  leftIcon,
  rightIcon,
  style,
  inputStyle,
  inputContainerStyle,
  /** Soft 3D look: shadow, no hard border (auth screens). */
  elevated = false,
  /** Use fixed light palette (e.g. login) even when app dark mode is on. */
  forceLight = false,
  /** Override editability (used for custom keyboards). */
  editable,
  ...props
}) => {
  const { colors: themeColors } = useTheme();
  const colors = forceLight ? lightColors : themeColors;
  const styles = useMemo(() => createInputStyles(colors), [colors, forceLight]);

  const effectiveEditable = typeof editable === 'boolean' ? editable : !disabled;
  const pressToEdit = !effectiveEditable && typeof props.onPressIn === 'function';

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputContainer,
          elevated && styles.inputContainerElevated,
          error && styles.inputError,
          disabled && styles.inputDisabled,
          inputContainerStyle,
        ]}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <Pressable
          style={{ flex: 1 }}
          disabled={!pressToEdit}
          onPress={(e) => {
            // When editable is false, TextInput often won’t fire onPressIn reliably.
            // Capture tap here to support custom keyboards.
            props.onPressIn?.(e);
          }}
        >
          <TextInput
            style={[
              styles.input,
              leftIcon && styles.inputWithLeftIcon,
              rightIcon && styles.inputWithRightIcon,
              multiline && styles.inputMultiline,
              inputStyle,
            ]}
            pointerEvents={pressToEdit ? 'none' : 'auto'}
            placeholder={placeholder}
            placeholderTextColor={colors.text.muted}
            value={value}
            onChangeText={onChangeText}
            editable={effectiveEditable}
            multiline={multiline}
            numberOfLines={numberOfLines}
            keyboardType={keyboardType}
            secureTextEntry={secureTextEntry}
            selectionColor={colors.primary.main}
            {...props}
          />
        </Pressable>
        {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

export default Input;
