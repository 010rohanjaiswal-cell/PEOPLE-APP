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
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../../theme';
import { Button, Card, CardContent } from '../../components/common';
import { verificationAPI, userAPI } from '../../api';
import { VERIFICATION_STATUS } from '../../constants';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const Verification = ({ navigation }) => {
  const { updateUser, isNewUser } = useAuth();
  const { t } = useLanguage();
  const [status, setStatus] = useState(null); // null, 'pending', 'approved', 'rejected'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showResubmitForm, setShowResubmitForm] = useState(false); // Control form visibility for rejected status
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorModalTitle, setErrorModalTitle] = useState('');
  const [errorModalMessage, setErrorModalMessage] = useState('');

  // Offline Aadhaar OTP + PAN verification
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [aadhaarOtp, setAadhaarOtp] = useState('');
  const [aadhaarRefId, setAadhaarRefId] = useState(null);
  const [aadhaarVerified, setAadhaarVerified] = useState(false);
  const [panNumber, setPanNumber] = useState('');
  const [panRegisteredName, setPanRegisteredName] = useState(null);
  const [panVerified, setPanVerified] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    checkVerificationStatus();
  }, []);

  // NOTE: With SecureID-only flow we no longer collect manual name/photo here.

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

  const showErrorModal = (title, message) => {
    setErrorModalTitle(title);
    setErrorModalMessage(message);
    setErrorModalVisible(true);
  };

  const sendAadhaarOtp = async () => {
    try {
      setSubmitting(true);
      setError('');
      setSuccessMessage('');
      const resp = await verificationAPI.sendAadhaarOtp(aadhaarNumber);
      if (!resp?.success || !resp?.refId) {
        throw new Error(resp?.error || 'Failed to send OTP');
      }
      setAadhaarRefId(resp.refId);
      setIsSubmitted(true);
      setStatus(VERIFICATION_STATUS.PENDING);
      setSuccessMessage('OTP sent to your Aadhaar-linked mobile number.');
    } catch (e) {
      showErrorModal('Aadhaar OTP', e?.response?.data?.error || e?.message || 'Failed to send OTP');
    } finally {
      setSubmitting(false);
    }
  };

  const verifyAadhaar = async () => {
    try {
      setSubmitting(true);
      setError('');
      setSuccessMessage('');
      const resp = await verificationAPI.verifyAadhaarOtp(aadhaarOtp, aadhaarRefId);
      if (!resp?.success) {
        throw new Error(resp?.error || 'Aadhaar verification failed');
      }
      setAadhaarVerified(true);
      setSuccessMessage('Aadhaar verified.');
    } catch (e) {
      showErrorModal('Aadhaar Verification', e?.response?.data?.error || e?.message || 'Aadhaar verification failed');
    } finally {
      setSubmitting(false);
    }
  };

  const verifyPan = async () => {
    try {
      setSubmitting(true);
      setError('');
      setSuccessMessage('');
      const resp = await verificationAPI.verifyPan(panNumber);
      if (!resp?.success) {
        throw new Error(resp?.error || 'PAN verification failed');
      }
      setPanVerified(true);
      setPanRegisteredName(resp.registeredName || null);
      setSuccessMessage('PAN verified.');
    } catch (e) {
      showErrorModal('PAN Verification', e?.response?.data?.error || e?.message || 'PAN verification failed');
    } finally {
      setSubmitting(false);
    }
  };

  const complete = async () => {
    try {
      setSubmitting(true);
      setError('');
      setSuccessMessage('');
      const resp = await verificationAPI.completeVerification(termsAccepted);
      if (!resp?.success) {
        throw new Error(resp?.error || 'Failed to create account');
      }
      setStatus(VERIFICATION_STATUS.APPROVED);
      setSuccessMessage('Account created successfully. Redirecting you to dashboard...');

      const profileResponse = await userAPI.getProfile();
      if (profileResponse.success && profileResponse.user) {
        await updateUser(profileResponse.user);
      }
    } catch (e) {
      showErrorModal('Create account', e?.response?.data?.error || e?.message || 'Failed to create account');
    } finally {
      setSubmitting(false);
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
      // We no longer have "admin review pending" screen in SecureID flow.
      // Still keep isSubmitted for controlling resubmit UX in rejected case.
      setIsSubmitted(false);
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
        Your verification has been rejected. Please try again with correct Aadhaar and PAN details.
      </Text>
      <Button
        onPress={() => {
          // Show SecureID form again
          setShowResubmitForm(true);
        }}
        variant="outline"
        style={styles.resubmitButton}
      >
        <Text style={styles.resubmitButtonText}>Retry Verification</Text>
      </Button>
    </View>
  );

  // Verification Form – SecureID Option B (Aadhaar + OTP + PAN only)
  const renderVerificationForm = () => (
    <View style={styles.formContainer}>
      <View style={[styles.iconContainer, styles.pendingIcon]}>
        <MaterialIcons name="verified-user" size={48} color={colors.primary.main} />
      </View>
      <Text style={styles.statusTitle}>Verification Required</Text>
      <Text style={styles.statusMessage}>
        {isNewUser
          ? 'You don’t have an existing account. Verify Aadhaar & PAN to create your account.'
          : 'Complete Aadhaar & PAN verification to continue.'}
      </Text>

      <View style={styles.stepBlock}>
        <Text style={styles.stepTitle}>Aadhaar number</Text>
        <TextInput
          value={aadhaarNumber}
          onChangeText={(v) => setAadhaarNumber(String(v || '').replace(/\D/g, '').slice(0, 12))}
          placeholder="12-digit Aadhaar"
          placeholderTextColor={colors.muted}
          keyboardType="number-pad"
          style={styles.input}
        />
        <TouchableOpacity
          onPress={sendAadhaarOtp}
          disabled={submitting || aadhaarNumber.length !== 12}
          style={[styles.secondaryButton, (submitting || aadhaarNumber.length !== 12) && styles.submitButtonDisabled]}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryButtonText}>Send OTP</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.stepBlock}>
        <Text style={styles.stepTitle}>Aadhaar OTP</Text>
        <TextInput
          value={aadhaarOtp}
          onChangeText={(v) => setAadhaarOtp(String(v || '').replace(/\D/g, '').slice(0, 6))}
          placeholder="6-digit OTP"
          placeholderTextColor={colors.muted}
          keyboardType="number-pad"
          style={styles.input}
        />
        <TouchableOpacity
          onPress={verifyAadhaar}
          disabled={submitting || !aadhaarRefId || aadhaarOtp.length !== 6}
          style={[styles.secondaryButton, (submitting || !aadhaarRefId || aadhaarOtp.length !== 6) && styles.submitButtonDisabled]}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryButtonText}>Verify Aadhaar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.stepBlock}>
        <Text style={styles.stepTitle}>PAN number</Text>
        <TextInput
          value={panNumber}
          onChangeText={(v) => setPanNumber(String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))}
          placeholder="ABCDE1234F"
          placeholderTextColor={colors.muted}
          autoCapitalize="characters"
          style={styles.input}
        />
        {panVerified && !!panRegisteredName && (
          <Text style={styles.panNameText}>{panRegisteredName}</Text>
        )}
        <TouchableOpacity
          onPress={verifyPan}
          disabled={submitting || !aadhaarVerified || panNumber.length !== 10}
          style={[styles.secondaryButton, (submitting || !aadhaarVerified || panNumber.length !== 10) && styles.submitButtonDisabled]}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryButtonText}>Verify PAN</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.termsRow} activeOpacity={0.7} onPress={() => setTermsAccepted((v) => !v)}>
        <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
          {termsAccepted ? <MaterialIcons name="check" size={16} color="#FFFFFF" /> : null}
        </View>
        <Text style={styles.termsText}>I agree to Terms & Conditions</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={complete}
        disabled={submitting || !panVerified || !termsAccepted}
        style={[styles.submitButton, (submitting || !panVerified || !termsAccepted) && styles.submitButtonDisabled]}
        activeOpacity={0.7}
      >
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <>
            <Text style={styles.submitButtonText}>Create account</Text>
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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
                {/* Show rejection info (without form) */}
                {status === VERIFICATION_STATUS.REJECTED && !showResubmitForm && renderRejectedStatus()}

                {/* Show form only when:
                    1. New user (status is null and not submitted), OR
                    2. Rejected and user clicked "Resubmit Verification" (showResubmitForm === true)
                */}
                {((status == null) || (status === VERIFICATION_STATUS.PENDING) || (status === VERIFICATION_STATUS.REJECTED && showResubmitForm)) && renderVerificationForm()}
              </>
            )}
          </CardContent>
        </Card>
      </ScrollView>
      {/* Error Modal */}
      <Modal
        visible={errorModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setErrorModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.errorIconContainer}>
              <MaterialIcons name="error-outline" size={64} color={colors.error.main} />
            </View>
            <Text style={styles.modalTitle}>{errorModalTitle}</Text>
            <Text style={styles.modalSubtitle}>
              {errorModalMessage}
            </Text>
            <View style={[styles.modalActions, styles.modalActionsCentered]}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSubmitButton, styles.errorModalButton]}
                onPress={() => setErrorModalVisible(false)}
              >
                <Text style={styles.modalSubmitText}>{t('common.ok')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
  // pendingIcon removed (no pending page in new flow)
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
  // refreshButton + refreshButtonText removed (no pending page in new flow)
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
  formContainer: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    width: '100%',
  },
  stepBlock: {
    marginBottom: spacing.lg,
  },
  stepTitle: {
    ...typography.body,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: spacing.borderRadius.input,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text.primary,
    backgroundColor: colors.cardBackground,
    minHeight: 48,
  },
  secondaryButton: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary.main,
    borderRadius: spacing.borderRadius.button,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  secondaryButtonText: {
    ...typography.button,
    color: colors.primary.main,
  },
  panNameText: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBackground,
  },
  checkboxChecked: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  termsText: {
    ...typography.body,
    color: colors.text.primary,
    flex: 1,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: colors.cardBackground,
    borderRadius: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  errorIconContainer: {
    alignSelf: 'center',
    marginBottom: spacing.md,
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
    marginTop: spacing.lg,
  },
  modalActionsCentered: {
    justifyContent: 'center',
  },
  modalButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: spacing.sm,
    minWidth: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSubmitButton: {
    backgroundColor: colors.primary.main,
  },
  errorModalButton: {
    alignSelf: 'center',
    minWidth: 120,
  },
  modalSubmitText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default Verification;

