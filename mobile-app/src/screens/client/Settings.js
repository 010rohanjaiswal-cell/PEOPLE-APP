/**
 * Settings Screen - Client Dashboard
 * Settings and preferences for clients
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent } from '../../components/common';

const Settings = () => {
  const { user } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [emailNotifications, setEmailNotifications] = React.useState(false);

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <CardContent>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <MaterialIcons name="notifications" size={24} color={colors.text.primary} />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Push Notifications</Text>
                <Text style={styles.settingDescription}>Receive notifications about job offers and updates</Text>
              </View>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: colors.border, true: colors.primary.main }}
              thumbColor={colors.background}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <MaterialIcons name="email" size={24} color={colors.text.primary} />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Email Notifications</Text>
                <Text style={styles.settingDescription}>Receive email updates about your account</Text>
              </View>
            </View>
            <Switch
              value={emailNotifications}
              onValueChange={setEmailNotifications}
              trackColor={{ false: colors.border, true: colors.primary.main }}
              thumbColor={colors.background}
            />
          </View>
        </CardContent>
      </Card>

      <Card style={styles.card}>
        <CardContent>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <MaterialIcons name="lock" size={24} color={colors.text.primary} />
              <Text style={styles.settingLabel}>Privacy & Security</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.text.secondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <MaterialIcons name="help" size={24} color={colors.text.primary} />
              <Text style={styles.settingLabel}>Help & Support</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.text.secondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <MaterialIcons name="info" size={24} color={colors.text.primary} />
              <Text style={styles.settingLabel}>About</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.text.secondary} />
          </TouchableOpacity>
        </CardContent>
      </Card>

      <Card style={styles.card}>
        <CardContent>
          <Text style={styles.sectionTitle}>App Version</Text>
          <Text style={styles.versionText}>1.0.0</Text>
        </CardContent>
      </Card>
    </ScrollView>
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
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  settingText: {
    flex: 1,
  },
  settingLabel: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  settingDescription: {
    ...typography.small,
    color: colors.text.secondary,
  },
  versionText: {
    ...typography.body,
    color: colors.text.secondary,
  },
});

export default Settings;

