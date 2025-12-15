/**
 * Profile Tab - Freelancer Dashboard
 * Placeholder screen for Phase 4
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import EmptyState from '../../components/common/EmptyState';

const Profile = () => {
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      <EmptyState
        icon={<MaterialIcons name="person" size={64} color={colors.text.muted} />}
        title="Profile"
        message={`Profile details for ${user?.fullName || 'Freelancer'} will appear here in Phase 4`}
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

export default Profile;

