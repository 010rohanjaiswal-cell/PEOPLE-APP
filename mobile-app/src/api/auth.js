/**
 * Authentication API - People App
 */

import apiClient from './client';

export const authAPI = {
  /**
   * Send OTP to phone number
   * @param {string} phoneNumber - Phone number with country code (e.g., "+919876543210")
   * @param {string} role - User role ("client" or "freelancer")
   * @returns {Promise} Success response
   */
  sendOTP: async (phoneNumber, role) => {
    const response = await apiClient.post('/api/auth/send-otp', {
      phoneNumber,
      role,
    });
    return response.data;
  },

  /**
   * Verify OTP and get JWT token
   * @param {string} phoneNumber - Phone number with country code
   * @param {string} otp - 6-digit OTP code
   * @param {string} [deviceId] - Stable device ID for one-device-one-login
   * @param {boolean} [forceLogin] - If true, logout other device and login here
   * @returns {Promise} User data and JWT token, or { success: false, code: 'ALREADY_LOGGED_IN_ELSEWHERE', message }
   */
  /**
   * After Firebase client verifies OTP, exchange ID token for app JWT.
   */
  verifyFirebaseIdToken: async (idToken, role, deviceId = null, forceLogin = false) => {
    const body = {
      idToken,
      role,
      forceLogin: forceLogin || undefined,
    };
    if (deviceId != null && String(deviceId).trim() !== '') {
      body.deviceId = String(deviceId).trim();
    }
    const response = await apiClient.post('/api/auth/verify-firebase-id-token', body);
    return response.data;
  },

  verifyOTP: async (phoneNumber, otp, deviceId = null, forceLogin = false) => {
    const body = {
      phoneNumber,
      otp,
      forceLogin: forceLogin || undefined,
    };
    if (deviceId != null && String(deviceId).trim() !== '') {
      body.deviceId = String(deviceId).trim();
    }
    const response = await apiClient.post('/api/auth/verify-otp', body);
    return response.data;
  },

  /**
   * Authenticate user with Firebase token (legacy - kept for compatibility)
   * @param {string} firebaseToken - Firebase ID token
   * @returns {Promise} User data and JWT token
   */
  authenticate: async (firebaseToken) => {
    const response = await apiClient.post('/api/auth/authenticate', {
      firebaseToken,
    });
    return response.data;
  },

  /**
   * Logout user
   * @returns {Promise}
   */
  logout: async () => {
    const response = await apiClient.post('/api/auth/logout');
    return response.data;
  },
};

export default authAPI;

