/**
 * My Jobs Tab - Freelancer Dashboard
 * Shows assigned jobs and supports full workflow:
 * assigned -> work_done -> waiting for payment -> completed -> fully completed
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import EmptyState from '../../components/common/EmptyState';
import { freelancerJobsAPI } from '../../api/freelancerJobs';

const MyJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadJobs = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await freelancerJobsAPI.getAssignedJobs();
      if (response?.success && Array.isArray(response.jobs)) {
        setJobs(response.jobs);
      } else if (Array.isArray(response)) {
        setJobs(response);
      } else {
        setJobs([]);
      }
    } catch (err) {
      console.error('Error loading assigned jobs for freelancer:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load assigned jobs');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const handleWorkDone = async (job) => {
    Alert.alert('Mark Work Done', 'Are you sure you want to mark this job as work done?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes',
        onPress: async () => {
          try {
            const response = await freelancerJobsAPI.completeWork(job._id || job.id);
            if (response.success) {
              Alert.alert('Success', 'Job marked as work done. Waiting for client payment.');
              loadJobs();
            } else {
              Alert.alert('Error', response.error || 'Failed to mark work as done');
            }
          } catch (err) {
            console.error('Error marking work as done:', err);
            Alert.alert(
              'Error',
              err.response?.data?.error || err.message || 'Failed to mark work as done'
            );
          }
        },
      },
    ]);
  };

  const handleFullyComplete = async (job) => {
    Alert.alert(
      'Complete Job',
      'After completing this job, it will be removed from your active list. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              const response = await freelancerJobsAPI.fullyComplete(job._id || job.id);
              if (response.success) {
                Alert.alert('Success', 'Job completed and removed from active list.');
                loadJobs();
              } else {
                Alert.alert('Error', response.error || 'Failed to complete job');
              }
            } catch (err) {
              console.error('Error fully completing job:', err);
              Alert.alert(
                'Error',
                err.response?.data?.error || err.message || 'Failed to complete job'
              );
            }
          },
        },
      ]
    );
  };

  const handleViewClient = (job) => {
    const client = job.client || {};
    Alert.alert(
      'Client Details',
      `Name: ${client.fullName || 'N/A'}\nPhone: ${client.phone || 'N/A'}`,
      [{ text: 'OK' }]
    );
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'assigned':
        return { backgroundColor: colors.pending.light, color: colors.pending.main, label: 'ASSIGNED' };
      case 'work_done':
        return { backgroundColor: colors.warning.light, color: colors.warning.main, label: 'WORK DONE' };
      case 'completed':
        return { backgroundColor: colors.success.light, color: colors.success.main, label: 'COMPLETED' };
      default:
        return { backgroundColor: colors.text.muted + '20', color: colors.text.secondary, label: status };
    }
  };

  const renderJobItem = ({ item }) => {
    const statusInfo = getStatusBadgeStyle(item.status);
    const commission = item.commission || null;
    const hasUnpaidCommission =
      commission && commission.platformCommission > 0 && !commission.duesPaid;

    return (
      <View style={styles.jobCard}>
        <View style={styles.jobHeader}>
          <Text style={styles.jobTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <View
            style={[styles.statusBadge, { backgroundColor: statusInfo.backgroundColor }]}
          >
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
        </View>

        <Text style={styles.jobCategory}>{item.category}</Text>
        <Text style={styles.jobAddress}>
          {item.address}, {item.pincode}
        </Text>

        <View style={styles.jobMetaRow}>
          <View style={styles.jobMeta}>
            <MaterialIcons name="currency-rupee" size={16} color={colors.text.secondary} />
            <Text style={styles.jobMetaText}>₹{item.budget}</Text>
          </View>
          <View style={styles.jobMeta}>
            <MaterialIcons name="person" size={16} color={colors.text.secondary} />
            <Text style={styles.jobMetaText}>{(item.gender || 'any').toUpperCase()}</Text>
          </View>
        </View>

        {item.description ? (
          <Text style={styles.jobDescription} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        {/* Status-based actions */}
        <View style={styles.actionsRow}>
          {item.status === 'assigned' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.workDoneButton]}
              onPress={() => handleWorkDone(item)}
            >
              <MaterialIcons name="check-circle" size={18} color={colors.success.main} />
              <Text style={[styles.actionButtonText, { color: colors.success.main }]}>
                Work Done
              </Text>
            </TouchableOpacity>
          )}

          {(item.status === 'assigned' ||
            item.status === 'work_done' ||
            item.status === 'completed') && (
            <TouchableOpacity
              style={[styles.actionButton, styles.viewClientButton]}
              onPress={() => handleViewClient(item)}
            >
              <MaterialIcons name="person" size={18} color={colors.primary.main} />
              <Text style={[styles.actionButtonText, { color: colors.primary.main }]}>
                View Client
              </Text>
            </TouchableOpacity>
          )}

          {item.status === 'work_done' && (
            <View style={styles.waitingPaymentBadge}>
              <MaterialIcons name="access-time" size={18} color={colors.warning.main} />
              <Text style={[styles.waitingPaymentText, { color: colors.warning.main }]}>
                Waiting for Payment
              </Text>
            </View>
          )}

          {item.status === 'completed' && hasUnpaidCommission && (
            <View style={styles.waitingPaymentBadge}>
              <MaterialIcons name="warning" size={18} color={colors.warning.main} />
              <Text style={[styles.waitingPaymentText, { color: colors.warning.main }]}>
                Pay Commission to Complete
              </Text>
            </View>
          )}

          {item.status === 'completed' && !hasUnpaidCommission && (
            <TouchableOpacity
              style={[styles.actionButton, styles.completedButton]}
              onPress={() => handleFullyComplete(item)}
            >
              <MaterialIcons name="check-circle" size={18} color="#FFFFFF" />
              <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>
                Completed
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.main} />
      </View>
    );
  }

  if (jobs.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon={<MaterialIcons name="check-circle" size={64} color={colors.text.muted} />}
          title="My Assigned Jobs"
          description="Jobs you pickup or are assigned will appear here."
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      <FlatList
        data={jobs}
        keyExtractor={(item) => item._id || item.id}
        renderItem={renderJobItem}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    backgroundColor: colors.error.light,
    borderWidth: 1,
    borderColor: colors.error.main,
    borderRadius: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.small,
    color: colors.error.main,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: spacing.lg,
  },
  jobCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  jobTitle: {
    ...typography.h3,
    color: colors.text.primary,
    flex: 1,
    marginRight: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.xs,
  },
  statusText: {
    ...typography.small,
    fontWeight: '600',
  },
  jobCategory: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  jobAddress: {
    ...typography.body,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  jobMetaRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  jobMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  jobMetaText: {
    ...typography.small,
    color: colors.text.secondary,
  },
  jobDescription: {
    ...typography.small,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.sm,
    borderWidth: 1,
  },
  workDoneButton: {
    borderColor: colors.success.main,
    backgroundColor: 'transparent',
  },
  viewClientButton: {
    borderColor: colors.primary.main,
    backgroundColor: 'transparent',
  },
  completedButton: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.main,
  },
  actionButtonText: {
    ...typography.small,
    fontWeight: '600',
  },
  waitingPaymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  waitingPaymentText: {
    ...typography.small,
    fontWeight: '600',
  },
});

export default MyJobs;

