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
   * Get user profile by ID (for viewing other users' profiles)
   * @param {string} userId - User ID
   * @returns {Promise}
   */
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

