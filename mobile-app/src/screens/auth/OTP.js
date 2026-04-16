/**
 * OTP Verification Screen - People App
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import { validateOTP } from '../../utils/validation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OTPWidget } from '@msg91comm/sendotp-react-native';
import { authAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { getDeviceId } from '../../utils/deviceId';
import { msg91AuthToken, msg91WidgetId } from '../../config/msg91';

const OTP = ({ navigation, route }) => {
  const { phoneNumber, selectedRole, reqId: routeReqId } = route?.params || {};
  const { loginWithToken } = useAuth();
  const { t } = useLanguage();

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [forceLoginModalVisible, setForceLoginModalVisible] = useState(false);
  const [reqId, setReqId] = useState(routeReqId);
  // Start at 60s: OTP was just sent from Login; resend only after cooldown.
  const [resendCooldown, setResendCooldown] = useState(60);
  const otpInputRef = useRef(null);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimerRef = useRef(null);
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg) => {
    if (!msg) return;
    setToastMsg(String(msg));
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    Animated.timing(toastAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
    toastTimerRef.current = setTimeout(() => {
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(() => setToastMsg(''));
    }, 5000);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  useEffect(() => {
    if (!routeReqId) {
      setError('Missing verification session. Go back and request a new code.');
    }
  }, [routeReqId]);

  // Warm device id + role so verify isn’t blocked on AsyncStorage on submit.
  useEffect(() => {
    getDeviceId().catch(() => {});
    if (!selectedRole) {
      AsyncStorage.getItem('selectedRole').catch(() => {});
    }
  }, [selectedRole]);

  const handleOTPChange = (text) => {
    const digits = text.replace(/\D/g, '').slice(0, 6);
    setOtp(digits);
    setError('');
  };

  const handleVerifyOTP = async (forceLogin = false) => {
    if (!validateOTP(otp)) {
      setError('Please enter a valid 6-digit OTP');
      showToast('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (!phoneNumber) {
        throw new Error('Phone number not found. Please go back and try again.');
      }
      if (!reqId) {
        throw new Error('Missing verification session. Go back and request a new code.');
      }

      const shouldForceLogin = forceLogin === true;

      const fallbackDevice = () =>
        `session-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

      const [deviceIdRaw, roleFromStorage] = await Promise.all([
        getDeviceId().catch(() => fallbackDevice()),
        selectedRole ? Promise.resolve(selectedRole) : AsyncStorage.getItem('selectedRole'),
      ]);

      let deviceId =
        deviceIdRaw && typeof deviceIdRaw === 'string' && deviceIdRaw.trim()
          ? deviceIdRaw.trim()
          : fallbackDevice();

      const role = selectedRole || roleFromStorage;
      if (!role || !['client', 'freelancer'].includes(role)) {
        throw new Error('Account type missing. Go back and select Client or Freelancer.');
      }

      if (!msg91WidgetId || !msg91AuthToken) {
        throw new Error('MSG91 is not configured in this build. Check EXPO_PUBLIC_MSG91_* env.');
      }

      // Ensure widget initialized (safe to call multiple times).
      try {
        OTPWidget.initializeWidget(String(msg91WidgetId), String(msg91AuthToken));
      } catch {}

      const verifyResp = await OTPWidget.verifyOTP({ reqId, otp });
      console.log('MSG91 verifyOTP response:', verifyResp);
      const accessToken =
        verifyResp?.accessToken ||
        verifyResp?.access_token ||
        verifyResp?.message || // docs: success => message contains access-token (widget)
        verifyResp?.data?.accessToken ||
        verifyResp?.data?.access_token ||
        verifyResp?.data?.message ||
        verifyResp?.result?.message ||
        verifyResp?.result?.accessToken ||
        verifyResp?.result?.access_token;

      if (!accessToken) {
        throw new Error('OTP verification failed. Please try again.');
      }

      const phoneE164 = String(phoneNumber).replace(/\s/g, '');
      const result = await authAPI.verifyMsg91AccessToken(
        accessToken,
        role,
        phoneE164,
        deviceId,
        shouldForceLogin
      );

      if (result.success) {
        await loginWithToken(result.token, result.user);
      } else if (result.code === 'ALREADY_LOGGED_IN_ELSEWHERE') {
        setLoading(false);
        setForceLoginModalVisible(true);
        return;
      } else {
        throw new Error(result.error || 'Verification failed');
      }

      setLoading(false);
    } catch (err) {
      console.error('❌ Error verifying OTP:', err);

      let errorMessage = 'Failed to verify OTP. Please try again.';

      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message?.includes('Network Error') || err.code === 'ERR_NETWORK') {
        errorMessage =
          'Network error: Could not connect to server. Please check your internet connection.';
      } else if (err.response?.status === 401) {
        errorMessage = 'Invalid OTP. Please check and try again.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      if (err.code === 'auth/invalid-verification-code' || err.code === 'auth/code-expired') {
        errorMessage = 'Invalid or expired code. Please try again or request a new code.';
      }

      setError(errorMessage);
      showToast(errorMessage);
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;

    try {
      if (!phoneNumber) {
        setError('Phone number not found. Please go back and try again.');
        return;
      }

      if (!msg91WidgetId || !msg91AuthToken) {
        setError('MSG91 is not configured in this build.');
        return;
      }

      try {
        OTPWidget.initializeWidget(String(msg91WidgetId), String(msg91AuthToken));
      } catch {}

      // Retry on SMS (11) by default.
      const retryResp = await OTPWidget.retryOTP({ reqId, retryChannel: 11 });
      const newReqId =
        retryResp?.reqId || retryResp?.requestId || retryResp?.data?.reqId || retryResp?.data?.requestId;
      if (newReqId) setReqId(newReqId);
      setResendCooldown(60);
      setError('');
    } catch (err) {
      console.error('Error resending OTP:', err);
      setError(
        err.response?.data?.error || err.message || 'Failed to resend OTP. Please try again.'
      );
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const displayPhone = phoneNumber || 'your phone';

  return (
    <SafeAreaView style={styles.screenRoot} edges={['top', 'left', 'right']}>
      {toastMsg ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            {
              opacity: toastAnim,
              transform: [
                {
                  translateY: toastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-10, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.toastText}>{toastMsg}</Text>
        </Animated.View>
      ) : null}
      <View style={styles.colorWash} pointerEvents="none">
        <View style={styles.blobBlue} />
        <View style={styles.blobGreen} />
      </View>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.page}>
            <View style={styles.brandBlock}>
              <Text style={styles.screenTitle}>Enter verification code</Text>
              <View style={styles.brandAccent}>
                <View style={styles.brandAccentBlue} />
                <View style={styles.brandAccentGreen} />
              </View>
              <Text style={styles.subtitle}>
                Code sent to{' '}
                <Text style={styles.subtitleEmphasis}>{displayPhone}</Text>
              </Text>
            </View>

            <View style={styles.card}>
              <View style={styles.cardStripeRow}>
                <View style={styles.cardStripeBlue} />
                <View style={styles.cardStripeGreen} />
              </View>
              <Text style={styles.fieldLabel}>6-digit code</Text>
              <TextInput
                ref={otpInputRef}
                style={styles.otpInput}
                value={otp}
                onChangeText={handleOTPChange}
                placeholder="• • • • • •"
                placeholderTextColor={colors.text.muted}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                selectTextOnFocus
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity
                onPress={() => handleVerifyOTP(false)}
                disabled={!validateOTP(otp) || loading}
                style={[
                  styles.primaryButton,
                  (!validateOTP(otp) || loading) && styles.primaryButtonDisabled,
                ]}
                activeOpacity={0.9}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>Verify and continue</Text>
                )}
              </TouchableOpacity>

              <View style={styles.resendRow}>
                <Text style={styles.resendLabel}>Didn’t receive it?</Text>
                {resendCooldown > 0 ? (
                  <Text style={styles.cooldownText}>Resend in {resendCooldown}s</Text>
                ) : (
                  <TouchableOpacity onPress={handleResendOTP} hitSlop={{ top: 8, bottom: 8 }}>
                    <Text style={styles.resendLink}>Resend code</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                onPress={handleBack}
                style={styles.backRow}
                activeOpacity={0.7}
              >
                <MaterialIcons name="arrow-back" size={18} color={colors.primary.main} />
                <Text style={styles.backText}>Back to sign in</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={forceLoginModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setForceLoginModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconCircle}>
              <MaterialIcons name="devices" size={34} color={colors.primary.main} />
            </View>
            <Text style={styles.modalTitle}>Login on this device?</Text>
            <Text style={styles.modalSubtitle}>{t('auth.alreadyLoggedInElsewhere')}</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setForceLoginModalVisible(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalPrimaryButton]}
                onPress={() => {
                  setForceLoginModalVisible(false);
                  handleVerifyOTP(true);
                }}
                activeOpacity={0.9}
              >
                <Text style={styles.modalPrimaryText}>{t('auth.logoutFromOtherDevice')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: '#EEF3FA',
    overflow: 'hidden',
  },
  toast: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 20,
    backgroundColor: 'rgba(17, 24, 39, 0.92)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  colorWash: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  blobBlue: {
    position: 'absolute',
    top: -64,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
  },
  blobGreen: {
    position: 'absolute',
    bottom: '18%',
    left: -48,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
  },
  flex: {
    flex: 1,
    zIndex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  page: {
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  brandBlock: {
    marginBottom: spacing.xl,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: -0.3,
  },
  brandAccent: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    gap: 6,
  },
  brandAccentBlue: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary.main,
  },
  brandAccentGreen: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.success.main,
  },
  subtitle: {
    marginTop: spacing.md,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text.secondary,
  },
  subtitleEmphasis: {
    fontWeight: '600',
    color: colors.primary.main,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.14)',
    padding: spacing.lg,
    overflow: 'hidden',
    shadowColor: colors.success.main,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardStripeRow: {
    flexDirection: 'row',
    marginHorizontal: -spacing.lg,
    marginTop: -spacing.lg,
    marginBottom: spacing.md,
    height: 4,
  },
  cardStripeBlue: {
    flex: 1,
    backgroundColor: colors.primary.main,
  },
  cardStripeGreen: {
    flex: 1,
    backgroundColor: colors.success.main,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  otpInput: {
    width: '100%',
    height: 52,
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(37, 99, 235, 0.35)',
    borderRadius: 8,
    backgroundColor: colors.primary.light,
    color: colors.text.primary,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: typography.small.fontSize,
    color: colors.error.main,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: colors.text.muted,
    opacity: 0.55,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  resendLabel: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  cooldownText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.muted,
  },
  resendLink: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary.main,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xl,
    paddingVertical: spacing.sm,
  },
  backText: {
    fontSize: 15,
    color: colors.primary.main,
    fontWeight: '600',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.12)',
    shadowColor: colors.primary.main,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 5,
  },
  modalIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(37, 99, 235, 0.10)',
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  modalCancelButton: {
    backgroundColor: 'rgba(15, 23, 42, 0.06)',
  },
  modalCancelText: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '700',
  },
  modalPrimaryButton: {
    backgroundColor: colors.primary.main,
  },
  modalPrimaryText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default OTP;
