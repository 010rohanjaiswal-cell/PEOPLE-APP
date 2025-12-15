/**
 * Freelancer Dashboard - People App
 * Main dashboard with tab navigation for freelancers
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, typography } from '../../theme';
import LoadingSpinner from '../../components/common/LoadingSpinner';

// Tab Screens
import AvailableJobsScreen from './AvailableJobs';
import MyJobsScreen from './MyJobs';
import WalletScreen from './Wallet';
import OrdersScreen from './Orders';
import ProfileScreen from './Profile';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DASHBOARD_HEIGHT = SCREEN_WIDTH * (9 / 16); // 16:9 aspect ratio

const FreelancerDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('AvailableJobs');
  const [logoutError, setLogoutError] = useState('');

  const tabs = [
    { key: 'AvailableJobs', label: 'Available', icon: 'work', component: AvailableJobsScreen },
    { key: 'MyJobs', label: 'My Jobs', icon: 'check-circle', component: MyJobsScreen },
    { key: 'Wallet', label: 'Wallet', icon: 'account-balance-wallet', component: WalletScreen },
    { key: 'Orders', label: 'Orders', icon: 'receipt', component: OrdersScreen },
    { key: 'Profile', label: 'Profile', icon: 'person', component: ProfileScreen },
  ];

  const ActiveScreen = tabs.find(tab => tab.key === activeTab)?.component || AvailableJobsScreen;

  const handleLogout = async () => {
    try {
      // TODO: Check for active jobs before logout (Phase 4)
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
    <View style={styles.wrapper}>
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
                <Text style={styles.userName}>{user.fullName || 'Freelancer'}</Text>
                <Text style={styles.userPhone}>{user.phone || ''}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <MaterialIcons name="logout" size={20} color={colors.error.main} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Error Message */}
        {logoutError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{logoutError}</Text>
          </View>
        ) : null}

        {/* Top Tab Bar */}
        <View style={styles.tabBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarContent}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[
                  styles.tabButton,
                  activeTab === tab.key && styles.tabButtonActive,
                ]}
              >
                <MaterialIcons
                  name={tab.icon}
                  size={20}
                  color={activeTab === tab.key ? colors.primary.main : colors.text.secondary}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    activeTab === tab.key && styles.tabLabelActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          <ActiveScreen />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: SCREEN_WIDTH,
    height: DASHBOARD_HEIGHT,
    maxWidth: SCREEN_WIDTH,
    maxHeight: DASHBOARD_HEIGHT,
    backgroundColor: colors.background,
    overflow: 'hidden',
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
  tabBar: {
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabBarContent: {
    paddingHorizontal: spacing.sm,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.xs,
    borderRadius: spacing.sm,
    gap: spacing.xs,
  },
  tabButtonActive: {
    backgroundColor: colors.primary.light,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary.main,
  },
  tabLabel: {
    ...typography.small,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: colors.primary.main,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

export default FreelancerDashboard;

