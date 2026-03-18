/**
 * Face Verification Screen - People App
 * Capture selfie (camera only) and run face match with Aadhaar photo.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, TouchableOpacity, Modal } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../../theme';
import { Button, Card, CardContent } from '../../components/common';
import { verificationAPI, userAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import TermsAndConditions from '../common/TermsAndConditions';

const FaceVerification = ({ navigation }) => {
  const { updateUser } = useAuth();
  const [selfie, setSelfie] = useState(null);
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState(null);
  const [lastAttemptFailed, setLastAttemptFailed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsVisible, setTermsVisible] = useState(false);
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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Card style={styles.card}>
        <CardContent>
          <View style={styles.header}>
            <MaterialIcons name="face" size={28} color={colors.primary.main} />
            <Text style={styles.title}>Face Verification</Text>
          </View>
          <Text style={styles.subtitle}>
            Take a live selfie. Your face match score must be 65% or above.
          </Text>

          <View style={styles.preview}>
            {selfie?.uri ? (
              <Image source={{ uri: selfie.uri }} style={styles.image} />
            ) : (
              <View style={styles.placeholder}>
                <MaterialIcons name="camera-alt" size={32} color={colors.text.secondary} />
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

          <TouchableOpacity style={styles.termsRow} activeOpacity={0.7} onPress={() => setTermsAccepted((v) => !v)}>
            <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
              {termsAccepted ? <MaterialIcons name="check" size={16} color="#FFFFFF" /> : null}
            </View>
            <Text style={styles.termsText}>
              I agree to{' '}
              <Text style={styles.termsLink} onPress={() => setTermsVisible(true)}>
                Terms & Conditions
              </Text>
            </Text>
          </TouchableOpacity>

          <Button
            onPress={submit}
            disabled={!selfie || loading || !termsAccepted}
            style={[styles.submitButton, (!selfie || loading || !termsAccepted) && styles.submitButtonDisabled]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Create account</Text>
            )}
          </Button>

          {lastAttemptFailed ? (
            <Text style={styles.helpText}>
              Tip: Use good light, keep your face centered, and avoid blur.
            </Text>
          ) : null}
        </CardContent>
      </Card>

      <Modal visible={termsVisible} animationType="slide" onRequestClose={() => setTermsVisible(false)}>
        <TermsAndConditions onClose={() => setTermsVisible(false)} />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  card: { width: '100%', maxWidth: 420, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  title: { ...typography.h2, color: colors.text.primary },
  subtitle: { ...typography.body, color: colors.text.secondary, marginBottom: spacing.lg },
  preview: { width: '100%', height: 240, borderRadius: 12, overflow: 'hidden', marginBottom: spacing.md },
  image: { width: '100%', height: '100%' },
  placeholder: { flex: 1, backgroundColor: colors.cardBackground, alignItems: 'center', justifyContent: 'center' },
  placeholderText: { ...typography.small, color: colors.text.secondary, marginTop: spacing.sm },
  scoreText: { ...typography.body, color: colors.text.primary, marginBottom: spacing.md },
  scorePass: { color: colors.success.main },
  scoreFail: { color: colors.error.main },
  actionsRow: { flexDirection: 'row', gap: spacing.sm },
  takeButton: { flex: 1, minHeight: 52, paddingVertical: spacing.md, justifyContent: 'center' },
  termsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg, marginBottom: spacing.md },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBackground,
  },
  checkboxChecked: { backgroundColor: colors.primary.main, borderColor: colors.primary.main },
  termsText: { ...typography.body, color: colors.text.primary, flex: 1 },
  termsLink: { color: colors.primary.main, textDecorationLine: 'underline' },
  submitButton: { backgroundColor: colors.primary.main },
  submitButtonDisabled: { opacity: 0.6 },
  submitText: { ...typography.button, color: '#fff' },
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
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
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

export default FaceVerification;

