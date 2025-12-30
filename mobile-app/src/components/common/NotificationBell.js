/**
 * Notification Bell Component - People App
 * Displays notification bell icon with unread count badge
 */

import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import { useNotifications } from '../../context/NotificationContext';

const NotificationBell = ({ onPress, style }) => {
  const { unreadCount } = useNotifications();

  return (
    <TouchableOpacity onPress={onPress} style={[styles.container, style]}>
      <MaterialIcons name="notifications" size={24} color={colors.text.primary} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    padding: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.error.main,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    borderWidth: 2,
    borderColor: colors.background,
  },
  badgeText: {
    ...typography.small,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 10,
  },
});

export default NotificationBell;

