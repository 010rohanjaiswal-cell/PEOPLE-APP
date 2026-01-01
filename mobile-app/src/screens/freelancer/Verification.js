/**
 * Verification Screen - People App
 * Freelancers must complete verification before accessing dashboard
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Image,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, typography } from '../../theme';
import { Button, Card, CardContent, Input } from '../../components/common';
import { verificationAPI, userAPI } from '../../api';
import { VERIFICATION_STATUS } from '../../constants';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';

const Verification = ({ navigation }) => {
  const { updateUser } = useAuth();
  const [status, setStatus] = useState(null); // null, 'pending', 'approved', 'rejected'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showResubmitForm, setShowResubmitForm] = useState(false); // Control form visibility for rejected status

  // Form state
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState('');
  const [profilePhotoUri, setProfilePhotoUri] = useState(null);
  const [docFrontUri, setDocFrontUri] = useState(null);
  const [docBackUri, setDocBackUri] = useState(null);
  const [panCardUri, setPanCardUri] = useState(null);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 70 }, (_, i) => `${currentYear - i}`);
  const months = ['01','02','03','04','05','06','07','08','09','10','11','12'];
  const days = Array.from({ length: 31 }, (_, i) => `${i + 1}`.padStart(2, '0'));

  useEffect(() => {
    checkVerificationStatus();
  }, []);

  // Auto-navigate to dashboard if verification is approved
  useEffect(() => {
    if (status === VERIFICATION_STATUS.APPROVED && !loading) {
      // Small delay to show the approved message briefly
      const timer = setTimeout(() => {
        navigation.replace('FreelancerDashboard');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [status, loading]);

  const pickImage = async (setterUri, label) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Allow camera access to take a photo.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        setterUri(result.assets[0].uri);
      }
    } catch (err) {
      console.error(`Error picking ${label}:`, err);
      Alert.alert('Upload failed', `Could not select ${label}. Please try again.`);
    }
  };

  const checkVerificationStatus = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await verificationAPI.getVerificationStatus();
      
      // Handle different response formats
      if (response.status) {
        setStatus(response.status);
      } else if (response.verificationStatus) {
        setStatus(response.verificationStatus);
      } else if (response.verification) {
        setStatus(response.verification.status);
      } else {
        // No verification submitted yet
        setStatus(null);
      }
      // If status is pending from backend, mark as submitted
      setIsSubmitted(response.status === VERIFICATION_STATUS.PENDING || response.verificationStatus === VERIFICATION_STATUS.PENDING);
      // Reset resubmit form visibility when status changes
      if (response.status === VERIFICATION_STATUS.REJECTED || response.verificationStatus === VERIFICATION_STATUS.REJECTED) {
        setShowResubmitForm(false);
      }
    } catch (error) {
      console.error('Error checking verification status:', error);
      
      // If 404 or no verification found, status is null (not submitted)
      if (error.response?.status === 404) {
        setStatus(null);
      } else if (error.code === 'ERR_NETWORK') {
        setError('Network error: Unable to reach server. Please retry.');
        setStatus(null);
      } else {
        setError(error.response?.data?.message || 'Failed to check verification status');
      }
    } finally {
      setLoading(false);
    }
  };

  // Pending Status Screen
  const renderPendingStatus = () => (
    <View style={styles.statusContainer}>
      <View style={[styles.iconContainer, styles.pendingIcon]}>
        <MaterialIcons name="schedule" size={48} color={colors.pending.main} />
      </View>
      <Text style={styles.statusTitle}>Verification Pending</Text>
      <Text style={styles.statusMessage}>
        Your verification is under review. Please wait for approval.
      </Text>
      <TouchableOpacity
        onPress={checkVerificationStatus}
        style={styles.refreshButton}
        activeOpacity={0.7}
      >
        <MaterialIcons name="refresh" size={20} color={colors.primary.main} />
        <Text style={styles.refreshButtonText}>Refresh Status</Text>
      </TouchableOpacity>
    </View>
  );

  // Approved Status Screen
  const renderApprovedStatus = () => (
    <View style={styles.statusContainer}>
      <View style={[styles.iconContainer, styles.approvedIcon]}>
        <MaterialIcons name="check-circle" size={48} color={colors.success.main} />
      </View>
      <Text style={styles.statusTitle}>Verification Approved</Text>
      <Text style={styles.statusMessage}>
        Your verification has been approved! You can now access the dashboard.
      </Text>
      <Button
        onPress={() => {
          // Navigate to Freelancer Dashboard
          navigation.replace('FreelancerDashboard');
        }}
        style={styles.dashboardButton}
      >
        <Text style={styles.dashboardButtonText}>Go to Dashboard</Text>
        <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
      </Button>
    </View>
  );

  // Rejected Status Screen
  const renderRejectedStatus = () => (
    <View style={styles.statusContainer}>
      <View style={[styles.iconContainer, styles.rejectedIcon]}>
        <MaterialIcons name="cancel" size={48} color={colors.error.main} />
      </View>
      <Text style={styles.statusTitle}>Verification Rejected</Text>
      <Text style={styles.statusMessage}>
        Your verification has been rejected. Please review the requirements and resubmit.
      </Text>
      <Button
        onPress={() => {
          // Show verification form for resubmission
          setShowResubmitForm(true);
        }}
        variant="outline"
        style={styles.resubmitButton}
      >
        <Text style={styles.resubmitButtonText}>Resubmit Verification</Text>
      </Button>
    </View>
  );

  const handleSubmitVerification = async () => {
    // Basic validation
    if (!fullName || !dob || !gender || !address || !profilePhotoUri || !docFrontUri || !docBackUri || !panCardUri) {
      Alert.alert('Missing info', 'Please fill all required fields and upload all documents (including profile photo).');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      // Build multipart form data for Cloudinary upload via backend
      const formData = new FormData();
      formData.append('fullName', fullName);
      formData.append('dob', dob);
      formData.append('gender', gender);
      formData.append('address', address);

      formData.append('profilePhoto', {
        uri: profilePhotoUri,
        name: 'profile-photo.jpg',
        type: 'image/jpeg',
      });

      formData.append('aadhaarFront', {
        uri: docFrontUri,
        name: 'aadhaar-front.jpg',
        type: 'image/jpeg',
      });

      formData.append('aadhaarBack', {
        uri: docBackUri,
        name: 'aadhaar-back.jpg',
        type: 'image/jpeg',
      });

      formData.append('panCard', {
        uri: panCardUri,
        name: 'pan-card.jpg',
        type: 'image/jpeg',
      });

      await verificationAPI.submitVerification(formData);
      setStatus(VERIFICATION_STATUS.PENDING);
      setIsSubmitted(true);
      setShowResubmitForm(false); // Hide form after successful submission
      setSuccessMessage('Verification submitted successfully. We will update your status soon.');
      setError(''); // Clear any previous errors
      
      // Refresh user profile to get updated profile photo from backend
      try {
        const profileResponse = await userAPI.getProfile();
        if (profileResponse.success && profileResponse.user) {
          await updateUser(profileResponse.user);
        }
      } catch (profileError) {
        console.error('Error refreshing user profile:', profileError);
        // Don't show error to user, profile photo will update on next login
      }
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
    } catch (err) {
      console.error('Verification submit error:', err);
      setError(err.response?.data?.message || 'Failed to submit verification');
      setSuccessMessage(''); // Clear success message on error
    } finally {
      setSubmitting(false);
    }
  };

  // Verification Form
  const renderVerificationForm = () => (
    <View style={styles.formContainer}>
      <View style={[styles.iconContainer, styles.pendingIcon]}>
        <MaterialIcons name="verified-user" size={48} color={colors.primary.main} />
      </View>
      <Text style={styles.statusTitle}>Verification Required</Text>
      <Text style={styles.statusMessage}>
        Submit your details and documents to get approved.
      </Text>

      <Input
        label="Full Name"
        placeholder="Enter your full name"
        value={fullName}
        onChangeText={setFullName}
      />
      {/* Date Picker */}
      <TouchableOpacity style={styles.selector} onPress={() => setDatePickerVisible(true)}>
        <Text style={styles.selectorLabel}>Date of Birth</Text>
        <Text style={styles.selectorValue}>{dob || 'Select date'}</Text>
      </TouchableOpacity>

      {/* Gender Selector */}
      <View style={styles.genderRow}>
        {['Male', 'Female'].map((g) => (
          <TouchableOpacity
            key={g}
            style={[
              styles.genderButton,
              gender === g && styles.genderButtonActive,
            ]}
            onPress={() => setGender(g)}
          >
            <Text
              style={[
                styles.genderText,
                gender === g && styles.genderTextActive,
              ]}
            >
              {g}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Input
        label="Address"
        placeholder="Enter your address"
        value={address}
        onChangeText={setAddress}
        multiline
      />
      {/* Profile Photo */}
      <View style={styles.uploadSection}>
        <Text style={styles.uploadLabel}>Profile Photo (Required)</Text>
        <TouchableOpacity
          style={styles.uploadBox}
          onPress={() => pickImage(setProfilePhotoUri, 'Profile Photo')}
        >
          {profilePhotoUri ? (
            <Image source={{ uri: profilePhotoUri }} style={styles.uploadPreview} />
          ) : (
            <MaterialIcons name="upload-file" size={32} color={colors.text.muted} />
          )}
        </TouchableOpacity>
      </View>

      {/* Document Uploads with preview and upload button */}
      <View style={styles.uploadSection}>
        <Text style={styles.uploadLabel}>Aadhaar Front (Required)</Text>
        <TouchableOpacity
          style={styles.uploadBox}
          onPress={() => pickImage(setDocFrontUri, 'Aadhaar Front')}
        >
          {docFrontUri ? (
            <Image source={{ uri: docFrontUri }} style={styles.uploadPreview} />
          ) : (
            <MaterialIcons name="upload-file" size={32} color={colors.text.muted} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.uploadSection}>
        <Text style={styles.uploadLabel}>Aadhaar Back (Required)</Text>
        <TouchableOpacity
          style={styles.uploadBox}
          onPress={() => pickImage(setDocBackUri, 'Aadhaar Back')}
        >
          {docBackUri ? (
            <Image source={{ uri: docBackUri }} style={styles.uploadPreview} />
          ) : (
            <MaterialIcons name="upload-file" size={32} color={colors.text.muted} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.uploadSection}>
        <Text style={styles.uploadLabel}>PAN Card (Required)</Text>
        <TouchableOpacity
          style={styles.uploadBox}
          onPress={() => pickImage(setPanCardUri, 'PAN Card')}
        >
          {panCardUri ? (
            <Image source={{ uri: panCardUri }} style={styles.uploadPreview} />
          ) : (
            <MaterialIcons name="upload-file" size={32} color={colors.text.muted} />
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={handleSubmitVerification}
        disabled={submitting}
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        activeOpacity={0.7}
      >
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <>
            <Text style={styles.submitButtonText}>Submit Verification</Text>
            <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Back to Login */}
        <View style={styles.topAction}>
          <Button variant="ghost" onPress={() => navigation.replace('Login')} style={styles.backButton}>
            Back to Login
          </Button>
        </View>

        <Card style={styles.card}>
          <CardContent>
            {/* Error Display */}
            {error && (
              <View style={styles.errorContainer}>
                <MaterialIcons name="error-outline" size={20} color={colors.error.main} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Success Message Display */}
            {successMessage && (
              <View style={styles.successContainer}>
                <MaterialIcons name="check-circle" size={20} color={colors.success.main} />
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            )}

            {/* Approved */}
            {status === VERIFICATION_STATUS.APPROVED ? (
              renderApprovedStatus()
            ) : (
              <>
                {/* Show pending only if backend says pending and user has submitted */}
                {status === VERIFICATION_STATUS.PENDING && isSubmitted && renderPendingStatus()}
                {/* Show rejection info (without form) */}
                {status === VERIFICATION_STATUS.REJECTED && !showResubmitForm && renderRejectedStatus()}

                {/* Show form only when:
                    1. New user (status is null and not submitted), OR
                    2. Rejected and user clicked "Resubmit Verification" (showResubmitForm === true)
                */}
                {((status === null && !isSubmitted) || (status === VERIFICATION_STATUS.REJECTED && showResubmitForm)) && renderVerificationForm()}
              </>
            )}
          </CardContent>
        </Card>
      </ScrollView>
      <Modal visible={datePickerVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Date of Birth</Text>
            <View style={styles.datePickers}>
              <ScrollView style={styles.pickerColumn}>
                {years.map((y) => (
                  <TouchableOpacity
                    key={y}
                    style={[styles.pickerItem, selectedYear === y && styles.pickerItemActive]}
                    onPress={() => setSelectedYear(y)}
                  >
                    <Text style={[styles.pickerItemText, selectedYear === y && styles.pickerItemTextActive]}>{y}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <ScrollView style={styles.pickerColumn}>
                {months.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.pickerItem, selectedMonth === m && styles.pickerItemActive]}
                    onPress={() => setSelectedMonth(m)}
                  >
                    <Text style={[styles.pickerItemText, selectedMonth === m && styles.pickerItemTextActive]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <ScrollView style={styles.pickerColumn}>
                {days.map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.pickerItem, selectedDay === d && styles.pickerItemActive]}
                    onPress={() => setSelectedDay(d)}
                  >
                    <Text style={[styles.pickerItemText, selectedDay === d && styles.pickerItemTextActive]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View style={styles.modalActions}>
              <Button variant="ghost" onPress={() => setDatePickerVisible(false)} style={styles.modalButton}>
                Cancel
              </Button>
              <Button
                onPress={() => {
                  if (selectedYear && selectedMonth && selectedDay) {
                    setDob(`${selectedYear}-${selectedMonth}-${selectedDay}`);
                    setDatePickerVisible(false);
                  } else {
                    Alert.alert('Select date', 'Please select year, month, and day.');
                  }
                }}
                style={styles.modalButton}
              >
                Confirm
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  topAction: {
    alignItems: 'flex-end',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.lg, // Add padding from top to avoid phone navigation bar
  },
  backButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statusContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    width: '100%',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    alignSelf: 'center',
  },
  pendingIcon: {
    backgroundColor: colors.pending.light,
  },
  approvedIcon: {
    backgroundColor: colors.success.light,
  },
  rejectedIcon: {
    backgroundColor: colors.error.light,
  },
  statusTitle: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  statusMessage: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: spacing.borderRadius.button,
    minHeight: 48,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignSelf: 'center',
    gap: spacing.md,
  },
  refreshButtonText: {
    ...typography.button,
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  dashboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.success.main,
  },
  dashboardButtonText: {
    ...typography.button,
    color: '#FFFFFF',
  },
  resubmitButton: {
    borderColor: colors.error.main,
  },
  resubmitButtonText: {
    ...typography.button,
    color: colors.error.main,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Center align content including arrow
    gap: spacing.sm,
    minHeight: 50, // Increase height to prevent text from being covered
    paddingVertical: spacing.md, // Add vertical padding
    backgroundColor: colors.primary.main,
    borderRadius: spacing.borderRadius.button,
    paddingHorizontal: spacing.buttonPadding?.horizontal || spacing.lg,
  },
  submitButtonDisabled: {
    backgroundColor: colors.text.muted,
    opacity: 0.5,
  },
  submitButtonText: {
    ...typography.button,
    color: '#FFFFFF',
  },
  uploadSection: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  uploadLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  uploadBox: {
    height: 120,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderStyle: 'dashed',
    borderRadius: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    marginBottom: spacing.sm,
  },
  uploadPreview: {
    width: '100%',
    height: '100%',
    borderRadius: spacing.sm,
  },
  selector: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.cardBackground,
  },
  selectorLabel: {
    ...typography.small,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  selectorValue: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  genderRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  genderButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
  },
  genderButtonActive: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.light,
  },
  genderText: {
    ...typography.body,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  genderTextActive: {
    color: colors.primary.main,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.cardBackground,
    borderRadius: spacing.md,
    padding: spacing.lg,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  datePickers: {
    flexDirection: 'row',
    gap: spacing.sm,
    height: 160,
    marginBottom: spacing.md,
  },
  pickerColumn: {
    flex: 1,
  },
  pickerItem: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  pickerItemActive: {
    backgroundColor: colors.primary.light,
  },
  pickerItemText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  pickerItemTextActive: {
    color: colors.primary.main,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  modalButton: {
    minWidth: 100,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error.light,
    borderWidth: 1,
    borderColor: colors.error.main,
    borderRadius: spacing.borderRadius.input,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  errorText: {
    ...typography.body,
    color: colors.error.main,
    flex: 1,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success.light,
    borderWidth: 1,
    borderColor: colors.success.main,
    borderRadius: spacing.borderRadius.input,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  successText: {
    ...typography.body,
    color: colors.success.dark,
    flex: 1,
  },
});

export default Verification;

