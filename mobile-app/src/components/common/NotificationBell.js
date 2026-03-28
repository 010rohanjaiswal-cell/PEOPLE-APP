/**
 * Notification Bell Component - People App
 * Displays notification bell icon with unread count badge
 */

import React, { useMemo } from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { spacing, typography } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useNotifications } from '../../context/NotificationContext';

function createNotificationBellStyles(colors) {
  return StyleSheet.create({
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
      borderColor: colors.cardBackground,
    },
    badgeText: {
      ...typography.small,
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 10,
    },
  });
}

const NotificationBell = ({ onPress, style }) => {
  const { unreadCount } = useNotifications();
  const { colors } = useTheme();
  const styles = useMemo(() => createNotificationBellStyles(colors), [colors]);

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

export default NotificationBell;
