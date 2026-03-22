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
import { Input, Card, CardContent } from '../../components/common';
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
    <View style={styles.screenRoot}>
      {/* Soft ambient shapes */}
      <View style={styles.decorLayer} pointerEvents="none">
        <View style={styles.blobA} />
        <View style={styles.blobB} />
        <View style={styles.blobC} />
      </View>

      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.content}>
              {/* Hero */}
              <View style={styles.header}>
                <View style={styles.iconRing}>
                  <View style={styles.iconContainer}>
                    <MaterialIcons name="phone-android" size={34} color="#FFFFFF" />
                  </View>
                </View>
                <Text style={styles.title}>Welcome to People</Text>
              </View>

              <Card style={styles.authCard}>
                <View style={styles.cardAccent} />
                <CardContent style={styles.cardInner}>
                  <Text style={styles.sectionEyebrow}>Account</Text>
                  <Input
                    label="Mobile number"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChangeText={handlePhoneChange}
                    keyboardType="phone-pad"
                    maxLength={17}
                    elevated
                    leftIcon={
                      <MaterialIcons name="dialpad" size={18} color={colors.primary.main} />
                    }
                    error={error && !selectedRole ? error : ''}
                  />

                  <View style={styles.roleSection}>
                    <Text style={styles.sectionEyebrow}>I am joining as</Text>
                    <View style={styles.roleButtons}>
                      <TouchableOpacity
                        style={[
                          styles.roleButton,
                          selectedRole === 'client'
                            ? styles.roleButtonSelected
                            : styles.roleButtonUnselected,
                        ]}
                        onPress={() => handleRoleSelect('client')}
                        activeOpacity={0.75}
                      >
                        <View
                          style={[
                            styles.roleIconWrap,
                            selectedRole === 'client' && styles.roleIconWrapSelected,
                          ]}
                        >
                          <MaterialIcons
                            name="business-center"
                            size={22}
                            color={selectedRole === 'client' ? colors.primary.main : colors.text.muted}
                          />
                        </View>
                        <Text
                          style={[
                            styles.roleButtonText,
                            selectedRole === 'client' && styles.roleButtonTextSelected,
                          ]}
                        >
                          Client
                        </Text>
                        <Text
                          style={[
                            styles.roleButtonSubtext,
                            selectedRole === 'client' && styles.roleButtonSubtextSelected,
                          ]}
                        >
                          Hire talent
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.roleButton,
                          selectedRole === 'freelancer'
                            ? styles.roleButtonSelected
                            : styles.roleButtonUnselected,
                        ]}
                        onPress={() => handleRoleSelect('freelancer')}
                        activeOpacity={0.75}
                      >
                        <View
                          style={[
                            styles.roleIconWrap,
                            selectedRole === 'freelancer' && styles.roleIconWrapSelected,
                          ]}
                        >
                          <MaterialIcons
                            name="engineering"
                            size={22}
                            color={selectedRole === 'freelancer' ? colors.primary.main : colors.text.muted}
                          />
                        </View>
                        <Text
                          style={[
                            styles.roleButtonText,
                            selectedRole === 'freelancer' && styles.roleButtonTextSelected,
                          ]}
                        >
                          Freelancer
                        </Text>
                        <Text
                          style={[
                            styles.roleButtonSubtext,
                            selectedRole === 'freelancer' && styles.roleButtonSubtextSelected,
                          ]}
                        >
                          Find work
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {error && selectedRole ? <Text style={styles.errorText}>{error}</Text> : null}
                  </View>

                  <TouchableOpacity
                    onPress={handleSendOTP}
                    disabled={!validatePhone(phone) || !selectedRole || loading}
                    style={[
                      styles.submitButton,
                      (!validatePhone(phone) || !selectedRole || loading) && styles.submitButtonDisabled,
                    ]}
                    activeOpacity={0.85}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <View style={styles.buttonContent}>
                        <Text style={styles.buttonText}>Continue</Text>
                        <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
                        {error ? (
                          <>
                            <View style={styles.buttonDivider} />
                            <View style={styles.errorInline}>
                              <MaterialIcons name="error-outline" size={16} color="#FFFFFF" />
                              <Text style={styles.errorTextInline} numberOfLines={2}>
                                {error}
                              </Text>
                            </View>
                          </>
                        ) : null}
                      </View>
                    )}
                  </TouchableOpacity>

                  <Text style={styles.footerHint}>We’ll send a one-time code via SMS</Text>
                </CardContent>
              </Card>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  flex: {
    flex: 1,
  },
  decorLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  blobA: {
    position: 'absolute',
    top: -100,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
  },
  blobB: {
    position: 'absolute',
    top: '18%',
    left: -100,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  blobC: {
    position: 'absolute',
    bottom: -40,
    right: -20,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(37, 99, 235, 0.06)',
  },
  safe: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  content: {
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconRing: {
    padding: 4,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    marginBottom: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#1e3a8a',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 6,
      },
      default: {},
    }),
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text.primary,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  authCard: {
    width: '100%',
    borderWidth: 0,
    borderColor: 'transparent',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    overflow: 'hidden',
    borderRadius: 20,
    padding: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
      },
      android: {
        elevation: 12,
      },
      default: {},
    }),
  },
  cardAccent: {
    height: 5,
    width: '100%',
    backgroundColor: colors.primary.main,
    opacity: 0.95,
  },
  cardInner: {
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.text.muted,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  roleSection: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  roleButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 118,
    borderRadius: 16,
    borderWidth: 0,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
      default: {},
    }),
  },
  roleButtonSelected: {
    backgroundColor: colors.primary.light,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary.main,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      default: {},
    }),
  },
  roleButtonUnselected: {
    backgroundColor: '#FFFFFF',
  },
  roleIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  roleIconWrapSelected: {
    backgroundColor: '#FFFFFF',
  },
  roleButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text.secondary,
    textAlign: 'center',
  },
  roleButtonTextSelected: {
    color: colors.primary.main,
  },
  roleButtonSubtext: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.muted,
    textAlign: 'center',
    marginTop: 4,
  },
  roleButtonSubtextSelected: {
    color: colors.primary.main,
    opacity: 0.85,
  },
  errorText: {
    fontSize: typography.small.fontSize,
    color: colors.error.main,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  submitButton: {
    width: '100%',
    minHeight: 54,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    backgroundColor: colors.primary.main,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#1e40af',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.38,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      default: {},
    }),
  },
  submitButtonDisabled: {
    backgroundColor: colors.text.muted,
    opacity: 0.65,
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
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  buttonDivider: {
    width: 1,
    height: 18,
    backgroundColor: 'rgba(255,255,255,0.35)',
    marginHorizontal: spacing.xs,
  },
  errorInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 1,
    maxWidth: '100%',
  },
  errorTextInline: {
    ...typography.small,
    color: '#FFFFFF',
    fontSize: 11,
    flex: 1,
    flexShrink: 1,
  },
  footerHint: {
    marginTop: spacing.lg,
    textAlign: 'center',
    fontSize: 12,
    color: colors.text.muted,
    lineHeight: 18,
  },
});

export default Login;
