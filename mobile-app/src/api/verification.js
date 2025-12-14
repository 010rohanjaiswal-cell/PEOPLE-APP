/**
 * Verification API - People App
 */

import apiClient from './client';

export const verificationAPI = {
  /**
   * Submit verification documents
   * @param {Object} verificationData - Verification details and documents
   * @returns {Promise}
   */
  submitVerification: async (verificationData) => {
    const response = await apiClient.post('/api/freelancer/verification', verificationData);
    return response.data;
  },

  /**
   * Get verification status
   * @returns {Promise} Verification status
   */
  getVerificationStatus: async () => {
    const response = await apiClient.get('/api/freelancer/verification/status');
    return response.data;
  },
};

export default verificationAPI;

