/**
 * API Client - People App
 * Base configuration for all API calls
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Base URL - will be set from environment variables
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3001';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token to requests
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
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

