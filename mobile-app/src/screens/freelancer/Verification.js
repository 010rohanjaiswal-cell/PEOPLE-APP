/**
 * Verification Screen - People App
 * Freelancers must complete verification before accessing dashboard
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Animated,
  Easing,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../../theme';
import {
  ACCENT_BLUE,
  authScreenStyles as auth,
} from '../../theme/authScreen';
import { Button } from '../../components/common';
import { verificationAPI, userAPI } from '../../api';
import { VERIFICATION_STATUS } from '../../constants';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const OTP_SLIDE_LAYOUT = {
  duration: 420,
  create: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
  update: {
    type: LayoutAnimation.Types.spring,
    springDamping: 0.82,
  },
};

const AutoDismissSuccessMessage = ({ message, onDismiss }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!message) return;

    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 250,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    const fadeOutTimer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) onDismissRef.current();
      });
    }, 3000);

    return () => {
      clearTimeout(fadeOutTimer);
      fadeAnim.stopAnimation();
    };
  }, [message, fadeAnim]);

  if (!message) return null;

  return (
    <Animated.View style={[styles.successContainer, { opacity: fadeAnim }]}>
      <MaterialIcons name="check-circle" size={20} color={colors.success.main} />
      <Text style={styles.successText}>{message}</Text>
    </Animated.View>
  );
};

const AadhaarOtpVerifyBlock = ({
  revealKey,
  aadhaarOtp,
  setAadhaarOtp,
  aadhaarVerified,
  submitting,
  canVerifyOtp,
  canContinue,
  isVerifyingAadhaar,
  onVerify,
  onContinue,
}) => {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [focusOtpInput, setFocusOtpInput] = useState(false);

  useEffect(() => {
    slideAnim.setValue(0);
    setFocusOtpInput(false);
    const animTimer = setTimeout(() => {
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }, 40);
    const focusTimer = setTimeout(() => setFocusOtpInput(true), 440);
    return () => {
      clearTimeout(animTimer);
      clearTimeout(focusTimer);
    };
  }, [revealKey, slideAnim]);

  return (
    <Animated.View
      style={[
        styles.stepBlock,
        styles.otpSlideContainer,
        {
          opacity: slideAnim,
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [36, 0],
              }),
            },
          ],
        },
      ]}
    >
      <Text style={auth.fieldLabel}>Aadhaar OTP</Text>
      <TextInput
        value={aadhaarOtp}
        onChangeText={(v) => setAadhaarOtp(String(v || '').replace(/\D/g, '').slice(0, 6))}
        placeholder="6-digit OTP"
        placeholderTextColor={colors.text.muted}
        keyboardType="number-pad"
        editable={!aadhaarVerified && !submitting}
        autoFocus={focusOtpInput}
        style={[
          auth.textInput,
          styles.compactInput,
          aadhaarVerified && auth.textInputDisabled,
        ]}
      />
      <View style={[auth.inputLine, aadhaarVerified && auth.inputLineDisabled]} />
      <TouchableOpacity
        onPress={onVerify}
        disabled={!canVerifyOtp}
        style={[
          auth.outlineButton,
          auth.outlineButtonCenter,
          !canVerifyOtp && auth.outlineButtonDisabled,
        ]}
        activeOpacity={0.85}
      >
        {aadhaarVerified ? (
          <View style={styles.inlineButtonContent}>
            <MaterialIcons name="check-circle" size={18} color={colors.success.main} />
            <Text style={[auth.outlineButtonText, { color: colors.success.main }]}>Verified</Text>
          </View>
        ) : isVerifyingAadhaar ? (
          <ActivityIndicator color={ACCENT_BLUE} size="small" />
        ) : (
          <Text style={[auth.outlineButtonText, !canVerifyOtp && auth.outlineButtonTextDisabled]}>
            Verify Aadhaar
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onContinue}
        disabled={!canContinue || submitting}
        style={[
          auth.primaryButton,
          (!canContinue || submitting) && auth.primaryButtonDisabled,
        ]}
        activeOpacity={0.9}
      >
        <Text style={auth.primaryButtonText}>Continue</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
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
  statusMessage: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 24,
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
    width: '100%',
  },
  stepBlock: {
    marginBottom: spacing.lg,
  },
  compactInput: {
    fontSize: 16,
    letterSpacing: 0.5,
  },
  otpSlideContainer: {
    overflow: 'hidden',
  },
  referralIntro: {
    ...typography.body,
    color: colors.text.secondary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  referralFormatHint: {
    ...typography.small,
    color: colors.text.muted,
    marginTop: spacing.xs,
  },
  referralSkipTouch: {
    alignSelf: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
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
  mismatchInline: {
    fontSize: 13,
    color: colors.error.main,
    marginTop: spacing.sm,
    lineHeight: 18,
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
    backgroundColor: '#FFFFFF',
    borderRadius: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.12)',
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

const Verification = ({ navigation }) => {
  const { isNewUser, mergeUser } = useAuth();
  const { t } = useLanguage();


  const [status, setStatus] = useState(null); // null, 'pending', 'approved', 'rejected'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const clearSuccessMessage = useCallback(() => setSuccessMessage(''), []);
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
  const [otpRevealKey, setOtpRevealKey] = useState(0);
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
  const [step, setStep] = useState(0); // 0 = Aadhaar, 1 = PAN, 2 = Referral (optional)

  // Referral (optional)
  const [referralCode, setReferralCode] = useState('');
  const [referralValidating, setReferralValidating] = useState(false);
  const [referralValid, setReferralValid] = useState(null); // null | true | false
  const [referralApplied, setReferralApplied] = useState(false);
  const referralValidateSeq = React.useRef(0);

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
      LayoutAnimation.configureNext(OTP_SLIDE_LAYOUT);
      setAadhaarRefId(resp.refId);
      setOtpRevealKey((k) => k + 1);
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

      const approvedStatus =
        response.status === VERIFICATION_STATUS.APPROVED ||
        response.verificationStatus === VERIFICATION_STATUS.APPROVED ||
        response.verification?.status === VERIFICATION_STATUS.APPROVED;
      if (approvedStatus) {
        mergeUser({ verificationStatus: 'approved' });
        navigation.replace('FreelancerDashboard');
        return;
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
  const referralRequiredValid = referralCode.trim().length > 0;
  const canGoNextFromReferral = !referralRequiredValid || referralValid === true;

  const renderProgress = () => {
    const aadhaarDone = aadhaarVerified === true;
    const panDone = panVerified === true && panNameMatchOk !== false;
    const referralDone = !referralRequiredValid ? true : referralApplied === true;
    const dotLabel = (done, num) =>
      done ? (
        <MaterialIcons name="check" size={14} color="#fff" />
      ) : (
        <Text style={[auth.progressDotText, (step === num - 1 || done) && auth.progressDotTextActive]}>
          {num}
        </Text>
      );
    return (
      <View style={auth.progressContainer}>
        <View style={auth.progressRow}>
          <View style={[auth.progressDot, (step === 0 || aadhaarDone) && auth.progressDotActive]}>
            {dotLabel(aadhaarDone, 1)}
          </View>
          <View style={[auth.progressLine, (aadhaarDone || step > 0) && auth.progressLineActive]} />
          <View style={[auth.progressDot, (step === 1 || panDone) && auth.progressDotActive]}>
            {dotLabel(panDone, 2)}
          </View>
          <View style={[auth.progressLine, panDone && auth.progressLineActive]} />
          <View style={[auth.progressDot, (step === 2 || referralDone) && auth.progressDotActive]}>
            {dotLabel(referralDone, 3)}
          </View>
          <View style={[auth.progressLine, referralDone && auth.progressLineActive]} />
          <View style={auth.progressDot}>
            <Text style={auth.progressDotText}>4</Text>
          </View>
        </View>
      </View>
    );
  };

  useEffect(() => {
    const code = referralCode.trim();
    if (!code) {
      setReferralValid(null);
      setReferralValidating(false);
      return;
    }
    const seq = ++referralValidateSeq.current;
    setReferralValidating(true);
    const tmr = setTimeout(() => {
      (async () => {
        try {
          const resp = await verificationAPI.validateReferralCode(code);
          if (seq !== referralValidateSeq.current) return;
          setReferralValid(resp?.success && resp?.valid === true);
        } catch (e) {
          if (seq !== referralValidateSeq.current) return;
          setReferralValid(false);
        } finally {
          if (seq === referralValidateSeq.current) setReferralValidating(false);
        }
      })();
    }, 450);
    return () => clearTimeout(tmr);
  }, [referralCode]);

  const renderAadhaarStep = () => {
    const aadhaarLocked = aadhaarVerified || !!aadhaarRefId;
    const showOtpSection = !!aadhaarRefId || aadhaarVerified;
    const canSendOtp =
      !submitting && !aadhaarVerified && aadhaarNumber.length === 12 && aadhaarOtpCooldown <= 0;
    const canVerifyOtp =
      !submitting && !aadhaarVerified && !!aadhaarRefId && aadhaarOtp.length === 6;

    return (
      <View>
        <View style={styles.stepBlock}>
          <Text style={auth.fieldLabel}>Aadhaar number</Text>
          <TextInput
            value={aadhaarNumber}
            onChangeText={(v) => setAadhaarNumber(String(v || '').replace(/\D/g, '').slice(0, 12))}
            placeholder="12-digit Aadhaar"
            placeholderTextColor={colors.text.muted}
            keyboardType="number-pad"
            editable={!aadhaarVerified && !submitting && !aadhaarRefId}
            style={[
              auth.textInput,
              styles.compactInput,
              aadhaarLocked && auth.textInputDisabled,
            ]}
          />
          <View style={[auth.inputLine, aadhaarLocked && auth.inputLineDisabled]} />
          {aadhaarVerified ? (
            <Text style={auth.successText}>Aadhaar verified successfully</Text>
          ) : (
            <Text style={auth.fieldHint}>OTP will be sent to your Aadhaar-linked mobile</Text>
          )}
          <TouchableOpacity
            onPress={sendAadhaarOtp}
            disabled={!canSendOtp}
            style={[
              auth.outlineButton,
              auth.outlineButtonCenter,
              !canSendOtp && auth.outlineButtonDisabled,
            ]}
            activeOpacity={0.85}
          >
            {isSendingAadhaarOtp ? (
              <ActivityIndicator color={ACCENT_BLUE} size="small" />
            ) : (
              <Text style={[auth.outlineButtonText, !canSendOtp && auth.outlineButtonTextDisabled]}>
                {aadhaarRefId ? 'Resend OTP' : 'Send OTP'}
                {aadhaarOtpCooldown > 0 ? ` (${aadhaarOtpCooldown}s)` : ''}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {showOtpSection ? (
          <AadhaarOtpVerifyBlock
            key={otpRevealKey}
            revealKey={otpRevealKey}
            aadhaarOtp={aadhaarOtp}
            setAadhaarOtp={setAadhaarOtp}
            aadhaarVerified={aadhaarVerified}
            submitting={submitting}
            canVerifyOtp={canVerifyOtp}
            canContinue={aadhaarVerified === true}
            isVerifyingAadhaar={isVerifyingAadhaar}
            onVerify={verifyAadhaar}
            onContinue={() => setStep(1)}
          />
        ) : null}
      </View>
    );
  };

  const renderPanStep = () => {
    const canVerifyPan =
      !submitting && !panVerified && aadhaarVerified && panNumber.length === 10;

    return (
      <View>
        <View style={styles.stepBlock}>
          <Text style={auth.fieldLabel}>PAN number</Text>
          <TextInput
            value={panNumber}
            onChangeText={(v) =>
              setPanNumber(String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))
            }
            placeholder="ABCDE1234F"
            placeholderTextColor={colors.text.muted}
            autoCapitalize="characters"
            editable={!panVerified && !submitting}
            style={[auth.textInput, styles.compactInput, panVerified && auth.textInputDisabled]}
          />
          <View style={[auth.inputLine, panVerified && auth.inputLineDisabled]} />
          {panVerified && !!panRegisteredName ? (
            <Text style={auth.fieldHint}>{panRegisteredName}</Text>
          ) : (
            <Text style={auth.fieldHint}>Must match the name on your Aadhaar</Text>
          )}
          {panVerified ? <Text style={auth.successText}>PAN verified successfully</Text> : null}
          {panVerified && panNameMatchOk === false ? (
            <Text style={styles.mismatchInline}>
              Name mismatch: Aadhaar & PAN should match (score {panNameMatchScore ?? 0}%)
            </Text>
          ) : null}
          <TouchableOpacity
            onPress={verifyPan}
            disabled={!canVerifyPan}
            style={[
              auth.outlineButton,
              auth.outlineButtonCenter,
              !canVerifyPan && auth.outlineButtonDisabled,
            ]}
            activeOpacity={0.85}
          >
            {panVerified ? (
              <View style={styles.inlineButtonContent}>
                <MaterialIcons name="check-circle" size={18} color={colors.success.main} />
                <Text style={[auth.outlineButtonText, { color: colors.success.main }]}>Verified</Text>
              </View>
            ) : isVerifyingPan ? (
              <ActivityIndicator color={ACCENT_BLUE} size="small" />
            ) : (
              <Text style={[auth.outlineButtonText, !canVerifyPan && auth.outlineButtonTextDisabled]}>
                Verify PAN
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderReferralStep = () => (
    <View>
      <Text style={auth.fieldLabel}>{t('referral.enterTitle')}</Text>
      <Text style={auth.fieldHint}>{t('referral.stepIntro')}</Text>

      <View style={styles.stepBlock}>
        <TextInput
          value={referralCode}
          onChangeText={(v) => {
            setReferralApplied(false);
            const upper = String(v || '').toUpperCase();
            const filtered = upper
              .split('')
              .filter((ch) => /[A-Z2-9@_-]/.test(ch))
              .join('')
              .slice(0, 18);
            setReferralCode(filtered);
          }}
          placeholder={t('referral.enterPlaceholder')}
          placeholderTextColor={colors.text.muted}
          autoCapitalize="characters"
          editable={!submitting && !referralApplied}
          style={[auth.textInput, styles.compactInput, referralApplied && auth.textInputDisabled]}
        />
        <View style={[auth.inputLine, referralApplied && auth.inputLineDisabled]} />
        <Text style={styles.referralFormatHint}>{t('referral.stepFormatHint')}</Text>

        {referralCode.trim().length > 0 ? (
          <View style={{ marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            {referralValidating ? (
              <>
                <ActivityIndicator color={ACCENT_BLUE} size="small" />
                <Text style={{ ...typography.small, color: colors.text.secondary }}>{t('referral.validating')}</Text>
              </>
            ) : referralValid === true ? (
              <>
                <MaterialIcons name="check-circle" size={18} color={colors.success.main} />
                <Text style={{ ...typography.small, color: colors.success.main, fontWeight: '700' }}>{t('referral.valid')}</Text>
              </>
            ) : referralValid === false ? (
              <>
                <MaterialIcons name="cancel" size={18} color={colors.error.main} />
                <Text style={{ ...typography.small, color: colors.error.main, fontWeight: '700' }}>{t('referral.invalid')}</Text>
              </>
            ) : null}
          </View>
        ) : (
          <Text style={{ ...typography.small, color: colors.text.secondary, marginTop: spacing.sm }}>
            {t('referral.codeHint')}
          </Text>
        )}
      </View>

      <TouchableOpacity
        onPress={() => !submitting && navigation.navigate('FaceVerification')}
        disabled={!!submitting}
        style={styles.referralSkipTouch}
        activeOpacity={0.7}
      >
        <Text style={auth.linkText}>{t('referral.skipForNow')}</Text>
      </TouchableOpacity>
    </View>
  );

  const handleContinue = async () => {
    if (step === 0) {
      setStep(1);
      return;
    }
    if (step === 1) {
      setStep(2);
      return;
    }
    const code = referralCode.trim();
    if (!code) {
      navigation.navigate('FaceVerification');
      return;
    }
    if (referralValid !== true) return;
    if (referralApplied) {
      navigation.navigate('FaceVerification');
      return;
    }
    try {
      setSubmitting(true);
      const resp = await verificationAPI.applyReferralCode(code);
      if (!resp?.success) throw new Error(resp?.error || 'Failed to apply referral code');
      setReferralApplied(true);
      navigation.navigate('FaceVerification');
    } catch (e) {
      showErrorModal('Referral code', e?.response?.data?.error || e?.message || 'Failed to apply referral code');
    } finally {
      setSubmitting(false);
    }
  };

  const canContinue =
    step === 0 ? canGoNextFromAadhaar : step === 1 ? canGoNextFromPan : canGoNextFromReferral;

  // Verification Form – SecureID Option B (Aadhaar + OTP + PAN only)
  const renderVerificationForm = () => (
    <View style={styles.formContainer}>
      {renderProgress()}
      {step === 0 ? renderAadhaarStep() : step === 1 ? renderPanStep() : renderReferralStep()}

      {step > 0 ? (
        <TouchableOpacity
          onPress={handleContinue}
          disabled={!canContinue || submitting}
          style={[auth.primaryButton, (!canContinue || submitting) && auth.primaryButtonDisabled]}
          activeOpacity={0.9}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={auth.primaryButtonText}>
              {step === 2 ? 'Continue to face verification' : 'Continue'}
            </Text>
          )}
        </TouchableOpacity>
      ) : null}

      {step > 0 ? (
        <TouchableOpacity
          onPress={() => setStep((s) => Math.max(0, s - 1))}
          style={auth.backStepTouch}
          activeOpacity={0.7}
        >
          <Text style={auth.backStepText}>Back</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={auth.screenRoot} edges={['top', 'bottom']}>
        <View style={[auth.flex, { justifyContent: 'center', alignItems: 'center' }]}>
          <LoadingSpinner />
        </View>
      </SafeAreaView>
    );
  }

  const showForm =
    status == null ||
    status === VERIFICATION_STATUS.PENDING ||
    (status === VERIFICATION_STATUS.REJECTED && showResubmitForm);
  const showRejectedOnly =
    status === VERIFICATION_STATUS.REJECTED && !showResubmitForm;

  const alertsBlock = (
    <>
      {error ? (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={20} color={colors.error.main} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      {successMessage ? (
        <AutoDismissSuccessMessage
          message={successMessage}
          onDismiss={clearSuccessMessage}
        />
      ) : null}
    </>
  );

  const subtitleText = isNewUser
    ? 'Verify your Aadhaar and PAN to create your freelancer account.'
    : 'Complete Aadhaar and PAN verification to continue.';

  return (
    <SafeAreaView style={auth.screenRoot} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={auth.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
      >
        <ScrollView
          contentContainerStyle={auth.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            onPress={() => navigation.replace('Login')}
            style={auth.backBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={22} color={ACCENT_BLUE} />
          </TouchableOpacity>

          <Text style={auth.screenTitle}>Verification required</Text>
          <Text style={auth.helperText}>{subtitleText}</Text>

          {alertsBlock}

          {showForm ? renderVerificationForm() : null}
          {showRejectedOnly ? renderRejectedStatus() : null}
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

export default Verification;

