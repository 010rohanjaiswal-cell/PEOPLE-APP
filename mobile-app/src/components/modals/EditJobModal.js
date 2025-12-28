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
import { Button, Input } from '../common';
import { validateRequired, validatePincode } from '../../utils/validation';
import { clientJobsAPI } from '../../api/clientJobs';

const EditJobModal = ({ visible, job, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    address: '',
    pincode: '',
    budget: '',
    gender: '',
    description: '',
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
        title: job.title || '',
        category: job.category || '',
        address: job.address || '',
        pincode: job.pincode || '',
        budget: job.budget?.toString() || '',
        gender: job.gender ? job.gender.charAt(0).toUpperCase() + job.gender.slice(1) : '',
        description: job.description || '',
      });
      setError('');
    }
  }, [job, visible]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async () => {
    // Validation
    if (!validateRequired(formData.title)) {
      setError('Please enter a job title');
      return;
    }
    if (!formData.category) {
      setError('Please select a category');
      return;
    }
    if (!validateRequired(formData.address)) {
      setError('Please enter an address');
      return;
    }
    if (!validatePincode(formData.pincode)) {
      setError('Please enter a valid 6-digit pincode');
      return;
    }
    if (!formData.budget || parseFloat(formData.budget) < 10) {
      setError('Budget must be at least ₹10');
      return;
    }
    if (!formData.gender) {
      setError('Please select a gender preference');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const jobData = {
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
        Alert.alert('Success', 'Job updated successfully!');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setError(result.error || 'Failed to update job');
      }
    } catch (err) {
      console.error('Error updating job:', err);
      setError(err.response?.data?.error || err.message || 'Failed to update job');
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

            <Input
              label="Budget (₹)"
              value={formData.budget}
              onChangeText={(value) => handleChange('budget', value)}
              placeholder="1000"
              keyboardType="numeric"
            />

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

