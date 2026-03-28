/**
 * Card Component - People App
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { spacing, typography } from '../../theme';
import lightColors from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';

function useCardPalette(forceLight) {
  const { colors } = useTheme();
  return useMemo(() => (forceLight ? lightColors : colors), [forceLight, colors]);
}

function createCardStyles(colors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: spacing.borderRadius.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.cardPadding,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    cardHeader: {
      paddingBottom: spacing.md,
      flexDirection: 'column',
    },
    cardTitle: {
      fontSize: typography.h2.fontSize,
      fontWeight: typography.h2.fontWeight,
      color: colors.text.primary,
      marginBottom: spacing.xs,
    },
    cardDescription: {
      fontSize: typography.small.fontSize,
      color: colors.text.secondary,
      lineHeight: typography.small.lineHeight,
    },
    cardContent: {
      paddingTop: 0,
    },
  });
}

export const Card = ({ children, style, forceLight = false, ...props }) => {
  const colors = useCardPalette(forceLight);
  const styles = useMemo(() => createCardStyles(colors), [colors]);
  return (
    <View style={[styles.card, style]} {...props}>
      {children}
    </View>
  );
};

export const CardHeader = ({ children, style, forceLight = false, ...props }) => {
  const colors = useCardPalette(forceLight);
  const styles = useMemo(() => createCardStyles(colors), [colors]);
  return (
    <View style={[styles.cardHeader, style]} {...props}>
      {children}
    </View>
  );
};

export const CardTitle = ({ children, style, forceLight = false, ...props }) => {
  const colors = useCardPalette(forceLight);
  const styles = useMemo(() => createCardStyles(colors), [colors]);
  return (
    <Text style={[styles.cardTitle, style]} {...props}>
      {children}
    </Text>
  );
};

export const CardDescription = ({ children, style, forceLight = false, ...props }) => {
  const colors = useCardPalette(forceLight);
  const styles = useMemo(() => createCardStyles(colors), [colors]);
  return (
    <Text style={[styles.cardDescription, style]} {...props}>
      {children}
    </Text>
  );
};

export const CardContent = ({ children, style, forceLight = false, ...props }) => {
  const colors = useCardPalette(forceLight);
  const styles = useMemo(() => createCardStyles(colors), [colors]);
  return (
    <View style={[styles.cardContent, style]} {...props}>
      {children}
    </View>
  );
};

export default Card;
