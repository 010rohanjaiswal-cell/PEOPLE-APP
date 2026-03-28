/**
 * AuthContext - People App
 * Manages authentication state
 */

import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../api';
import { setUnauthorizedCallback } from '../api/client';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  // Check for existing auth on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // When API returns 401 (e.g. logged in on another device), clear in-memory auth so user sees login
  useEffect(() => {
    setUnauthorizedCallback(() => {
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
    });
    return () => setUnauthorizedCallback(null);
  }, []);

  const checkAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('authToken');
      const storedUser = await AsyncStorage.getItem('userData');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        setIsNewUser(Boolean(JSON.parse(storedUser)?.isNewUser));
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Error checking auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (firebaseToken) => {
    try {
      const response = await authAPI.authenticate(firebaseToken);
      const { token: jwtToken, user: userData } = response;

      // Store token and user data
      await AsyncStorage.setItem('authToken', jwtToken);
      await AsyncStorage.setItem('userData', JSON.stringify(userData));

      setToken(jwtToken);
      setUser(userData);
      setIsAuthenticated(true);

      return { success: true, user: userData };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Login failed',
      };
    }
  };

  // Direct login with JWT token (for OTP verification)
  const loginWithToken = async (jwtToken, userData) => {
    try {
      // Store token and user data
      await AsyncStorage.setItem('authToken', jwtToken);
      await AsyncStorage.setItem('userData', JSON.stringify(userData));

      setToken(jwtToken);
      setUser(userData);
      setIsNewUser(Boolean(userData?.isNewUser));
      setIsAuthenticated(true);

      return { success: true, user: userData };
    } catch (error) {
      console.error('Login with token error:', error);
      return {
        success: false,
        error: error.message || 'Login failed',
      };
    }
  };

  const logout = async () => {
    try {
      // Call backend logout
      await authAPI.logout();
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Clear local storage regardless of API call result
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userData');

      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const updateUser = useCallback(async (userData) => {
    try {
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      setUser(userData);
      setIsNewUser(Boolean(userData?.isNewUser));
    } catch (error) {
      console.error('Error updating user:', error);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated,
      isNewUser,
      login,
      loginWithToken,
      logout,
      updateUser,
    }),
    [user, token, loading, isAuthenticated, isNewUser, login, loginWithToken, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;

