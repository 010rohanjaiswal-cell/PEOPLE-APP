/**
 * Empty State Component - People App
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { spacing, typography } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import Button from './Button';

function createEmptyStateStyles(colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
    },
    iconContainer: {
      marginBottom: spacing.lg,
    },
    title: {
      fontSize: typography.h3.fontSize,
      fontWeight: typography.h3.fontWeight,
      color: colors.text.primary,
      marginBottom: spacing.sm,
      textAlign: 'center',
    },
    description: {
      fontSize: typography.body.fontSize,
      color: colors.text.secondary,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    button: {
      marginTop: spacing.md,
    },
  });
}

const EmptyState = ({ icon, title, description, buttonText, onButtonPress, style }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createEmptyStateStyles(colors), [colors]);

  return (
    <View style={[styles.container, style]}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      {title && <Text style={styles.title}>{title}</Text>}
      {description && <Text style={styles.description}>{description}</Text>}
      {buttonText && onButtonPress && (
        <Button onPress={onButtonPress} style={styles.button}>
          {buttonText}
        </Button>
      )}
    </View>
  );
};

export default EmptyState;
