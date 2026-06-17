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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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

const TITLE_COLOR = '#1A3348';
const ACCENT_BLUE = '#5B8DEF';
const MUTED = '#6B7C8F';

const OTP = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
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
  const cachedAccessTokenRef = useRef(null);
  const lastLoginContextRef = useRef(null);
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

  const lastAutoOtpRef = useRef('');

  useEffect(() => {
    if (otp.length === 6 && otp !== lastAutoOtpRef.current && !loading && reqId) {
      lastAutoOtpRef.current = otp;
      handleVerifyOTP(false);
    }
    if (otp.length < 6) {
      lastAutoOtpRef.current = '';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, loading, reqId]);

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
      if (verifyResp?.type && String(verifyResp.type).toLowerCase() !== 'success') {
        const msg = verifyResp?.message || 'Invalid OTP. Please try again.';
        throw new Error(String(msg));
      }

      const accessToken =
        verifyResp?.accessToken ||
        verifyResp?.access_token ||
        // MSG91 widget returns access-token in `message` on success.
        verifyResp?.message ||
        verifyResp?.data?.accessToken ||
        verifyResp?.data?.access_token ||
        verifyResp?.data?.message ||
        verifyResp?.result?.message ||
        verifyResp?.result?.accessToken ||
        verifyResp?.result?.access_token;

      const looksLikeJwt =
        typeof accessToken === 'string' &&
        /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(accessToken);

      if (!looksLikeJwt) {
        throw new Error('OTP verification failed. Please try again.');
      }

      const phoneE164 = String(phoneNumber).replace(/\s/g, '');

      // Cache the verified access-token so force-login doesn't re-run verifyOTP (which can return "otp already verified").
      cachedAccessTokenRef.current = accessToken;
      lastLoginContextRef.current = {
        role,
        phoneE164,
        deviceId,
      };

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

  const handleForceLoginConfirm = async () => {
    try {
      const accessToken = cachedAccessTokenRef.current;
      const ctx = lastLoginContextRef.current;
      if (!accessToken || !ctx?.role || !ctx?.phoneE164 || !ctx?.deviceId) {
        showToast('Session expired. Please request a new OTP.');
        return;
      }
      setLoading(true);
      const result = await authAPI.verifyMsg91AccessToken(
        accessToken,
        ctx.role,
        ctx.phoneE164,
        ctx.deviceId,
        true
      );
      if (result.success) {
        await loginWithToken(result.token, result.user);
      } else {
        throw new Error(result.error || 'Login failed');
      }
      setLoading(false);
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Login failed. Please try again.';
      setError(msg);
      showToast(msg);
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

  const displayPhone = (phoneNumber || '').replace(/\s/g, '') || 'your phone';

  const otpCells = Array.from({ length: 6 }, (_, i) => otp[i] || '');

  return (
    <SafeAreaView style={styles.screenRoot} edges={['top', 'left', 'right']}>
      {toastMsg ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            { top: (insets?.top || 0) + 12 },
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
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={styles.backBtn}
            onPress={handleBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <MaterialIcons name="arrow-back" size={22} color={ACCENT_BLUE} />
          </TouchableOpacity>

          <Text style={styles.screenTitle}>Log in to People</Text>

          <View style={styles.phoneRow}>
            <Text style={styles.phoneHint}>You will receive an OTP on this number</Text>
            <View style={styles.phoneValueRow}>
              <Text style={styles.phoneValue}>{displayPhone}</Text>
              <TouchableOpacity onPress={handleBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialIcons name="edit" size={18} color={ACCENT_BLUE} />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.otpLabel}>Enter OTP</Text>

          <TouchableOpacity
            activeOpacity={1}
            onPress={() => otpInputRef.current?.focus()}
            style={styles.otpRow}
          >
            <TextInput
              ref={otpInputRef}
              value={otp}
              onChangeText={handleOTPChange}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              caretHidden
              style={styles.hiddenOtpInput}
            />
            {otpCells.map((digit, index) => (
              <View key={index} style={styles.otpCell}>
                <Text style={styles.otpDigit}>{digit}</Text>
                <View
                  style={[
                    styles.otpLine,
                    index === otp.length && styles.otpLineActive,
                  ]}
                />
              </View>
            ))}
          </TouchableOpacity>

          {loading ? (
            <ActivityIndicator
              style={styles.loader}
              color={ACCENT_BLUE}
              size="small"
            />
          ) : null}

          {resendCooldown > 0 ? (
            <Text style={styles.resendTimer}>Resend OTP in {resendCooldown} seconds</Text>
          ) : (
            <TouchableOpacity onPress={handleResendOTP} style={styles.resendBtn}>
              <Text style={styles.resendLink}>Resend OTP</Text>
            </TouchableOpacity>
          )}
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
                  handleForceLoginConfirm();
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
    backgroundColor: '#FFFFFF',
  },
  toast: {
    position: 'absolute',
    top: 0,
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
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: spacing.xxl,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    marginBottom: 8,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: TITLE_COLOR,
    marginBottom: 28,
    letterSpacing: -0.3,
  },
  phoneRow: {
    marginBottom: 28,
  },
  phoneHint: {
    fontSize: 14,
    color: MUTED,
    lineHeight: 20,
    marginBottom: 6,
  },
  phoneValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  phoneValue: {
    fontSize: 16,
    fontWeight: '600',
    color: TITLE_COLOR,
  },
  otpLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: ACCENT_BLUE,
    marginBottom: 12,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    position: 'relative',
  },
  hiddenOtpInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  otpCell: {
    flex: 1,
    maxWidth: 48,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  otpDigit: {
    fontSize: 22,
    fontWeight: '600',
    color: TITLE_COLOR,
    height: 30,
    lineHeight: 30,
    textAlign: 'center',
  },
  otpLine: {
    marginTop: 6,
    width: '100%',
    height: 2,
    backgroundColor: 'rgba(91, 141, 239, 0.35)',
    borderRadius: 1,
  },
  otpLineActive: {
    backgroundColor: ACCENT_BLUE,
    height: 2.5,
  },
  loader: {
    marginTop: 8,
    marginBottom: 8,
  },
  resendTimer: {
    fontSize: 13,
    color: MUTED,
    marginTop: 4,
  },
  resendBtn: {
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  resendLink: {
    fontSize: 13,
    fontWeight: '600',
    color: ACCENT_BLUE,
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
