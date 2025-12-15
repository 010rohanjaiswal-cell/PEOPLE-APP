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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, typography } from '../../theme';
import { Button, Card, CardContent, Input } from '../../components/common';
import { verificationAPI } from '../../api';
import { VERIFICATION_STATUS } from '../../constants';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const Verification = ({ navigation }) => {
  const [status, setStatus] = useState(null); // null, 'pending', 'approved', 'rejected'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Form state
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState('');
  const [profilePhotoUri, setProfilePhotoUri] = useState(null);
  const [docFrontUri, setDocFrontUri] = useState(null);
  const [docBackUri, setDocBackUri] = useState(null);
  const [panCardUri, setPanCardUri] = useState(null);

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
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Allow gallery access to upload documents.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
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
        Your verification is under review. Please wait for admin approval.
      </Text>
      <Button
        variant="outline"
        onPress={checkVerificationStatus}
        style={styles.refreshButton}
      >
        <MaterialIcons name="refresh" size={20} color={colors.primary.main} />
        <Text style={styles.refreshButtonText}>Refresh Status</Text>
      </Button>
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
          // TODO: Show verification form for resubmission (Phase 4)
          Alert.alert(
            'Resubmission Coming Soon',
            'Verification form will be available in Phase 4.',
            [{ text: 'OK' }]
          );
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
      // Submit minimal payload; backend can extend later
      await verificationAPI.submitVerification({
        fullName,
        dob,
        gender,
        address,
        profilePhoto: profilePhotoUri,
        aadhaarFront: docFrontUri,
        aadhaarBack: docBackUri,
        panCard: panCardUri,
      });
      setStatus(VERIFICATION_STATUS.PENDING);
      setIsSubmitted(true);
      Alert.alert('Submitted', 'Verification submitted. We will update your status soon.');
    } catch (err) {
      console.error('Verification submit error:', err);
      setError(err.response?.data?.message || 'Failed to submit verification');
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
      <Input
        label="Date of Birth"
        placeholder="DD/MM/YYYY"
        value={dob}
        onChangeText={setDob}
      />
      <Input
        label="Gender"
        placeholder="Male / Female"
        value={gender}
        onChangeText={setGender}
      />
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

      <Button
        onPress={handleSubmitVerification}
        loading={submitting}
        disabled={submitting}
        style={styles.submitButton}
      >
        <Text style={styles.submitButtonText}>Submit Verification</Text>
        <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
      </Button>
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

            {/* Approved */}
            {status === VERIFICATION_STATUS.APPROVED ? (
              renderApprovedStatus()
            ) : (
              <>
                {/* Show pending only if backend says pending and user has submitted */}
                {status === VERIFICATION_STATUS.PENDING && isSubmitted && renderPendingStatus()}
                {/* Show rejection info and form */}
                {status === VERIFICATION_STATUS.REJECTED && renderRejectedStatus()}

                {/* Form for not submitted or resubmit */}
                {renderVerificationForm()}
              </>
            )}
          </CardContent>
        </Card>
      </ScrollView>
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
  },
  backButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statusContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
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
    gap: spacing.sm,
  },
  refreshButtonText: {
    ...typography.button,
    color: colors.primary.main,
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
    gap: spacing.sm,
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
});

export default Verification;

