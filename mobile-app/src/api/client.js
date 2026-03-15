/**
 * API Client - People App
 * Base configuration for all API calls
 * Handles Render cold start: longer timeout + retry for first load
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Base URL - Production backend (Render: free tier spins down after ~15 min; first request can take 30s–2min)
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://freelancing-platform-backend-backup.onrender.com';

// Longer timeout so first request survives backend cold start (Render free tier can take 1–2 min)
const REQUEST_TIMEOUT_MS = 90000;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Log API base URL for debugging
console.log('🔗 API Base URL:', API_BASE_URL);

// One-device-one-login: when backend returns 401 (e.g. LOGGED_IN_ELSEWHERE), clear auth state
let onUnauthorizedCallback = null;
export function setUnauthorizedCallback(cb) {
  onUnauthorizedCallback = cb;
}
function getUnauthorizedCallback() {
  return onUnauthorizedCallback;
}

// Request interceptor - Add auth token to requests
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      // Log request for debugging
      console.log('📤 API Request:', config.method?.toUpperCase(), config.url);
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
apiClient.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', response.config.method?.toUpperCase(), response.config.url, response.status);
    return response;
  },
  async (error) => {
    const config = error.config;

    // Retry once on timeout or network error (backend cold start on Render free tier)
    const isRetryable =
      (!config._retryCount || config._retryCount < 1) &&
      (error.code === 'ECONNABORTED' || error.message === 'Network Error' || !error.response);
    if (isRetryable && config) {
      config._retryCount = (config._retryCount || 0) + 1;
      await new Promise((r) => setTimeout(r, 2000));
      return apiClient.request(config);
    }

    // Enhanced error logging
    if (error.response) {
      // Server responded with error status
      console.error('❌ API Error Response:', {
        status: error.response.status,
        url: error.config?.url,
        data: error.response.data,
      });
    } else if (error.request) {
      // Request was made but no response received
      console.error('❌ API Network Error:', {
        url: error.config?.url,
        message: error.message,
        code: error.code,
      });
      console.error('❌ Full error:', error);
    } else {
      // Something else happened
      console.error('❌ API Error:', error.message);
    }

    // Handle 401 Unauthorized - Token expired, invalid, or logged in elsewhere
    if (error.response?.status === 401) {
      try {
        await AsyncStorage.removeItem('authToken');
        await AsyncStorage.removeItem('userData');
        const cb = getUnauthorizedCallback();
        if (typeof cb === 'function') cb();
      } catch (storageError) {
        console.error('Error clearing storage:', storageError);
      }
    }

    // Return error for component-level handling
    return Promise.reject(error);
  }
);

export default apiClient;

/** Ping backend to wake it from cold start (Render free tier). Call when app opens and user is logged in. */
export function warmupBackend() {
  axios.get(`${API_BASE_URL.replace(/\/$/, '')}/health`, { timeout: 15000 }).catch(() => {});
}

