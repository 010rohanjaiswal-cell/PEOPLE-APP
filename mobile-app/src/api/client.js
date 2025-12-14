/**
 * API Client - People App
 * Base configuration for all API calls
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Base URL - Production backend
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://freelancing-platform-backend-backup.onrender.com';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Log API base URL for debugging
console.log('🔗 API Base URL:', API_BASE_URL);

// Request interceptor - Add auth token to requests
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      // Log request for debugging
      console.log('📤 API Request:', config.method?.toUpperCase(), config.url, config.data);
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

    // Handle 401 Unauthorized - Token expired or invalid
    if (error.response?.status === 401) {
      try {
        // Clear token and redirect to login
        await AsyncStorage.removeItem('authToken');
        await AsyncStorage.removeItem('userData');
        // Navigation will be handled by AuthContext
      } catch (storageError) {
        console.error('Error clearing storage:', storageError);
      }
    }

    // Return error for component-level handling
    return Promise.reject(error);
  }
);

export default apiClient;

