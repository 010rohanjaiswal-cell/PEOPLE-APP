/**
 * My Jobs Screen - People App
 * Display active jobs for client with all features from documentation
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import EmptyState from '../../components/common/EmptyState';
import { clientJobsAPI } from '../../api/clientJobs';
import EditJobModal from '../../components/modals/EditJobModal';
import OffersModal from '../../components/modals/OffersModal';
import BillModal from '../../components/modals/BillModal';

const MyJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [offersModalVisible, setOffersModalVisible] = useState(false);
  const [billModalVisible, setBillModalVisible] = useState(false);

  const loadJobs = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await clientJobsAPI.getActiveJobs();
      if (response?.success && Array.isArray(response.jobs)) {
        setJobs(response.jobs);
      } else if (Array.isArray(response)) {
        setJobs(response);
      } else {
        setJobs([]);
      }
    } catch (err) {
      console.error('Error loading client jobs:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load jobs');
      setJobs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadJobs();
  };

  const handleEditJob = (job) => {
    setSelectedJob(job);
    setEditModalVisible(true);
  };

  const handleDeleteJob = (job) => {
    Alert.alert('Delete Job', 'Are you sure you want to delete this job?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await clientJobsAPI.deleteJob(job._id);
            if (response.success) {
              Alert.alert('Success', 'Job deleted successfully');
              loadJobs();
            } else {
              Alert.alert('Error', response.error || 'Failed to delete job');
            }
          } catch (err) {
            console.error('Error deleting job:', err);
            Alert.alert('Error', err.response?.data?.error || 'Failed to delete job');
          }
        },
      },
    ]);
  };

  const handleViewOffers = (job) => {
    setSelectedJob(job);
    setOffersModalVisible(true);
  };

  const handleViewFreelancer = (job) => {
    const freelancer = job.assignedFreelancer;
    if (!freelancer) {
      Alert.alert('Error', 'No freelancer assigned');
      return;
    }

    Alert.alert(
      'Freelancer Details',
      `Name: ${freelancer.fullName || 'N/A'}\nPhone: ${freelancer.phone || 'N/A'}`,
      [{ text: 'OK' }]
    );
  };

  const handlePay = (job) => {
    setSelectedJob(job);
    setBillModalVisible(true);
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'open':
        return { backgroundColor: colors.primary.light, color: colors.primary.main };
      case 'assigned':
        return { backgroundColor: colors.pending.light, color: colors.pending.main };
      case 'work_done':
        return { backgroundColor: colors.warning.light, color: colors.warning.main };
      case 'completed':
        return { backgroundColor: colors.success.light, color: colors.success.main };
      default:
        return { backgroundColor: colors.text.muted + '20', color: colors.text.secondary };
    }
  };

  const canEditOrDelete = (job) => {
    // Only allow edit/delete if job is open and no offers accepted
    if (job.status !== 'open') return false;
    const hasAcceptedOffers =
      job.offers && job.offers.some((offer) => offer.status === 'accepted');
    return !hasAcceptedOffers;
  };

  const getOffersCount = (job) => {
    if (!job.offers || !Array.isArray(job.offers)) return 0;
    return job.offers.filter((offer) => offer.status === 'pending').length;
  };

  const renderJobItem = ({ item }) => {
    const statusStyle = getStatusBadgeStyle(item.status);
    const offersCount = getOffersCount(item);
    const showEditDelete = canEditOrDelete(item);

    return (
      <View style={styles.jobCard}>
        <View style={styles.jobHeader}>
          <Text style={styles.jobTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor }]}>
            <Text style={[styles.statusText, { color: statusStyle.color }]}>
              {(item.status || 'open').toUpperCase()}
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
          {offersCount > 0 && (
            <View style={styles.jobMeta}>
              <MaterialIcons name="local-offer" size={16} color={colors.primary.main} />
              <Text style={[styles.jobMetaText, { color: colors.primary.main }]}>
                {offersCount} {offersCount === 1 ? 'offer' : 'offers'}
              </Text>
            </View>
          )}
        </View>

        {item.description ? (
          <Text style={styles.jobDescription} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        {/* Status-based action buttons */}
        <View style={styles.actionsRow}>
          {item.status === 'open' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.viewOffersButton]}
              onPress={() => handleViewOffers(item)}
            >
              <MaterialIcons name="local-offer" size={18} color={colors.primary.main} />
              <Text style={[styles.actionButtonText, { color: colors.primary.main }]}>
                View Offers
              </Text>
            </TouchableOpacity>
          )}

          {(item.status === 'assigned' || item.status === 'work_done' || item.status === 'completed') &&
            item.assignedFreelancer && (
              <TouchableOpacity
                style={[styles.actionButton, styles.viewFreelancerButton]}
                onPress={() => handleViewFreelancer(item)}
              >
                <MaterialIcons name="person" size={18} color={colors.success.main} />
                <Text style={[styles.actionButtonText, { color: colors.success.main }]}>
                  View Freelancer
                </Text>
              </TouchableOpacity>
            )}

          {item.status === 'work_done' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.payButton]}
              onPress={() => handlePay(item)}
            >
              <MaterialIcons name="payment" size={18} color="#FFFFFF" />
              <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Pay</Text>
            </TouchableOpacity>
          )}

          {item.status === 'completed' && (
            <View style={styles.completedBadge}>
              <MaterialIcons name="check-circle" size={18} color={colors.success.main} />
              <Text style={[styles.completedText, { color: colors.success.main }]}>
                Payment Completed
              </Text>
            </View>
          )}

          {/* Edit/Delete buttons (only for open jobs with no accepted offers) */}
          {showEditDelete && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.editButton]}
                onPress={() => handleEditJob(item)}
              >
                <MaterialIcons name="edit" size={18} color={colors.primary.main} />
                <Text style={[styles.actionButtonText, { color: colors.primary.main }]}>
                  Edit
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => handleDeleteJob(item)}
              >
                <MaterialIcons name="delete" size={18} color={colors.error.main} />
                <Text style={[styles.actionButtonText, { color: colors.error.main }]}>Delete</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.main} />
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

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Active Jobs</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <MaterialIcons name="refresh" size={24} color={colors.primary.main} />
        </TouchableOpacity>
      </View>

      {jobs.length === 0 ? (
        <EmptyState
          icon={<MaterialIcons name="work" size={64} color={colors.text.muted} />}
          title="No active jobs found"
          description="Post your first job to get started!"
        />
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item._id || item.id}
          renderItem={renderJobItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary.main} />
          }
        />
      )}

      {/* Modals */}
      <EditJobModal
        visible={editModalVisible}
        job={selectedJob}
        onClose={() => {
          setEditModalVisible(false);
          setSelectedJob(null);
        }}
        onSuccess={loadJobs}
      />

      <OffersModal
        visible={offersModalVisible}
        job={selectedJob}
        onClose={() => {
          setOffersModalVisible(false);
          setSelectedJob(null);
        }}
        onOfferAccepted={loadJobs}
      />

      <BillModal
        visible={billModalVisible}
        job={selectedJob}
        onClose={() => {
          setBillModalVisible(false);
          setSelectedJob(null);
        }}
        onPaymentSuccess={loadJobs}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    margin: spacing.lg,
  },
  errorText: {
    ...typography.small,
    color: colors.error.main,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text.primary,
  },
  refreshButton: {
    padding: spacing.xs,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
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
    flexWrap: 'wrap',
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
  viewOffersButton: {
    borderColor: colors.primary.main,
    backgroundColor: 'transparent',
  },
  viewFreelancerButton: {
    borderColor: colors.success.main,
    backgroundColor: 'transparent',
  },
  payButton: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.main,
  },
  editButton: {
    borderColor: colors.primary.main,
    backgroundColor: 'transparent',
  },
  deleteButton: {
    borderColor: colors.error.main,
    backgroundColor: 'transparent',
  },
  actionButtonText: {
    ...typography.small,
    fontWeight: '600',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  completedText: {
    ...typography.small,
    fontWeight: '600',
  },
});

export default MyJobs;
