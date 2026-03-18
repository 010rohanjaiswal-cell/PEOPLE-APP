/**
 * Profile Setup Screen - People App
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, typography } from '../../theme';
import { Button, Input, Card, CardContent } from '../../components/common';
import { validateRequired } from '../../utils/validation';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { userAPI } from '../../api';

const ProfileSetup = ({ navigation }) => {
  const { user, updateUser } = useAuth();
  const { t } = useLanguage();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [profilePhotoUri, setProfilePhotoUri] = useState(user?.profilePhoto || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Get role from AsyncStorage or user object
  const [role, setRole] = useState(user?.role || 'client');

  React.useEffect(() => {
    const getRole = async () => {
      const storedRole = await AsyncStorage.getItem('selectedRole');
      if (storedRole) {
        setRole(storedRole);
      }
    };
    getRole();
  }, []);

  const handleCameraPress = async () => {
    try {
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('auth.permissionDenied'), t('auth.cameraPermissionRequired'));
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setProfilePhotoUri(result.assets[0].uri);
        setProfilePhoto(result.assets[0]);
        setError('');
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      setError(t('auth.failedToTakePhoto'));
    }
  };

  // Gallery option removed (camera only)

  const handleCompleteSetup = async () => {
    // Validation
    if (!validateRequired(fullName)) {
      setError('Please enter your full name');
      return;
    }

    // Profile photo is optional for now (for testing)
    // In production, make it required

    setLoading(true);
    setError('');

    try {
      const resp = await userAPI.updateProfile({
        fullName,
        imageAsset: profilePhoto,
      });

      if (resp?.success && resp?.user) {
        await updateUser(resp.user);
      } else {
        // Fallback to local update if API shape differs
        await updateUser({ ...user, fullName });
      }

      // Navigation will be handled automatically by AppNavigator
      // based on updated user state
      console.log('✅ Profile updated, navigation will be handled by AppNavigator');

      setLoading(false);
    } catch (error) {
      console.error('Error completing profile setup:', error);
      setError(error.response?.data?.error || error.message || 'Failed to complete setup. Please try again.');
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Quick Login Link */}
      <View style={styles.topAction}>
        <Button
          variant="ghost"
          onPress={() => navigation.replace('Login')}
          style={styles.loginButton}
        >
          Back to Login
        </Button>
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <MaterialIcons name="person" size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.title}>Complete Your Profile</Text>
            <Text style={styles.description}>
              Set up your {role === 'client' ? 'Client' : 'Freelancer'} profile
            </Text>
          </View>

          {/* Card */}
          <Card style={styles.card}>
            <CardContent>
              {/* Profile Photo Upload */}
              <View style={styles.photoSection}>
                <View style={styles.photoPreview}>
                  {profilePhotoUri ? (
                    <Image source={{ uri: profilePhotoUri }} style={styles.photoImage} />
                  ) : (
                    <MaterialIcons name="camera-alt" size={32} color={colors.text.muted} />
                  )}
                </View>
                <View style={styles.photoButtons}>
                  <Button
                    onPress={handleCameraPress}
                    style={[styles.photoButton, styles.cameraButton]}
                  >
                    <View style={styles.photoButtonContent}>
                      <MaterialIcons name="camera-alt" size={20} color="#FFFFFF" />
                      <Text style={styles.photoButtonText}>Camera</Text>
                    </View>
                  </Button>
                </View>
                <Text style={styles.photoHelperText}>
                  Take a photo
                </Text>
              </View>

              {/* Full Name Input */}
              <Input
                label="Full Name"
                placeholder="Enter your full name"
                value={fullName}
                onChangeText={(text) => {
                  setFullName(text);
                  setError('');
                }}
                error={error && !profilePhoto ? error : ''}
              />

              {/* Submit Button */}
              <Button
                onPress={handleCompleteSetup}
                disabled={!validateRequired(fullName) || loading}
                loading={loading}
                style={styles.submitButton}
              >
                {user?.fullName ? 'Update Profile' : 'Complete Setup'}
              </Button>
              
              {/* Skip Button - Only show if user already has fullName but no photo */}
              {user?.fullName && !user?.profilePhoto && !profilePhoto && (
                <Button
                  variant="ghost"
                  onPress={async () => {
                    setLoading(true);
                    try {
                      // Skip photo upload, just update name if changed
                      const updatedUser = {
                        ...user,
                        fullName: fullName || user.fullName,
                        // Keep existing profilePhoto or set to null
                        profilePhoto: user.profilePhoto || null,
                      };
                      await updateUser(updatedUser);
                      // Navigation will be handled by AppNavigator automatically
                      console.log('✅ Profile updated (skipped photo), navigation will be handled by AppNavigator');
                    } catch (error) {
                      console.error('Error updating profile:', error);
                      setError('Failed to update profile. Please try again.');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  style={styles.skipButton}
                  disabled={loading}
                >
                  Skip Photo (Continue to Dashboard)
                </Button>
              )}

              {/* Error Display */}
              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}
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
  topAction: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    alignItems: 'flex-end',
  },
  loginButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
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
  photoSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  photoPreview: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.inputBorder,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 48,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  photoButton: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 52,
  },
  cameraButton: {
    backgroundColor: colors.primary.main,
  },
  photoButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  photoButtonText: {
    color: '#FFFFFF',
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  photoHelperText: {
    fontSize: typography.small.fontSize,
    color: colors.text.muted,
    textAlign: 'center',
  },
  photoLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  submitButton: {
    marginTop: spacing.lg,
    minHeight: 52,
    paddingVertical: spacing.md,
  },
  skipButton: {
    marginTop: spacing.sm,
  },
  errorContainer: {
    backgroundColor: colors.error.light,
    borderWidth: 1,
    borderColor: colors.error.main,
    borderRadius: spacing.borderRadius.input,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  errorText: {
    fontSize: typography.body.fontSize,
    color: colors.error.main,
  },
});

export default ProfileSetup;

