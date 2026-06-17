/**
 * Face Verification Screen - People App
 * Capture selfie (camera only) and run face match with Aadhaar photo.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../../theme';
import {
  ACCENT_BLUE,
  BUTTON_BLUE,
  BUTTON_DISABLED,
  authScreenStyles as auth,
} from '../../theme/authScreen';
import { verificationAPI, userAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import TermsAndConditions from '../common/TermsAndConditions';
import PrivacyPolicy from '../common/PrivacyPolicy';

const styles = StyleSheet.create({
  legalModalRoot: {
    flex: 1,
    backgroundColor: colors.background,
  },
  preview: {
    width: '100%',
    height: 240,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: '#D1D9E6',
  },
  image: { width: '100%', height: '100%' },
  placeholder: {
    flex: 1,
    backgroundColor: '#F5F8FC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: { ...typography.small, color: colors.text.secondary, marginTop: spacing.sm },
  scoreText: { ...typography.body, color: colors.text.primary, marginBottom: spacing.md, textAlign: 'center' },
  scorePass: { color: colors.success.main },
  scoreFail: { color: colors.error.main },
  takeButton: {
    alignSelf: 'center',
    minWidth: 200,
    paddingHorizontal: 40,
    height: 50,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: ACCENT_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  takeButtonText: {
    color: ACCENT_BLUE,
    fontSize: 17,
    fontWeight: '700',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
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
  },
  checkboxChecked: { backgroundColor: BUTTON_BLUE, borderColor: BUTTON_BLUE },
  termsText: { ...typography.body, color: colors.text.primary, flex: 1, flexWrap: 'wrap', lineHeight: 22 },
  termsLink: { color: ACCENT_BLUE, textDecorationLine: 'underline' },
  submitButton: {
    alignSelf: 'center',
    minWidth: 200,
    paddingHorizontal: 48,
    marginTop: spacing.lg,
    height: 50,
    borderRadius: 26,
    backgroundColor: BUTTON_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: BUTTON_DISABLED,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  helpText: { ...typography.small, color: colors.text.secondary, marginTop: spacing.md, textAlign: 'center' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.12)',
  },
  errorIconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.error.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  modalActions: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  modalButton: {
    minWidth: 140,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitButton: {
    backgroundColor: colors.primary.main,
  },
  errorModalButton: {
    backgroundColor: colors.primary.main,
  },
  modalSubmitText: {
    ...typography.button,
    color: '#FFFFFF',
  },
});

const FaceVerification = ({ navigation }) => {
  const { updateUser } = useAuth();
  const { t } = useLanguage();


  const [selfie, setSelfie] = useState(null);
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState(null);
  const [lastAttemptFailed, setLastAttemptFailed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  /** 'terms' | 'privacy' | null */
  const [legalDoc, setLegalDoc] = useState(null);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorModalTitle, setErrorModalTitle] = useState('Face verification');
  const [errorModalMessage, setErrorModalMessage] = useState('');

  const showErrorModal = (title, message) => {
    setErrorModalTitle(title || 'Face verification');
    setErrorModalMessage(message || 'Something went wrong');
    setErrorModalVisible(true);
  };

  const takeSelfie = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showErrorModal('Permission required', 'Camera permission is required to take a selfie.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
      cameraType: ImagePicker.CameraType.front,
    });

    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      // Front-camera selfies can be saved as mirrored; flip so profile photo looks natural everywhere.
      const flipped = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ flip: ImageManipulator.FlipType.Horizontal }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
      );
      setSelfie({
        ...asset,
        uri: flipped.uri,
        mimeType: asset.mimeType || 'image/jpeg',
        fileName: asset.fileName || 'selfie.jpg',
      });
      setScore(null);
      setLastAttemptFailed(false);
    }
  };

  const submit = async () => {
    if (!selfie) return;
    if (!termsAccepted) return;
    setLoading(true);
    try {
      const resp = await verificationAPI.faceMatchSelfie(selfie);
      if (!resp.success) throw new Error(resp.error || 'Face verification failed');
      setScore(resp.score ?? null);
      setLastAttemptFailed(false);

      // Mark verification complete
      const completeResp = await verificationAPI.completeVerification(true);
      if (!completeResp?.success) throw new Error(completeResp?.error || 'Failed to complete verification');

      const profileResp = await userAPI.getProfile();
      if (profileResp?.success && profileResp?.user) {
        await updateUser(profileResp.user);
      }

      navigation.replace('FreelancerDashboard');
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || 'Face verification failed';
      showErrorModal('Face verification', msg);
      setLastAttemptFailed(true);
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = !!selfie && termsAccepted && !loading;

  return (
    <SafeAreaView style={auth.screenRoot} edges={['top', 'left', 'right']}>
      <ScrollView
        style={auth.flex}
        contentContainerStyle={auth.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={auth.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={22} color={ACCENT_BLUE} />
        </TouchableOpacity>

        <Text style={auth.screenTitle}>Face verification</Text>
        <Text style={auth.helperText}>
          Take a live selfie. Your face match score must be 65% or above.
        </Text>

        <Text style={auth.fieldLabel}>Selfie preview</Text>
        <View style={styles.preview}>
          {selfie?.uri ? (
            <Image source={{ uri: selfie.uri }} style={styles.image} />
          ) : (
            <View style={styles.placeholder}>
              <MaterialIcons name="camera-alt" size={32} color={ACCENT_BLUE} />
              <Text style={styles.placeholderText}>No selfie taken</Text>
            </View>
          )}
        </View>

        {score != null ? (
          <Text style={[styles.scoreText, score >= 65 ? styles.scorePass : styles.scoreFail]}>
            Face match score: {score}%
          </Text>
        ) : null}

        <TouchableOpacity onPress={takeSelfie} style={styles.takeButton} activeOpacity={0.85}>
          <Text style={styles.takeButtonText}>{selfie ? 'Retake photo' : 'Take photo'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.termsRow}
          activeOpacity={0.7}
          onPress={() => setTermsAccepted((v) => !v)}
        >
          <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
            {termsAccepted ? <MaterialIcons name="check" size={16} color="#FFFFFF" /> : null}
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
            {t('legalAcceptance.suffixFreelancer')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={submit}
          disabled={!canSubmit}
          style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
          activeOpacity={0.9}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>{t('legalAcceptance.createAccount')}</Text>
          )}
        </TouchableOpacity>

        {lastAttemptFailed ? (
          <Text style={styles.helpText}>
            Tip: Use good light, keep your face centered, and avoid blur.
          </Text>
        ) : null}
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

      <Modal
        visible={errorModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setErrorModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.errorIconContainer}>
              <MaterialIcons name="error-outline" size={64} color={colors.error.main} />
            </View>
            <Text style={styles.modalTitle}>{errorModalTitle}</Text>
            <Text style={styles.modalSubtitle}>{errorModalMessage}</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSubmitButton, styles.errorModalButton]}
                onPress={() => setErrorModalVisible(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.modalSubmitText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default FaceVerification;

