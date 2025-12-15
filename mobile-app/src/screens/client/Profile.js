/**
 * Profile Screen - People App
 * Display client profile information
 */

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import { Card, CardContent } from '../../components/common';
import { useAuth } from '../../context/AuthContext';

const Profile = () => {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <CardContent>
          <View style={styles.profileHeader}>
            {user.profilePhoto ? (
              <Image source={{ uri: user.profilePhoto }} style={styles.profilePhoto} />
            ) : (
              <View style={[styles.profilePhoto, styles.profilePhotoPlaceholder]}>
                <MaterialIcons name="person" size={48} color={colors.text.secondary} />
              </View>
            )}
            <Text style={styles.name}>{user.fullName || 'User'}</Text>
            <Text style={styles.role}>Client</Text>
          </View>

          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <MaterialIcons name="phone" size={20} color={colors.text.secondary} />
              <Text style={styles.infoText}>{user.phone || 'N/A'}</Text>
            </View>
            {user.email && (
              <View style={styles.infoRow}>
                <MaterialIcons name="email" size={20} color={colors.text.secondary} />
                <Text style={styles.infoText}>{user.email}</Text>
              </View>
            )}
          </View>
        </CardContent>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  card: {
    width: '100%',
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: spacing.md,
  },
  profilePhotoPlaceholder: {
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  role: {
    ...typography.body,
    color: colors.text.secondary,
  },
  infoSection: {
    marginTop: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  infoText: {
    ...typography.body,
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
});

export default Profile;

