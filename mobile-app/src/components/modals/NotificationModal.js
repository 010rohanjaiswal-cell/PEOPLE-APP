/**
 * Notification Modal - People App
 * Displays list of notifications with actions
 */

import React, { useState, useEffect } from 'react';
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
import { colors, spacing, typography } from '../../theme';
import { useNotifications } from '../../context/NotificationContext';
import EmptyState from '../common/EmptyState';

const NotificationModal = ({ visible, onClose }) => {
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

  // Auto-mark all notifications as read when modal opens
  useEffect(() => {
    if (visible && unreadCount > 0) {
      markAllAsRead();
    }
  }, [visible, unreadCount, markAllAsRead]);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'offer_received':
        return 'attach-money';
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
      case 'chat_message':
        return 'message';
      case 'profile_verified':
        return 'verified';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'offer_received':
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
        return colors.error.main;
      case 'chat_message':
        return colors.info?.main || colors.primary.main;
      default:
        return colors.text.secondary;
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffInSeconds = Math.floor((now - notificationDate) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return notificationDate.toLocaleDateString();
  };

  const handleNotificationPress = async (notification) => {
    if (!notification.read) {
      await markAsRead(notification._id);
    }
    // TODO: Navigate to relevant screen based on notification type
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
            <Text style={styles.title}>Notifications</Text>
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
                  title="No notifications"
                  description="You're all caught up!"
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
                      'offer_accepted',
                      'offer_rejected',
                      'job_picked_up',
                      'work_done',
                      'payment_received',
                      'chat_message',
                    ];
                    return allowedTypes.includes(notification.type);
                  })
                  .map((notification) => (
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
                          {notification.title}
                        </Text>
                        <Text
                          style={[
                            styles.notificationMessage,
                            !notification.read && styles.unreadText,
                          ]}
                        >
                          {notification.message}
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
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
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

export default NotificationModal;

