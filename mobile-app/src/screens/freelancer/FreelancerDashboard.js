/**
 * Freelancer Dashboard - People App
 * Main dashboard with tab navigation for freelancers
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Modal, Animated, Dimensions, ActivityIndicator, BackHandler, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { spacing, typography } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import NotificationBell from '../../components/common/NotificationBell';
import LanguageSelector from '../../components/common/LanguageSelector';
import NotificationModal from '../../components/modals/NotificationModal';
import GpsBanner from '../../components/common/GpsBanner';
import NotificationPermissionBanner from '../../components/common/NotificationPermissionBanner';
import { useLocation } from '../../context/LocationContext';
import { userAPI, verificationAPI } from '../../api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.75; // 75% of screen width

// Tab Screens
import AvailableJobsScreen from './AvailableJobs';
import MyJobsScreen from './MyJobs';
import WalletScreen from './Wallet';
import OrdersScreen from './Orders';
import ProfileScreen from './Profile';
import SettingsScreen from './Settings';
import ReferralScreen from './Referral';
import SupportScreen from './Support';
import SupportChatScreen from './SupportChat';

function createFreelancerDashboardStyles(colors) {
  return StyleSheet.create({
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
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageSelector: {
    marginRight: 0,
  },
  menuButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  notificationButton: {
    padding: spacing.xs,
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
    backgroundColor: colors.background,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  tabBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: spacing.md,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.sm,
    gap: spacing.xs,
    minHeight: 44,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  tabButtonActive: {
    backgroundColor: colors.primary.main,
    shadowColor: colors.primary.main,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  tabLabel: {
    ...typography.body,
    fontSize: typography.body.fontSize,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#FFFFFF',
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  drawerProfilePhoto: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: spacing.md,
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
  drawerUserMeta: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  drawerUserTextBlock: {
    flex: 1,
  },
  drawerRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  drawerRatingText: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
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
  },
  drawerMenuItemText: {
    ...typography.body,
    fontWeight: '500',
    color: colors.text.primary,
    flex: 1,
  },
  drawerMenuDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: colors.cardBackground,
    borderRadius: spacing.md,
    padding: spacing.lg,
    maxWidth: 400,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  modalSubtitle: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  modalButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: spacing.sm,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelText: {
    ...typography.body,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  modalSubmitButton: {
    backgroundColor: colors.primary.main,
  },
  modalSubmitText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  logoutModalButton: {
    backgroundColor: colors.error.main,
  },
});
}

const FreelancerDashboard = () => {
  const { user, logout, updateUser } = useAuth();
  const { t } = useLanguage();
  const { requestPermission, checkPermission } = useLocation();
  const [activeTab, setActiveTab] = useState('AvailableJobs');

  // Ask for GPS when user lands on freelancer dashboard (ensures dialog shows at right time)
  useEffect(() => {
    const t = setTimeout(() => {
      requestPermission();
    }, 600);
    return () => clearTimeout(t);
  }, [requestPermission]);

  // Stack of drawer screens so back follows history: e.g. Dashboard -> Wallet -> Profile -> Settings -> Orders; back -> Orders -> Settings -> Profile -> Wallet -> Dashboard
  const [drawerScreenStack, setDrawerScreenStack] = useState([]);
  const [logoutError, setLogoutError] = useState('');
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerAnimation] = useState(new Animated.Value(-DRAWER_WIDTH));
  const [verification, setVerification] = useState(null);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);

  const formatRatingCount = (rawCount) => {
    const count = Number(rawCount || 0);
    if (!Number.isFinite(count) || count <= 0) return '0';
    if (count < 1000) return String(Math.floor(count));
    if (count < 1000000) return `${Math.floor(count / 1000)}k`;
    return `${Math.floor(count / 1000000)}M`;
  };

  const activeDrawerScreen = drawerScreenStack.length > 0 ? drawerScreenStack[drawerScreenStack.length - 1] : null;

  // Re-check when this screen gains focus (LocationContext also polls + AppState globally).
  useFocusEffect(
    useCallback(() => {
      checkPermission();
    }, [checkPermission])
  );

  const refreshUserProfile = useCallback(async () => {
    try {
      const profileResponse = await userAPI.getProfile();
      if (profileResponse.success && profileResponse.user) {
        await updateUser(profileResponse.user);

        if (profileResponse.user.verification) {
          setVerification(profileResponse.user.verification);
        }
      }

      // Also try to fetch verification data directly
      try {
        const verificationResponse = await verificationAPI.getVerificationStatus();
        if (verificationResponse.success) {
          let verificationData = null;
          if (verificationResponse.verification) {
            verificationData = verificationResponse.verification;
          } else if (verificationResponse.data?.verification) {
            verificationData = verificationResponse.data.verification;
          } else if (verificationResponse.data) {
            verificationData = verificationResponse.data;
          }
          if (verificationData) {
            setVerification(verificationData);
          }
        }
      } catch (verificationError) {
        // Silently fail - verification data is optional
      }
    } catch (error) {
      console.error('Error refreshing user profile:', error);
    }
  }, [updateUser]);

  // Refresh user profile on mount to get updated profile photo/rating
  useEffect(() => {
    refreshUserProfile();
  }, [refreshUserProfile]);

  const tabs = [
    { key: 'AvailableJobs', labelKey: 'available', icon: 'work', component: AvailableJobsScreen },
    { key: 'MyJobs', labelKey: 'myJobs', icon: 'check-circle', component: MyJobsScreen },
  ];

  const handleDrawerBack = () => {
    setDrawerScreenStack((s) => {
      const next = s.slice(0, -1);
      if (next.length === 0) setActiveTab('AvailableJobs');
      return next;
    });
  };

  // Drawer menu items (screens accessible from drawer)
  const drawerScreens = {
    Wallet: WalletScreen,
    Orders: OrdersScreen,
    Profile: ProfileScreen,
    Settings: SettingsScreen,
    Referral: ReferralScreen,
    Support: (props) => <SupportScreen {...props} onNavigate={handleDrawerNavigation} />,
    SupportChat: (props) => <SupportChatScreen {...props} onBack={handleDrawerBack} />,
  };

  // Determine which screen to show
  const getActiveScreen = () => {
    if (activeDrawerScreen && drawerScreens[activeDrawerScreen]) {
      return drawerScreens[activeDrawerScreen];
    }
    return tabs.find(tab => tab.key === activeTab)?.component || AvailableJobsScreen;
  };
  const ActiveScreen = getActiveScreen();

  const toggleDrawer = async () => {
    if (drawerVisible) {
      // Close drawer
      Animated.timing(drawerAnimation, {
        toValue: -DRAWER_WIDTH,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setDrawerVisible(false));
    } else {
      // Open drawer
      // Refresh profile in background; do NOT block drawer (avoids hanging on slow/cold network)
      refreshUserProfile();
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

  // Push drawer screen onto stack so back follows history
  const handleDrawerNavigation = (screenKey) => {
    setDrawerScreenStack(s => [...s, screenKey]);
    setActiveTab(null); // Clear tab selection when navigating to drawer screen
    closeDrawer();
  };

  // Refs so BackHandler always reads latest state (useFocusEffect callback doesn't re-run when stack changes)
  const drawerVisibleRef = useRef(drawerVisible);
  const drawerScreenStackRef = useRef(drawerScreenStack);
  drawerVisibleRef.current = drawerVisible;
  drawerScreenStackRef.current = drawerScreenStack;

  // Android back: only when this screen is focused. First close drawer, then pop stack, then allow exit. useFocusEffect so we run after navigator.
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return;
      const onBack = () => {
        if (drawerVisibleRef.current) {
          closeDrawer();
          return true;
        }
        if (drawerScreenStackRef.current.length > 0) {
          setDrawerScreenStack(s => {
            const next = s.slice(0, -1);
            if (next.length === 0) setActiveTab('AvailableJobs');
            return next;
          });
          return true;
        }
        return false;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [])
  );

  const handleLogout = () => {
    closeDrawer();
    setLogoutModalVisible(true);
  };

  const confirmLogout = async () => {
    setLogoutModalVisible(false);
    try {
      // TODO: Check for active jobs before logout (Phase 4)
      // For now, just logout
      await logout();
    } catch (error) {
      setLogoutError(t('common.logoutFailed'));
      setTimeout(() => setLogoutError(''), 5000);
    }
  };

  const { colors } = useTheme();
  const styles = useMemo(() => createFreelancerDashboardStyles(colors), [colors]);

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
          <Text style={styles.logo}>{t('common.appName')}</Text>
        </View>
        <View style={styles.rightSection}>
          <LanguageSelector style={styles.languageSelector} />
          <NotificationBell
            onPress={() => setNotificationModalVisible(true)}
            style={styles.notificationButton}
          />
        </View>
      </View>

      <GpsBanner />
      <NotificationPermissionBanner />

        {/* Error Message */}
        {logoutError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{logoutError}</Text>
          </View>
        ) : null}

        {/* Top Tab Bar - Only show when not viewing drawer screens */}
        {!activeDrawerScreen && (
          <View style={styles.tabBar}>
            <View style={styles.tabBarContent}>
              {tabs.map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => {
                    setActiveTab(tab.key);
                    setDrawerScreenStack([]); // Clear drawer stack when selecting tab
                  }}
                  style={[
                    styles.tabButton,
                    activeTab === tab.key && styles.tabButtonActive,
                  ]}
                >
                  <MaterialIcons
                    name={tab.icon}
                    size={20}
                    color={activeTab === tab.key ? '#FFFFFF' : colors.text.secondary}
                  />
                  <Text
                    style={[
                      styles.tabLabel,
                      activeTab === tab.key && styles.tabLabelActive,
                    ]}
                    numberOfLines={1}
                  >
                    {t('dashboard.' + tab.labelKey)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

      {/* Tab Content */}
      <View style={styles.tabContent}>
        {activeTab === 'AvailableJobs' ? (
          <AvailableJobsScreen onJobPickedUp={() => setActiveTab('MyJobs')} />
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
                <View style={styles.drawerUserMeta}>
                  <View style={styles.drawerUserTextBlock}>
                    <Text style={styles.drawerUserName}>
                      {verification?.fullName || user.verification?.fullName || user.fullName || t('common.freelancer')}
                    </Text>
                    <Text style={styles.drawerUserPhone}>{user.phone || ''}</Text>
                  </View>
                  {Number(user?.ratingCount || 0) > 0 &&
                  Number.isFinite(Number(user?.averageRating)) ? (
                    <View style={styles.drawerRatingRow}>
                      <MaterialIcons name="star" size={18} color={colors.warning.main} />
                      <Text style={styles.drawerRatingText}>
                        {Number(user.averageRating).toFixed(1)} ({formatRatingCount(user.ratingCount)})
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>

              {/* Drawer Menu Items */}
              <View style={styles.drawerMenuItems}>
                <TouchableOpacity 
                  onPress={() => {
                    setDrawerScreenStack([]);
                    setActiveTab('AvailableJobs');
                    closeDrawer();
                  }} 
                  style={styles.drawerMenuItem}
                >
                  <MaterialIcons name="dashboard" size={24} color={colors.text.primary} />
                  <Text style={styles.drawerMenuItemText}>{t('common.dashboard')}</Text>
                </TouchableOpacity>
                
                <View style={styles.drawerMenuDivider} />
                
                <TouchableOpacity 
                  onPress={() => handleDrawerNavigation('Wallet')} 
                  style={styles.drawerMenuItem}
                >
                  <MaterialIcons name="account-balance-wallet" size={24} color={colors.text.primary} />
                  <Text style={styles.drawerMenuItemText}>{t('dashboard.wallet')}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={() => handleDrawerNavigation('Orders')} 
                  style={styles.drawerMenuItem}
                >
                  <MaterialIcons name="receipt" size={24} color={colors.text.primary} />
                  <Text style={styles.drawerMenuItemText}>{t('dashboard.orders')}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={() => handleDrawerNavigation('Profile')} 
                  style={styles.drawerMenuItem}
                >
                  <MaterialIcons name="person" size={24} color={colors.text.primary} />
                  <Text style={styles.drawerMenuItemText}>{t('dashboard.profile')}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={() => handleDrawerNavigation('Settings')} 
                  style={styles.drawerMenuItem}
                >
                  <MaterialIcons name="settings" size={24} color={colors.text.primary} />
                  <Text style={styles.drawerMenuItemText}>{t('dashboard.settings')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleDrawerNavigation('Referral')}
                  style={styles.drawerMenuItem}
                >
                  <MaterialIcons name="card-giftcard" size={24} color={colors.text.primary} />
                  <Text style={styles.drawerMenuItemText}>{t('referral.title')}</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={() => handleDrawerNavigation('Support')}
                  style={styles.drawerMenuItem}
                >
                  <MaterialIcons name="support-agent" size={24} color={colors.text.primary} />
                  <Text style={styles.drawerMenuItemText}>{t('dashboard.support')}</Text>
                </TouchableOpacity>
                
                <View style={styles.drawerMenuDivider} />
                
                <TouchableOpacity 
                  onPress={handleLogout} 
                  style={styles.drawerMenuItem}
                >
                  <MaterialIcons name="logout" size={24} color={colors.error.main} />
                  <Text style={[styles.drawerMenuItemText, { color: colors.error.main }]}>
                    {t('common.logout')}
                  </Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={logoutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('common.logout')}</Text>
            <Text style={styles.modalSubtitle}>
              {t('common.logoutConfirmMessage')}
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setLogoutModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSubmitButton, styles.logoutModalButton]}
                onPress={confirmLogout}
              >
                <Text style={styles.modalSubmitText}>{t('common.logout')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Notification Modal */}
      <NotificationModal
        visible={notificationModalVisible}
        onClose={() => setNotificationModalVisible(false)}
      />
    </SafeAreaView>
  );
};

export default FreelancerDashboard;

