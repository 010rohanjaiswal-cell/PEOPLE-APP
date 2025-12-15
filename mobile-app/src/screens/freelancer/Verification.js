/**
 * Verification Screen - People App
 * Freelancers must complete verification before accessing dashboard
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import { Button, Card, CardContent } from '../../components/common';
import { verificationAPI } from '../../api';
import { VERIFICATION_STATUS } from '../../constants';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const Verification = ({ navigation }) => {
  const [status, setStatus] = useState(null); // null, 'pending', 'approved', 'rejected'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    checkVerificationStatus();
  }, []);

  // Auto-navigate to dashboard if verification is approved
  useEffect(() => {
    if (status === VERIFICATION_STATUS.APPROVED && !loading) {
      // Small delay to show the approved message briefly
      const timer = setTimeout(() => {
        navigation.replace('FreelancerDashboard');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [status, loading]);

  const checkVerificationStatus = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await verificationAPI.getVerificationStatus();
      
      // Handle different response formats
      if (response.status) {
        setStatus(response.status);
      } else if (response.verificationStatus) {
        setStatus(response.verificationStatus);
      } else if (response.verification) {
        setStatus(response.verification.status);
      } else {
        // No verification submitted yet
        setStatus(null);
      }
    } catch (error) {
      console.error('Error checking verification status:', error);
      
      // If 404 or no verification found, status is null (not submitted)
      if (error.response?.status === 404) {
        setStatus(null);
      } else {
        setError(error.response?.data?.message || 'Failed to check verification status');
      }
    } finally {
      setLoading(false);
    }
  };

  // Pending Status Screen
  const renderPendingStatus = () => (
    <View style={styles.statusContainer}>
      <View style={[styles.iconContainer, styles.pendingIcon]}>
        <MaterialIcons name="schedule" size={48} color={colors.pending.main} />
      </View>
      <Text style={styles.statusTitle}>Verification Pending</Text>
      <Text style={styles.statusMessage}>
        Your verification is under review. Please wait for admin approval.
      </Text>
      <Button
        variant="outline"
        onPress={checkVerificationStatus}
        style={styles.refreshButton}
      >
        <MaterialIcons name="refresh" size={20} color={colors.primary.main} />
        <Text style={styles.refreshButtonText}>Refresh Status</Text>
      </Button>
    </View>
  );

  // Approved Status Screen
  const renderApprovedStatus = () => (
    <View style={styles.statusContainer}>
      <View style={[styles.iconContainer, styles.approvedIcon]}>
        <MaterialIcons name="check-circle" size={48} color={colors.success.main} />
      </View>
      <Text style={styles.statusTitle}>Verification Approved</Text>
      <Text style={styles.statusMessage}>
        Your verification has been approved! You can now access the dashboard.
      </Text>
      <Button
        onPress={() => {
          // Navigate to Freelancer Dashboard
          navigation.replace('FreelancerDashboard');
        }}
        style={styles.dashboardButton}
      >
        <Text style={styles.dashboardButtonText}>Go to Dashboard</Text>
        <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
      </Button>
    </View>
  );

  // Rejected Status Screen
  const renderRejectedStatus = () => (
    <View style={styles.statusContainer}>
      <View style={[styles.iconContainer, styles.rejectedIcon]}>
        <MaterialIcons name="cancel" size={48} color={colors.error.main} />
      </View>
      <Text style={styles.statusTitle}>Verification Rejected</Text>
      <Text style={styles.statusMessage}>
        Your verification has been rejected. Please review the requirements and resubmit.
      </Text>
      <Button
        onPress={() => {
          // TODO: Show verification form for resubmission (Phase 4)
          Alert.alert(
            'Resubmission Coming Soon',
            'Verification form will be available in Phase 4.',
            [{ text: 'OK' }]
          );
        }}
        variant="outline"
        style={styles.resubmitButton}
      >
        <Text style={styles.resubmitButtonText}>Resubmit Verification</Text>
      </Button>
    </View>
  );

  // No Verification Submitted Screen
  const renderNoVerification = () => (
    <View style={styles.statusContainer}>
      <View style={[styles.iconContainer, styles.pendingIcon]}>
        <MaterialIcons name="verified-user" size={48} color={colors.primary.main} />
      </View>
      <Text style={styles.statusTitle}>Verification Required</Text>
      <Text style={styles.statusMessage}>
        You need to complete verification before accessing the dashboard. Please submit your documents.
      </Text>
      <Button
        onPress={() => {
          // TODO: Show verification form (Phase 4)
          Alert.alert(
            'Verification Form Coming Soon',
            'Verification form will be available in Phase 4.',
            [{ text: 'OK' }]
          );
        }}
        style={styles.submitButton}
      >
        <Text style={styles.submitButtonText}>Submit Verification</Text>
        <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
      </Button>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.card}>
          <CardContent>
            {/* Error Display */}
            {error && (
              <View style={styles.errorContainer}>
                <MaterialIcons name="error-outline" size={20} color={colors.error.main} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Status Screens */}
            {status === VERIFICATION_STATUS.PENDING && renderPendingStatus()}
            {status === VERIFICATION_STATUS.APPROVED && renderApprovedStatus()}
            {status === VERIFICATION_STATUS.REJECTED && renderRejectedStatus()}
            {status === null && renderNoVerification()}
          </CardContent>
        </Card>
      </ScrollView>
    </View>
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
  card: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  statusContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  pendingIcon: {
    backgroundColor: colors.pending.light,
  },
  approvedIcon: {
    backgroundColor: colors.success.light,
  },
  rejectedIcon: {
    backgroundColor: colors.error.light,
  },
  statusTitle: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  statusMessage: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  refreshButtonText: {
    ...typography.button,
    color: colors.primary.main,
  },
  dashboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.success.main,
  },
  dashboardButtonText: {
    ...typography.button,
    color: '#FFFFFF',
  },
  resubmitButton: {
    borderColor: colors.error.main,
  },
  resubmitButtonText: {
    ...typography.button,
    color: colors.error.main,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  submitButtonText: {
    ...typography.button,
    color: '#FFFFFF',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error.light,
    borderWidth: 1,
    borderColor: colors.error.main,
    borderRadius: spacing.borderRadius.input,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  errorText: {
    ...typography.body,
    color: colors.error.main,
    flex: 1,
  },
});

export default Verification;

