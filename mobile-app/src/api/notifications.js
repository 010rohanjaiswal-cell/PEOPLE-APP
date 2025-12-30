/**
 * Notifications API - People App
 */

import apiClient from './client';

export const notificationsAPI = {
  /**
   * Get all notifications for the authenticated user
   * @param {Object} params - Query parameters (page, limit, unreadOnly)
   * @returns {Promise} List of notifications
   */
  getNotifications: async (params = {}) => {
    const response = await apiClient.get('/api/notifications', { params });
    return response.data;
  },

  /**
   * Get unread notification count
   * @returns {Promise} Unread count
   */
  getUnreadCount: async () => {
    const response = await apiClient.get('/api/notifications/unread-count');
    return response.data;
  },

  /**
   * Mark a notification as read
   * @param {String} notificationId - Notification ID
   * @returns {Promise} Updated notification
   */
  markAsRead: async (notificationId) => {
    const response = await apiClient.put(`/api/notifications/${notificationId}/read`);
    return response.data;
  },

  /**
   * Mark all notifications as read
   * @returns {Promise} Success response
   */
  markAllAsRead: async () => {
    const response = await apiClient.put('/api/notifications/read-all');
    return response.data;
  },

  /**
   * Delete a notification
   * @param {String} notificationId - Notification ID
   * @returns {Promise} Success response
   */
  deleteNotification: async (notificationId) => {
    const response = await apiClient.delete(`/api/notifications/${notificationId}`);
    return response.data;
  },
};

