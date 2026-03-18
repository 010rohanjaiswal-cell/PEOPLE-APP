/**
 * Face Verification Screen - People App
 * Capture selfie (camera only) and run face match with Aadhaar photo.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../../theme';
import { Button, Card, CardContent } from '../../components/common';
import { verificationAPI, userAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';

const FaceVerification = ({ navigation }) => {
  const { updateUser } = useAuth();
  const [selfie, setSelfie] = useState(null);
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState(null);
  const [lastAttemptFailed, setLastAttemptFailed] = useState(false);

  const takeSelfie = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Camera permission is required to take a selfie.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
      cameraType: ImagePicker.CameraType.front,
    });

    if (!result.canceled && result.assets?.[0]) {
      setSelfie(result.assets[0]);
      setScore(null);
      setLastAttemptFailed(false);
    }
  };

  const submit = async () => {
    if (!selfie) return;
    setLoading(true);
    try {
      const resp = await verificationAPI.faceMatchSelfie(selfie);
      if (!resp.success) throw new Error(resp.error || 'Face verification failed');
      setScore(resp.score ?? null);
      setLastAttemptFailed(false);

      // Mark verification complete (terms already accepted earlier)
      const completeResp = await verificationAPI.completeVerification(true);
      if (!completeResp?.success) throw new Error(completeResp?.error || 'Failed to complete verification');

      const profileResp = await userAPI.getProfile();
      if (profileResp?.success && profileResp?.user) {
        await updateUser(profileResp.user);
      }

      navigation.replace('FreelancerDashboard');
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || 'Face verification failed';
      Alert.alert('Face verification', msg);
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
            <Button
              onPress={submit}
              disabled={!selfie || loading}
              style={[styles.submitButton, (!selfie || loading) && styles.submitButtonDisabled]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>Upload</Text>
              )}
            </Button>
          </View>

          {lastAttemptFailed ? (
            <Text style={styles.helpText}>
              Tip: Use good light, keep your face centered, and avoid blur.
            </Text>
          ) : null}
        </CardContent>
      </Card>
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
  takeButton: { flex: 1 },
  submitButton: { flex: 1, backgroundColor: colors.primary.main },
  submitButtonDisabled: { opacity: 0.6 },
  submitText: { ...typography.button, color: '#fff' },
  helpText: { ...typography.small, color: colors.text.secondary, marginTop: spacing.md, textAlign: 'center' },
});

export default FaceVerification;

