/**
 * OTP Verification Screen - People App
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/common';
import { validateOTP } from '../../utils/validation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { getDeviceId } from '../../utils/deviceId';

const OTP = ({ navigation, route }) => {
  const { phoneNumber, selectedRole } = route?.params || {};
  const { loginWithToken } = useAuth();
  const { t } = useLanguage();
  
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpInputRef = useRef(null);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleOTPChange = (text) => {
    // Only allow digits, max 6
    const digits = text.replace(/\D/g, '').slice(0, 6);
    setOtp(digits);
    setError('');
  };

  const handleVerifyOTP = async (forceLogin = false) => {
    if (!validateOTP(otp)) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (!phoneNumber) {
        throw new Error('Phone number not found. Please go back and try again.');
      }

      const formattedPhone = phoneNumber.replace(/\s/g, '');
      let deviceId;
      try {
        deviceId = await getDeviceId();
      } catch (e) {
        deviceId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      }
      if (!deviceId || typeof deviceId !== 'string') {
        deviceId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      }
      const shouldForceLogin = forceLogin === true;
      const result = await authAPI.verifyOTP(formattedPhone, otp, deviceId, shouldForceLogin);

      if (result.success) {
        await loginWithToken(result.token, result.user);
        console.log('✅ User authenticated, navigation will be handled by AppNavigator');
      } else if (result.code === 'ALREADY_LOGGED_IN_ELSEWHERE') {
        setLoading(false);
        Alert.alert(
          null,
          t('auth.alreadyLoggedInElsewhere'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('auth.logoutFromOtherDevice'),
              onPress: () => handleVerifyOTP(true),
            },
          ]
        );
        return;
      } else {
        throw new Error(result.error || 'Verification failed');
      }

      setLoading(false);
    } catch (error) {
      console.error('❌ Error verifying OTP:', error);
      
      // Better error handling
      let errorMessage = 'Failed to verify OTP. Please try again.';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message?.includes('Network Error') || error.code === 'ERR_NETWORK') {
        errorMessage = 'Network error: Could not connect to server. Please check your internet connection.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Invalid OTP. Please check and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
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
      
      const formattedPhone = phoneNumber.replace(/\s/g, '');
      const storedRole = selectedRole || await AsyncStorage.getItem('selectedRole');
      
      if (!storedRole) {
        setError('Role not found. Please go back and try again.');
        return;
      }
      
      // Call backend API to resend OTP
      const result = await authAPI.sendOTP(formattedPhone, storedRole);
      
      if (result.success) {
        setResendCooldown(60);
        setError('');
        console.log('✅ OTP resent successfully!');
      } else {
        throw new Error(result.error || 'Failed to resend OTP');
      }
    } catch (error) {
      console.error('Error resending OTP:', error);
      setError(error.response?.data?.error || error.message || 'Failed to resend OTP. Please try again.');
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  // Get phone number from route params or AsyncStorage
  const displayPhone = phoneNumber || 'your phone';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <MaterialIcons name="security" size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.title}>Verify OTP</Text>
            <Text style={styles.description}>
              Enter the 6-digit code sent to {displayPhone}
            </Text>
          </View>

          {/* Card — elevated panel, no harsh outline */}
          <Card style={styles.authCard}>
            <CardContent>
              {/* OTP Input — 3D lifted field */}
              <View style={styles.otpContainer}>
                <TextInput
                  ref={otpInputRef}
                  style={styles.otpInput}
                  value={otp}
                  onChangeText={handleOTPChange}
                  placeholder="000000"
                  placeholderTextColor={colors.text.muted}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                  selectTextOnFocus
                />
              </View>

              {/* Submit Button with Error */}
              <TouchableOpacity
                onPress={() => handleVerifyOTP(false)}
                disabled={!validateOTP(otp) || loading}
                style={[styles.submitButton, (!validateOTP(otp) || loading) && styles.submitButtonDisabled]}
                activeOpacity={0.7}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <View style={styles.buttonContent}>
                    <MaterialIcons name="check-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.buttonText}>Verify OTP</Text>
                    {error ? (
                      <>
                        <View style={styles.buttonDivider} />
                        <View style={styles.errorInline}>
                          <MaterialIcons name="error-outline" size={16} color="#FFFFFF" />
                          <Text style={styles.errorTextInline} numberOfLines={1}>
                            {error}
                          </Text>
                        </View>
                      </>
                    ) : null}
                  </View>
                )}
              </TouchableOpacity>

              {/* Resend OTP */}
              <View style={styles.resendContainer}>
                <Text style={styles.resendText}>Didn't receive the code?</Text>
                {resendCooldown > 0 ? (
                  <Text style={styles.cooldownText}>Resend in {resendCooldown}s</Text>
                ) : (
                  <Button
                    variant="ghost"
                    onPress={handleResendOTP}
                    style={styles.resendButton}
                  >
                    Resend OTP
                  </Button>
                )}
              </View>

              {/* Back Button */}
              <TouchableOpacity
                onPress={handleBack}
                style={styles.backButton}
                activeOpacity={0.7}
              >
                <View style={styles.backButtonContent}>
                  <MaterialIcons name="arrow-back" size={16} color={colors.primary.main} />
                  <Text style={styles.backButtonText}>Back to Login</Text>
                </View>
              </TouchableOpacity>
            </CardContent>
          </Card>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  content: {
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#1e3a8a',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
      default: {},
    }),
  },
  title: {
    ...typography.h1,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  description: {
    ...typography.body,
    color: colors.muted,
    textAlign: 'center',
  },
  authCard: {
    width: '100%',
    borderWidth: 0,
    backgroundColor: colors.cardBackground,
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.14,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
      default: {},
    }),
  },
  otpContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    width: '100%',
    borderRadius: spacing.md,
    backgroundColor: colors.cardBackground,
    borderWidth: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      default: {},
    }),
  },
  otpInput: {
    width: '100%',
    height: 64,
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 8,
    borderWidth: 0,
    borderRadius: spacing.md,
    backgroundColor: colors.cardBackground,
    color: colors.text.primary,
    paddingHorizontal: spacing.md,
  },
  submitButton: {
    width: '100%',
    minHeight: 52,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.primary.main,
    borderRadius: spacing.borderRadius.button,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#1e40af',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
      default: {},
    }),
  },
  submitButtonDisabled: {
    backgroundColor: colors.text.muted,
    opacity: 0.7,
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
  buttonDivider: {
    width: 1,
    height: '80%',
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: spacing.sm,
  },
  errorInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 1,
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
  resendContainer: {
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  resendText: {
    ...typography.small,
    color: colors.muted,
    marginBottom: spacing.xs,
  },
  cooldownText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '600',
  },
  resendButton: {
    marginTop: spacing.xs,
  },
  backButton: {
    width: '100%',
    minHeight: 52,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.cardBackground,
    borderRadius: spacing.borderRadius.button,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      default: {},
    }),
  },
  backButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  backButtonText: {
    color: colors.primary.main,
    fontSize: typography.button.fontSize,
    fontWeight: typography.button.fontWeight,
  },
  backIcon: {
    marginRight: spacing.xs,
  },
});

export default OTP;
