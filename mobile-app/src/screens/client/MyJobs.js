/**
 * My Jobs Screen - People App
 * Display active jobs for client
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import EmptyState from '../../components/common/EmptyState';

const MyJobs = () => {
  return (
    <View style={styles.container}>
      <EmptyState
        icon={<MaterialIcons name="work" size={64} color={colors.text.muted} />}
        title="No active jobs found"
        description="Post your first job to get started!"
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

export default MyJobs;

