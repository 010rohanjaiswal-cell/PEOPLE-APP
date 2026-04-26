/**
 * Client Dashboard - People App
 * Main dashboard with tab navigation for clients
 */

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, Animated, Dimensions, PanResponder, BackHandler, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRoute, useNavigation } from '@react-navigation/native';
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
import { useLocation } from '../../context/LocationContext';
import { clientJobsAPI } from '../../api/clientJobs';
import { hasSeenIntro } from '../../utils/introSeen';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.75; // 75% of screen width

function parseActiveJobsResponse(response) {
  if (response?.success && Array.isArray(response.jobs)) return response.jobs;
  if (Array.isArray(response?.jobs)) return response.jobs;
  if (Array.isArray(response)) return response;
  return [];
}

// Tab Screens
import PostJobScreen from './PostJob';
import MyJobsScreen from './MyJobs';
import HistoryScreen from './History';
import ProfileScreen from './Profile';
import SettingsScreen from './Settings';
import ClientSupportScreen from './ClientSupport';
import ClientSupportChatScreen from './ClientSupportChat';

function createClientDashboardStyles(colors) {
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
  notificationButton: {
    padding: spacing.xs,
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
    backgroundColor: colors.background,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  tabBarScroll: {
    flexGrow: 0,
  },
  tabBarContent: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  tabRow: {
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
    minHeight: 40,
  },
  tabButtonActive: {
    backgroundColor: colors.primary.main,
    shadowColor: colors.primary.main,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  tabLabel: {
    ...typography.body,
    fontSize: 15,
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
    overflow: 'hidden',
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

const ClientDashboard = () => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const { requestPermission } = useLocation();
  const route = useRoute();
  const navigation = useNavigation();
  const introCheckedRef = useRef(false);
  const [activeTab, setActiveTab] = useState('PostJob');
  const [pendingOpenApplicationsJobId, setPendingOpenApplicationsJobId] = useState(null);
  // Stack of drawer screens so back goes through history: e.g. [Wallet, Profile, Settings] -> back -> [Wallet, Profile] -> back -> [Wallet] -> back -> []
  const [drawerScreenStack, setDrawerScreenStack] = useState([]);
  /** When opening Support Chat after startTicket, ticket is applied before first paint. */
  const supportChatBootstrapTicketRef = useRef(null);
  const [logoutError, setLogoutError] = useState('');
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerAnimation] = useState(new Animated.Value(-DRAWER_WIDTH));
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);

  const activeDrawerScreen = drawerScreenStack.length > 0 ? drawerScreenStack[drawerScreenStack.length - 1] : null;

  /** When returning to main tabs: My Jobs if any active job, else Post Job. */
  const goToMainTabPreferringMyJobs = useCallback(async () => {
    try {
      const response = await clientJobsAPI.getActiveJobs();
      const list = parseActiveJobsResponse(response);
      setActiveTab(list.length > 0 ? 'MyJobs' : 'PostJob');
    } catch (e) {
      console.warn('ClientDashboard: active jobs check failed', e?.message);
      setActiveTab('PostJob');
    }
  }, []);

  /** If client has any active job, switch to My Jobs (does not force Post Job — for focus / resume). */
  const switchToMyJobsIfActiveJobs = useCallback(async () => {
    try {
      const response = await clientJobsAPI.getActiveJobs();
      const list = parseActiveJobsResponse(response);
      if (list.length > 0) setActiveTab('MyJobs');
    } catch (e) {
      console.warn('ClientDashboard: active jobs check failed', e?.message);
    }
  }, []);

  const clearPendingOpenApplications = useCallback(() => setPendingOpenApplicationsJobId(null), []);

  // Top tabs - only Post Job and My Jobs
  const tabs = [
    { key: 'PostJob', labelKey: 'postJob', icon: 'add-circle', component: PostJobScreen },
    { key: 'MyJobs', labelKey: 'myJobs', icon: 'work', component: MyJobsScreen },
  ];

  const handleDrawerBack = () => {
    setDrawerScreenStack((s) => {
      const next = s.slice(0, -1);
      if (next.length === 0) {
        goToMainTabPreferringMyJobs();
      }
      return next;
    });
  };

  // Ask for GPS when user lands on client dashboard (ensures dialog shows at right time)
  useEffect(() => {
    const t = setTimeout(() => {
      requestPermission();
    }, 600);
    return () => clearTimeout(t);
  }, [requestPermission]);

  // Only prefer My Jobs once when the dashboard first mounts. Running this on every focus
  // (useFocusEffect) fires again after native overlays (map, location sheets) and yanks the user
  // off Post Job while picking an address.
  useEffect(() => {
    switchToMyJobsIfActiveJobs();
  }, [switchToMyJobsIfActiveJobs]);

  // First visit: show client intro once per user.
  useEffect(() => {
    if (introCheckedRef.current) return;
    introCheckedRef.current = true;
    (async () => {
      const seen = await hasSeenIntro(user, 'client');
      if (!seen) {
        navigation.reset({ index: 0, routes: [{ name: 'ClientIntro' }] });
      }
    })();
  }, [navigation, user]);

  // Push notification tap: switch tab / open applications modal (params from AppNavigator)
  useEffect(() => {
    const pa = route.params?.pushAction;
    if (!pa) return;
    setDrawerScreenStack([]);
    if (pa.tab === 'MyJobs') {
      setActiveTab('MyJobs');
      setPendingOpenApplicationsJobId(pa.openApplicationsJobId ?? null);
    }
    navigation.setParams({ pushAction: undefined });
  }, [route.params?.pushAction, navigation]);

  // Do not switch tabs on every AppState "active" — the location permission dialog (and other
  // system sheets) triggers that and would jump to My Jobs while posting a job.

  // Swipe gesture to switch between Post Job and My Jobs (with slide animation)
  // Keep both screens mounted and slide between them to avoid jank from mounting PostJob/MyJobs mid-swipe.
  const swipeX = useRef(new Animated.Value(activeTab === 'MyJobs' ? -SCREEN_WIDTH : 0)).current;
  const swipeAnimInFlightRef = useRef(false);
  const swipeStartXRef = useRef(0);

  const animateToTab = useCallback(
    (nextTab, onDone) => {
      if (swipeAnimInFlightRef.current) return;
      const targetX = nextTab === 'MyJobs' ? -SCREEN_WIDTH : 0;
      swipeAnimInFlightRef.current = true;
      Animated.timing(swipeX, {
        toValue: targetX,
        // Make "back" (MyJobs -> PostJob) feel snappier.
        duration: nextTab === 'PostJob' ? 170 : 200,
        useNativeDriver: true,
      }).start(() => {
        swipeAnimInFlightRef.current = false;
        if (typeof onDone === 'function') onDone();
      });
    },
    [swipeX]
  );

  // When tab changes via tap/pushAction, animate to it.
  useEffect(() => {
    if (activeDrawerScreen) return;
    if (activeTab !== 'PostJob' && activeTab !== 'MyJobs') return;
    animateToTab(activeTab);
  }, [activeTab, activeDrawerScreen, animateToTab]);

  const panResponder = useMemo(() => {
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gesture) => {
        if (activeDrawerScreen) return false;
        if (swipeAnimInFlightRef.current) return false;
        // Only handle swipe between PostJob <-> MyJobs.
        if (activeTab !== 'PostJob' && activeTab !== 'MyJobs') return false;
        const dx = Math.abs(gesture.dx);
        const dy = Math.abs(gesture.dy);
        // Edge swipe only (start near left/right edge) so we don't interfere with PostJob's internal pager.
        const EDGE = 24;
        const startedOnEdge = gesture.x0 <= EDGE || gesture.x0 >= SCREEN_WIDTH - EDGE;
        if (!startedOnEdge) return false;
        return dx > 12 && dx > dy * 1.2;
      },
      onPanResponderGrant: () => {
        swipeX.stopAnimation((value) => {
          swipeStartXRef.current = Number(value) || 0;
        });
      },
      onPanResponderMove: (_evt, gesture) => {
        if (activeDrawerScreen) return;
        if (swipeAnimInFlightRef.current) return;
        if (activeTab === 'PostJob' && gesture.dx > 0) return;
        if (activeTab === 'MyJobs' && gesture.dx < 0) return;
        const next = swipeStartXRef.current + gesture.dx;
        const clamped = Math.max(-SCREEN_WIDTH, Math.min(0, next));
        swipeX.setValue(clamped);
      },
      onPanResponderRelease: (_evt, gesture) => {
        if (activeDrawerScreen) return;
        if (swipeAnimInFlightRef.current) return;
        const threshold = 70;
        if (activeTab === 'PostJob' && gesture.dx < -threshold) {
          // Animate first, then commit tab state (prevents hitch before animation starts).
          animateToTab('MyJobs', () => setActiveTab('MyJobs'));
          return;
        }
        if (activeTab === 'MyJobs' && gesture.dx > threshold) {
          // Animate first, then commit tab state (prevents hitch before animation starts).
          animateToTab('PostJob', () => setActiveTab('PostJob'));
          return;
        }
        // Snap back to the current tab.
        animateToTab(activeTab);
      },
      onPanResponderTerminate: () => {
        animateToTab(activeTab);
      },
    });
  }, [activeDrawerScreen, activeTab, animateToTab, swipeX]);

  // Stable elements to avoid re-render churn during tab commits.
  const onJobPosted = useCallback(() => setActiveTab('MyJobs'), []);
  const postJobElement = useMemo(() => <PostJobScreen onJobPosted={onJobPosted} />, [onJobPosted]);
  const myJobsElement = useMemo(
    () => (
      <MyJobsScreen
        openApplicationsJobId={pendingOpenApplicationsJobId}
        onConsumeOpenApplicationsJobId={clearPendingOpenApplications}
      />
    ),
    [pendingOpenApplicationsJobId, clearPendingOpenApplications]
  );

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

  const handleDrawerNavigation = (screenKey, extra) => {
    if (screenKey === 'SupportChat' && extra?.bootstrapTicket) {
      supportChatBootstrapTicketRef.current = extra.bootstrapTicket;
    }
    setDrawerScreenStack((s) => [...s, screenKey]);
    setActiveTab(null);
    closeDrawer();
  };

  const goToSupportAfterChatEnd = () => {
    // Ensure we land on Support page (not Dashboard) after ending a chat.
    setDrawerScreenStack(['Support']);
    setActiveTab(null);
  };

  const drawerScreens = {
    History: HistoryScreen,
    Profile: ProfileScreen,
    Settings: SettingsScreen,
    Support: (props) => <ClientSupportScreen {...props} onNavigate={handleDrawerNavigation} />,
    SupportChat: (props) => (
      <ClientSupportChatScreen
        {...props}
        onBack={handleDrawerBack}
        onEndChat={goToSupportAfterChatEnd}
        bootstrapTicketRef={supportChatBootstrapTicketRef}
      />
    ),
  };

  const getActiveScreen = () => {
    if (activeDrawerScreen && drawerScreens[activeDrawerScreen]) {
      return drawerScreens[activeDrawerScreen];
    }
    return tabs.find((tab) => tab.key === activeTab)?.component || PostJobScreen;
  };
  const ActiveScreen = getActiveScreen();

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
            if (next.length === 0) {
              goToMainTabPreferringMyJobs();
            }
            return next;
          });
          return true;
        }
        return false;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [goToMainTabPreferringMyJobs])
  );

  const handleLogout = () => {
    closeDrawer();
    setLogoutModalVisible(true);
  };

  const confirmLogout = async () => {
    setLogoutModalVisible(false);
    try {
      // TODO: Check for active jobs before logout
      // For now, just logout
      await logout();
    } catch (error) {
      setLogoutError(t('common.logoutFailed'));
      setTimeout(() => setLogoutError(''), 5000);
    }
  };

  const { colors } = useTheme();
  const styles = useMemo(() => createClientDashboardStyles(colors), [colors]);

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

        {/* Error Message */}
        {logoutError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{logoutError}</Text>
          </View>
        ) : null}

        {/* Top Tab Bar - only show for PostJob/MyJobs */}
        {!activeDrawerScreen && tabs.some(tab => tab.key === activeTab) && (
          <View style={styles.tabBar}>
            <View style={styles.tabRow}>
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
      <View style={styles.tabContent} {...(!activeDrawerScreen ? panResponder.panHandlers : {})}>
        {activeDrawerScreen ? (
          <ActiveScreen />
        ) : (
          <Animated.View
            style={{
              flex: 1,
              flexDirection: 'row',
              width: SCREEN_WIDTH * 2,
              transform: [{ translateX: swipeX }],
            }}
          >
            <View style={{ width: SCREEN_WIDTH, flex: 1 }} pointerEvents={activeTab === 'PostJob' ? 'auto' : 'none'}>
              {postJobElement}
            </View>
            <View style={{ width: SCREEN_WIDTH, flex: 1 }} pointerEvents={activeTab === 'MyJobs' ? 'auto' : 'none'}>
              {myJobsElement}
            </View>
          </Animated.View>
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
                    <Text style={styles.drawerUserName}>{user.fullName || t('common.user')}</Text>
                    <Text style={styles.drawerUserPhone}>{user.phone || ''}</Text>
                  </View>
                </View>
              </View>

              {/* Drawer Menu Items */}
              <View style={styles.drawerMenuItems}>
                <TouchableOpacity 
                  onPress={() => {
                    setDrawerScreenStack([]);
                    closeDrawer();
                    goToMainTabPreferringMyJobs();
                  }} 
                  style={styles.drawerMenuItem}
                >
                  <MaterialIcons name="dashboard" size={24} color={colors.text.primary} />
                  <Text style={styles.drawerMenuItemText}>{t('common.dashboard')}</Text>
                </TouchableOpacity>
                <View style={styles.drawerMenuDivider} />
                <TouchableOpacity 
                  onPress={() => handleDrawerNavigation('History')} 
                  style={styles.drawerMenuItem}
                >
                  <MaterialIcons name="history" size={24} color={colors.text.primary} />
                  <Text style={styles.drawerMenuItemText}>{t('dashboard.history')}</Text>
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

export default ClientDashboard;

