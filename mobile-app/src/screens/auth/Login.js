/**
 * Login Screen - People App
 */

import React, { useEffect, useState } from 'react';
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
import { OTPWidget } from '@msg91comm/sendotp-react-native';
import { msg91AuthToken, msg91WidgetId } from '../../config/msg91';

const Login = ({ navigation }) => {
  const [phone, setPhone] = useState('+91 ');
  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      if (!msg91WidgetId || !msg91AuthToken) return;
      OTPWidget.initializeWidget(String(msg91WidgetId), String(msg91AuthToken));
    } catch (e) {
      // handled on send
    }
  }, []);

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
      if (!msg91WidgetId || !msg91AuthToken) {
        throw new Error('MSG91 is not configured in this build. Check EXPO_PUBLIC_MSG91_* env.');
      }

      // MSG91 expects country code without "+".
      const identifier = phone.replace(/\s/g, '').replace(/^\+/, '');
      const response = await OTPWidget.sendOTP({ identifier });
      console.log('MSG91 sendOTP response:', response);

      const reqId =
        response?.reqId ||
        response?.req_id ||
        response?.requestId ||
        response?.request_id ||
        // MSG91 commonly returns reqId in `message` on success for sendOTP.
        (response?.type === 'success' ? response?.message : null) ||
        response?.data?.reqId ||
        response?.data?.req_id ||
        response?.data?.requestId ||
        response?.data?.request_id;
      if (!reqId) {
        const msg =
          response?.message ||
          response?.error ||
          response?.data?.message ||
          response?.data?.error ||
          null;
        throw new Error(
          msg
            ? `Could not start OTP session: ${String(msg)}`
            : 'Could not start OTP session. Please try again.'
        );
      }

      await AsyncStorage.setItem('selectedRole', selectedRole);
      await AsyncStorage.setItem('phoneNumber', phone);

      navigation.navigate('OTP', {
        phoneNumber: phone,
        selectedRole,
        reqId,
      });

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
      if (String(err?.message || '').toLowerCase().includes('initialize')) {
        errorMessage = 'MSG91 OTP is not initialized. Check widgetId/authToken and Mobile Integration.';
      }
      if (String(err?.message || '').toLowerCase().includes('auth') || String(err?.message || '').toLowerCase().includes('token')) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screenRoot} edges={['top', 'left', 'right']}>
      <View style={styles.headerWash} pointerEvents="none">
        <View style={styles.headerBlobBlue} />
        <View style={styles.headerBlobGreen} />
        <View style={styles.headerBlobBlueBottom} />
        <View style={styles.headerBlobGreenBottom} />
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
            <View style={styles.hero}>
              <Text style={styles.brandName}>People</Text>
              <Text style={styles.heroTitle}>Welcome Back</Text>
              <Text style={styles.heroSubtitle}>Enter your details below</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>Mobile Number</Text>
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

              <Text style={[styles.label, styles.labelSpacing]}>Login as</Text>
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
                  <Text style={styles.roleSub}>Find work and earn</Text>
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

              <Text style={styles.footerHint}>We’ll send a one-time code via SMS</Text>
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
    backgroundColor: '#F4F7FB',
    overflow: 'hidden',
  },
  headerWash: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  headerBlobBlue: {
    position: 'absolute',
    top: -170,
    left: -170,
    width: 440,
    height: 440,
    borderRadius: 220,
    backgroundColor: '#2F6FED',
  },
  headerBlobGreen: {
    position: 'absolute',
    top: -120,
    right: -160,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: '#19C37D',
    opacity: 0.92,
  },
  headerBlobBlueBottom: {
    position: 'absolute',
    bottom: -180,
    right: -160,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: 'rgba(47, 111, 237, 0.14)',
  },
  headerBlobGreenBottom: {
    position: 'absolute',
    bottom: -220,
    left: -200,
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: 'rgba(25, 195, 125, 0.12)',
  },
  flex: {
    flex: 1,
    zIndex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: 58,
    paddingBottom: spacing.xl,
  },
  page: {
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  hero: {
    paddingHorizontal: 4,
    marginBottom: 18,
    // Keep title/subtitle inside the blue header circle
    maxWidth: 240,
  },
  brandName: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.6,
  },
  heroTitle: {
    marginTop: 0,
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    borderWidth: 0,
    padding: 18,
    overflow: 'hidden',
    shadowColor: '#0B1220',
    shadowOpacity: 0.1,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 14 },
    elevation: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
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
    gap: 12,
  },
  rolePill: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    backgroundColor: '#FFFFFF',
  },
  rolePillClientActive: {
    borderColor: 'rgba(47, 111, 237, 0.38)',
    backgroundColor: 'rgba(47, 111, 237, 0.06)',
  },
  rolePillFreelancerActive: {
    borderColor: 'rgba(25, 195, 125, 0.4)',
    backgroundColor: 'rgba(25, 195, 125, 0.07)',
  },
  roleTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  roleTitleActive: {
    color: '#2F6FED',
  },
  roleTitleFreelancerActive: {
    color: '#19C37D',
  },
  roleSub: {
    fontSize: 12,
    color: '#64748B',
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
    height: 54,
    borderRadius: 16,
    backgroundColor: '#2F6FED',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2F6FED',
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  primaryButtonDisabled: {
    backgroundColor: 'rgba(47, 111, 237, 0.55)',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  footerHint: {
    marginTop: spacing.md,
    textAlign: 'center',
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
});

export default Login;
