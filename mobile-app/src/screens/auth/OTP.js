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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/common';
import { validateOTP } from '../../utils/validation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';

const OTP = ({ navigation, route }) => {
  const { phoneNumber, selectedRole } = route?.params || {};
  const { loginWithToken } = useAuth();
  
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

  const handleVerifyOTP = async () => {
    if (!validateOTP(otp)) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('🔐 Verifying OTP...');
      
      if (!phoneNumber) {
        throw new Error('Phone number not found. Please go back and try again.');
      }
      
      // Format phone number (remove spaces, keep +)
      const formattedPhone = phoneNumber.replace(/\s/g, '');
      
      // Call backend API to verify OTP
      // Backend handles Firebase verification and returns JWT token
      const result = await authAPI.verifyOTP(formattedPhone, otp);
      
      if (result.success) {
        console.log('✅ OTP verified! Authentication successful!');
        
        // Update auth context (this will trigger navigation via AppNavigator)
        await loginWithToken(result.token, result.user);
        
        // Check if user has profile
        const user = result.user;
        
        // Note: Navigation will be handled automatically by AppNavigator
        // based on auth state and user profile completeness
        // We don't need to manually navigate here
        console.log('✅ User authenticated, navigation will be handled by AppNavigator');
        
        // If user needs profile setup, AppNavigator will show ProfileSetup
        // If user has complete profile, AppNavigator will show appropriate dashboard
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

          {/* Card */}
          <Card style={styles.card}>
            <CardContent>
              {/* OTP Input */}
              <View style={styles.otpContainer}>
                <TextInput
                  ref={otpInputRef}
                  style={styles.otpInput}
                  value={otp}
                  onChangeText={handleOTPChange}
                  placeholder="000000"
                  placeholderTextColor={colors.muted}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                  selectTextOnFocus
                />
              </View>

              {/* Submit Button */}
              <Button
                onPress={handleVerifyOTP}
                disabled={!validateOTP(otp) || loading}
                loading={loading}
                style={styles.submitButton}
              >
                {!loading && <MaterialIcons name="check-circle" size={20} color="#FFFFFF" style={styles.buttonIcon} />}
                {loading ? 'Verifying...' : 'Verify OTP'}
              </Button>

              {/* Error Display */}
              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

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
              <Button
                variant="ghost"
                onPress={handleBack}
                style={styles.backButton}
              >
                <MaterialIcons name="arrow-back" size={16} color={colors.primary} style={styles.backIcon} />
                Back to Login
              </Button>
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
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h1,
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.body,
    color: colors.muted,
    textAlign: 'center',
  },
  card: {
    width: '100%',
  },
  otpContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  otpInput: {
    width: '100%',
    height: 64,
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 8,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: spacing.md,
    backgroundColor: colors.card,
    color: '#000000', // Explicit black color for visibility
    paddingHorizontal: spacing.md,
  },
  submitButton: {
    width: '100%',
    marginBottom: spacing.md,
  },
  buttonIcon: {
    marginRight: spacing.sm,
  },
  errorContainer: {
    backgroundColor: colors.destructive + '20',
    borderWidth: 1,
    borderColor: colors.destructive,
    borderRadius: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.small,
    color: colors.destructive,
    textAlign: 'center',
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
    marginTop: spacing.md,
  },
  backIcon: {
    marginRight: spacing.xs,
  },
});

export default OTP;
