/**
 * User API - People App
 */

import apiClient from './client';

export const userAPI = {
  /**
   * Get current user profile
   * @returns {Promise}
   */
  getProfile: async () => {
    const response = await apiClient.get('/api/user/profile');
    return response.data;
  },

  /**
   * Get another user's profile (same payload shape as freelancer profile / MyJobs view).
   * GET /api/user/profile/:userId
   */
  getUserProfile: async (userId) => {
    const response = await apiClient.get(`/api/user/profile/${userId}`);
    return response.data;
  },

  updateProfile: async ({ fullName, imageAsset } = {}) => {
    const formData = new FormData();
    if (fullName != null) formData.append('fullName', String(fullName));
    if (imageAsset?.uri) {
      formData.append('image', {
        uri: imageAsset.uri,
        name: imageAsset.fileName || 'profile.jpg',
        type: imageAsset.mimeType || 'image/jpeg',
      });
    }
    const response = await apiClient.put('/api/user/profile', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /**
   * Register Expo push token with backend for push notifications
   * @param {string} expoPushToken - Token from getExpoPushTokenAsync()
   * @param {string} [platform] - 'android' | 'ios'
   * @returns {Promise}
   */
  registerPushToken: async (expoPushToken, platform) => {
    const response = await apiClient.post('/api/user/push-token', {
      expoPushToken,
      platform: platform || (require('react-native').Platform.OS === 'ios' ? 'ios' : 'android'),
    });
    return response.data;
  },
};

export default userAPI;

