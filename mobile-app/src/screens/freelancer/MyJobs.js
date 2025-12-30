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
  ScrollView,
  Dimensions,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import EmptyState from '../../components/common/EmptyState';
import UserDetailsModal from '../../components/modals/UserDetailsModal';
import { freelancerJobsAPI } from '../../api/freelancerJobs';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MyJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientModalVisible, setClientModalVisible] = useState(false);
  const [workDoneModalVisible, setWorkDoneModalVisible] = useState(false);
  const [workDoneJob, setWorkDoneJob] = useState(null);
  const [markingWorkDone, setMarkingWorkDone] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [completeJobModalVisible, setCompleteJobModalVisible] = useState(false);
  const [completeJobSuccessModalVisible, setCompleteJobSuccessModalVisible] = useState(false);
  const [completeJobErrorModalVisible, setCompleteJobErrorModalVisible] = useState(false);
  const [completeJobErrorMessage, setCompleteJobErrorMessage] = useState('');
  const [completingJob, setCompletingJob] = useState(false);
  const [jobToComplete, setJobToComplete] = useState(null);

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
    setWorkDoneJob(job);
    setWorkDoneModalVisible(true);
  };

  const confirmWorkDone = async () => {
    if (!workDoneJob) return;

    try {
      setMarkingWorkDone(true);
      const response = await freelancerJobsAPI.completeWork(workDoneJob._id || workDoneJob.id);
      if (response.success) {
        setWorkDoneModalVisible(false);
        setWorkDoneJob(null);
        setSuccessModalVisible(true);
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
    } finally {
      setMarkingWorkDone(false);
    }
  };

  const handleFullyComplete = (job) => {
    setJobToComplete(job);
    setCompleteJobModalVisible(true);
  };

  const confirmFullyComplete = async () => {
    if (!jobToComplete) return;
    setCompleteJobModalVisible(false);
    setCompletingJob(true);
    try {
      const response = await freelancerJobsAPI.fullyComplete(jobToComplete._id || jobToComplete.id);
      if (response.success) {
        setCompletingJob(false);
        setCompleteJobSuccessModalVisible(true);
        setJobToComplete(null);
        loadJobs();
      } else {
        setCompletingJob(false);
        setCompleteJobErrorMessage(response.error || 'Failed to complete job');
        setCompleteJobErrorModalVisible(true);
      }
    } catch (err) {
      console.error('Error fully completing job:', err);
      setCompletingJob(false);
      setCompleteJobErrorMessage(err.response?.data?.error || err.message || 'Failed to complete job');
      setCompleteJobErrorModalVisible(true);
    }
  };

  const handleCompleteJobSuccessClose = () => {
    setCompleteJobSuccessModalVisible(false);
  };

  const handleViewClient = (job) => {
    const client = job.client || null;
    if (!client) {
      Alert.alert('Error', 'No client details available');
      return;
    }

    setSelectedClient(client);
    setClientModalVisible(true);
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

    return (
      <View style={styles.jobCard}>
        <View style={styles.jobHeader}>
          <Text style={styles.jobTitle}>{item.title}</Text>
          <View style={styles.jobHeaderRight}>
            <Text style={styles.jobBudget}>₹{item.budget}</Text>
            <View
              style={[styles.statusBadge, { backgroundColor: statusInfo.backgroundColor }]}
            >
              <Text style={[styles.statusText, { color: statusInfo.color }]}>
                {statusInfo.label}
              </Text>
            </View>
          </View>
        </View>

        {item.description ? (
          <Text style={styles.jobDescription} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
        <View style={styles.jobAddressRow}>
          <MaterialIcons name="location-on" size={16} color={colors.text.secondary} />
          <Text style={styles.jobAddress}>{item.address}</Text>
        </View>
        <View style={styles.jobMetaRow}>
          <View style={styles.jobMetaLeft}>
            <View style={styles.jobMeta}>
              <MaterialIcons name="person" size={16} color={colors.text.secondary} />
              <Text style={styles.jobMetaText}>{(item.gender || 'any').toUpperCase()}</Text>
            </View>
            <View style={styles.jobMeta}>
              <MaterialIcons name="location-on" size={16} color={colors.text.secondary} />
              <Text style={styles.jobMetaText}>{item.pincode}</Text>
            </View>
          </View>
          {(item.status === 'assigned' ||
            item.status === 'work_done' ||
            item.status === 'completed') && (
            <TouchableOpacity
              style={styles.viewClientMeta}
              onPress={() => handleViewClient(item)}
            >
              <MaterialIcons name="person" size={16} color={colors.primary.main} />
              <Text style={styles.viewClientMetaText}>View Client</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Status-based actions */}
        <View style={styles.actionsRow}>
          {item.status === 'assigned' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.workDoneButton]}
              onPress={() => handleWorkDone(item)}
            >
              <MaterialIcons name="check-circle" size={18} color={colors.background} />
              <Text style={[styles.actionButtonText, styles.workDoneButtonText, { color: colors.background }]}>
                Work Done
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

          {item.status === 'completed' && (
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

      <UserDetailsModal
        visible={clientModalVisible}
        user={selectedClient}
        roleLabel="Client"
        title="Client Details"
        onClose={() => {
          setClientModalVisible(false);
          setSelectedClient(null);
        }}
      />

      {/* Mark Work Done Confirmation Modal */}
      <Modal
        visible={workDoneModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setWorkDoneModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Mark Work Done</Text>
            <Text style={styles.modalSubtitle}>
              Are you sure you want to mark this job as work done?
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setWorkDoneModalVisible(false);
                  setWorkDoneJob(null);
                }}
                disabled={markingWorkDone}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSubmitButton, styles.workDoneModalButton]}
                onPress={confirmWorkDone}
                disabled={markingWorkDone}
              >
                {markingWorkDone ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalSubmitText}>Mark Done</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={successModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSuccessModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <MaterialIcons name="check-circle" size={48} color={colors.success.main} style={styles.modalIcon} />
            <Text style={styles.modalTitle}>Success</Text>
            <Text style={styles.modalSubtitle}>Job marked as work done. Waiting for client payment.</Text>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalSubmitButton]}
              onPress={() => setSuccessModalVisible(false)}
            >
              <Text style={styles.modalSubmitText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Complete Job Confirmation Modal */}
      <Modal
        visible={completeJobModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCompleteJobModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Complete Job</Text>
            <Text style={styles.modalSubtitle}>
              After completing this job, it will be removed from your active list. Continue?
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setCompleteJobModalVisible(false);
                  setJobToComplete(null);
                }}
                disabled={completingJob}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSubmitButton, styles.completeJobModalButton]}
                onPress={confirmFullyComplete}
                disabled={completingJob}
              >
                {completingJob ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalSubmitText}>Complete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Complete Job Success Modal */}
      <Modal
        visible={completeJobSuccessModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCompleteJobSuccessClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIconContainer}>
              <MaterialIcons name="check-circle" size={64} color={colors.success.main} />
            </View>
            <Text style={styles.modalTitle}>Job Completed</Text>
            <Text style={styles.modalSubtitle}>
              Job completed and removed from active list.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSubmitButton, styles.successModalButton]}
                onPress={handleCompleteJobSuccessClose}
              >
                <Text style={styles.modalSubmitText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Complete Job Error Modal */}
      <Modal
        visible={completeJobErrorModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCompleteJobErrorModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.errorIconContainer}>
              <MaterialIcons name="error-outline" size={64} color={colors.error.main} />
            </View>
            <Text style={styles.modalTitle}>Error</Text>
            <Text style={styles.modalSubtitle}>
              {completeJobErrorMessage}
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSubmitButton, styles.errorModalButton]}
                onPress={() => setCompleteJobErrorModalVisible(false)}
              >
                <Text style={styles.modalSubmitText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    width: SCREEN_WIDTH * 0.97,
    alignSelf: 'center',
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  jobHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  jobTitle: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
  },
  jobBudget: {
    ...typography.body,
    color: colors.primary.main,
    fontWeight: '600',
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
  jobAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  jobAddress: {
    ...typography.small,
    color: colors.text.primary,
    flex: 1,
  },
  jobMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  jobMetaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
  viewClientMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  viewClientMetaText: {
    ...typography.small,
    color: colors.primary.main,
    fontWeight: '500',
  },
  jobDescription: {
    ...typography.small,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
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
    backgroundColor: colors.success.main,
    width: '96%',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  workDoneButtonText: {
    color: colors.background,
  },
  completedButton: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.main,
    width: '98%',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    ...typography.small,
    fontWeight: '600',
  },
  waitingPaymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    width: '96%',
    alignSelf: 'center',
  },
  waitingPaymentText: {
    ...typography.small,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: colors.cardBackground,
    borderRadius: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalIcon: {
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  modalSubtitle: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  modalButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: spacing.sm,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButton: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.cardBackground,
  },
  modalSubmitButton: {
    backgroundColor: colors.primary.main,
  },
  modalCancelText: {
    ...typography.body,
    color: colors.text.primary,
  },
  modalSubmitText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  workDoneModalButton: {
    backgroundColor: colors.success.main,
  },
  completeJobModalButton: {
    backgroundColor: colors.primary.main,
  },
  successModalButton: {
    backgroundColor: colors.success.main,
  },
  errorModalButton: {
    backgroundColor: colors.error.main,
  },
  successIconContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  errorIconContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
});

export default MyJobs;

