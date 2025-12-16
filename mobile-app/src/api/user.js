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
};

export default userAPI;

