/**
 * Chat API - People App
 * Handles real-time messaging between users
 */

import apiClient from './client';

export const chatAPI = {
  /**
   * Get messages between current user and recipient
   * @param {string} recipientId - ID of the recipient user
   * @returns {Promise} Messages array
   */
  getMessages: async (recipientId) => {
    const response = await apiClient.get(`/api/chat/messages/${recipientId}`);
    return response.data;
  },

  /**
   * Send a message to recipient
   * @param {string} recipientId - ID of the recipient user
   * @param {string} message - Message text
   * @returns {Promise} Created message object
   */
  sendMessage: async (recipientId, message) => {
    const response = await apiClient.post('/api/chat/send', {
      recipientId,
      message,
    });
    return response.data;
  },

  /**
   * Mark messages as read
   * @param {string} senderId - ID of the sender
   * @returns {Promise} Success status
   */
  markAsRead: async (senderId) => {
    const response = await apiClient.post('/api/chat/mark-read', {
      senderId,
    });
    return response.data;
  },
};

export default chatAPI;

