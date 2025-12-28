/**
 * Login Screen - People App
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/common';
import { validatePhone, formatPhone } from '../../utils/validation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../../api';

const Login = ({ navigation }) => {
  const [phone, setPhone] = useState('+91 ');
  const [selectedRole, setSelectedRole] = useState(null); // 'client' or 'freelancer'
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
    // Validation
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
      console.log('📱 Sending OTP to:', phone);
      
      // Format phone number (remove spaces, keep +)
      const formattedPhone = phone.replace(/\s/g, '');
      
      // Call backend API to send OTP
      // Backend handles Firebase Phone Auth - simpler and more reliable!
      const result = await authAPI.sendOTP(formattedPhone, selectedRole);
      
      if (result.success) {
        console.log('✅ OTP sent successfully!');
        
        // Store role and phone for later use
        await AsyncStorage.setItem('selectedRole', selectedRole);
        await AsyncStorage.setItem('phoneNumber', phone);
        
        // Navigate to OTP screen
        navigation.navigate('OTP', {
          phoneNumber: phone,
          selectedRole,
        });
      } else {
        throw new Error(result.error || 'Failed to send OTP');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('❌ Error sending OTP:', error);
      
      // Better error handling
      let errorMessage = 'Failed to send OTP. Please try again.';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };

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
              <MaterialIcons name="phone" size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.title}>Welcome to People</Text>
            <Text style={styles.description}>
              Enter your mobile number to get started
            </Text>
          </View>

          {/* Card */}
          <Card style={styles.card}>
            <CardContent>
              {/* Phone Number Input */}
              <Input
                label="Mobile Number"
                placeholder="+91 9876543210"
                value={phone}
                onChangeText={handlePhoneChange}
                keyboardType="phone-pad"
                maxLength={17}
                leftIcon={<MaterialIcons name="phone" size={16} color={colors.text.muted} />}
                error={error && !selectedRole ? error : ''}
              />
              <Text style={styles.helperText}>
                Enter your 10-digit mobile number
              </Text>

              {/* Role Selection */}
              <View style={styles.roleSection}>
                <Text style={styles.roleLabel}>Choose Your Role</Text>
                <View style={styles.roleButtons}>
                  <TouchableOpacity
                    style={[
                      styles.roleButton,
                      selectedRole === 'client' ? styles.roleButtonSelected : styles.roleButtonUnselected,
                    ]}
                    onPress={() => handleRoleSelect('client')}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.roleButtonText,
                        selectedRole === 'client' && styles.roleButtonTextSelected,
                      ]}
                    >
                      I'm a Client
                    </Text>
                    <Text
                      style={[
                        styles.roleButtonSubtext,
                        selectedRole === 'client' && styles.roleButtonSubtextSelected,
                      ]}
                    >
                      I want to hire
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.roleButton,
                      selectedRole === 'freelancer' ? styles.roleButtonSelected : styles.roleButtonUnselected,
                    ]}
                    onPress={() => handleRoleSelect('freelancer')}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.roleButtonText,
                        selectedRole === 'freelancer' && styles.roleButtonTextSelected,
                      ]}
                    >
                      I'm a Freelancer
                    </Text>
                    <Text
                      style={[
                        styles.roleButtonSubtext,
                        selectedRole === 'freelancer' && styles.roleButtonSubtextSelected,
                      ]}
                    >
                      I want to work
                    </Text>
                  </TouchableOpacity>
                </View>
                {error && selectedRole && (
                  <Text style={styles.errorText}>{error}</Text>
                )}
              </View>

              {/* Submit Button with Error */}
              <TouchableOpacity
                onPress={handleSendOTP}
                disabled={!validatePhone(phone) || !selectedRole || loading}
                style={[styles.submitButton, (!validatePhone(phone) || !selectedRole || loading) && styles.submitButtonDisabled]}
                activeOpacity={0.7}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <View style={styles.buttonContent}>
                    <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
                    <Text style={styles.buttonText}>Send OTP</Text>
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
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.h1.fontSize,
    fontWeight: typography.h1.fontWeight,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: typography.body.fontSize + 2,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  card: {
    width: '100%',
  },
  helperText: {
    fontSize: typography.small.fontSize,
    color: colors.text.muted,
    marginTop: -spacing.md,
    marginBottom: spacing.lg,
  },
  roleSection: {
    marginBottom: spacing.lg,
  },
  roleLabel: {
    fontSize: typography.body.fontSize,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  roleButton: {
    flex: 1,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
    borderRadius: spacing.borderRadius.button,
    borderWidth: 2,
  },
  roleButtonSelected: {
    backgroundColor: colors.primary.light,
    borderColor: colors.primary.main,
  },
  roleButtonUnselected: {
    backgroundColor: 'transparent',
    borderColor: colors.border,
  },
  roleButtonText: {
    fontSize: typography.body.fontSize,
    fontWeight: 'bold',
    color: colors.text.secondary,
    textAlign: 'center',
  },
  roleButtonTextSelected: {
    color: colors.primary.main,
  },
  roleButtonSubtext: {
    fontSize: typography.small.fontSize,
    color: colors.text.muted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  roleButtonSubtextSelected: {
    color: colors.primary.main,
  },
  submitButton: {
    width: '100%',
    minHeight: 52,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    backgroundColor: colors.primary.main,
    borderRadius: spacing.borderRadius.button,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginRight: spacing.xs,
  },
  testButton: {
    marginTop: spacing.lg,
  },
});

export default Login;

