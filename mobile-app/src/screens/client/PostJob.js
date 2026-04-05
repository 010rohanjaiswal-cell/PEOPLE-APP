/**
 * Post Job Screen - People App
 * Form to create a new job posting
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Alert,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { spacing, typography } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { Input, Card, CardContent } from '../../components/common';
import AddressPickerModal from '../../components/modals/AddressPickerModal';
import { validateRequired, validatePincode } from '../../utils/validation';
import {
  sanitizeJobTextInput,
  MAX_JOB_TITLE_LEN,
  MAX_JOB_DESCRIPTION_LEN,
  isValidJobTitle,
  isValidJobDescription,
  hasUnsupportedJobChars,
} from '../../utils/jobTextPolicy';
import { isJobTextBlockedByWords } from '../../utils/jobBlockedWords';
import { clientJobsAPI } from '../../api/clientJobs';
import { useLocation } from '../../context/LocationContext';
import { useLanguage } from '../../context/LanguageContext';
import { JOB_CATEGORIES, JOB_CATEGORY_I18N_KEYS } from '../../constants/jobCategories';

/**
 * Scroll so the focused field stays just below the top padding of the scroll area
 * (avoids scrollToEnd / fixed Y which jump to the bottom or wrong position).
 */
function createScrollFieldIntoView(scrollViewRef) {
  return (fieldWrapperRef) => {
    const scroll = scrollViewRef.current;
    const field = fieldWrapperRef?.current;
    if (!scroll || !field || typeof field.measureLayout !== 'function') return;

    const pad = Platform.OS === 'ios' ? 18 : 22;
    const delay = Platform.OS === 'ios' ? 110 : 160;

    const run = () => {
      field.measureLayout(
        scroll,
        (_x, y) => {
          scroll.scrollTo({ y: Math.max(0, y - pad), animated: true });
        },
        () => {}
      );
    };
    requestAnimationFrame(() => setTimeout(run, delay));
  };
}

function createPostJobStyles(colors, isDark) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.sm,
    paddingBottom: spacing.xxl || 120,
  },
  card: {
    width: '100%',
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  fieldContainer: {
    marginBottom: spacing.xs,
  },
  fieldWithErrorWrap: {
    position: 'relative',
    padding: 2,
    borderRadius: spacing.sm,
  },
  /** Wrapper for measureLayout + scrollTo (keyboard). No layout change. */
  measureFieldWrap: {},
  errorBorderBox: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: colors.error.main,
    borderRadius: spacing.sm,
  },
  label: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  inputField: {
    marginBottom: spacing.xs,
  },
  inputWrapper: {
    marginBottom: spacing.xs,
  },
  descriptionWrapper: {
    marginBottom: spacing.xl,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  categoryButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  categoryButtonActive: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.light,
  },
  categoryText: {
    ...typography.body,
    color: isDark ? colors.text.primary : colors.text.secondary,
  },
  categoryTextActive: {
    color: isDark ? colors.text.primary : colors.primary.main,
    fontWeight: '600',
  },
  genderContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  genderButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
  },
  genderButtonActive: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.light,
  },
  genderText: {
    ...typography.body,
    color: isDark ? colors.text.primary : colors.text.secondary,
  },
  genderTextActive: {
    color: isDark ? colors.text.primary : colors.primary.main,
    fontWeight: '600',
  },
  submitButton: {
    width: '100%',
    minHeight: 52,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
    backgroundColor: colors.primary.main,
    borderRadius: spacing.borderRadius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: typography.button.fontSize,
    fontWeight: typography.button.fontWeight,
  },
  buttonIcon: {
    marginRight: spacing.sm,
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
    justifyContent: 'center',
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
  modalSubmitButton: {
    backgroundColor: colors.primary.main,
  },
  modalSubmitText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  successModalButton: {
    backgroundColor: colors.success.main,
  },
  successIconContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  errorModalButton: {
    backgroundColor: colors.error.main,
  },
  verifyModalContent: {
    width: '88%',
    maxWidth: 400,
    backgroundColor: colors.cardBackground,
    borderRadius: spacing.md,
    padding: spacing.lg,
    alignItems: 'center',
  },
  verifyProgressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  verifyProgressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.primary.main,
  },
  verifyModalTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  verifyStatusText: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    minHeight: 48,
    paddingHorizontal: spacing.xs,
  },
  verifyProgressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  verifyProgressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.primary.main,
  },
  verifySpinnerWrap: {
    marginTop: spacing.xs,
  },
  gpsMessageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warning.light,
    padding: spacing.md,
    borderRadius: spacing.sm,
    marginBottom: spacing.md,
  },
  gpsMessageBoxText: {
    ...typography.body,
    color: colors.text.primary,
    flex: 1,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  deliveryRouteContainer: {
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  deliveryLegCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.cardBackground,
  },
  deliveryLegCardFrom: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary.main,
  },
  deliveryLegCardTo: {
    borderLeftWidth: 4,
    borderLeftColor: colors.success.main,
  },
  deliveryLegTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 2,
    gap: spacing.xs,
  },
  deliveryLegLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text.primary,
    letterSpacing: 0.3,
  },
  deliveryLegDash: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  deliveryLegHint: {
    ...typography.small,
    color: colors.text.secondary,
    flex: 1,
    flexShrink: 1,
  },
  deliveryMicroHint: {
    ...typography.small,
    color: colors.text.muted,
    marginBottom: spacing.sm,
  },
  deliveryPinRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  deliveryPinField: {
    flex: 1,
    maxWidth: 240,
  },
});
}

