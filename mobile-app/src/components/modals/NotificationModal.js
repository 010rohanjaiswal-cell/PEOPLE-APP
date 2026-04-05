/**
 * Notification Modal - People App
 * Displays list of notifications with actions
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { spacing, typography } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useNotifications } from '../../context/NotificationContext';
import { useLanguage } from '../../context/LanguageContext';
import { translateNotificationToHindi } from '../../utils/translate';
import EmptyState from '../common/EmptyState';

function createNotificationModalStyles(colors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modal: {
      backgroundColor: colors.background,
      borderTopLeftRadius: spacing.lg,
      borderTopRightRadius: spacing.lg,
      height: '85%',
      width: '100%',
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      ...typography.h2,
      color: colors.text.primary,
    },
    closeButton: {
      padding: spacing.xs,
    },
    contentWrapper: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xxl,
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      padding: spacing.md,
    },
    notificationItem: {
      backgroundColor: colors.cardBackground,
      borderRadius: spacing.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      position: 'relative',
    },
    unreadNotification: {
      borderLeftWidth: 4,
      borderLeftColor: colors.primary.main,
      backgroundColor: colors.primary.light + '10',
    },
    notificationContent: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.md,
    },
    notificationText: {
      flex: 1,
    },
    notificationTitle: {
      ...typography.body,
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: spacing.xs,
    },
    notificationMessage: {
      ...typography.body,
      color: colors.text.secondary,
      marginBottom: spacing.xs,
    },
    unreadText: {
      fontWeight: '500',
      color: colors.text.primary,
    },
    notificationTime: {
      ...typography.small,
      color: colors.text.muted,
    },
    deleteButton: {
      padding: spacing.xs,
      marginLeft: spacing.sm,
    },
    unreadDot: {
      position: 'absolute',
      top: spacing.md,
      right: spacing.md,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary.main,
    },
  });
}

const NotificationModal = ({ visible, onClose }) => {
  const { t, locale } = useLanguage();
  const {
    notifications,
    unreadCount,
    loading,
    refreshing,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
  } = useNotifications();

  const [translatedNotifications, setTranslatedNotifications] = useState({});
  const { colors } = useTheme();
  const styles = useMemo(() => createNotificationModalStyles(colors), [colors]);

  // When locale is Hindi, translate notification title and message for display
  useEffect(() => {
    if (locale !== 'hi' || !notifications.length) {
      if (locale !== 'hi') setTranslatedNotifications({});
      return;
    }
    let cancelled = false;
    const run = async () => {
      for (const notif of notifications) {
        const id = notif._id;
        if (!id) continue;
        try {
          const translated = await translateNotificationToHindi(notif);
          if (!cancelled) setTranslatedNotifications((prev) => ({ ...prev, [id]: translated }));
        } catch (e) {
          if (!cancelled) setTranslatedNotifications((prev) => ({ ...prev, [id]: { title: notif.title || '', message: notif.message || '' } }));
        }
      }
    };
    run();
    return () => { cancelled = true; };
  }, [locale, notifications]);

  // Auto-mark all notifications as read once when modal opens (avoid loops on unreadCount updates)
  useEffect(() => {
    if (visible) {
      markAllAsRead();
    }
  }, [visible, markAllAsRead]);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'offer_received':
        return 'attach-money';
      case 'application_received':
        return 'person-add';
      case 'auto_pick':
        return 'stars';
      case 'application_rejected':
        return 'person-off';
      case 'offer_accepted':
        return 'check-circle';
      case 'offer_rejected':
        return 'cancel';
      case 'job_picked_up':
      case 'job_assigned':
        return 'work';
      case 'job_completed':
        return 'done-all';
      case 'payment_received':
        return 'account-balance-wallet';
      case 'payment_sent':
        return 'send';
      case 'work_done':
        return 'check';
      case 'profile_verified':
        return 'verified';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'offer_received':
      case 'application_received':
      case 'auto_pick':
      case 'job_picked_up':
      case 'job_assigned':
        return colors.primary.main;
      case 'offer_accepted':
      case 'job_completed':
      case 'payment_received':
      case 'work_done':
      case 'profile_verified':
        return colors.success.main;
      case 'offer_rejected':
      case 'application_rejected':
        return colors.error.main;
      default:
        return colors.text.secondary;
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffInSeconds = Math.floor((now - notificationDate) / 1000);

    if (diffInSeconds < 60) return t('notifications.justNow');
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}${t('notifications.mAgo')}`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}${t('notifications.hAgo')}`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}${t('notifications.dAgo')}`;
    return notificationDate.toLocaleDateString();
  };

  const handleNotificationPress = async (notification) => {
    if (!notification.read) {
      await markAsRead(notification._id);
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('notifications.title')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.contentWrapper}>
            {loading && !refreshing ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary.main} />
              </View>
            ) : notifications.length === 0 ? (
              <View style={styles.emptyContainer}>
                <EmptyState
                  icon={<MaterialIcons name="notifications-none" size={64} color={colors.text.muted} />}
                  title={t('notifications.noNotifications')}
                  description={t('notifications.allCaughtUp')}
                />
              </View>
            ) : (
              <ScrollView
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={true}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={refreshNotifications}
                    colors={[colors.primary.main]}
                    tintColor={colors.primary.main}
                  />
                }
              >
                {notifications
                  .filter((notification) => {
                    // Only show specific notification types
                    const allowedTypes = [
                      'offer_received',
                      'application_received',
                      'auto_pick',
                      'offer_accepted',
                      'offer_rejected',
                      'application_rejected',
                      'job_picked_up',
                      'job_assigned',
                      'job_completed',
                      'work_done',
                      'payment_received',
                      'payment_sent',
                      'profile_verified',
                    ];
                    return allowedTypes.includes(notification.type);
                  })
                  .map((notification) => {
                    const tr = locale === 'hi' && translatedNotifications[notification._id];
                    const displayTitle = tr ? tr.title : (notification.title || '');
                    const displayMessage = tr ? tr.message : (notification.message || '');
                    return (
                  <TouchableOpacity
                    key={notification._id}
                    style={[
                      styles.notificationItem,
                      !notification.read && styles.unreadNotification,
                    ]}
                    onPress={() => handleNotificationPress(notification)}
                  >
                    <View style={styles.notificationContent}>
                      <View
                        style={[
                          styles.iconContainer,
                          { backgroundColor: getNotificationColor(notification.type) + '20' },
                        ]}
                      >
                        <MaterialIcons
                          name={getNotificationIcon(notification.type)}
                          size={24}
                          color={getNotificationColor(notification.type)}
                        />
                      </View>
                      <View style={styles.notificationText}>
                        <Text style={styles.notificationTitle}>
                          {displayTitle}
                        </Text>
                        <Text
                          style={[
                            styles.notificationMessage,
                            !notification.read && styles.unreadText,
                          ]}
                        >
                          {displayMessage}
                        </Text>
                        <Text style={styles.notificationTime}>
                          {formatTime(notification.createdAt)}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => deleteNotification(notification._id)}
                        style={styles.deleteButton}
                      >
                        <MaterialIcons
                          name="delete-outline"
                          size={20}
                          color={colors.text.muted}
                        />
                      </TouchableOpacity>
                    </View>
                    {!notification.read && <View style={styles.unreadDot} />}
                  </TouchableOpacity>
                    );
                  })}
              </ScrollView>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default NotificationModal;

