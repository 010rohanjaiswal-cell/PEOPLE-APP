/**
 * Face Verification Screen - People App
 * Capture selfie (camera only) and run face match with Aadhaar photo.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Modal, Platform, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../../theme';
import { Button } from '../../components/common';
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
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  brandBlock: {
    marginBottom: spacing.lg,
  },
  title: {
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
    marginBottom: spacing.lg,
  },
  subtitleAccent: {
    color: colors.success.dark,
    fontWeight: '600',
  },
  authCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.14)',
    overflow: 'hidden',
    padding: spacing.lg,
    shadowColor: colors.success.main,
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
  preview: {
    width: '100%',
    height: 240,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: 'rgba(37, 99, 235, 0.25)',
  },
  image: { width: '100%', height: '100%' },
  placeholder: {
    flex: 1,
    backgroundColor: colors.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: { ...typography.small, color: colors.text.secondary, marginTop: spacing.sm },
  scoreText: { ...typography.body, color: colors.text.primary, marginBottom: spacing.md },
  scorePass: { color: colors.success.main },
  scoreFail: { color: colors.error.main },
  actionsRow: { flexDirection: 'row', gap: spacing.sm },
  takeButton: {
    flex: 1,
    minHeight: 52,
    paddingVertical: spacing.md,
    justifyContent: 'center',
    backgroundColor: colors.success.main,
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
  checkboxChecked: { backgroundColor: colors.primary.main, borderColor: colors.primary.main },
  termsText: { ...typography.body, color: colors.text.primary, flex: 1, flexWrap: 'wrap', lineHeight: 22 },
  termsLink: { color: colors.primary.main, textDecorationLine: 'underline' },
  submitButton: { backgroundColor: colors.primary.main },
  submitButtonDisabled: { opacity: 0.6 },
  createAccountButton: {
    minHeight: 58,
    height: 58,
    paddingVertical: spacing.md,
    width: '100%',
  },
  createAccountButtonText: {
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

  return (
    <SafeAreaView style={styles.screenRoot} edges={['top', 'bottom']}>
      <View style={styles.colorWash} pointerEvents="none">
        <View style={styles.blobBlue} />
        <View style={styles.blobGreen} />
      </View>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.page}>
          <View style={styles.brandBlock}>
            <Text style={styles.title}>Face verification</Text>
            <View style={styles.brandAccent}>
              <View style={styles.brandAccentBlue} />
              <View style={styles.brandAccentGreen} />
            </View>
            <Text style={styles.subtitle}>
              Take a live selfie. Your face match score must be{' '}
              <Text style={styles.subtitleAccent}>65% or above</Text>.
            </Text>
          </View>

          <View style={styles.authCard}>
            <View style={styles.cardStripeRow}>
              <View style={styles.cardStripeBlue} />
              <View style={styles.cardStripeGreen} />
            </View>

            <View style={styles.preview}>
              {selfie?.uri ? (
                <Image source={{ uri: selfie.uri }} style={styles.image} />
              ) : (
                <View style={styles.placeholder}>
                  <MaterialIcons name="camera-alt" size={32} color={colors.primary.main} />
                  <Text style={styles.placeholderText}>No selfie taken</Text>
                </View>
              )}
            </View>

            {score != null ? (
              <Text style={[styles.scoreText, score >= 65 ? styles.scorePass : styles.scoreFail]}>
                Face match score: {score}%
              </Text>
            ) : null}

            <View style={styles.actionsRow}>
              <Button onPress={takeSelfie} style={styles.takeButton}>
                {selfie ? 'Retake photo' : 'Take photo'}
              </Button>
            </View>

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

            <Button
              onPress={submit}
              disabled={!selfie || loading || !termsAccepted}
              loading={loading}
              size="lg"
              style={[
                styles.submitButton,
                styles.createAccountButton,
                (!selfie || loading || !termsAccepted) && styles.submitButtonDisabled,
              ]}
              textStyle={styles.createAccountButtonText}
            >
              {t('legalAcceptance.createAccount')}
            </Button>

            {lastAttemptFailed ? (
              <Text style={styles.helpText}>
                Tip: Use good light, keep your face centered, and avoid blur.
              </Text>
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

