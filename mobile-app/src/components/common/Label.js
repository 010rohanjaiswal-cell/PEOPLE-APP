/**
 * Label Component - People App
 */

import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { colors, typography } from '../../theme';

const Label = ({ children, style, ...props }) => {
  return (
    <Text style={[styles.label, style]} {...props}>
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: typography.body.fontSize,
    fontWeight: '500',
    color: colors.text.primary,
  },
});

export default Label;

