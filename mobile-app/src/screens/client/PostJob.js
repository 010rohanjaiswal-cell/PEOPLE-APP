/**
 * Post Job Screen - People App
 * Form to create a new job posting
 */

import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import { Button, Input, Card, CardContent } from '../../components/common';
import { validateRequired, validatePincode } from '../../utils/validation';
import { clientJobsAPI } from '../../api/clientJobs';

const PostJob = ({ onJobPosted }) => {
  const scrollViewRef = useRef(null);
  const descriptionInputRef = useRef(null);
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
  const [successModalVisible, setSuccessModalVisible] = useState(false);

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

      const result = await clientJobsAPI.postJob(jobData);

      if (result.success) {
        setLoading(false);
        setSuccessModalVisible(true);
      } else {
        throw new Error(result.error || 'Failed to post job');
      }
    } catch (error) {
      console.error('Error posting job:', error);
      setError(error.response?.data?.error || error.message || 'Failed to post job. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 20}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        nestedScrollEnabled={true}
      >
        <Card style={styles.card}>
        <CardContent>
          {/* Job Title */}
          <Input
            label="Job Title"
            placeholder="Enter job title"
            value={formData.title}
            onChangeText={(value) => handleChange('title', value)}
            style={styles.inputField}
          />

          {/* Category */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.categoryGrid}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryButton,
                    formData.category === cat && styles.categoryButtonActive,
                  ]}
                  onPress={() => handleChange('category', cat)}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      formData.category === cat && styles.categoryTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Address */}
          <Input
            label="Address"
            placeholder="Enter address"
            value={formData.address}
            onChangeText={(value) => handleChange('address', value)}
            style={styles.inputField}
          />

          {/* Pincode */}
          <Input
            label="Pincode"
            placeholder="e.g., 400001"
            value={formData.pincode}
            onChangeText={(value) => handleChange('pincode', value.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            style={styles.inputField}
          />

          {/* Budget */}
          <View style={styles.inputWrapper} onStartShouldSetResponder={() => true}>
            <Input
              label="Budget (₹)"
              placeholder="1000"
              value={formData.budget}
              onChangeText={(value) => handleChange('budget', value.replace(/\D/g, ''))}
              keyboardType="number-pad"
              style={styles.inputField}
              onFocus={() => {
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 100);
              }}
            />
          </View>

          {/* Gender */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Gender Preference</Text>
            <View style={styles.genderContainer}>
              {genders.map((gen) => (
                <TouchableOpacity
                  key={gen}
                  style={[
                    styles.genderButton,
                    formData.gender === gen && styles.genderButtonActive,
                  ]}
                  onPress={() => handleChange('gender', gen)}
                >
                  <Text
                    style={[
                      styles.genderText,
                      formData.gender === gen && styles.genderTextActive,
                    ]}
                  >
                    {gen}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Description */}
          <View 
            ref={descriptionInputRef}
            style={styles.descriptionWrapper} 
            onStartShouldSetResponder={() => true}
          >
            <Input
              label="Job Description (Optional)"
              placeholder="Describe the job requirements..."
              value={formData.description}
              onChangeText={(value) => handleChange('description', value)}
              multiline
              numberOfLines={2}
              style={styles.inputField}
              onFocus={() => {
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 500);
              }}
            />
          </View>

          {/* Submit Button with Error */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            style={styles.submitButton}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <View style={styles.buttonContent}>
                <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
                <Text style={styles.buttonText}>Post Job</Text>
                {error ? (
                  <View style={styles.errorInline}>
                    <MaterialIcons name="error-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.errorTextInline} numberOfLines={1}>
                      {error}
                    </Text>
                  </View>
                ) : null}
              </View>
            )}
          </TouchableOpacity>
        </CardContent>
      </Card>

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
            <Text style={styles.modalTitle}>Job Posted Successfully</Text>
            <Text style={styles.modalSubtitle}>
              Your job has been posted successfully!
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
                <Text style={styles.modalSubmitText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
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
    color: colors.text.secondary,
  },
  categoryTextActive: {
    color: colors.primary.main,
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
    color: colors.text.secondary,
  },
  genderTextActive: {
    color: colors.primary.main,
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
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: typography.button.fontSize,
    fontWeight: typography.button.fontWeight,
  },
  errorInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginLeft: spacing.md,
    paddingLeft: spacing.md,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.3)',
    maxWidth: '60%',
  },
  errorTextInline: {
    ...typography.small,
    color: '#FFFFFF',
    fontSize: 11,
    flexShrink: 1,
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
});

export default PostJob;

