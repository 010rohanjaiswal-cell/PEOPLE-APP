/**
 * History Screen - People App
 * Display completed jobs for client
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import EmptyState from '../../components/common/EmptyState';

const History = () => {
  return (
    <View style={styles.container}>
      <EmptyState
        icon={<MaterialIcons name="history" size={64} color={colors.text.muted} />}
        title="No completed jobs yet"
        description="Completed jobs will appear here"
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

export default History;

