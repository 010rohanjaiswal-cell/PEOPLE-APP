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

  faceMatchSelfie: async (imageAsset) => {
    const formData = new FormData();
    formData.append('image', {
      uri: imageAsset.uri,
      name: imageAsset.fileName || 'selfie.jpg',
      type: imageAsset.mimeType || 'image/jpeg',
    });
    const response = await apiClient.post('/api/freelancer/verification/face-match', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
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

  // Referral (optional verification step)
  getMyReferralCode: async () => {
    const response = await apiClient.get('/api/freelancer/referral/my-code');
    return response.data;
  },

  validateReferralCode: async (code) => {
    const response = await apiClient.post('/api/freelancer/referral/validate', { code });
    return response.data;
  },

  applyReferralCode: async (code) => {
    const response = await apiClient.post('/api/freelancer/referral/apply', { code });
    return response.data;
  },
};

export default verificationAPI;

