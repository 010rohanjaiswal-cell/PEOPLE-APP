/**
 * Settings Screen - Freelancer Dashboard
 * Settings and preferences for freelancers
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  Pressable,
  ActivityIndicator,
  Alert,
  TextInput,
  FlatList,
  Platform,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { spacing, typography } from '../../theme';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent } from '../../components/common';
import PrivacyPolicy from '../common/PrivacyPolicy';
import TermsAndConditions from '../common/TermsAndConditions';
import About from '../common/About';
import RefundPolicy from '../common/RefundPolicy';
import HelpAndSupport from '../common/HelpAndSupport';
import { APP_VERSION_DISPLAY } from '../../constants/appVersion';
import { labelForJobCategory, normalizePreferenceCategory } from '../../constants/categorySubcategories';
import {
  buildJobCategoryPreferenceList,
  filterJobCategoryPreferenceList,
} from '../../constants/jobCategoryPreferenceList';
import { freelancerJobsAPI } from '../../api/freelancerJobs';

function buildSettingsStyles(colors, isDark) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: spacing.lg,
    },
    card: {
      width: '100%',
      marginBottom: spacing.md,
    },
    sectionTitle: {
      ...typography.h3,
      color: colors.text.primary,
      marginBottom: spacing.md,
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    settingInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: spacing.md,
    },
    settingText: {
      flex: 1,
    },
    settingLabel: {
      ...typography.body,
      color: colors.text.primary,
      fontWeight: '500',
      marginBottom: spacing.xs,
    },
    settingDescription: {
      ...typography.small,
      color: colors.text.secondary,
    },
    settingLabelSelected: {
      color: colors.primary.main,
      fontWeight: '700',
    },
    versionText: {
      ...typography.body,
      color: colors.text.secondary,
    },
    modalWrap: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      height: '85%',
      maxHeight: '85%',
      overflow: 'hidden',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      ...typography.h3,
      fontSize: 18,
      color: colors.text.primary,
      fontWeight: '700',
      flex: 1,
    },
    modalList: {
      flex: 1,
    },
    modalListContent: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
    },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: Platform.OS === 'ios' ? spacing.sm : 0,
      borderRadius: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      gap: spacing.sm,
    },
    searchInput: {
      flex: 1,
      ...typography.body,
      color: colors.text.primary,
      paddingVertical: spacing.sm,
    },
    categoryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      overflow: 'hidden',
    },
    categoryRowOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: isDark ? '#FFFFFF' : '#000000',
    },
    categoryRowSub: {
      paddingLeft: spacing.lg,
    },
    categoryRowActive: {
      backgroundColor: colors.primary.light,
    },
    categoryRowText: {
      ...typography.body,
      color: colors.text.primary,
      fontWeight: '600',
      flex: 1,
    },
    clearRow: {
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    clearRowText: {
      ...typography.body,
      color: colors.text.secondary,
      fontWeight: '700',
    },
  });
}

function PreferenceCategoryRow({
  item,
  active,
  disabled,
  isDark,
  label,
  onPress,
  styles,
  colors,
}) {
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const animateOverlay = (toValue) => {
    Animated.timing(overlayOpacity, {
      toValue,
      duration: toValue ? 70 : 140,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => animateOverlay(1)}
      onPressOut={() => animateOverlay(0)}
      disabled={disabled}
      android_ripple={{ color: 'rgba(0,0,0,0.14)' }}
    >
      <View
        style={[
          styles.categoryRow,
          item.isSub && styles.categoryRowSub,
          active && styles.categoryRowActive,
        ]}
      >
        <Text
          style={[
            styles.categoryRowText,
            item.isSub && { fontWeight: '500' },
            !item.isSub && item.section && { fontWeight: '700' },
          ]}
          numberOfLines={2}
        >
          {label}
        </Text>
        {active ? <MaterialIcons name="check" size={22} color={colors.primary.main} /> : null}
        <Animated.View
          pointerEvents="none"
          style={[styles.categoryRowOverlay, { opacity: overlayOpacity.interpolate({
            inputRange: [0, 1],
            outputRange: [0, isDark ? 0.12 : 0.1],
          }) }]}
        />
      </View>
    </Pressable>
  );
}

const Settings = ({ onNavigate, showToast }) => {
  const { t } = useLanguage();
  const { colors, isDark, setDarkMode } = useTheme();
  const { user, mergeUser } = useAuth();
  const styles = useMemo(() => buildSettingsStyles(colors, isDark), [colors, isDark]);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTermsAndConditions, setShowTermsAndConditions] = useState(false);
  const [showRefundPolicy, setShowRefundPolicy] = useState(false);
  const [showHelpAndSupport, setShowHelpAndSupport] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [preferenceModalVisible, setPreferenceModalVisible] = useState(false);
  const [jobCategoryPreference, setJobCategoryPreference] = useState(user?.jobCategoryPreference ?? null);
  const [preferenceLoading, setPreferenceLoading] = useState(false);
  const [preferenceSaving, setPreferenceSaving] = useState(false);
  const [preferenceSearch, setPreferenceSearch] = useState('');
  const saveInFlightRef = useRef(false);

  const categoryLabel = useCallback((cat) => (cat ? labelForJobCategory(t, cat) : ''), [t]);
  const preferenceList = useMemo(() => buildJobCategoryPreferenceList(), []);
  const filteredPreferenceList = useMemo(
    () => filterJobCategoryPreferenceList(preferenceList, preferenceSearch, categoryLabel),
    [preferenceList, preferenceSearch, categoryLabel]
  );

  const openPreferenceModal = () => {
    setPreferenceSearch('');
    setPreferenceModalVisible(true);
  };

  const closePreferenceModal = () => {
    setPreferenceSearch('');
    setPreferenceModalVisible(false);
  };

  const loadPreference = useCallback(async () => {
    try {
      setPreferenceLoading(true);
      const res = await freelancerJobsAPI.getJobCategoryPreference();
      if (res?.success) {
        const next = normalizePreferenceCategory(res.category) || null;
        setJobCategoryPreference(next);
        mergeUser({ jobCategoryPreference: next });
      }
    } catch (err) {
      console.error('Failed to load job preference:', err);
    } finally {
      setPreferenceLoading(false);
    }
  }, [mergeUser]);

  useEffect(() => {
    loadPreference();
  }, [loadPreference]);

  const savePreference = async (category) => {
    if (saveInFlightRef.current) return;

    const normalized = category ? normalizePreferenceCategory(category) : null;
    const previous = jobCategoryPreference;

    setPreferenceModalVisible(false);
    setPreferenceSearch('');
    setJobCategoryPreference(normalized);
    mergeUser({ jobCategoryPreference: normalized });

    saveInFlightRef.current = true;
    setPreferenceSaving(true);

    try {
      const res = await freelancerJobsAPI.setJobCategoryPreference(normalized);
      if (!res?.success) {
        setJobCategoryPreference(previous);
        mergeUser({ jobCategoryPreference: previous });
        const msg = res?.error || t('common.error');
        if (showToast) showToast(msg);
        else Alert.alert(t('common.error'), msg);
        return;
      }
      const next = normalizePreferenceCategory(res.category) || null;
      setJobCategoryPreference(next);
      mergeUser({ jobCategoryPreference: next });
      const msg = next ? t('settings.preferenceSaved') : t('settings.preferenceCleared');
      if (showToast) showToast(msg);
    } catch (err) {
      console.error('Failed to save job preference:', err);
      setJobCategoryPreference(previous);
      mergeUser({ jobCategoryPreference: previous });
      const msg = err.response?.data?.error || t('common.error');
      if (showToast) showToast(msg);
      else Alert.alert(t('common.error'), msg);
    } finally {
      saveInFlightRef.current = false;
      setPreferenceSaving(false);
    }
  };

  if (showPrivacyPolicy) {
    return <PrivacyPolicy onClose={() => setShowPrivacyPolicy(false)} />;
  }

  if (showTermsAndConditions) {
    return <TermsAndConditions onClose={() => setShowTermsAndConditions(false)} />;
  }

  if (showRefundPolicy) {
    return <RefundPolicy onClose={() => setShowRefundPolicy(false)} />;
  }

  if (showHelpAndSupport) {
    return <HelpAndSupport onClose={() => setShowHelpAndSupport(false)} />;
  }

  if (showAbout) {
    return <About onClose={() => setShowAbout(false)} />;
  }

  return (
    <>
      <ScrollView style={styles.container}>
        <Card style={styles.card}>
          <CardContent>
            <Text style={styles.sectionTitle}>{t('settings.appearance')}</Text>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <MaterialIcons name="dark-mode" size={24} color={colors.text.primary} />
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>{t('settings.darkMode')}</Text>
                  <Text style={styles.settingDescription}>{t('settings.darkModeDesc')}</Text>
                </View>
              </View>
              <Switch
                value={isDark}
                onValueChange={setDarkMode}
                trackColor={{ false: colors.border, true: colors.primary.main }}
                thumbColor={colors.cardBackground}
              />
            </View>
          </CardContent>
        </Card>

        <Card style={styles.card}>
          <CardContent>
            <Text style={styles.sectionTitle}>{t('settings.jobNotifications')}</Text>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={openPreferenceModal}
              activeOpacity={0.75}
            >
              <View style={styles.settingInfo}>
                <MaterialIcons name="notifications-active" size={24} color={colors.text.primary} />
                <View style={styles.settingText}>
                  {preferenceLoading ? (
                    <ActivityIndicator size="small" color={colors.primary.main} style={{ marginBottom: spacing.xs }} />
                  ) : (
                    <Text
                      style={[styles.settingLabel, jobCategoryPreference && styles.settingLabelSelected]}
                    >
                      {jobCategoryPreference
                        ? categoryLabel(jobCategoryPreference)
                        : t('settings.selectPreference')}
                    </Text>
                  )}
                  <Text style={styles.settingDescription}>{t('settings.selectPreferenceDesc')}</Text>
                </View>
              </View>
              <MaterialIcons name="expand-more" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </CardContent>
        </Card>

        <Card style={styles.card}>
          <CardContent>
            <Text style={styles.sectionTitle}>{t('settings.account')}</Text>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => setShowPrivacyPolicy(true)}
            >
              <View style={styles.settingInfo}>
                <MaterialIcons name="lock" size={24} color={colors.text.primary} />
                <Text style={styles.settingLabel}>{t('settings.privacySecurity')}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={colors.text.secondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => setShowTermsAndConditions(true)}
            >
              <View style={styles.settingInfo}>
                <MaterialIcons name="description" size={24} color={colors.text.primary} />
                <Text style={styles.settingLabel}>{t('settings.termsAndConditions')}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={colors.text.secondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => setShowRefundPolicy(true)}
            >
              <View style={styles.settingInfo}>
                <MaterialIcons name="money-off" size={24} color={colors.text.primary} />
                <Text style={styles.settingLabel}>{t('settings.refundPolicy')}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={colors.text.secondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => setShowHelpAndSupport(true)}
            >
              <View style={styles.settingInfo}>
                <MaterialIcons name="help" size={24} color={colors.text.primary} />
                <Text style={styles.settingLabel}>{t('settings.helpSupport')}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={colors.text.secondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => setShowAbout(true)}
            >
              <View style={styles.settingInfo}>
                <MaterialIcons name="info" size={24} color={colors.text.primary} />
                <Text style={styles.settingLabel}>{t('settings.about')}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </CardContent>
        </Card>

        <Card style={styles.card}>
          <CardContent>
            <Text style={styles.sectionTitle}>{t('settings.appVersion')}</Text>
            <Text style={styles.versionText}>{APP_VERSION_DISPLAY}</Text>
          </CardContent>
        </Card>
      </ScrollView>

      <Modal
        visible={preferenceModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closePreferenceModal}
      >
        <View style={styles.modalWrap}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closePreferenceModal} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('settings.chooseCategoryPreference')}</Text>
              <TouchableOpacity
                onPress={closePreferenceModal}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <MaterialIcons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchWrap}>
              <MaterialIcons name="search" size={22} color={colors.text.secondary} />
              <TextInput
                style={styles.searchInput}
                value={preferenceSearch}
                onChangeText={setPreferenceSearch}
                placeholder={t('settings.searchCategories')}
                placeholderTextColor={colors.text.secondary}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
              />
              {preferenceSearch ? (
                <TouchableOpacity
                  onPress={() => setPreferenceSearch('')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialIcons name="close" size={20} color={colors.text.secondary} />
                </TouchableOpacity>
              ) : null}
            </View>

            <FlatList
              style={styles.modalList}
              contentContainerStyle={styles.modalListContent}
              data={filteredPreferenceList}
              keyExtractor={(item) => item.value}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={24}
              maxToRenderPerBatch={32}
              windowSize={10}
              ListEmptyComponent={
                <Text style={[styles.settingDescription, { textAlign: 'center', paddingVertical: spacing.lg }]}>
                  {t('settings.noCategoriesFound')}
                </Text>
              }
              ListFooterComponent={
                <TouchableOpacity
                  style={styles.clearRow}
                  onPress={() => savePreference(null)}
                  disabled={preferenceSaving || !jobCategoryPreference}
                >
                  {preferenceSaving ? (
                    <ActivityIndicator size="small" color={colors.text.secondary} />
                  ) : (
                    <Text style={styles.clearRowText}>{t('settings.clearPreference')}</Text>
                  )}
                </TouchableOpacity>
              }
              renderItem={({ item }) => (
                <PreferenceCategoryRow
                  item={item}
                  active={jobCategoryPreference === item.value}
                  disabled={preferenceSaving}
                  isDark={isDark}
                  label={categoryLabel(item.value)}
                  onPress={() => savePreference(item.value)}
                  styles={styles}
                  colors={colors}
                />
              )}
            />
          </View>
        </View>
      </Modal>
    </>
  );
};

export default Settings;
