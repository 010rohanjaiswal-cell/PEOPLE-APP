/**
 * NotificationContext - People App
 * Manages notification state and real-time updates
 */

import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from '../hooks/useSocket';
import { notificationsAPI } from '../api';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const { socket, isConnected } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Load notifications
  const loadNotifications = useCallback(async (showLoading = true) => {
    if (!isAuthenticated || !user) {
      console.log('⚠️ Cannot load notifications: not authenticated or no user');
      return;
    }

    try {
      if (showLoading && !refreshing) setLoading(true);
      console.log('📬 Loading notifications for user:', user._id || user.id);
      const response = await notificationsAPI.getNotifications({ limit: 50 });
      console.log('📬 Notifications response:', response);
      if (response.success) {
        setNotifications(response.notifications || []);
        setUnreadCount(response.unreadCount || 0);
        console.log('✅ Loaded notifications:', response.notifications?.length || 0, 'Unread:', response.unreadCount || 0);
      } else {
        console.error('❌ Failed to load notifications:', response.error);
      }
    } catch (error) {
      console.error('❌ Error loading notifications:', error);
      console.error('❌ Error details:', error.response?.data || error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated, user, refreshing]);

  // Load unread count only
  const loadUnreadCount = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    try {
      const response = await notificationsAPI.getUnreadCount();
      if (response.success) {
        setUnreadCount(response.count || 0);
        console.log('📊 Unread count updated:', response.count || 0);
      }
    } catch (error) {
      console.error('❌ Error loading unread count:', error);
      console.error('❌ Error details:', error.response?.data || error.message);
    }
  }, [isAuthenticated, user]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      const response = await notificationsAPI.markAsRead(notificationId);
      if (response.success) {
        setNotifications(prev =>
          prev.map(notif =>
            notif._id === notificationId
              ? { ...notif, read: true, readAt: new Date() }
              : notif
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await notificationsAPI.markAllAsRead();
      if (response.success) {
        setNotifications(prev =>
          prev.map(notif => ({ ...notif, read: true, readAt: new Date() }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      const response = await notificationsAPI.deleteNotification(notificationId);
      if (response.success) {
        setNotifications(prev => {
          const notification = prev.find(n => n._id === notificationId);
          const wasUnread = notification && !notification.read;
          if (wasUnread) {
            setUnreadCount(prevCount => Math.max(0, prevCount - 1));
          }
          return prev.filter(n => n._id !== notificationId);
        });
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, []);

  // Refresh notifications
  const refreshNotifications = useCallback(() => {
    setRefreshing(true);
    loadNotifications(false);
  }, [loadNotifications]);

  // Load notifications on mount and when user changes
  useEffect(() => {
    if (isAuthenticated && user) {
      loadNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated, user, loadNotifications]);

  // Set up Socket.io listener for new notifications
  useEffect(() => {
    if (!socket) {
      console.log('⚠️ Socket not available for notifications');
      return;
    }
    
    if (!isConnected) {
      console.log('⚠️ Socket not connected for notifications');
      return;
    }

    console.log('✅ Setting up notification listener on socket');
    
    const handleNewNotification = (data) => {
      console.log('🔔 New notification received via Socket.io:', data);
      const newNotification = data.notification;
      
      if (!newNotification) {
        console.error('❌ Invalid notification data received:', data);
        return;
      }
      
      // Add notification to the beginning of the list
      setNotifications(prev => [newNotification, ...prev]);
      
      // Increment unread count if notification is unread
      if (!newNotification.read) {
        setUnreadCount(prev => prev + 1);
        console.log('📬 Unread count incremented');
      }
    };

    socket.on('new_notification', handleNewNotification);
    console.log('✅ Notification listener registered');

    return () => {
      console.log('🧹 Cleaning up notification listener');
      socket.off('new_notification', handleNewNotification);
    };
  }, [socket, isConnected]);

  // Periodically refresh unread count (every 30 seconds)
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const interval = setInterval(() => {
      loadUnreadCount();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [isAuthenticated, user, loadUnreadCount]);

  const value = {
    notifications,
    unreadCount,
    loading,
    refreshing,
    loadNotifications,
    loadUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

