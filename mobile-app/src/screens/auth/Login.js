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
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing } from '../../theme';
import { validatePhone, formatPhone } from '../../utils/validation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OTPWidget } from '@msg91comm/sendotp-react-native';
import { msg91AuthToken, msg91WidgetId } from '../../config/msg91';

const TITLE_COLOR = '#1A3348';
const ACCENT_BLUE = '#5B8DEF';
const BUTTON_BLUE = '#0066FA';
const BUTTON_DISABLED = '#93B8F5';
/** @deprecated use BUTTON_BLUE — kept for Metro hot-reload compatibility */
const PILL_BLUE = BUTTON_BLUE;
const MUTED = '#6B7C8F';

const Login = ({ navigation }) => {
  const [phone, setPhone] = useState('+91 ');
  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      if (!msg91WidgetId || !msg91AuthToken) return;
      OTPWidget.initializeWidget(String(msg91WidgetId), String(msg91AuthToken));
    } catch {
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
      setError('Please select Client or Freelancer');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (!msg91WidgetId || !msg91AuthToken) {
        throw new Error('MSG91 is not configured in this build. Check EXPO_PUBLIC_MSG91_* env.');
      }

      const identifier = phone.replace(/\s/g, '').replace(/^\+/, '');
      const response = await OTPWidget.sendOTP({ identifier });

      const reqId =
        response?.reqId ||
        response?.req_id ||
        response?.requestId ||
        response?.request_id ||
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

      setError(errorMessage);
      setLoading(false);
    }
  };

  const canSubmit = validatePhone(phone) && selectedRole && !loading;

  return (
    <SafeAreaView style={styles.screenRoot} edges={['top', 'left', 'right']}>
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
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('AuthWelcome');
              }
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <MaterialIcons name="arrow-back" size={22} color={ACCENT_BLUE} />
          </TouchableOpacity>

          <Text style={styles.screenTitle}>Log in to People</Text>

          <Text style={styles.fieldLabel}>Mobile Number</Text>
          <TextInput
            style={styles.phoneInput}
            value={phone}
            onChangeText={handlePhoneChange}
            placeholder="+91"
            placeholderTextColor={MUTED}
            keyboardType="phone-pad"
            maxLength={17}
            autoFocus
          />
          <View style={styles.inputLine} />
          <Text style={styles.helperText}>You will receive an OTP on this number</Text>

          <Text style={[styles.fieldLabel, styles.roleLabel]}>Login as</Text>
          <View style={styles.roleRow}>
            <TouchableOpacity
              style={[styles.rolePill, selectedRole === 'client' && styles.rolePillActive]}
              onPress={() => handleRoleSelect('client')}
              activeOpacity={0.85}
            >
              <Text style={[styles.roleTitle, selectedRole === 'client' && styles.roleTitleActive]}>
                Client
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.rolePill, selectedRole === 'freelancer' && styles.rolePillActive]}
              onPress={() => handleRoleSelect('freelancer')}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.roleTitle,
                  selectedRole === 'freelancer' && styles.roleTitleActive,
                ]}
              >
                Freelancer
              </Text>
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            onPress={handleSendOTP}
            disabled={!canSubmit}
            style={[styles.primaryButton, !canSubmit && styles.primaryButtonDisabled]}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Get OTP</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    marginBottom: 36,
    letterSpacing: -0.3,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: ACCENT_BLUE,
    marginBottom: 4,
  },
  roleLabel: {
    marginTop: 28,
    marginBottom: 10,
  },
  phoneInput: {
    fontSize: 22,
    fontWeight: '600',
    color: TITLE_COLOR,
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  inputLine: {
    height: 2,
    backgroundColor: ACCENT_BLUE,
    borderRadius: 1,
    marginBottom: 10,
  },
  helperText: {
    fontSize: 13,
    color: MUTED,
    lineHeight: 18,
    marginBottom: 4,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  rolePill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#D1D9E6',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  rolePillActive: {
    borderColor: ACCENT_BLUE,
    backgroundColor: 'rgba(91, 141, 239, 0.08)',
  },
  roleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: MUTED,
  },
  roleTitleActive: {
    color: ACCENT_BLUE,
    fontWeight: '700',
  },
  errorText: {
    fontSize: 13,
    color: colors.error.main,
    marginTop: spacing.md,
    lineHeight: 18,
  },
  primaryButton: {
    alignSelf: 'center',
    minWidth: 200,
    paddingHorizontal: 48,
    marginTop: 48,
    height: 50,
    borderRadius: 26,
    backgroundColor: BUTTON_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: BUTTON_DISABLED,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});

export default Login;
