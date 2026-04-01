/**
 * Edit Job Modal - People App
 * Modal for editing job details
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { spacing, typography } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { Button, Input } from '../common';
import AddressPickerModal from './AddressPickerModal';
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
import { isDeliveryCategory } from '../../utils/jobDisplay';

function createEditJobModalStyles(themeColors, isDark) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modal: {
      backgroundColor: themeColors.background,
      borderRadius: spacing.lg,
      maxHeight: '90%',
      width: '90%',
      maxWidth: 500,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
    },
    title: {
      ...typography.h2,
      color: themeColors.text.primary,
    },
    closeButton: {
      padding: spacing.xs,
    },
    content: {
      padding: spacing.lg,
      maxHeight: 500,
    },
    errorContainer: {
      backgroundColor: themeColors.error.light,
      borderWidth: 1,
      borderColor: themeColors.error.main,
      borderRadius: spacing.sm,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    errorText: {
      ...typography.small,
      color: themeColors.error.main,
      textAlign: 'center',
    },
    selectContainer: {
      marginBottom: spacing.md,
    },
    label: {
      ...typography.body,
      fontWeight: '600',
      color: themeColors.text.primary,
      marginBottom: spacing.sm,
    },
    selectGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    selectRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    selectOption: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: spacing.sm,
      borderWidth: 1,
      borderColor: themeColors.border,
      backgroundColor: themeColors.cardBackground,
    },
    selectOptionActive: {
      borderColor: themeColors.primary.main,
      backgroundColor: themeColors.primary.light,
    },
    selectOptionText: {
      ...typography.body,
      color: isDark ? themeColors.text.primary : themeColors.text.secondary,
    },
    selectOptionTextActive: {
      color: isDark ? themeColors.text.primary : themeColors.primary.main,
      fontWeight: '600',
    },
    footer: {
      flexDirection: 'row',
      gap: spacing.md,
      padding: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: themeColors.border,
    },
    cancelButton: {
      flex: 1,
      minHeight: 52,
      paddingVertical: spacing.md,
    },
    submitButton: {
      flex: 1,
      minHeight: 52,
      paddingVertical: spacing.md,
    },
    alertOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    alertCard: {
      width: '88%',
      maxWidth: 380,
      backgroundColor: themeColors.cardBackground,
      borderRadius: spacing.md,
      padding: spacing.lg,
      alignItems: 'center',
    },
    alertTitle: {
      ...typography.h3,
      color: themeColors.text.primary,
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
      textAlign: 'center',
    },
    alertSubtitle: {
      ...typography.body,
      color: themeColors.text.secondary,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    alertButton: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: spacing.sm,
      backgroundColor: themeColors.error.main,
      minWidth: 120,
      alignItems: 'center',
    },
    alertButtonText: {
      ...typography.body,
      color: '#FFFFFF',
      fontWeight: '700',
    },

    verifyCard: {
      width: '88%',
      maxWidth: 400,
      backgroundColor: themeColors.cardBackground,
      borderRadius: spacing.md,
      padding: spacing.lg,
      alignItems: 'center',
    },
    verifyTitle: {
      ...typography.h3,
      color: themeColors.text.primary,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
      textAlign: 'center',
    },
    verifySubtitle: {
      ...typography.body,
      color: themeColors.text.secondary,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    verifyProgressTrack: {
      width: '100%',
      height: 8,
      borderRadius: 4,
      backgroundColor: themeColors.border,
      overflow: 'hidden',
    },
    verifyProgressFill: {
      height: '100%',
      borderRadius: 4,
      backgroundColor: themeColors.primary.main,
    },
  });
}

const EditJobModal = ({ visible, job, onClose, onSuccess }) => {
  const { t } = useLanguage();
  const { colors: themeColors, isDark } = useTheme();
  const styles = useMemo(
    () => createEditJobModalStyles(themeColors, isDark),
    [themeColors, isDark]
  );
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    address: '',
    pincode: '',
    jobLat: null,
    jobLng: null,
    budget: '',
    gender: '',
    description: '',
    deliveryFromAddress: '',
    deliveryFromPincode: '',
    deliveryToAddress: '',
    deliveryToPincode: '',
  });
  const [loading, setLoading] = useState(false);
  const [notAppropriateModalVisible, setNotAppropriateModalVisible] = useState(false);
  const [verifyingModalVisible, setVerifyingModalVisible] = useState(false);
  const [moderationRejectedVisible, setModerationRejectedVisible] = useState(false);
  const [error, setError] = useState('');
  const verifyProgressAnim = useRef(new Animated.Value(0)).current;
  const [addressPickerVisible, setAddressPickerVisible] = useState(false);
  const [addressPickerTarget, setAddressPickerTarget] = useState(null); // 'address'|'deliveryFrom'|'deliveryTo'

  const categories = [
    'Delivery',
    'Cooking',
    'Cleaning',
    'Plumbing',
    'Electrical',
    'Mechanic',
    'Driver',
    'Care taker',
    'Tailor',
    'Barber',
    'Laundry',
    'Other',
  ];

  const genders = ['Male', 'Female', 'Any'];

  useEffect(() => {
    if (job && visible) {
      setFormData({
        title: sanitizeJobTextInput(job.title || '').slice(0, MAX_JOB_TITLE_LEN),
        category: job.category || '',
        address: job.address || '',
        pincode: job.pincode || '',
        jobLat: job.jobLat ?? null,
        jobLng: job.jobLng ?? null,
        budget: job.budget?.toString() || '',
        gender: job.gender ? job.gender.charAt(0).toUpperCase() + job.gender.slice(1) : '',
        description: sanitizeJobTextInput(job.description || '').slice(0, MAX_JOB_DESCRIPTION_LEN),
        deliveryFromAddress: job.deliveryFromAddress || '',
        deliveryFromPincode: job.deliveryFromPincode || '',
        deliveryToAddress: job.deliveryToAddress || '',
        deliveryToPincode: job.deliveryToPincode || '',
      });
      setError('');
    }
  }, [job, visible]);

  useEffect(() => {
    if (!visible) {
      setLoading(false);
      setError('');
      setVerifyingModalVisible(false);
      verifyProgressAnim.stopAnimation();
    }
  }, [visible]);

  const handleChange = (field, value) => {
    let next = value;
    if (field === 'title') {
      next = sanitizeJobTextInput(value).slice(0, MAX_JOB_TITLE_LEN);
    } else if (field === 'description') {
      next = sanitizeJobTextInput(value).slice(0, MAX_JOB_DESCRIPTION_LEN);
    }
    setFormData((prev) => ({ ...prev, [field]: next }));
    setError('');
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

  const handleSubmit = async () => {
    const delivery = isDeliveryCategory(formData.category);

    // Validation
    if (!validateRequired(formData.title)) {
      setError(t('jobs.pleaseEnterJobTitle'));
      return;
    }
    if (!isValidJobTitle(formData.title)) {
      setError(t('postJob.titleInvalidAlphanumeric'));
      return;
    }
    if (hasUnsupportedJobChars(formData.title)) {
      setError(t('postJob.onlyEnglishHindi'));
      return;
    }
    if (!delivery && !isValidJobDescription(formData.description)) {
      setError(t('postJob.descriptionInvalidAlphanumeric'));
      return;
    }
    if (!delivery && hasUnsupportedJobChars(formData.description)) {
      setError(t('postJob.onlyEnglishHindi'));
      return;
    }
    if (!formData.category) {
      setError(t('jobs.pleaseSelectCategory'));
      return;
    }
    if (!formData.budget || parseFloat(formData.budget) < 10) {
      setError(t('jobs.budgetMin10'));
      return;
    }

    if (delivery) {
      if (!validateRequired(formData.deliveryFromAddress)) {
        setError(t('jobs.deliveryEnterFrom'));
        return;
      }
      if (!validatePincode(formData.deliveryFromPincode)) {
        setError(t('jobs.pleaseEnterValidPincode'));
        return;
      }
      if (!validateRequired(formData.deliveryToAddress)) {
        setError(t('jobs.deliveryEnterTo'));
        return;
      }
      if (!validatePincode(formData.deliveryToPincode)) {
        setError(t('jobs.pleaseEnterValidPincode'));
        return;
      }
    } else {
      if (!validateRequired(formData.address)) {
        setError(t('jobs.pleaseEnterAddress'));
        return;
      }
      if (!validatePincode(formData.pincode)) {
        setError(t('jobs.pleaseEnterValidPincode'));
        return;
      }
      if (!formData.gender) {
        setError(t('jobs.pleaseSelectGender'));
        return;
      }
    }

    const blocked = isJobTextBlockedByWords(formData.title, formData.description);
    if (blocked.blocked) {
      setNotAppropriateModalVisible(true);
      return;
    }

    try {
      setVerifyingModalVisible(true);
      verifyProgressAnim.setValue(0);
      Animated.loop(
        Animated.sequence([
          Animated.timing(verifyProgressAnim, {
            toValue: 1,
            duration: 1400,
            useNativeDriver: false,
          }),
          Animated.timing(verifyProgressAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: false,
          }),
        ])
      ).start();
      setLoading(true);
      setError('');

      const jobData = delivery
        ? {
            title: formData.title,
            category: formData.category,
            budget: parseFloat(formData.budget),
            gender: 'any',
            description: null,
            deliveryFromAddress: String(formData.deliveryFromAddress).trim(),
            deliveryFromPincode: String(formData.deliveryFromPincode).trim(),
            deliveryToAddress: String(formData.deliveryToAddress).trim(),
            deliveryToPincode: String(formData.deliveryToPincode).trim(),
            jobLat: formData.jobLat,
            jobLng: formData.jobLng,
          }
        : {
            title: formData.title,
            category: formData.category,
            address: formData.address,
            pincode: formData.pincode,
            jobLat: formData.jobLat,
            jobLng: formData.jobLng,
            budget: parseFloat(formData.budget),
            gender: formData.gender.toLowerCase(),
            description: formData.description || null,
          };

      const result = await clientJobsAPI.updateJob(job._id, jobData);

      if (result.success) {
        Alert.alert(t('common.success'), t('jobs.jobUpdatedSuccess'));
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setError(result.error || t('jobs.failedUpdateJob'));
      }
    } catch (err) {
      console.error('Error updating job:', err);
      const code = err.response?.data?.code;
      const serverErr = err.response?.data?.error;
      if (code === 'JOB_BLOCKED_WORD') {
        setNotAppropriateModalVisible(true);
      } else if (code === 'JOB_MODERATION_REJECTED' || code === 'JOB_SAFETY_REJECTED') {
        setModerationRejectedVisible(true);
      } else if (code === 'JOB_UNSUPPORTED_LANGUAGE') {
        setError(t('postJob.onlyEnglishHindi'));
      } else {
        setError(serverErr || err.message || t('jobs.failedUpdateJob'));
      }
    } finally {
      setVerifyingModalVisible(false);
      verifyProgressAnim.stopAnimation();
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Edit Job</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              disabled={loading}
            >
              <MaterialIcons name="close" size={24} color={themeColors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Input
              label="Job Title"
              value={formData.title}
              onChangeText={(value) => handleChange('title', value)}
              placeholder="Enter job title"
            />

            <View style={styles.selectContainer}>
              <Text style={styles.label}>Category</Text>
              <View style={styles.selectGrid}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.selectOption,
                      formData.category === cat && styles.selectOptionActive,
                    ]}
                    onPress={() => handleChange('category', cat)}
                  >
                    <Text
                      style={[
                        styles.selectOptionText,
                        formData.category === cat && styles.selectOptionTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {isDeliveryCategory(formData.category) ? (
              <>
                <Input
                  label={t('postJob.fromAddress')}
                  value={formData.deliveryFromAddress}
                  editable={false}
                  onPressIn={() => openAddressPicker('deliveryFrom')}
                  placeholder={t('postJob.enterFromAddress')}
                  multiline
                />
                <Input
                  label={t('postJob.fromPincode')}
                  value={formData.deliveryFromPincode}
                  editable={false}
                  onPressIn={() => openAddressPicker('deliveryFrom')}
                  placeholder={t('postJob.pincodePlaceholder')}
                  keyboardType="numeric"
                  maxLength={6}
                />
                <Input
                  label={t('postJob.toAddress')}
                  value={formData.deliveryToAddress}
                  editable={false}
                  onPressIn={() => openAddressPicker('deliveryTo')}
                  placeholder={t('postJob.enterToAddress')}
                  multiline
                />
                <Input
                  label={t('postJob.toPincode')}
                  value={formData.deliveryToPincode}
                  editable={false}
                  onPressIn={() => openAddressPicker('deliveryTo')}
                  placeholder={t('postJob.pincodePlaceholder')}
                  keyboardType="numeric"
                  maxLength={6}
                />
              </>
            ) : (
              <>
                <Input
                  label="Address"
                  value={formData.address}
                  editable={false}
                  onPressIn={() => openAddressPicker('address')}
                  placeholder="Enter address"
                  multiline
                />

                <Input
                  label="Pincode"
                  value={formData.pincode}
                  editable={false}
                  onPressIn={() => openAddressPicker('address')}
                  placeholder="e.g., 400001"
                  keyboardType="numeric"
                  maxLength={6}
                />
              </>
            )}

            <Input
              label="Budget (₹)"
              value={formData.budget}
              onChangeText={(value) => handleChange('budget', value)}
              placeholder="1000"
              keyboardType="numeric"
            />

            {!isDeliveryCategory(formData.category) ? (
              <>
                <View style={styles.selectContainer}>
                  <Text style={styles.label}>Gender</Text>
                  <View style={styles.selectRow}>
                    {genders.map((gen) => (
                      <TouchableOpacity
                        key={gen}
                        style={[
                          styles.selectOption,
                          formData.gender === gen && styles.selectOptionActive,
                        ]}
                        onPress={() => handleChange('gender', gen)}
                      >
                        <Text
                          style={[
                            styles.selectOptionText,
                            formData.gender === gen && styles.selectOptionTextActive,
                          ]}
                        >
                          {gen}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <Input
                  label="Job Description (Optional)"
                  value={formData.description}
                  onChangeText={(value) => handleChange('description', value)}
                  placeholder="Describe the job requirements, tasks, or any additional details..."
                  multiline
                  numberOfLines={3}
                />
              </>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <Button
              variant="outline"
              onPress={onClose}
              style={styles.cancelButton}
              textStyle={{ color: themeColors.text.primary }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onPress={handleSubmit} loading={loading} style={styles.submitButton}>
              Update Job
            </Button>
          </View>
        </View>
      </View>

      <Modal
        visible={notAppropriateModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNotAppropriateModalVisible(false)}
      >
        <View style={styles.alertOverlay}>
          <View style={styles.alertCard}>
            <MaterialIcons name="error" size={54} color={themeColors.error.main} />
            <Text style={styles.alertTitle}>{t('common.error')}</Text>
            <Text style={styles.alertSubtitle}>{t('postJob.jobNotAppropriate')}</Text>
            <TouchableOpacity
              style={styles.alertButton}
              onPress={() => setNotAppropriateModalVisible(false)}
            >
              <Text style={styles.alertButtonText}>{t('common.ok')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={verifyingModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.alertOverlay}>
          <View style={styles.verifyCard}>
            <ActivityIndicator size="large" color={themeColors.primary.main} />
            <Text style={styles.verifyTitle}>{t('postJob.verifyModalTitle')}</Text>
            <Text style={styles.verifySubtitle}>{t('postJob.verifyReviewingPost')}</Text>
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
        <View style={styles.alertOverlay}>
          <View style={styles.alertCard}>
            <MaterialIcons name="error" size={54} color={themeColors.error.main} />
            <Text style={styles.alertTitle}>{t('common.error')}</Text>
            <Text style={styles.alertSubtitle}>{t('postJob.jobModerationRejected')}</Text>
            <TouchableOpacity
              style={styles.alertButton}
              onPress={() => setModerationRejectedVisible(false)}
            >
              <Text style={styles.alertButtonText}>{t('common.ok')}</Text>
            </TouchableOpacity>
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

    </Modal>
  );
};

export default EditJobModal;

