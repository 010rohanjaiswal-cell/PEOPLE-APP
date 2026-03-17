/**
 * Verification API - People App
 */

import apiClient from './client';

export const verificationAPI = {
  // Offline Aadhaar OTP + PAN verification (Cashfree VRS)
  sendAadhaarOtp: async (aadhaarNumber) => {
    const response = await apiClient.post('/api/freelancer/verification/aadhaar/otp', {
      aadhaarNumber,
    });
    return response.data;
  },

  verifyAadhaarOtp: async (otp, refId = null) => {
    const response = await apiClient.post('/api/freelancer/verification/aadhaar/verify', {
      otp,
      refId: refId || undefined,
    });
    return response.data;
  },

  verifyPan: async (panNumber) => {
    const response = await apiClient.post('/api/freelancer/verification/pan/verify', {
      panNumber,
    });
    return response.data;
  },

  completeVerification: async (termsAccepted) => {
    const response = await apiClient.post('/api/freelancer/verification/complete', {
      termsAccepted: termsAccepted === true,
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