const PostJob = ({ onJobPosted }) => {
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createPostJobStyles(colors, isDark), [colors, isDark]);
  const insets = useSafeAreaInsets();
  const { gpsEnabled, gpsDenied } = useLocation();
  const scrollViewRef = useRef(null);
  const scrollFieldIntoView = useMemo(() => createScrollFieldIntoView(scrollViewRef), []);
  const fromAddrWrapRef = useRef(null);
  const toAddrWrapRef = useRef(null);
  const budgetWrapRef = useRef(null);
  const ndAddressWrapRef = useRef(null);
  const descriptionWrapRef = useRef(null);
  const [keyboardPad, setKeyboardPad] = useState(0);

  /** Android: KAV offset. iOS: rely on ScrollView automaticallyAdjustKeyboardInsets + measure scroll. */
  const keyboardVerticalOffset =
    Platform.OS === 'android' ? Math.max(insets.top, 12) + 100 : 0;

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardPad(e.endCoordinates?.height ?? 0)
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardPad(0)
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const focusScrollToField = (ref) => scrollFieldIntoView(ref);
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    address: '',
    pincode: '',
    jobLat: null,
    jobLng: null,
    deliveryFromAddress: '',
    deliveryFromPincode: '',
    deliveryToAddress: '',
    deliveryToPincode: '',
    budget: '',
    gender: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [notAppropriateModalVisible, setNotAppropriateModalVisible] = useState(false);
  const [verifyingModalVisible, setVerifyingModalVisible] = useState(false);
  const [moderationRejectedVisible, setModerationRejectedVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [addressPickerVisible, setAddressPickerVisible] = useState(false);
  const [addressPickerTarget, setAddressPickerTarget] = useState(null); // 'address'|'deliveryFrom'|'deliveryTo'
  const verifyProgressAnim = useRef(new Animated.Value(0)).current;
  const titleBorderOpacity = useRef(new Animated.Value(0)).current;
  const categoryBorderOpacity = useRef(new Animated.Value(0)).current;
  const addressBorderOpacity = useRef(new Animated.Value(0)).current;
  const budgetBorderOpacity = useRef(new Animated.Value(0)).current;
  const genderBorderOpacity = useRef(new Animated.Value(0)).current;
  const fromAddrBorderOpacity = useRef(new Animated.Value(0)).current;
  const toAddrBorderOpacity = useRef(new Animated.Value(0)).current;
  const borderOpacity = {
    title: titleBorderOpacity,
    category: categoryBorderOpacity,
    address: addressBorderOpacity,
    budget: budgetBorderOpacity,
    gender: genderBorderOpacity,
    fromAddr: fromAddrBorderOpacity,
    toAddr: toAddrBorderOpacity,
  };

  const genders = ['Male', 'Female', 'Any'];

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const openAddressPicker = (target) => {
    setAddressPickerTarget(target);
    setAddressPickerVisible(true);
  };

  const applyPickedAddress = ({ address, pincode, lat, lng }, target) => {
    if (target === 'deliveryFrom') {
      setFormData((prev) => ({
        ...prev,
        deliveryFromAddress: String(address || ''),
        deliveryFromPincode: String(pincode || ''),
      }));
      return;
    }
    if (target === 'deliveryTo') {
      setFormData((prev) => ({
        ...prev,
        deliveryToAddress: String(address || ''),
        deliveryToPincode: String(pincode || ''),
        jobLat: lat ?? prev.jobLat,
        jobLng: lng ?? prev.jobLng,
      }));
      return;
    }
    setFormData((prev) => ({
      ...prev,
      address: String(address || ''),
      pincode: String(pincode || ''),
      jobLat: lat ?? prev.jobLat,
      jobLng: lng ?? prev.jobLng,
    }));
  };

  const handleTitleChange = (value) => {
    const cleaned = sanitizeJobTextInput(value).slice(0, MAX_JOB_TITLE_LEN);
    setFormData((prev) => ({ ...prev, title: cleaned }));
  };

  const handleDescriptionChange = (value) => {
    const cleaned = sanitizeJobTextInput(value).slice(0, MAX_JOB_DESCRIPTION_LEN);
    setFormData((prev) => ({ ...prev, description: cleaned }));
  };

  const runErrorBorderAnimation = (animValue) => {
    animValue.setValue(1);
    Animated.sequence([
      Animated.delay(100),
      Animated.timing(animValue, {
        toValue: 0,
        duration: 1200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const isDelivery = String(formData.category || '').trim().toLowerCase() === 'delivery';

  const handleSubmit = async () => {
    if (gpsDenied || !gpsEnabled) {
      runErrorBorderAnimation(borderOpacity.title);
      return;
    }
    if (!validateRequired(formData.title)) {
      runErrorBorderAnimation(borderOpacity.title);
      return;
    }
    if (!isValidJobTitle(formData.title)) {
      runErrorBorderAnimation(borderOpacity.title);
      Alert.alert(t('common.error'), t('postJob.titleInvalidAlphanumeric'));
      return;
    }
    if (hasUnsupportedJobChars(formData.title)) {
      runErrorBorderAnimation(borderOpacity.title);
      Alert.alert(t('common.error'), t('postJob.onlyEnglishHindi'));
      return;
    }
    if (!isDelivery && !isValidJobDescription(formData.description)) {
      Alert.alert(t('common.error'), t('postJob.descriptionInvalidAlphanumeric'));
      return;
    }
    if (!isDelivery && hasUnsupportedJobChars(formData.description)) {
      Alert.alert(t('common.error'), t('postJob.onlyEnglishHindi'));
      return;
    }
    if (!formData.category) {
      runErrorBorderAnimation(borderOpacity.category);
      return;
    }

    if (isDelivery) {
      if (!validateRequired(formData.deliveryFromAddress)) {
        runErrorBorderAnimation(borderOpacity.fromAddr);
        return;
      }
      if (!validatePincode(formData.deliveryFromPincode)) {
        runErrorBorderAnimation(borderOpacity.fromAddr);
        return;
      }
      if (!validateRequired(formData.deliveryToAddress)) {
        runErrorBorderAnimation(borderOpacity.toAddr);
        return;
      }
      if (!validatePincode(formData.deliveryToPincode)) {
        runErrorBorderAnimation(borderOpacity.toAddr);
        return;
      }
    } else {
      if (!validateRequired(formData.address)) {
        runErrorBorderAnimation(borderOpacity.address);
        return;
      }
      if (!validatePincode(formData.pincode)) {
        runErrorBorderAnimation(borderOpacity.address);
        return;
      }
      if (!formData.gender) {
        runErrorBorderAnimation(borderOpacity.gender);
        return;
      }
    }

    const budgetNum = parseFloat(String(formData.budget || '').replace(/,/g, ''));
    if (!Number.isFinite(budgetNum) || budgetNum < 10) {
      runErrorBorderAnimation(borderOpacity.budget);
      Alert.alert(t('common.error'), t('jobs.budgetMin10'));
      return;
    }

    const blocked = isJobTextBlockedByWords(formData.title, formData.description);
    if (blocked.blocked) {
      runErrorBorderAnimation(borderOpacity.title);
      setNotAppropriateModalVisible(true);
      return;
    }

    try {
      setVerifyingModalVisible(true);
      verifyProgressAnim.setValue(0);
      Animated.loop(
        Animated.sequence([
          Animated.timing(verifyProgressAnim, { toValue: 1, duration: 1400, useNativeDriver: false }),
          Animated.timing(verifyProgressAnim, { toValue: 0, duration: 800, useNativeDriver: false }),
        ])
      ).start();
      setLoading(true);

      const categoryTrimmed = String(formData.category || '').trim();
      const base = {
        title: String(formData.title || '').trim(),
        category: categoryTrimmed,
        budget: budgetNum,
      };
      const jobData = isDelivery
        ? {
            ...base,
            category: categoryTrimmed || 'Delivery',
            deliveryFromAddress: formData.deliveryFromAddress.trim(),
            deliveryFromPincode: formData.deliveryFromPincode.trim(),
            deliveryToAddress: formData.deliveryToAddress.trim(),
            deliveryToPincode: formData.deliveryToPincode.trim(),
            jobLat: formData.jobLat,
            jobLng: formData.jobLng,
          }
        : {
            ...base,
            address: formData.address,
            pincode: formData.pincode,
            jobLat: formData.jobLat,
            jobLng: formData.jobLng,
            gender: formData.gender.toLowerCase(),
            description: formData.description || null,
          };

      const result = await clientJobsAPI.postJob(jobData);

      if (result.success) {
        setSuccessModalVisible(true);
      } else {
        throw new Error(result.error || t('postJob.failedToPostJob'));
      }
    } catch (err) {
      console.error('Error posting job:', err);
      const code = err.response?.data?.code;
      const serverErr = err.response?.data?.error;
      if (code === 'JOB_BLOCKED_WORD') {
        setNotAppropriateModalVisible(true);
      } else if (code === 'JOB_MODERATION_REJECTED' || code === 'JOB_SAFETY_REJECTED') {
        setModerationRejectedVisible(true);
      } else {
        Alert.alert(t('common.error'), serverErr || err.message || t('postJob.failedToPostJobTryAgain'));
      }
    } finally {
      setVerifyingModalVisible(false);
      verifyProgressAnim.stopAnimation();
      setLoading(false);
    }
  };

  const contentPaddingBottom = (spacing.xxl || 120) + keyboardPad + (Platform.OS === 'android' ? insets.bottom : 0);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'android' ? 'padding' : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: contentPaddingBottom }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        nestedScrollEnabled={true}
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      >
        {/* GPS banner is shown globally (ClientDashboard). Keep this screen uncluttered. */}
        <Card style={styles.card}>
        <CardContent>
          {/* Job Title */}
          <View style={styles.fieldWithErrorWrap}>
            <Animated.View style={[styles.errorBorderBox, { opacity: borderOpacity.title }]} pointerEvents="none" />
            <Input
              label={t('postJob.jobTitle')}
              placeholder={t('postJob.enterJobTitle')}
              value={formData.title}
              onChangeText={handleTitleChange}
              style={styles.inputField}
            />
          </View>

          {/* Category */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>{t('postJob.category')}</Text>
            <View style={styles.fieldWithErrorWrap}>
              <Animated.View style={[styles.errorBorderBox, { opacity: borderOpacity.category }]} pointerEvents="none" />
              <View style={styles.categoryGrid}>
                {JOB_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryButton, formData.category === cat && styles.categoryButtonActive]}
                    onPress={() => handleChange('category', cat)}
                  >
                    <Text style={[styles.categoryText, formData.category === cat && styles.categoryTextActive]}>
                      {t('postJob.category' + (JOB_CATEGORY_I18N_KEYS[cat] || cat))}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {isDelivery ? (
            <View style={styles.deliveryRouteContainer}>
              {/* From — address (pincode from Google selection) */}
              <View style={[styles.deliveryLegCard, styles.deliveryLegCardFrom]}>
                <View style={styles.deliveryLegTitleRow}>
                  <Text style={styles.deliveryLegLabel}>{t('jobs.fromShort')}</Text>
                  <Text style={styles.deliveryLegDash}>—</Text>
                  <Text style={styles.deliveryLegHint}>{t('postJob.deliveryFromHeading')}</Text>
                </View>
                <Text style={styles.deliveryMicroHint}>
                  {t('postJob.deliveryAddressHint')}
                </Text>
                <View
                  ref={fromAddrWrapRef}
                  collapsable={false}
                  style={styles.measureFieldWrap}
                >
                  <View style={styles.fieldWithErrorWrap}>
                    <Animated.View style={[styles.errorBorderBox, { opacity: borderOpacity.fromAddr }]} pointerEvents="none" />
                    <Input
                      label={t('postJob.address')}
                      placeholder={t('postJob.enterFromAddress')}
                      value={formData.deliveryFromAddress}
                      editable={false}
                      onPressIn={() => openAddressPicker('deliveryFrom')}
                      multiline
                      numberOfLines={2}
                      style={styles.inputField}
                      onFocus={() => focusScrollToField(fromAddrWrapRef)}
                    />
                  </View>
                </View>
              </View>

              {/* To — address (pincode from Google selection) */}
              <View style={[styles.deliveryLegCard, styles.deliveryLegCardTo]}>
                <View style={styles.deliveryLegTitleRow}>
                  <Text style={styles.deliveryLegLabel}>{t('jobs.toShort')}</Text>
                  <Text style={styles.deliveryLegDash}>—</Text>
                  <Text style={styles.deliveryLegHint}>{t('postJob.deliveryToHeading')}</Text>
                </View>
                <Text style={styles.deliveryMicroHint}>
                  {t('postJob.deliveryAddressHint')}
                </Text>
                <View
                  ref={toAddrWrapRef}
                  collapsable={false}
                  style={styles.measureFieldWrap}
                >
                  <View style={styles.fieldWithErrorWrap}>
                    <Animated.View style={[styles.errorBorderBox, { opacity: borderOpacity.toAddr }]} pointerEvents="none" />
                    <Input
                      label={t('postJob.address')}
                      placeholder={t('postJob.enterToAddress')}
                      value={formData.deliveryToAddress}
                      editable={false}
                      onPressIn={() => openAddressPicker('deliveryTo')}
                      multiline
                      numberOfLines={2}
                      style={styles.inputField}
                      onFocus={() => focusScrollToField(toAddrWrapRef)}
                    />
                  </View>
                </View>
              </View>
            </View>
          ) : (
            <>
              <View
                ref={ndAddressWrapRef}
                collapsable={false}
                style={styles.measureFieldWrap}
              >
                <View style={styles.fieldWithErrorWrap}>
                  <Animated.View style={[styles.errorBorderBox, { opacity: borderOpacity.address }]} pointerEvents="none" />
                  <Input
                    label={t('postJob.address')}
                    placeholder={t('postJob.enterAddress')}
                    value={formData.address}
                    editable={false}
                    onPressIn={() => openAddressPicker('address')}
                    style={styles.inputField}
                    onFocus={() => focusScrollToField(ndAddressWrapRef)}
                  />
                </View>
              </View>
            </>
          )}

          {/* Budget */}
          <View
            ref={budgetWrapRef}
            collapsable={false}
            style={[styles.inputWrapper, styles.fieldWithErrorWrap, styles.measureFieldWrap]}
            onStartShouldSetResponder={() => true}
          >
            <Animated.View style={[styles.errorBorderBox, { opacity: borderOpacity.budget }]} pointerEvents="none" />
            <Input
              label={t('postJob.budget')}
              placeholder={t('postJob.budgetPlaceholder')}
              value={formData.budget}
              onChangeText={(value) => handleChange('budget', value.replace(/\D/g, ''))}
              keyboardType="number-pad"
              style={styles.inputField}
              onFocus={() => focusScrollToField(budgetWrapRef)}
            />
          </View>

          {!isDelivery ? (
            <>
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>{t('postJob.genderPreference')}</Text>
                <View style={styles.fieldWithErrorWrap}>
                  <Animated.View style={[styles.errorBorderBox, { opacity: borderOpacity.gender }]} pointerEvents="none" />
                  <View style={styles.genderContainer}>
                    {genders.map((gen) => (
                      <TouchableOpacity
                        key={gen}
                        style={[styles.genderButton, formData.gender === gen && styles.genderButtonActive]}
                        onPress={() => handleChange('gender', gen)}
                      >
                        <Text style={[styles.genderText, formData.gender === gen && styles.genderTextActive]}>
                          {t('gender.' + (gen === 'Any' ? 'any' : gen.toLowerCase()))}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View
                ref={descriptionWrapRef}
                collapsable={false}
                style={[styles.descriptionWrapper, styles.measureFieldWrap]}
                onStartShouldSetResponder={() => true}
              >
                <Input
                  label={t('postJob.jobDescriptionOptional')}
                  placeholder={t('postJob.jobDescriptionPlaceholder')}
                  value={formData.description}
                  onChangeText={handleDescriptionChange}
                  multiline
                  numberOfLines={2}
                  style={styles.inputField}
                  onFocus={() => focusScrollToField(descriptionWrapRef)}
                />
              </View>
            </>
          ) : null}

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading || gpsDenied}
            style={[
              styles.submitButton,
              (gpsDenied || loading) && styles.submitButtonDisabled,
            ]}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="large" />
            ) : (
              <View style={styles.buttonContent}>
                <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
                <Text style={styles.buttonText}>{t('postJob.postJobButton')}</Text>
              </View>
            )}
          </TouchableOpacity>
        </CardContent>
      </Card>

      <Modal
        visible={notAppropriateModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNotAppropriateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIconContainer}>
              <MaterialIcons name="error" size={64} color={colors.error.main} />
            </View>
            <Text style={styles.modalTitle}>{t('common.error')}</Text>
            <Text style={styles.modalSubtitle}>{t('postJob.jobNotAppropriate')}</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSubmitButton, styles.errorModalButton]}
                onPress={() => setNotAppropriateModalVisible(false)}
              >
                <Text style={styles.modalSubmitText}>{t('common.ok')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={verifyingModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.verifyModalContent}>
            <ActivityIndicator size="large" color={colors.primary.main} />
            <Text style={[styles.verifyModalTitle, { marginTop: spacing.md }]}>{t('postJob.verifyModalTitle')}</Text>
            <Text style={styles.verifyStatusText}>{t('postJob.verifyReviewingPost')}</Text>
            <View style={styles.verifyProgressTrack}>
              <Animated.View
                style={[
                  styles.verifyProgressFill,
                  {
                    width: verifyProgressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['10%', '95%'],
                    }),
                  },
                ]}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={moderationRejectedVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModerationRejectedVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIconContainer}>
              <MaterialIcons name="error" size={64} color={colors.error.main} />
            </View>
            <Text style={styles.modalTitle}>{t('common.error')}</Text>
            <Text style={styles.modalSubtitle}>{t('postJob.jobModerationRejected')}</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSubmitButton, styles.errorModalButton]}
                onPress={() => setModerationRejectedVisible(false)}
              >
                <Text style={styles.modalSubmitText}>{t('common.ok')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <AddressPickerModal
        visible={addressPickerVisible}
        onClose={() => setAddressPickerVisible(false)}
        initialValue={{
          address:
            addressPickerTarget === 'deliveryFrom'
              ? formData.deliveryFromAddress
              : addressPickerTarget === 'deliveryTo'
                ? formData.deliveryToAddress
                : formData.address,
          pincode:
            addressPickerTarget === 'deliveryFrom'
              ? formData.deliveryFromPincode
              : addressPickerTarget === 'deliveryTo'
                ? formData.deliveryToPincode
                : formData.pincode,
          lat: formData.jobLat,
          lng: formData.jobLng,
        }}
        onSelect={(picked) => applyPickedAddress(picked, addressPickerTarget)}
      />

      {/* Success Modal */}
      <Modal
        visible={successModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setSuccessModalVisible(false);
          // Clear form
          setFormData({
            title: '',
            category: '',
            address: '',
            pincode: '',
            jobLat: null,
            jobLng: null,
            deliveryFromAddress: '',
            deliveryFromPincode: '',
            deliveryToAddress: '',
            deliveryToPincode: '',
            budget: '',
            gender: '',
            description: '',
          });
          // Navigate to My Jobs tab after closing success modal
          if (onJobPosted) {
            onJobPosted();
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIconContainer}>
              <MaterialIcons name="check-circle" size={64} color={colors.success.main} />
            </View>
            <Text style={styles.modalTitle}>{t('postJob.jobPostedSuccessfully')}</Text>
            <Text style={styles.modalSubtitle}>
              {t('postJob.jobPostedSuccessMessage')}
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSubmitButton, styles.successModalButton]}
                onPress={() => {
                  setSuccessModalVisible(false);
                  // Clear form
                  setFormData({
                    title: '',
                    category: '',
                    address: '',
                    pincode: '',
                    jobLat: null,
                    jobLng: null,
                    deliveryFromAddress: '',
                    deliveryFromPincode: '',
                    deliveryToAddress: '',
                    deliveryToPincode: '',
                    budget: '',
                    gender: '',
                    description: '',
                  });
                  // Notify parent (ClientDashboard) to switch to My Jobs tab
                  if (typeof onJobPosted === 'function') {
                    onJobPosted();
                  }
                }}
              >
                <Text style={styles.modalSubmitText}>{t('common.ok')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default PostJob;

