/**
 * Card Component - People App
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';

export const Card = ({ children, style, ...props }) => {
  return (
    <View style={[styles.card, style]} {...props}>
      {children}
    </View>
  );
};

export const CardHeader = ({ children, style, ...props }) => {
  return (
    <View style={[styles.cardHeader, style]} {...props}>
      {children}
    </View>
  );
};

export const CardTitle = ({ children, style, ...props }) => {
  return (
    <Text style={[styles.cardTitle, style]} {...props}>
      {children}
    </Text>
  );
};

export const CardDescription = ({ children, style, ...props }) => {
  return (
    <Text style={[styles.cardDescription, style]} {...props}>
      {children}
    </Text>
  );
};

export const CardContent = ({ children, style, ...props }) => {
  return (
    <View style={[styles.cardContent, style]} {...props}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
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

export default Card;

