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
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, typography } from '../../theme';
import { Button, Input } from '../../components/common';
import { validateRequired } from '../../utils/validation';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { userAPI } from '../../api';
import TermsAndConditions from '../common/TermsAndConditions';
import PrivacyPolicy from '../common/PrivacyPolicy';

const ProfileSetup = () => {
  const { user, updateUser } = useAuth();
  const { t } = useLanguage();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [profilePhotoUri, setProfilePhotoUri] = useState(user?.profilePhoto || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [legalDoc, setLegalDoc] = useState(null);

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
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('auth.permissionDenied'), t('auth.cameraPermissionRequired'));
        return;
      }

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
    } catch (err) {
      console.error('Error taking photo:', err);
      setError(t('auth.failedToTakePhoto'));
    }
  };

  const handleCompleteSetup = async () => {
    if (!validateRequired(fullName)) {
      setError('Please enter your full name');
      return;
    }

    if (role === 'client' && !termsAccepted) {
      setError(t('legalAcceptance.mustAccept'));
      return;
    }

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
        await updateUser({ ...user, fullName });
      }

      setLoading(false);
    } catch (err) {
      console.error('Error completing profile setup:', err);
      setError(
        err.response?.data?.error || err.message || 'Failed to complete setup. Please try again.'
      );
      setLoading(false);
    }
  };

  const roleLabel = role === 'client' ? 'Client' : 'Freelancer';

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
              <Text style={styles.screenTitle}>Your profile</Text>
              <View style={styles.brandAccent}>
                <View style={styles.brandAccentBlue} />
                <View style={styles.brandAccentGreen} />
              </View>
              <Text style={styles.subtitle}>
                {role === 'client' ? (
                  <>
                    Add your details to continue as a{' '}
                    <Text style={styles.subtitleAccent}>client</Text>.
                  </>
                ) : (
                  <>
                    Add your details to continue as a{' '}
                    <Text style={styles.subtitleAccentFreelancer}>freelancer</Text>.
                  </>
                )}
              </Text>
            </View>

            <View style={styles.card}>
              <View style={styles.cardStripeRow}>
                <View style={styles.cardStripeBlue} />
                <View style={styles.cardStripeGreen} />
              </View>
              <Text
                style={[
                  styles.cardKicker,
                  role === 'client' ? styles.cardKickerClient : styles.cardKickerFreelancer,
                ]}
              >
                {roleLabel} account
              </Text>

              <Text style={styles.fieldLabel}>Photo</Text>
              <View style={styles.photoSection}>
                <View style={styles.photoPreview}>
                  {profilePhotoUri ? (
                    <Image source={{ uri: profilePhotoUri }} style={styles.photoImage} />
                  ) : (
                    <MaterialIcons name="person-outline" size={36} color={colors.text.muted} />
                  )}
                </View>
                <Button
                  onPress={handleCameraPress}
                  style={[styles.photoButton, styles.cameraButton]}
                >
                  <View style={styles.photoButtonContent}>
                    <MaterialIcons name="camera-alt" size={18} color="#FFFFFF" />
                    <Text style={styles.photoButtonText}>Take photo</Text>
                  </View>
                </Button>
                <Text style={styles.photoHelperText}>Optional. You can add this later.</Text>
              </View>

              <Text style={[styles.fieldLabel, styles.fieldLabelSpacing]}>Full name</Text>
              <Input
                label={null}
                placeholder="Enter your full name"
                value={fullName}
                onChangeText={(text) => {
                  setFullName(text);
                  setError('');
                }}
                error={!validateRequired(fullName) && error ? error : ''}
                forceLight
                style={styles.inputWrap}
              />

              {role === 'client' ? (
                <TouchableOpacity
                  style={styles.termsRow}
                  activeOpacity={0.7}
                  onPress={() => {
                    setTermsAccepted((v) => !v);
                    setError('');
                  }}
                >
                  <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                    {termsAccepted ? <MaterialIcons name="check" size={14} color="#FFFFFF" /> : null}
                  </View>
                  <Text style={styles.termsText}>
                    {t('legalAcceptance.leadIn')}
                    <Text style={styles.termsLink} onPress={() => setLegalDoc('terms')}>
                      {t('legalAcceptance.termsLink')}
                    </Text>
                    {t('legalAcceptance.middle')}
                    <Text style={styles.termsLink} onPress={() => setLegalDoc('privacy')}>
                      {t('legalAcceptance.privacyLink')}
                    </Text>
                    {t('legalAcceptance.suffixClient')}
                  </Text>
                </TouchableOpacity>
              ) : null}

              <Button
                onPress={handleCompleteSetup}
                disabled={
                  !validateRequired(fullName) ||
                  loading ||
                  (role === 'client' && !termsAccepted)
                }
                loading={loading}
                style={styles.submitButton}
              >
                {user?.fullName ? 'Save and continue' : 'Continue'}
              </Button>

              {user?.fullName && !user?.profilePhoto && !profilePhoto ? (
                <Button
                  variant="ghost"
                  onPress={async () => {
                    if (role === 'client' && !termsAccepted) {
                      setError(t('legalAcceptance.mustAccept'));
                      return;
                    }
                    setLoading(true);
                    try {
                      const updatedUser = {
                        ...user,
                        fullName: fullName || user.fullName,
                        profilePhoto: user.profilePhoto || null,
                      };
                      await updateUser(updatedUser);
                    } catch (err) {
                      console.error('Error updating profile:', err);
                      setError('Failed to update profile. Please try again.');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  style={styles.skipButton}
                  disabled={loading}
                >
                  Skip photo
                </Button>
              ) : null}

              {error && validateRequired(fullName) ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </ScrollView>

        <Modal
          visible={!!legalDoc}
          animationType="slide"
          presentationStyle={Platform.OS === 'ios' ? 'fullScreen' : undefined}
          onRequestClose={() => setLegalDoc(null)}
        >
          <View style={styles.legalModalRoot}>
            {legalDoc === 'terms' ? (
              <TermsAndConditions onClose={() => setLegalDoc(null)} />
            ) : legalDoc === 'privacy' ? (
              <PrivacyPolicy onClose={() => setLegalDoc(null)} />
            ) : null}
          </View>
        </Modal>
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
    top: -56,
    right: -36,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: 'rgba(37, 99, 235, 0.11)',
  },
  blobGreen: {
    position: 'absolute',
    bottom: '10%',
    left: -52,
    width: 195,
    height: 195,
    borderRadius: 97.5,
    backgroundColor: 'rgba(22, 163, 74, 0.09)',
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
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: -0.3,
  },
  brandAccent: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    gap: 6,
  },
  brandAccentBlue: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary.main,
  },
  brandAccentGreen: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.success.main,
  },
  subtitle: {
    marginTop: spacing.md,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text.secondary,
  },
  subtitleAccent: {
    color: colors.primary.main,
    fontWeight: '600',
  },
  subtitleAccentFreelancer: {
    color: colors.success.dark,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.1)',
    padding: spacing.lg,
    overflow: 'hidden',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
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
  cardKicker: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.lg,
  },
  cardKickerClient: {
    color: colors.primary.main,
  },
  cardKickerFreelancer: {
    color: colors.success.dark,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  fieldLabelSpacing: {
    marginTop: spacing.lg,
  },
  inputWrap: {
    marginBottom: 0,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  photoPreview: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: colors.primary.light,
    backgroundColor: colors.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoButton: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
  },
  cameraButton: {
    backgroundColor: colors.success.main,
  },
  photoButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  photoButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  photoHelperText: {
    fontSize: 13,
    color: colors.text.muted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  submitButton: {
    marginTop: spacing.lg,
    minHeight: 48,
    borderRadius: 8,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  termsText: {
    ...typography.body,
    color: colors.text.primary,
    flex: 1,
    lineHeight: 22,
    fontSize: 14,
  },
  termsLink: {
    color: colors.primary.main,
    textDecorationLine: 'underline',
  },
  skipButton: {
    marginTop: spacing.sm,
  },
  errorContainer: {
    backgroundColor: colors.error.light,
    borderWidth: 1,
    borderColor: colors.error.main,
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  errorText: {
    fontSize: typography.body.fontSize,
    color: colors.error.main,
  },
  legalModalRoot: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

export default ProfileSetup;
