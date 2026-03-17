/**
 * Verification API - People App
 */

import apiClient from './client';

export const verificationAPI = {
  // DigiLocker SecureID (Option B)
  initiateDigilocker: async (userFlow = 'signup') => {
    const response = await apiClient.post('/api/freelancer/verification/digilocker/initiate', {
      userFlow,
    });
    return response.data;
  },

  getDigilockerStatus: async (verificationId) => {
    const response = await apiClient.get('/api/freelancer/verification/digilocker/status', {
      params: { verificationId },
    });
    return response.data;
  },

  fetchDigilockerDocuments: async (verificationId) => {
    const response = await apiClient.post('/api/freelancer/verification/digilocker/fetch', {
      verificationId,
    });
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

