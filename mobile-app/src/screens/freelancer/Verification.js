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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useDigiLocker } from '@cashfreepayments/react-native-digilocker';
import { colors, spacing, typography } from '../../theme';
import { Button, Card, CardContent } from '../../components/common';
import { verificationAPI, userAPI } from '../../api';
import { VERIFICATION_STATUS } from '../../constants';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const Verification = ({ navigation }) => {
  const { updateUser } = useAuth();
  const { t } = useLanguage();
  const { verify } = useDigiLocker();
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

  // DigiLocker SecureID (Option B)
  const [digilockerUrl, setDigilockerUrl] = useState(null);
  const [digilockerVerificationId, setDigilockerVerificationId] = useState(null);
  const [digilockerChecking, setDigilockerChecking] = useState(false);

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

  const startDigilocker = async () => {
    try {
      setSubmitting(true);
      setError('');
      setSuccessMessage('');
      const resp = await verificationAPI.initiateDigilocker('signup');
      if (!resp?.success || !resp?.url || !resp?.verificationId) {
        throw new Error(resp?.error || 'Failed to start DigiLocker');
      }
      setDigilockerUrl(resp.url);
      setDigilockerVerificationId(resp.verificationId);
      setIsSubmitted(true);
      setStatus(VERIFICATION_STATUS.PENDING);
      verify(resp.url, undefined, {
        userFlow: 'signup',
        onSuccess: async (data) => {
          try {
            // Prefer SDK-provided verification_id if present
            const vId = data?.verification_id || data?.verificationId || resp.verificationId;
            setDigilockerVerificationId(vId);
            setSuccessMessage('DigiLocker consent received. Fetching documents...');
            await checkAndFetchDigilocker(vId);
          } catch (e) {
            showErrorModal('Verification Error', e?.message || 'Failed to complete verification');
          }
        },
        onError: (errMsg) => {
          showErrorModal('DigiLocker Error', errMsg || 'DigiLocker verification failed');
        },
        onCancel: () => {
          showErrorModal('Cancelled', 'You cancelled the DigiLocker verification.');
        },
      });
    } catch (e) {
      console.error('DigiLocker initiate error:', e);
      showErrorModal('DigiLocker Error', e?.response?.data?.error || e?.message || 'Failed to initiate DigiLocker');
    } finally {
      setSubmitting(false);
    }
  };

  const checkAndFetchDigilocker = async (verificationIdOverride) => {
    const vId = verificationIdOverride || digilockerVerificationId;
    if (!vId) return;
    try {
      setDigilockerChecking(true);
      const statusResp = await verificationAPI.getDigilockerStatus(vId);
      const st = statusResp?.status;
      if (st !== 'AUTHENTICATED') {
        showErrorModal(
          'Not completed yet',
          `DigiLocker status: ${st || 'UNKNOWN'}. Please complete consent in DigiLocker and try again.`
        );
        return;
      }
      const fetchResp = await verificationAPI.fetchDigilockerDocuments(vId);
      if (!fetchResp?.success) {
        throw new Error(fetchResp?.error || 'Failed to fetch documents');
      }
      setStatus(VERIFICATION_STATUS.APPROVED);
      setSuccessMessage('Verification completed successfully. Redirecting you to dashboard...');

      const profileResponse = await userAPI.getProfile();
      if (profileResponse.success && profileResponse.user) {
        await updateUser(profileResponse.user);
      }
    } catch (e) {
      console.error('DigiLocker fetch error:', e);
      showErrorModal('Verification Error', e?.response?.data?.error || e?.message || 'Failed to complete verification');
    } finally {
      setDigilockerChecking(false);
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

  // Option B flow is now DigiLocker-based, not Aadhaar OTP inputs.

  // Verification Form – SecureID Option B (Aadhaar + OTP + PAN only)
  const renderVerificationForm = () => (
    <View style={styles.formContainer}>
      <View style={[styles.iconContainer, styles.pendingIcon]}>
        <MaterialIcons name="verified-user" size={48} color={colors.primary.main} />
      </View>
      <Text style={styles.statusTitle}>Verification Required</Text>
      <Text style={styles.statusMessage}>
        Continue with DigiLocker to fetch your Aadhaar and PAN details securely and get instant access.
      </Text>

      <TouchableOpacity
        onPress={startDigilocker}
        disabled={submitting}
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        activeOpacity={0.7}
      >
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <>
            <Text style={styles.submitButtonText}>Continue with DigiLocker</Text>
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
  formContainer: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    width: '100%',
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

