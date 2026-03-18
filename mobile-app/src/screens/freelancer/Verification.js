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
  KeyboardAvoidingView,
  Platform,
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
  const { user, updateUser, isNewUser } = useAuth();
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
  const [aadhaarOtpCooldown, setAadhaarOtpCooldown] = useState(0); // seconds
  const [aadhaarMobileMatchesSignup, setAadhaarMobileMatchesSignup] = useState(null);
  const [isSendingAadhaarOtp, setIsSendingAadhaarOtp] = useState(false);
  const [isVerifyingAadhaar, setIsVerifyingAadhaar] = useState(false);
  const [panNumber, setPanNumber] = useState('');
  const [panRegisteredName, setPanRegisteredName] = useState(null);
  const [panVerified, setPanVerified] = useState(false);
  const [isVerifyingPan, setIsVerifyingPan] = useState(false);
  const [panNameMatchOk, setPanNameMatchOk] = useState(null);
  const [panNameMatchScore, setPanNameMatchScore] = useState(null);
  const [step, setStep] = useState(0); // 0 = Aadhaar, 1 = PAN

  useEffect(() => {
    checkVerificationStatus();
  }, []);

  useEffect(() => {
    if (aadhaarOtpCooldown <= 0) {
      return;
    }
    const timer = setTimeout(() => {
      setAadhaarOtpCooldown((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearTimeout(timer);
  }, [aadhaarOtpCooldown]);

  // NOTE: With SecureID-only flow we no longer collect manual name/photo here.

  // Note: approval is auto; navigate directly on completion.

  const showErrorModal = (title, message) => {
    setErrorModalTitle(title);
    setErrorModalMessage(message);
    setErrorModalVisible(true);
  };

  const sendAadhaarOtp = async () => {
    try {
      setIsSendingAadhaarOtp(true);
      setSubmitting(true);
      setError('');
      setSuccessMessage('');
      const resp = await verificationAPI.sendAadhaarOtp(aadhaarNumber);
      if (!resp?.success || !resp?.refId) {
        throw new Error(resp?.error || 'Failed to send OTP');
      }
      setAadhaarRefId(resp.refId);
      setAadhaarOtpCooldown(60);
      setIsSubmitted(true);
      setStatus(VERIFICATION_STATUS.PENDING);
      // Cashfree OTP-send endpoint doesn't reliably return Aadhaar-linked mobile last-4.
      // We'll show the exact xxxxxx1234 after OTP verify (when available).
      setSuccessMessage('OTP sent successfully to your Aadhaar-linked mobile number.');
    } catch (e) {
      showErrorModal('Aadhaar OTP', e?.response?.data?.error || e?.message || 'Failed to send OTP');
    } finally {
      setSubmitting(false);
      setIsSendingAadhaarOtp(false);
    }
  };

  const verifyAadhaar = async () => {
    try {
      setIsVerifyingAadhaar(true);
      setSubmitting(true);
      setError('');
      setSuccessMessage('');
      const resp = await verificationAPI.verifyAadhaarOtp(aadhaarOtp, aadhaarRefId);
      if (!resp?.success) {
        throw new Error(resp?.error || 'Aadhaar verification failed');
      }
      const match = resp?.verification?.aadhaarMobileMatchesSignup ?? null;
      setAadhaarMobileMatchesSignup(match);

      if (match === false) {
        setAadhaarVerified(false);
        showErrorModal('Verification Error', 'Mobile number mismatch with Aadhaar.');
        return;
      }

      setAadhaarVerified(true);
      const aadhaarMobileLast4 = resp?.verification?.aadhaarMobileLast4 || null;
      if (aadhaarMobileLast4) {
        setSuccessMessage(`Aadhaar verified. OTP was sent to xxxxxx${aadhaarMobileLast4}`);
      }
    } catch (e) {
      showErrorModal('Aadhaar Verification', e?.response?.data?.error || e?.message || 'Aadhaar verification failed');
    } finally {
      setSubmitting(false);
      setIsVerifyingAadhaar(false);
    }
  };

  const verifyPan = async () => {
    try {
      setIsVerifyingPan(true);
      setSubmitting(true);
      setError('');
      setSuccessMessage('');
      const resp = await verificationAPI.verifyPan(panNumber);
      if (!resp?.success) {
        throw new Error(resp?.error || 'PAN verification failed');
      }
      setPanVerified(true);
      setPanRegisteredName(resp.registeredName || null);
      setPanNameMatchOk(resp?.nameMatchOk ?? null);
      setPanNameMatchScore(resp?.nameMatchScore ?? null);
      setSuccessMessage('');
    } catch (e) {
      showErrorModal('PAN Verification', e?.response?.data?.error || e?.message || 'PAN verification failed');
    } finally {
      setSubmitting(false);
      setIsVerifyingPan(false);
    }
  };

  // Completion happens after selfie + T&C on FaceVerification screen.

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

  const canGoNextFromAadhaar = aadhaarVerified === true;
  const canGoNextFromPan =
    panVerified === true &&
    panNameMatchOk !== false &&
    aadhaarMobileMatchesSignup !== false;

  const renderProgress = () => {
    const aadhaarDone = aadhaarVerified === true;
    const panDone = panVerified === true && panNameMatchOk !== false;
    // Face step is completed on the next screen; we show it as the final step indicator here.
    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressRow}>
          <View style={[styles.progressDot, (step === 0 || aadhaarDone) && styles.progressDotActive]}>
            {aadhaarDone ? <MaterialIcons name="check" size={14} color="#fff" /> : <Text style={styles.progressDotText}>1</Text>}
          </View>
          <View style={[styles.progressLine, (aadhaarDone || step > 0) && styles.progressLineActive]} />
          <View style={[styles.progressDot, (step === 1 || panDone) && styles.progressDotActive]}>
            {panDone ? <MaterialIcons name="check" size={14} color="#fff" /> : <Text style={styles.progressDotText}>2</Text>}
          </View>
          <View style={[styles.progressLine, panDone && styles.progressLineActive]} />
          <View style={styles.progressDot}>
            <Text style={styles.progressDotText}>3</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderAadhaarStep = () => (
    <View>
      <View style={styles.stepHeaderRow}>
        <Text style={styles.stepHeaderTitle}>Aadhaar verification</Text>
      </View>

      <View style={styles.stepBlock}>
        <Text style={styles.stepTitle}>Aadhaar number</Text>
        <TextInput
          value={aadhaarNumber}
          onChangeText={(v) => setAadhaarNumber(String(v || '').replace(/\D/g, '').slice(0, 12))}
          placeholder="12-digit Aadhaar"
          placeholderTextColor={colors.muted}
          keyboardType="number-pad"
          editable={!aadhaarVerified && !submitting && !aadhaarRefId}
          style={[styles.input, (aadhaarVerified || aadhaarRefId) && styles.inputDisabled]}
        />
        {aadhaarVerified ? <Text style={styles.verifiedInline}>Aadhaar verified successfully</Text> : null}
        <TouchableOpacity
          onPress={sendAadhaarOtp}
          disabled={submitting || aadhaarVerified || aadhaarNumber.length !== 12 || aadhaarOtpCooldown > 0}
          style={[
            styles.secondaryButton,
            (submitting || aadhaarVerified || aadhaarNumber.length !== 12 || aadhaarOtpCooldown > 0) && styles.submitButtonDisabled,
          ]}
          activeOpacity={0.7}
        >
          {isSendingAadhaarOtp ? (
            <ActivityIndicator color={colors.primary.main} size="small" />
          ) : (
            <Text style={styles.secondaryButtonText}>
              {aadhaarRefId ? 'Resend OTP' : 'Send OTP'}
              {aadhaarOtpCooldown > 0 ? ` (${aadhaarOtpCooldown}s)` : ''}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.stepBlock}>
        <Text style={styles.stepTitle}>Aadhaar OTP</Text>
        <TextInput
          value={aadhaarOtp}
          onChangeText={(v) => setAadhaarOtp(String(v || '').replace(/\D/g, '').slice(0, 6))}
          placeholder="6-digit OTP"
          placeholderTextColor={colors.text.secondary}
          keyboardType="number-pad"
          editable={!aadhaarVerified && !submitting && !!aadhaarRefId}
          style={[styles.input, (aadhaarVerified || !aadhaarRefId) && styles.inputDisabled]}
        />
        <TouchableOpacity
          onPress={verifyAadhaar}
          disabled={submitting || aadhaarVerified || !aadhaarRefId || aadhaarOtp.length !== 6}
          style={[
            styles.secondaryButton,
            (submitting || aadhaarVerified || !aadhaarRefId || aadhaarOtp.length !== 6) && styles.submitButtonDisabled,
          ]}
          activeOpacity={0.7}
        >
          {aadhaarVerified ? (
            <View style={styles.inlineButtonContent}>
              <MaterialIcons name="check-circle" size={18} color={colors.success.main} />
              <Text style={styles.secondaryButtonTextSuccess}>Verified</Text>
            </View>
          ) : isVerifyingAadhaar ? (
            <ActivityIndicator color={colors.primary.main} size="small" />
          ) : (
            <Text style={styles.secondaryButtonText}>Verify Aadhaar</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPanStep = () => (
    <View>
      <View style={styles.stepHeaderRow}>
        {/* Back handled by bottom-left floating arrow */}
      </View>

      <Text style={styles.stepHeaderTitle}>PAN Verification</Text>

      <View style={styles.stepBlock}>
        <TextInput
          value={panNumber}
          onChangeText={(v) => setPanNumber(String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))}
          placeholder="PAN Number (ABCDE1234F)"
          placeholderTextColor={colors.muted}
          autoCapitalize="characters"
          editable={!panVerified && !submitting}
          style={[styles.input, panVerified && styles.inputDisabled]}
        />
        {panVerified && !!panRegisteredName && (
          <Text style={styles.panNameText}>{panRegisteredName}</Text>
        )}
        {panVerified ? <Text style={styles.verifiedInline}>PAN verified successfully</Text> : null}
        {panVerified && panNameMatchOk === false ? (
          <Text style={styles.mismatchInline}>
            Name mismatch: Aadhaar & PAN should match (score {panNameMatchScore ?? 0}%)
          </Text>
        ) : null}
        <TouchableOpacity
          onPress={verifyPan}
          disabled={submitting || panVerified || !aadhaarVerified || panNumber.length !== 10}
          style={[
            styles.secondaryButton,
            (submitting || panVerified || !aadhaarVerified || panNumber.length !== 10) && styles.submitButtonDisabled,
          ]}
          activeOpacity={0.7}
        >
          {panVerified ? (
            <View style={styles.inlineButtonContent}>
              <MaterialIcons name="check-circle" size={18} color={colors.success.main} />
              <Text style={styles.secondaryButtonTextSuccess}>Verified</Text>
            </View>
          ) : isVerifyingPan ? (
            <ActivityIndicator color={colors.primary.main} size="small" />
          ) : (
            <Text style={styles.secondaryButtonText}>Verify PAN</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  // Verification Form – SecureID Option B (Aadhaar + OTP + PAN only)
  const renderVerificationForm = () => (
    <View style={styles.formContainer}>
      <View style={styles.headerRow}>
        <MaterialIcons name="verified-user" size={20} color={colors.primary.main} />
        <Text style={styles.statusTitleInline}>Verification Required</Text>
      </View>
      <Text style={styles.statusMessage}>
        {isNewUser
          ? 'You don’t have an existing account. Verify Aadhaar & PAN to create your account.'
          : 'Complete Aadhaar & PAN verification to continue.'}
      </Text>

      {renderProgress()}
      {step === 0 ? renderAadhaarStep() : renderPanStep()}

      {/* Bottom-right Next arrow */}
      <TouchableOpacity
        onPress={() => {
          if (step === 0) setStep(1);
          else navigation.navigate('FaceVerification');
        }}
        disabled={step === 0 ? !canGoNextFromAadhaar : !canGoNextFromPan}
        style={[
          styles.floatingArrow,
          (step === 0 ? !canGoNextFromAadhaar : !canGoNextFromPan) && styles.floatingArrowDisabled,
        ]}
        activeOpacity={0.85}
      >
        <MaterialIcons name="arrow-forward" size={22} color="#fff" />
      </TouchableOpacity>

      {/* Bottom-left Back arrow (PAN -> Aadhaar) */}
      {step === 1 ? (
        <TouchableOpacity onPress={() => setStep(0)} style={styles.floatingBack} activeOpacity={0.85}>
          <MaterialIcons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
      ) : null}
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
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
      >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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

            {/* Show rejection info (without form) */}
            {status === VERIFICATION_STATUS.REJECTED && !showResubmitForm && renderRejectedStatus()}

            {/* Show form for new / pending / resubmit */}
            {((status == null) || (status === VERIFICATION_STATUS.PENDING) || (status === VERIFICATION_STATUS.REJECTED && showResubmitForm)) && renderVerificationForm()}
          </CardContent>
        </Card>
      </ScrollView>
      </KeyboardAvoidingView>
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
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    padding: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
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
  // approvedIcon removed (no approved page)
  rejectedIcon: {
    backgroundColor: colors.error.light,
  },
  statusTitle: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  statusTitleInline: {
    ...typography.h2,
    color: colors.text.primary,
  },
  statusMessage: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 24,
  },
  progressContainer: {
    marginBottom: spacing.lg,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotActive: {
    backgroundColor: colors.primary.main,
  },
  progressDotText: {
    ...typography.small,
    color: colors.text.primary,
    fontWeight: '700',
  },
  progressLine: {
    height: 3,
    width: 70,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
    borderRadius: 2,
  },
  progressLineActive: {
    backgroundColor: colors.primary.main,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  stepHeaderTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  arrowButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowButtonDisabled: {
    backgroundColor: colors.text.muted,
    opacity: 0.5,
  },
  floatingArrow: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingArrowDisabled: {
    backgroundColor: colors.text.muted,
    opacity: 0.5,
  },
  floatingBack: {
    position: 'absolute',
    left: spacing.sm,
    bottom: spacing.sm,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // backPill/backPillText removed; using floatingBack arrow instead
  // refreshButton + refreshButtonText removed (no pending page in new flow)
  // dashboardButton + dashboardButtonText removed (no approved page)
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
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    width: '100%',
    paddingBottom: spacing.xl + 54, // extra space for floating arrow
  },
  stepBlock: {
    marginBottom: spacing.md,
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
    color: '#000',
    backgroundColor: colors.cardBackground,
    minHeight: 48,
  },
  inputDisabled: {
    backgroundColor: colors.border,
    borderColor: colors.border,
    color: '#000',
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
  secondaryButtonTextSuccess: {
    ...typography.button,
    color: colors.success.main,
  },
  inlineButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  panNameText: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },
  verifiedInline: {
    ...typography.body,
    color: colors.success.main,
    marginTop: spacing.sm,
  },
  mismatchInline: {
    ...typography.body,
    color: colors.error.main,
    marginTop: spacing.sm,
  },
  // Terms & Conditions styles moved to FaceVerification screen
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

