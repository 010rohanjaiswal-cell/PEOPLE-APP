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
import AsyncStorage from '@react-native-async-storage/async-storage';

const ProfileSetup = ({ navigation }) => {
  const { user, updateUser } = useAuth();
  const [fullName, setFullName] = useState('');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [profilePhotoUri, setProfilePhotoUri] = useState(null);
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
        Alert.alert('Permission Denied', 'Camera permission is required to take a photo.');
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
      setError('Failed to take photo. Please try again.');
    }
  };

  const handleGalleryPress = async () => {
    try {
      // Request media library permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Gallery permission is required to select a photo.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
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
      console.error('Error selecting photo:', error);
      setError('Failed to select photo. Please try again.');
    }
  };

  const uploadImageToCloudinary = async (imageUri) => {
    // TODO: Implement Cloudinary upload
    // For now, we'll return a mock URL
    // In production, you'll need to:
    // 1. Create FormData with the image
    // 2. Upload to Cloudinary using their API
    // 3. Return the secure URL
    
    // Mock implementation
    return `https://res.cloudinary.com/your-cloud/image/upload/v${Date.now()}/profile.jpg`;
  };

  const handleCompleteSetup = async () => {
    // Validation
    if (!validateRequired(fullName)) {
      setError('Please enter your full name');
      return;
    }

    if (!profilePhoto) {
      setError('Please upload a profile photo');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Upload profile photo to Cloudinary
      const profilePhotoUrl = await uploadImageToCloudinary(profilePhotoUri);

      // TODO: Submit profile data to backend
      // In production, you'll need to:
      // 1. Call API to update user profile
      // 2. Include fullName and profilePhotoUrl
      // 3. Update user context with new data

      // For now, we'll update local user data
      await updateUser({
        fullName,
        profilePhoto: profilePhotoUrl,
      });

      // Navigate based on role
      // Note: Verification and Dashboard screens will be created in Phase 4
      if (role === 'client') {
        // ClientDashboard will be created in Phase 3
        navigation.replace('ClientDashboard');
      } else if (role === 'freelancer') {
        // Verification screen will be created in Phase 4
        navigation.replace('Verification');
      } else {
        // Default to client dashboard
        navigation.replace('ClientDashboard');
      }

      setLoading(false);
    } catch (error) {
      console.error('Error completing profile setup:', error);
      setError(error.message || 'Failed to complete setup. Please try again.');
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
                    <MaterialIcons name="camera-alt" size={20} color="#FFFFFF" style={styles.photoButtonIcon} />
                    <Text style={styles.photoButtonText}>
                      {Platform.OS === 'ios' ? 'Camera' : 'Camera'}
                    </Text>
                  </Button>
                  <Button
                    onPress={handleGalleryPress}
                    variant="secondary"
                    style={styles.photoButton}
                  >
                    <MaterialIcons name="upload" size={20} color="#FFFFFF" style={styles.photoButtonIcon} />
                    <Text style={styles.photoButtonText}>Gallery</Text>
                  </Button>
                </View>
                <Text style={styles.photoHelperText}>
                  Take a photo or choose from gallery
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
                disabled={!validateRequired(fullName) || !profilePhoto || loading}
                loading={loading}
                style={styles.submitButton}
              >
                Complete Setup
              </Button>

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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraButton: {
    backgroundColor: colors.primary.main,
  },
  photoButtonIcon: {
    marginRight: spacing.xs,
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
  submitButton: {
    marginTop: spacing.lg,
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

