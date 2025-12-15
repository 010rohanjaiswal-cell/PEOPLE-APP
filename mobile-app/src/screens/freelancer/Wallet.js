/**
 * Wallet Tab - Freelancer Dashboard
 * Placeholder screen for Phase 4
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import EmptyState from '../../components/common/EmptyState';

const Wallet = () => {
  return (
    <View style={styles.container}>
      <EmptyState
        icon={<MaterialIcons name="account-balance-wallet" size={64} color={colors.text.muted} />}
        title="Wallet"
        message="Wallet features will be available in Phase 4"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
});

export default Wallet;

