/**
 * NotificationContext - People App
 * Manages notification state and real-time updates
 */

import React, { createContext, useState, useEffect, useContext, useCallback, useMemo, useRef } from 'react';
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
  const userId = useMemo(() => (user?._id || user?.id || null), [user?._id, user?.id]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const notificationIdSetRef = useRef(new Set());
  const loadInFlightRef = useRef(false);
  const lastLoadAtRef = useRef(0);

  useEffect(() => {
    // Keep a fast lookup set for de-duping socket events
    try {
      notificationIdSetRef.current = new Set((notifications || []).map((n) => n?._id).filter(Boolean));
    } catch {
      notificationIdSetRef.current = new Set();
    }
  }, [notifications]);

  // Load notifications
  const loadNotifications = useCallback(async (showLoading = true) => {
    if (!isAuthenticated || !userId) {
      return;
    }

    try {
      // Prevent render-loops and request storms when user object updates frequently
      if (loadInFlightRef.current) return;
      const now = Date.now();
      if (now - lastLoadAtRef.current < 1500) return;
      lastLoadAtRef.current = now;
      loadInFlightRef.current = true;

      if (showLoading) setLoading(true);
      const response = await notificationsAPI.getNotifications({ limit: 50 });
      if (response.success) {
        setNotifications(response.notifications || []);
        setUnreadCount(response.unreadCount || 0);
      } else {
        console.error('❌ Failed to load notifications:', response.error);
      }
    } catch (error) {
      console.error('❌ Error loading notifications:', error);
      console.error('❌ Error details:', error.response?.data || error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
      loadInFlightRef.current = false;
    }
  }, [isAuthenticated, userId]);

  // Load unread count only
  const loadUnreadCount = useCallback(async () => {
    if (!isAuthenticated || !userId) return;

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
  }, [isAuthenticated, userId]);

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
    if (isAuthenticated && userId) {
      loadNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated, userId, loadNotifications]);

  // Set up Socket.io listener for new notifications
  useEffect(() => {
    if (!socket) {
      console.log('⚠️ Socket not available for notifications');
      return;
    }
    
    if (!isConnected) {
      console.log('⚠️ Socket not connected for notifications. Socket connected:', socket.connected);
      return;
    }

    console.log('✅ Setting up notification listener on socket. Socket ID:', socket.id);
    
    const handleNewNotification = (data) => {
      const newNotification = data.notification;
      
      if (!newNotification) {
        console.error('❌ Invalid notification data received:', data);
        return;
      }

      const nid = newNotification._id;
      if (nid && notificationIdSetRef.current.has(nid)) {
        // Avoid duplicate events (backend may emit to multiple rooms / reconnects)
        return;
      }
      if (nid) notificationIdSetRef.current.add(nid);
      
      // Add notification to the beginning of the list
      setNotifications(prev => {
        // Check if notification already exists (avoid duplicates)
        const exists = prev.some(n => n._id === newNotification._id);
        if (exists) {
          return prev;
        }
        return [newNotification, ...prev];
      });
      
      // Increment unread count if notification is unread
      if (!newNotification.read) {
        setUnreadCount(prev => {
          return prev + 1;
        });
      }
    };

    socket.on('new_notification', handleNewNotification);
    console.log('✅ Notification listener registered on socket');

    return () => {
      console.log('🧹 Cleaning up notification listener');
      if (socket) {
        socket.off('new_notification', handleNewNotification);
      }
    };
  }, [socket, isConnected]);

  // Periodically refresh unread count (every 30 seconds)
  useEffect(() => {
    if (!isAuthenticated || !userId) return;

    const interval = setInterval(() => {
      loadUnreadCount();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [isAuthenticated, userId, loadUnreadCount]);

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

