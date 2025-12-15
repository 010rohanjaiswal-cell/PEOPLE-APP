/**
 * Client Dashboard - People App
 * Main dashboard with tab navigation for clients
 */

import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, Animated, Dimensions, PanResponder } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, typography } from '../../theme';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.75; // 75% of screen width

// Tab Screens
import PostJobScreen from './PostJob';
import MyJobsScreen from './MyJobs';
import HistoryScreen from './History';
import ProfileScreen from './Profile';

const ClientDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('PostJob');
  const [logoutError, setLogoutError] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerAnimation] = useState(new Animated.Value(-DRAWER_WIDTH));

  // Top tabs - only Post Job and My Jobs
  const tabs = [
    { key: 'PostJob', label: 'Post Job', icon: 'add-circle', component: PostJobScreen },
    { key: 'MyJobs', label: 'My Jobs', icon: 'work', component: MyJobsScreen },
  ];

  const ActiveScreen = tabs.find(tab => tab.key === activeTab)?.component || PostJobScreen;

  // Swipe gesture to switch between Post Job and My Jobs
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 20,
      onPanResponderRelease: (_, gestureState) => {
        const currentIndex = tabs.findIndex(t => t.key === activeTab);
        if (gestureState.dx < -50 && currentIndex < tabs.length - 1) {
          setActiveTab(tabs[currentIndex + 1].key);
        } else if (gestureState.dx > 50 && currentIndex > 0) {
          setActiveTab(tabs[currentIndex - 1].key);
        }
      },
    })
  ).current;

  const toggleDrawer = () => {
    if (drawerVisible) {
      // Close drawer
      Animated.timing(drawerAnimation, {
        toValue: -DRAWER_WIDTH,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setDrawerVisible(false));
    } else {
      // Open drawer
      setDrawerVisible(true);
      Animated.timing(drawerAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  const closeDrawer = () => {
    Animated.timing(drawerAnimation, {
      toValue: -DRAWER_WIDTH,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setDrawerVisible(false));
  };

  const handleLogout = async () => {
    closeDrawer();
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
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Navigation Bar */}
      <View style={styles.topNav}>
        <View style={styles.leftSection}>
          <TouchableOpacity onPress={toggleDrawer} style={styles.menuButton}>
            <MaterialIcons name="menu" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.logo}>People</Text>
        </View>
      </View>

        {/* Error Message */}
        {logoutError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{logoutError}</Text>
          </View>
        ) : null}

        {/* Top Tab Bar - only show for PostJob/MyJobs */}
        {tabs.some(tab => tab.key === activeTab) && (
          <View style={styles.tabBar}>
            <View style={styles.tabBarContent}>
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
                    size={18}
                    color={activeTab === tab.key ? colors.primary.main : colors.text.secondary}
                  />
                  <Text
                    style={[
                      styles.tabLabel,
                      activeTab === tab.key && styles.tabLabelActive,
                    ]}
                    numberOfLines={1}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

      {/* Tab Content */}
      <View style={styles.tabContent} {...panResponder.panHandlers}>
        {activeTab === 'History' ? (
          <HistoryScreen />
        ) : activeTab === 'Profile' ? (
          <ProfileScreen />
        ) : (
          <ActiveScreen />
        )}
      </View>

      {/* Drawer Menu */}
      <Modal
        visible={drawerVisible}
        transparent={true}
        animationType="none"
        onRequestClose={closeDrawer}
      >
        <TouchableOpacity 
          style={styles.drawerOverlay} 
          activeOpacity={1}
          onPress={closeDrawer}
        >
          <Animated.View
            style={[
              styles.drawer,
              {
                transform: [{ translateX: drawerAnimation }],
              },
            ]}
          >
            <SafeAreaView style={styles.drawerContent} edges={['top', 'bottom']}>
              {/* Drawer Header */}
              <View style={styles.drawerHeader}>
                <TouchableOpacity onPress={closeDrawer} style={styles.drawerCloseButton}>
                  <MaterialIcons name="close" size={24} color={colors.text.primary} />
                </TouchableOpacity>
              </View>

              {/* User Info */}
              <View style={styles.drawerUserInfo}>
                {user.profilePhoto ? (
                  <Image source={{ uri: user.profilePhoto }} style={styles.drawerProfilePhoto} />
                ) : (
                  <View style={[styles.drawerProfilePhoto, styles.drawerProfilePhotoPlaceholder]}>
                    <MaterialIcons name="person" size={32} color={colors.text.secondary} />
                  </View>
                )}
                <Text style={styles.drawerUserName}>{user.fullName || 'User'}</Text>
                <Text style={styles.drawerUserPhone}>{user.phone || ''}</Text>
              </View>

              {/* Drawer Menu Items */}
              <View style={styles.drawerMenuItems}>
                <TouchableOpacity 
                  onPress={() => {
                    closeDrawer();
                    setActiveTab('History');
                  }} 
                  style={styles.drawerMenuItem}
                >
                  <MaterialIcons name="history" size={24} color={colors.text.primary} />
                  <Text style={styles.drawerMenuItemText}>History</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={() => {
                    closeDrawer();
                    setActiveTab('Profile');
                  }} 
                  style={styles.drawerMenuItem}
                >
                  <MaterialIcons name="person" size={24} color={colors.text.primary} />
                  <Text style={styles.drawerMenuItemText}>Profile</Text>
                </TouchableOpacity>
                
                <View style={styles.drawerMenuDivider} />
                
                <TouchableOpacity 
                  onPress={handleLogout} 
                  style={styles.drawerMenuItem}
                >
                  <MaterialIcons name="logout" size={24} color={colors.error.main} />
                  <Text style={[styles.drawerMenuItemText, { color: colors.error.main }]}>
                    Logout
                  </Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    width: '100%',
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
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
  menuButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  logo: {
    ...typography.h2,
    fontWeight: 'bold',
    color: colors.primary.main,
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
    maxHeight: 50,
  },
  tabBarScroll: {
    flexGrow: 0,
  },
  tabBarContent: {
    paddingLeft: spacing.sm,
    paddingRight: 0,
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginHorizontal: spacing.xs,
    borderRadius: spacing.sm,
    gap: spacing.xs,
    minWidth: 70,
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: colors.primary.light,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary.main,
  },
  tabLabel: {
    ...typography.small,
    fontSize: 11,
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
  // Drawer Styles
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: colors.cardBackground,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  drawerContent: {
    flex: 1,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  drawerCloseButton: {
    padding: spacing.xs,
  },
  drawerUserInfo: {
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  drawerProfilePhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: spacing.md,
  },
  drawerProfilePhotoPlaceholder: {
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawerUserName: {
    ...typography.h3,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  drawerUserPhone: {
    ...typography.body,
    color: colors.text.secondary,
  },
  drawerMenuItems: {
    padding: spacing.md,
  },
  drawerMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: spacing.sm,
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  drawerMenuItemText: {
    ...typography.body,
    fontWeight: '500',
    color: colors.text.primary,
  },
  drawerMenuDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
});

export default ClientDashboard;

