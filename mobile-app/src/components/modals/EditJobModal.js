/**
 * Edit Job Modal - People App
 * Modal for editing job details
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import { useLanguage } from '../../context/LanguageContext';
import { Button, Input } from '../common';
import { validateRequired, validatePincode } from '../../utils/validation';
import {
  sanitizeJobTextInput,
  MAX_JOB_TITLE_LEN,
  MAX_JOB_DESCRIPTION_LEN,
  isValidJobTitle,
  isValidJobDescription,
} from '../../utils/jobTextPolicy';
import { clientJobsAPI } from '../../api/clientJobs';
import { isDeliveryCategory } from '../../utils/jobDisplay';

const EditJobModal = ({ visible, job, onClose, onSuccess }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    address: '',
    pincode: '',
    budget: '',
    gender: '',
    description: '',
    deliveryFromAddress: '',
    deliveryFromPincode: '',
    deliveryToAddress: '',
    deliveryToPincode: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    if (!delivery && !isValidJobDescription(formData.description)) {
      setError(t('postJob.descriptionInvalidAlphanumeric'));
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

    setLoading(true);
    setError('');

    try {
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
          }
        : {
            title: formData.title,
            category: formData.category,
            address: formData.address,
            pincode: formData.pincode,
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
      if (code === 'JOB_MODERATION_REJECTED') {
        setError(t('postJob.jobModerationRejected'));
      } else {
        setError(err.response?.data?.error || err.message || t('jobs.failedUpdateJob'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Edit Job</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={colors.text.primary} />
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
                  onChangeText={(value) => handleChange('deliveryFromAddress', value)}
                  placeholder={t('postJob.enterFromAddress')}
                  multiline
                />
                <Input
                  label={t('postJob.fromPincode')}
                  value={formData.deliveryFromPincode}
                  onChangeText={(value) => handleChange('deliveryFromPincode', value)}
                  placeholder={t('postJob.pincodePlaceholder')}
                  keyboardType="numeric"
                  maxLength={6}
                />
                <Input
                  label={t('postJob.toAddress')}
                  value={formData.deliveryToAddress}
                  onChangeText={(value) => handleChange('deliveryToAddress', value)}
                  placeholder={t('postJob.enterToAddress')}
                  multiline
                />
                <Input
                  label={t('postJob.toPincode')}
                  value={formData.deliveryToPincode}
                  onChangeText={(value) => handleChange('deliveryToPincode', value)}
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
                  onChangeText={(value) => handleChange('address', value)}
                  placeholder="Enter address"
                  multiline
                />

                <Input
                  label="Pincode"
                  value={formData.pincode}
                  onChangeText={(value) => handleChange('pincode', value)}
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
            <Button variant="outline" onPress={onClose} style={styles.cancelButton}>
              Cancel
            </Button>
            <Button onPress={handleSubmit} loading={loading} style={styles.submitButton}>
              Update Job
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: colors.background,
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
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
  },
  closeButton: {
    padding: spacing.xs,
  },
  content: {
    padding: spacing.lg,
    maxHeight: 500,
  },
  errorContainer: {
    backgroundColor: colors.error.light,
    borderWidth: 1,
    borderColor: colors.error.main,
    borderRadius: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.small,
    color: colors.error.main,
    textAlign: 'center',
  },
  selectContainer: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text.primary,
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
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  selectOptionActive: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.light,
  },
  selectOptionText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  selectOptionTextActive: {
    color: colors.primary.main,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
});

export default EditJobModal;

