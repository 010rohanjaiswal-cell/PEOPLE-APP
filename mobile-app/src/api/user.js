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
  getUserProfile: async (userId) => {
    const response = await apiClient.get(`/api/user/profile/${userId}`);
    return response.data;
  },
};

export default userAPI;

