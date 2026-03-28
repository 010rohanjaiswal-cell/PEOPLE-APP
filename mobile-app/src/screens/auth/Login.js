/**
 * Login Screen - People App
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import { Input } from '../../components/common';
import { validatePhone, formatPhone } from '../../utils/validation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../../api';

const Login = ({ navigation }) => {
  const [phone, setPhone] = useState('+91 ');
  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePhoneChange = (text) => {
    const formatted = formatPhone(text);
    setPhone(formatted);
    setError('');
  };

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setError('');
  };

  const handleSendOTP = async () => {
    if (!validatePhone(phone)) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    if (!selectedRole) {
      setError('Please select your role');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formattedPhone = phone.replace(/\s/g, '');
      const result = await authAPI.sendOTP(formattedPhone, selectedRole);

      if (result.success) {
        await AsyncStorage.setItem('selectedRole', selectedRole);
        await AsyncStorage.setItem('phoneNumber', phone);

        navigation.navigate('OTP', {
          phoneNumber: phone,
          selectedRole,
        });
      } else {
        throw new Error(result.error || 'Failed to send OTP');
      }

      setLoading(false);
    } catch (err) {
      let errorMessage = 'Failed to send OTP. Please try again.';

      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screenRoot} edges={['top', 'left', 'right']}>
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
              <Text style={styles.brandName}>People</Text>
              <View style={styles.brandAccent}>
                <View style={styles.brandAccentBlue} />
                <View style={styles.brandAccentGreen} />
              </View>
              <Text style={styles.tagline}>Sign in with your mobile number</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>Mobile number</Text>
              <Input
                label={null}
                placeholder="+91 98765 43210"
                value={phone}
                onChangeText={handlePhoneChange}
                keyboardType="phone-pad"
                maxLength={17}
                forceLight
                leftIcon={
                  <MaterialIcons name="phone" size={20} color={colors.primary.main} />
                }
                error={error && !selectedRole ? error : ''}
                style={styles.inputWrap}
              />

              <Text style={[styles.label, styles.labelSpacing]}>Account type</Text>
              <View style={styles.roleRow}>
                <TouchableOpacity
                  style={[
                    styles.rolePill,
                    selectedRole === 'client' && styles.rolePillClientActive,
                  ]}
                  onPress={() => handleRoleSelect('client')}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.roleTitle,
                      selectedRole === 'client' && styles.roleTitleActive,
                    ]}
                  >
                    Client
                  </Text>
                  <Text style={styles.roleSub}>Post jobs and hire</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.rolePill,
                    selectedRole === 'freelancer' && styles.rolePillFreelancerActive,
                  ]}
                  onPress={() => handleRoleSelect('freelancer')}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.roleTitle,
                      selectedRole === 'freelancer' && styles.roleTitleFreelancerActive,
                    ]}
                  >
                    Freelancer
                  </Text>
                  <Text style={styles.roleSub}>Find and complete work</Text>
                </TouchableOpacity>
              </View>

              {error && selectedRole ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity
                onPress={handleSendOTP}
                disabled={!validatePhone(phone) || !selectedRole || loading}
                style={[
                  styles.primaryButton,
                  (!validatePhone(phone) || !selectedRole || loading) && styles.primaryButtonDisabled,
                ]}
                activeOpacity={0.9}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>Continue</Text>
                )}
              </TouchableOpacity>

              <Text style={styles.footerHint}>
                We’ll send a one-time code via{' '}
                <Text style={styles.footerHintAccent}>SMS</Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: '#EEF3FA',
    overflow: 'hidden',
  },
  colorWash: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  blobBlue: {
    position: 'absolute',
    top: -72,
    right: -48,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
  },
  blobGreen: {
    position: 'absolute',
    bottom: '12%',
    left: -56,
    width: 200,
    height: 200,
    borderRadius: 100,
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
  brandName: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: -0.5,
  },
  brandAccent: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    gap: 6,
  },
  brandAccentBlue: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary.main,
  },
  brandAccentGreen: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.success.main,
  },
  tagline: {
    marginTop: spacing.md,
    fontSize: 16,
    lineHeight: 22,
    color: colors.text.secondary,
  },
  taglineAccent: {
    color: colors.primary.main,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.12)',
    padding: spacing.lg,
    overflow: 'hidden',
    shadowColor: colors.primary.main,
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
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  labelSpacing: {
    marginTop: spacing.lg,
  },
  inputWrap: {
    marginBottom: 0,
  },
  roleRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  rolePill: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: '#FAFAFA',
  },
  rolePillClientActive: {
    borderColor: colors.primary.main,
    borderWidth: 2,
    backgroundColor: colors.primary.light,
  },
  rolePillFreelancerActive: {
    borderColor: colors.success.main,
    borderWidth: 2,
    backgroundColor: colors.success.light,
  },
  roleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  roleTitleActive: {
    color: colors.primary.main,
  },
  roleTitleFreelancerActive: {
    color: colors.success.dark,
  },
  roleSub: {
    fontSize: 12,
    color: colors.text.muted,
    lineHeight: 16,
  },
  errorText: {
    fontSize: typography.small.fontSize,
    color: colors.error.main,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  primaryButton: {
    marginTop: spacing.lg,
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
  footerHint: {
    marginTop: spacing.md,
    textAlign: 'center',
    fontSize: 13,
    color: colors.text.muted,
    lineHeight: 18,
  },
  footerHintAccent: {
    color: colors.success.dark,
    fontWeight: '600',
  },
});

export default Login;
