/**
 * Available Jobs Tab - Freelancer Dashboard
 * Display open jobs that freelancers can see
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
  Modal,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import EmptyState from '../../components/common/EmptyState';
import { freelancerJobsAPI } from '../../api/freelancerJobs';
import { walletAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';

const AvailableJobs = () => {
  const { user } = useAuth();
  const freelancerId = user?.id || user?._id || null;
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [canWork, setCanWork] = useState(true);
  const [offerModalVisible, setOfferModalVisible] = useState(false);
  const [offerJob, setOfferJob] = useState(null);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [submittingOffer, setSubmittingOffer] = useState(false);

  const loadJobs = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await freelancerJobsAPI.getAvailableJobs();
      if (response?.success && Array.isArray(response.jobs)) {
        setJobs(response.jobs);
      } else if (Array.isArray(response)) {
        setJobs(response);
      } else {
        setJobs([]);
      }
    } catch (err) {
      console.error('Error loading available jobs for freelancer:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load available jobs');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const loadWalletStatus = async () => {
    try {
      const response = await walletAPI.getWallet();
      if (response.success && response.wallet) {
        setCanWork(response.wallet.canWork !== false);
      }
    } catch (err) {
      console.error('Error loading wallet for canWork:', err);
    }
  };

  useEffect(() => {
    loadJobs();
    loadWalletStatus();
  }, []);

  const handlePickupJob = async (job) => {
    if (!canWork) {
      Alert.alert(
        'Cannot Pickup Job',
        'You have unpaid commission dues. Please pay dues in Wallet before picking up new jobs.'
      );
      return;
    }

    Alert.alert('Pickup Job', 'Are you sure you want to pickup this job?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Pickup',
        onPress: async () => {
          try {
            const response = await freelancerJobsAPI.pickupJob(job._id || job.id);
            if (response.success) {
              Alert.alert('Success', 'Job picked up successfully');
              loadJobs();
            } else {
              Alert.alert('Error', response.error || 'Failed to pickup job');
            }
          } catch (err) {
            console.error('Error picking up job:', err);
            Alert.alert(
              'Error',
              err.response?.data?.error || err.message || 'Failed to pickup job'
            );
          }
        },
      },
    ]);
  };

  const openOfferModal = (job) => {
    if (!canWork) {
      Alert.alert(
        'Cannot Make Offer',
        'You have unpaid commission dues. Please pay dues in Wallet before making offers.'
      );
      return;
    }
    setOfferJob(job);
    setOfferAmount('');
    setOfferMessage('');
    setOfferModalVisible(true);
  };

  const handleSubmitOffer = async () => {
    if (!offerJob) return;
    const amountNumber = Number(offerAmount);
    if (!amountNumber || amountNumber <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid offer amount.');
      return;
    }

    try {
      setSubmittingOffer(true);
      const response = await freelancerJobsAPI.makeOffer(offerJob._id || offerJob.id, {
        amount: amountNumber,
        message: offerMessage || null,
      });
      if (response.success) {
        Alert.alert('Success', 'Offer submitted successfully.');
        setOfferModalVisible(false);
        // Reload jobs so we get updated offers array for cooldown calculation
        loadJobs();
      } else {
        Alert.alert('Error', response.error || 'Failed to submit offer');
      }
    } catch (err) {
      console.error('Error submitting offer:', err);
      Alert.alert(
        'Error',
        err.response?.data?.error || err.message || 'Failed to submit offer'
      );
    } finally {
      setSubmittingOffer(false);
    }
  };

  const getOfferCooldownMinutes = (job) => {
    try {
      if (!job?.offers || !Array.isArray(job.offers) || !freelancerId) return 0;
      const myOffers = job.offers.filter(
        (o) =>
          o.freelancer === freelancerId ||
          o.freelancer?._id === freelancerId ||
          o.freelancer?.toString?.() === freelancerId
      );
      if (!myOffers.length) return 0;
      const lastOffer = myOffers.reduce((latest, current) => {
        const latestTime = new Date(latest.createdAt || 0).getTime();
        const currentTime = new Date(current.createdAt || 0).getTime();
        return currentTime > latestTime ? current : latest;
      });
      const FIVE_MINUTES = 5 * 60 * 1000;
      const now = Date.now();
      const lastTime = new Date(lastOffer.createdAt || 0).getTime();
      const diff = now - lastTime;
      if (diff >= FIVE_MINUTES) return 0;
      return Math.ceil((FIVE_MINUTES - diff) / (60 * 1000));
    } catch {
      return 0;
    }
  };

  const renderJobItem = ({ item }) => {
    const cooldownMinutes = getOfferCooldownMinutes(item);
    const canMakeOffer = canWork && cooldownMinutes === 0;

    return (
    <View style={styles.jobCard}>
      <View style={styles.jobHeader}>
        <Text style={styles.jobTitle}>{item.title}</Text>
        <Text style={styles.jobBudget}>₹{item.budget}</Text>
      </View>
      <Text style={styles.jobCategory}>{item.category}</Text>
      <Text style={styles.jobAddress}>{item.address}</Text>
      <View style={styles.jobMetaRow}>
        <View style={styles.jobMeta}>
          <MaterialIcons name="location-on" size={16} color={colors.text.secondary} />
          <Text style={styles.jobMetaText}>{item.pincode}</Text>
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

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionButton, !canWork && styles.actionButtonDisabled]}
          onPress={() => handlePickupJob(item)}
          disabled={!canWork}
        >
          <MaterialIcons
            name="check-circle"
            size={18}
            color={canWork ? colors.success.main : colors.text.muted}
          />
          <Text
            style={[
              styles.actionButtonText,
              { color: canWork ? colors.success.main : colors.text.muted },
            ]}
          >
            {canWork ? 'Pickup Job' : 'Pay Commission First'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.makeOfferButton,
            (!canWork || cooldownMinutes > 0) && styles.actionButtonDisabled,
          ]}
          onPress={() => openOfferModal(item)}
          disabled={!canMakeOffer}
        >
          <MaterialIcons
            name="local-offer"
            size={18}
            color={canMakeOffer ? colors.primary.main : colors.text.muted}
          />
          <Text
            style={[
              styles.actionButtonText,
              { color: canMakeOffer ? colors.primary.main : colors.text.muted },
            ]}
          >
            {!canWork
              ? 'Pay Commission First'
              : cooldownMinutes > 0
              ? `${cooldownMinutes}m`
              : 'Make Offer'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );};

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
          icon={<MaterialIcons name="work" size={64} color={colors.text.muted} />}
          title="No available jobs"
          description="New jobs will appear here when clients post them."
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

      {/* Make Offer Modal */}
      <Modal
        visible={offerModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setOfferModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Make Offer</Text>
            {offerJob && (
              <Text style={styles.modalSubtitle}>
                {offerJob.title} · ₹{offerJob.budget}
              </Text>
            )}
            <Text style={styles.modalLabel}>Offer Amount (₹)</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              placeholder="Enter your offer amount"
              value={offerAmount}
              onChangeText={setOfferAmount}
            />
            <Text style={styles.modalLabel}>Message (optional)</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextarea]}
              placeholder="Write a short message for the client"
              value={offerMessage}
              onChangeText={setOfferMessage}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setOfferModalVisible(false)}
                disabled={submittingOffer}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSubmitButton]}
                onPress={handleSubmitOffer}
                disabled={submittingOffer}
              >
                {submittingOffer ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalSubmitText}>Submit Offer</Text>
                )}
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
  },
  jobBudget: {
    ...typography.body,
    color: colors.primary.main,
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
    justifyContent: 'space-between',
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
    marginTop: spacing.md,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.sm,
    borderWidth: 1,
    borderColor: colors.success.main,
    backgroundColor: 'transparent',
  },
  actionButtonDisabled: {
    borderColor: colors.text.muted,
  },
  actionButtonText: {
    ...typography.small,
    fontWeight: '600',
  },
  makeOfferButton: {
    borderColor: colors.primary.main,
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
  modalTitle: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  modalLabel: {
    ...typography.body,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text.primary,
  },
  modalTextarea: {
    height: 90,
    textAlignVertical: 'top',
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
});

export default AvailableJobs;

