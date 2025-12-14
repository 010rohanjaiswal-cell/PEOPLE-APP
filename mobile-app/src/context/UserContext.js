/**
 * UserContext - People App
 * Manages user profile data
 */

import React, { createContext, useContext } from 'react';
import { useAuth } from './AuthContext';

const UserContext = createContext();

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
};

export const UserProvider = ({ children }) => {
  const { user, updateUser } = useAuth();

  const updateProfile = async (profileData) => {
    const updatedUser = { ...user, ...profileData };
    await updateUser(updatedUser);
    return updatedUser;
  };

  const value = {
    user,
    updateProfile,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export default UserContext;

