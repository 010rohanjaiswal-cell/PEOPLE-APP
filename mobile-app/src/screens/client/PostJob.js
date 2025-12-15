/**
 * Post Job Screen - People App
 * Form to create a new job posting
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import { Button, Input, Card, CardContent } from '../../components/common';
import { validateRequired, validatePincode } from '../../utils/validation';
import { clientJobsAPI } from '../../api/clientJobs';

const PostJob = ({ navigation }) => {
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
        Alert.alert('Success', 'Job posted successfully!', [
          {
            text: 'OK',
            onPress: () => {
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
              // Switch to My Jobs tab
              navigation.navigate('MyJobs');
            },
          },
        ]);
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <CardContent>
          <Text style={styles.title}>Post a Job</Text>

          {/* Job Title */}
          <Input
            label="Job Title"
            placeholder="Enter job title"
            value={formData.title}
            onChangeText={(value) => handleChange('title', value)}
            required
          />

          {/* Category */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Category *</Text>
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
            required
          />

          {/* Pincode */}
          <Input
            label="Pincode"
            placeholder="e.g., 400001"
            value={formData.pincode}
            onChangeText={(value) => handleChange('pincode', value.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            required
          />

          {/* Budget */}
          <Input
            label="Budget (₹)"
            placeholder="1000"
            value={formData.budget}
            onChangeText={(value) => handleChange('budget', value.replace(/\D/g, ''))}
            keyboardType="number-pad"
            required
          />

          {/* Gender */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Gender Preference *</Text>
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
          <Input
            label="Job Description (Optional)"
            placeholder="Describe the job requirements..."
            value={formData.description}
            onChangeText={(value) => handleChange('description', value)}
            multiline
            numberOfLines={3}
          />

          {/* Error Display */}
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Submit Button */}
          <Button onPress={handleSubmit} loading={loading} style={styles.submitButton}>
            <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" style={styles.buttonIcon} />
            Post Job
          </Button>
        </CardContent>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  card: {
    width: '100%',
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  fieldContainer: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
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
    gap: spacing.md,
  },
  genderButton: {
    flex: 1,
    paddingVertical: spacing.md,
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
  submitButton: {
    width: '100%',
    marginTop: spacing.md,
  },
  buttonIcon: {
    marginRight: spacing.sm,
  },
});

export default PostJob;

