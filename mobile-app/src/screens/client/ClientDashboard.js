/**
 * Client Dashboard - People App
 * Main dashboard with tab navigation for clients
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, typography } from '../../theme';
import LoadingSpinner from '../../components/common/LoadingSpinner';

// Tab Screens (will be created)
import PostJobScreen from './PostJob';
import MyJobsScreen from './MyJobs';
import HistoryScreen from './History';
import ProfileScreen from './Profile';

const Tab = createBottomTabNavigator();

const ClientDashboard = () => {
  const { user, logout } = useAuth();
  const navigation = useNavigation();
  const [logoutError, setLogoutError] = useState('');

  const handleLogout = async () => {
    try {
      // TODO: Check for active jobs before logout
      // For now, just logout
      await logout();
    } catch (error) {
      setLogoutError('Failed to logout. Please try again.');
      setTimeout(() => setLogoutError(''), 5000);
    }
  };

  if (!user) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      {/* Top Navigation Bar */}
      <View style={styles.topNav}>
        <View style={styles.leftSection}>
          <Text style={styles.logo}>People</Text>
          <View style={styles.userInfo}>
            {user.profilePhoto ? (
              <Image source={{ uri: user.profilePhoto }} style={styles.profilePhoto} />
            ) : (
              <View style={[styles.profilePhoto, styles.profilePhotoPlaceholder]}>
                <MaterialIcons name="person" size={20} color={colors.text.secondary} />
              </View>
            )}
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{user.fullName || 'User'}</Text>
              <Text style={styles.userPhone}>{user.phone || ''}</Text>
            </View>
          </View>
        </View>
        <View style={styles.rightSection}>
          <TouchableOpacity 
            onPress={() => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            }} 
            style={styles.loginButton}
          >
            <Text style={styles.loginText}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <MaterialIcons name="logout" size={20} color={colors.error.main} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Error Message */}
      {logoutError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{logoutError}</Text>
        </View>
      ) : null}

      {/* Tab Navigation */}
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary.main,
          tabBarInactiveTintColor: colors.text.secondary,
          tabBarStyle: {
            borderTopWidth: 1,
            borderTopColor: colors.border,
            height: 60,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
          },
        }}
      >
        <Tab.Screen
          name="PostJob"
          component={PostJobScreen}
          options={{
            tabBarLabel: 'Post Job',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="add-circle" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="MyJobs"
          component={MyJobsScreen}
          options={{
            tabBarLabel: 'My Jobs',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="work" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="History"
          component={HistoryScreen}
          options={{
            tabBarLabel: 'History',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="history" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            tabBarLabel: 'Profile',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="person" size={size} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logo: {
    ...typography.h2,
    fontWeight: 'bold',
    color: colors.primary.main,
    marginRight: spacing.md,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profilePhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: spacing.sm,
  },
  profilePhotoPlaceholder: {
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text.primary,
  },
  userPhone: {
    ...typography.small,
    color: colors.text.secondary,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  loginButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  loginText: {
    ...typography.body,
    color: colors.primary.main,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.sm,
  },
  logoutText: {
    ...typography.small,
    color: colors.error.main,
    marginLeft: spacing.xs,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: colors.error.light,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.error.main,
  },
  errorText: {
    ...typography.small,
    color: colors.error.main,
    textAlign: 'center',
  },
});

export default ClientDashboard;

