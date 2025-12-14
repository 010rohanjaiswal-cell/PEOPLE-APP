/**
 * Firebase Test Screen - People App
 * Use this screen to test Firebase configuration
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { colors, spacing, typography } from '../../theme';
import { Button, Card, CardContent } from '../../components/common';
import { testFirebaseConfig, testFirebaseInit, testPhoneAuthSetup, runAllFirebaseTests } from '../../utils/firebaseTest';
import auth from '@react-native-firebase/auth';

const FirebaseTestScreen = () => {
  const [testResults, setTestResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleRunTests = () => {
    setLoading(true);
    console.log('🧪 Running Firebase Tests...');
    
    const results = runAllFirebaseTests();
    setTestResults(results);
    
    setLoading(false);
    Alert.alert('Tests Complete', 'Check console for detailed results');
  };

  const handleTestPhoneAuth = () => {
    setLoading(true);
    testPhoneAuthSetup('+919876543210')
      .then(result => {
        setLoading(false);
        Alert.alert(
          result.success ? 'Success' : 'Error',
          result.message || result.error || 'Check console for details'
        );
      });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Card style={styles.card}>
          <CardContent>
            <Text style={styles.title}>Firebase Configuration Test</Text>
            <Text style={styles.description}>
              Use this screen to test your Firebase setup
            </Text>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Environment Variables</Text>
              <View style={styles.configItem}>
                <Text style={styles.configLabel}>API Key:</Text>
                <Text style={styles.configValue}>
                  {process.env.EXPO_PUBLIC_FIREBASE_API_KEY 
                    ? `${process.env.EXPO_PUBLIC_FIREBASE_API_KEY.substring(0, 20)}...` 
                    : '❌ Not Set'}
                </Text>
              </View>
              <View style={styles.configItem}>
                <Text style={styles.configLabel}>Project ID:</Text>
                <Text style={styles.configValue}>
                  {process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '❌ Not Set'}
                </Text>
              </View>
              <View style={styles.configItem}>
                <Text style={styles.configLabel}>Auth Domain:</Text>
                <Text style={styles.configValue}>
                  {process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '❌ Not Set'}
                </Text>
              </View>
              <View style={styles.configItem}>
                <Text style={styles.configLabel}>Storage Bucket:</Text>
                <Text style={styles.configValue}>
                  {process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '❌ Not Set'}
                </Text>
              </View>
              <View style={styles.configItem}>
                <Text style={styles.configLabel}>Messaging Sender ID:</Text>
                <Text style={styles.configValue}>
                  {process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '❌ Not Set'}
                </Text>
              </View>
              <View style={styles.configItem}>
                <Text style={styles.configLabel}>App ID:</Text>
                <Text style={styles.configValue}>
                  {process.env.EXPO_PUBLIC_FIREBASE_APP_ID 
                    ? `${process.env.EXPO_PUBLIC_FIREBASE_APP_ID.substring(0, 30)}...` 
                    : '❌ Not Set'}
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Firebase Auth Status</Text>
              <View style={styles.configItem}>
                <Text style={styles.configLabel}>Auth Object:</Text>
                <Text style={styles.configValue}>
                  {auth ? '✅ Initialized' : '❌ Not Initialized'}
                </Text>
              </View>
              {auth && (
                <View style={styles.configItem}>
                  <Text style={styles.configLabel}>Project ID:</Text>
                  <Text style={styles.configValue}>
                    {auth.app?.options?.projectId || 'N/A'}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.buttonSection}>
              <Button
                onPress={handleRunTests}
                loading={loading}
                style={styles.button}
              >
                Run All Tests
              </Button>
              <Button
                onPress={handleTestPhoneAuth}
                loading={loading}
                variant="outline"
                style={styles.button}
              >
                Test Phone Auth Setup
              </Button>
            </View>

            {testResults && (
              <View style={styles.resultsSection}>
                <Text style={styles.sectionTitle}>Test Results</Text>
                <Text style={styles.resultsText}>
                  Check the console for detailed test results.
                </Text>
                <Text style={styles.resultsText}>
                  Config Test: {testResults.config?.allSet ? '✅ Pass' : '❌ Fail'}
                </Text>
                <Text style={styles.resultsText}>
                  Init Test: {testResults.initialization?.success ? '✅ Pass' : '❌ Fail'}
                </Text>
              </View>
            )}

            <View style={styles.notesSection}>
              <Text style={styles.notesTitle}>📝 Notes:</Text>
              <Text style={styles.notesText}>
                • All tests log to console - check Metro bundler output
              </Text>
              <Text style={styles.notesText}>
                • Phone Auth requires Phone Authentication to be enabled in Firebase Console
              </Text>
              <Text style={styles.notesText}>
                • For Android, SHA fingerprints must be added to Firebase Console
              </Text>
              <Text style={styles.notesText}>
                • Make sure .env file exists with all Firebase credentials
              </Text>
            </View>
          </CardContent>
        </Card>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  card: {
    width: '100%',
  },
  title: {
    fontSize: typography.h2.fontSize,
    fontWeight: typography.h2.fontWeight,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: typography.body.fontSize,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
    padding: spacing.md,
    backgroundColor: colors.border,
    borderRadius: spacing.borderRadius.card,
  },
  sectionTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  configItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  configLabel: {
    fontSize: typography.body.fontSize,
    color: colors.text.secondary,
    flex: 1,
  },
  configValue: {
    fontSize: typography.body.fontSize,
    color: colors.text.primary,
    flex: 2,
    textAlign: 'right',
    fontWeight: '500',
  },
  buttonSection: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  button: {
    marginBottom: spacing.md,
  },
  resultsSection: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.success.light,
    borderRadius: spacing.borderRadius.card,
  },
  resultsText: {
    fontSize: typography.body.fontSize,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  notesSection: {
    marginTop: spacing.xl,
    padding: spacing.md,
    backgroundColor: colors.warning.light,
    borderRadius: spacing.borderRadius.card,
  },
  notesTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  notesText: {
    fontSize: typography.small.fontSize,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
});

export default FirebaseTestScreen;

