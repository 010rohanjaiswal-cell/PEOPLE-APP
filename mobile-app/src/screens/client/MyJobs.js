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
  Dimensions,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import { useLanguage } from '../../context/LanguageContext';
import EmptyState from '../../components/common/EmptyState';
import { clientJobsAPI } from '../../api/clientJobs';
import { translateJobToHindi } from '../../utils/translate';
import EditJobModal from '../../components/modals/EditJobModal';
import OffersModal from '../../components/modals/OffersModal';
import ApplicationsModal from '../../components/modals/ApplicationsModal';
import BillModal from '../../components/modals/BillModal';
import UserDetailsModal from '../../components/modals/UserDetailsModal';
import { isDeliveryJob } from '../../utils/jobDisplay';
import { JobLocationBlock, JobMetaGenderOrDeliveryPins } from '../../components/job/JobLocationBlock';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MyJobs = () => {
  const { t, locale } = useLanguage();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [offersModalVisible, setOffersModalVisible] = useState(false);
  const [applicationsModalVisible, setApplicationsModalVisible] = useState(false);
  const [billModalVisible, setBillModalVisible] = useState(false);
  const [freelancerModalVisible, setFreelancerModalVisible] = useState(false);
  const [expandedJobs, setExpandedJobs] = useState({});
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteJob, setDeleteJob] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [translatedJobs, setTranslatedJobs] = useState({});

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
      setError(err.response?.data?.error || err.message || t('jobs.failedLoadClientJobs'));
      setJobs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  // When locale is Hindi, translate job title/description/address/pincode for display
  useEffect(() => {
    if (locale !== 'hi' || !jobs.length) {
      if (locale !== 'hi') setTranslatedJobs({});
      return;
    }
    let cancelled = false;
    const run = async () => {
      for (const job of jobs) {
        const id = job._id || job.id;
        if (!id) continue;
        try {
          const translated = await translateJobToHindi(job);
          if (!cancelled) setTranslatedJobs((prev) => ({ ...prev, [id]: translated }));
        } catch (e) {
          if (!cancelled) {
            setTranslatedJobs((prev) => ({
              ...prev,
              [id]: {
                title: job.title,
                description: job.description || '',
                address: job.address || '',
                pincode: job.pincode || '',
                deliveryFromAddress: job.deliveryFromAddress || '',
                deliveryFromPincode: job.deliveryFromPincode || '',
                deliveryToAddress: job.deliveryToAddress || '',
                deliveryToPincode: job.deliveryToPincode || '',
              },
            }));
          }
        }
      }
    };
    run();
    return () => { cancelled = true; };
  }, [locale, jobs]);

  const onRefresh = () => {
    setRefreshing(true);
    loadJobs();
  };

  const handleEditJob = (job) => {
    setSelectedJob(job);
    setEditModalVisible(true);
  };

  const handleDeleteJob = (job) => {
    setDeleteJob(job);
    setDeleteModalVisible(true);
  };

  const confirmDeleteJob = async () => {
    if (!deleteJob) return;

    try {
      setDeleting(true);
      const response = await clientJobsAPI.deleteJob(deleteJob._id);
      if (response.success) {
        setDeleteModalVisible(false);
        setDeleteJob(null);
        setSuccessModalVisible(true);
        loadJobs();
      } else {
        Alert.alert(t('common.error'), response.error || t('jobs.failedDeleteJob'));
      }
    } catch (err) {
      console.error('Error deleting job:', err);
      Alert.alert(t('common.error'), err.response?.data?.error || t('jobs.failedDeleteJob'));
    } finally {
      setDeleting(false);
    }
  };

  const handleViewOffers = (job) => {
    setSelectedJob(job);
    setOffersModalVisible(true);
  };

  const handleViewApplications = (job) => {
    setSelectedJob(job);
    setApplicationsModalVisible(true);
  };

  const toggleJobExpansion = (jobId) => {
    setExpandedJobs(prev => ({
      ...prev,
      // If currently false (collapsed), set to true (expand)
      // Otherwise (undefined/true means expanded), set to false (collapse)
      [jobId]: prev[jobId] === false ? true : false
    }));
  };

  const handleViewFreelancer = async (job) => {
    const freelancer = job.assignedFreelancer;
    if (!freelancer) {
      Alert.alert(t('common.error'), t('jobs.noFreelancerAssigned'));
      return;
    }

    const freelancerId = freelancer._id || freelancer.id;
    
    // Fetch full freelancer profile using the same approach as freelancer profile page
    try {
      const { userAPI, verificationAPI } = await import('../../api');
      
      // Try to get user profile first (includes verification data)
      let fullFreelancerData = null;
      try {
        const profileResponse = await userAPI.getUserProfile(freelancerId);
        if (profileResponse.success && profileResponse.user) {
          fullFreelancerData = profileResponse.user;
          console.log('✅ Fetched freelancer profile:', {
            fullName: fullFreelancerData.fullName,
            phone: fullFreelancerData.phone,
            email: fullFreelancerData.email,
            hasVerification: !!fullFreelancerData.verification,
            verification: fullFreelancerData.verification
          });
        }
      } catch (profileError) {
        console.error('Error fetching user profile:', profileError);
      }

      // If profile doesn't have verification, try verification API
      if (fullFreelancerData && (!fullFreelancerData.verification || 
          (!fullFreelancerData.verification.dob && !fullFreelancerData.verification.gender && !fullFreelancerData.verification.address))) {
        try {
          // Note: verification API requires freelancer to be logged in, so this might not work
          // But we'll try anyway
          console.log('⚠️ Profile missing verification data, but cannot fetch via verification API (requires freelancer auth)');
        } catch (verificationError) {
          // Silently fail
        }
      }

      // Merge the fetched data with existing freelancer data
      const mergedFreelancer = fullFreelancerData ? {
        ...freelancer,
        ...fullFreelancerData,
        verification: fullFreelancerData.verification || freelancer.verification || null
      } : freelancer;

      setSelectedJob({
        ...job,
        assignedFreelancer: mergedFreelancer
      });
      setFreelancerModalVisible(true);
    } catch (error) {
      console.error('Error fetching freelancer profile:', error);
      // Fallback to using existing data
      setSelectedJob(job);
      setFreelancerModalVisible(true);
    }
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
    const hasAcceptedApplications =
      job.applications && job.applications.some((a) => a.status === 'accepted');
    return !hasAcceptedOffers && !hasAcceptedApplications;
  };

  const getOffersCount = (job) => {
    if (!job.offers || !Array.isArray(job.offers)) return 0;
    return job.offers.filter((offer) => offer.status === 'pending').length;
  };

  const getApplicationsCount = (job) => {
    if (!job.applications || !Array.isArray(job.applications)) return 0;
    return job.applications.filter((a) => a.status === 'pending').length;
  };

  const renderJobItem = ({ item }) => {
    const jobId = item._id || item.id;
    const tr = locale === 'hi' && translatedJobs[jobId];
    const title = tr ? tr.title : item.title;
    const description = tr ? tr.description : (item.description || '');
    const address = tr ? tr.address : (item.address || '');
    const delivery = isDeliveryJob(item);
    const dFromA = tr?.deliveryFromAddress ?? item.deliveryFromAddress;
    const dToA = tr?.deliveryToAddress ?? item.deliveryToAddress;

    const statusStyle = getStatusBadgeStyle(item.status);
    const offersCount = getOffersCount(item);
    const applicationsCount = getApplicationsCount(item);
    const showEditDelete = canEditOrDelete(item);
    // Default to expanded (true) unless explicitly set to false
    const isExpanded = expandedJobs[jobId] !== false;
    const hasDetails =
      (delivery
        ? Boolean(dFromA || dToA || address)
        : Boolean(item.description || item.address || item.gender || item.pincode)) ||
      ((item.status === 'assigned' || item.status === 'work_done' || item.status === 'completed') &&
        item.assignedFreelancer);

    return (
      <TouchableOpacity
        style={styles.jobCard}
        onPress={() => hasDetails && toggleJobExpansion(jobId)}
        activeOpacity={hasDetails ? 0.7 : 1}
      >
        <View style={styles.jobHeader}>
          <View style={styles.jobTitleRow}>
            <Text style={styles.jobTitle}>{title}</Text>
            {showEditDelete && (
              <View style={styles.editDeleteButtons}>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleEditJob(item);
                  }}
                >
                  <MaterialIcons name="edit" size={20} color={colors.primary.main} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDeleteJob(item);
                  }}
                >
                  <MaterialIcons name="delete" size={20} color={colors.error.main} />
                </TouchableOpacity>
              </View>
            )}
          </View>
          <View style={styles.jobHeaderRight}>
            <Text style={styles.jobBudget}>₹{item.budget}</Text>
            <View
              style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor }]}
            >
              <Text style={[styles.statusText, { color: statusStyle.color }]}>
                {t('status.' + (item.status || 'open').replace(/-/g, '_'))}
              </Text>
            </View>
          </View>
        </View>

        {isExpanded && (
          <>
            {!delivery && description ? (
              <Text style={styles.jobDescription} numberOfLines={2}>
                {description}
              </Text>
            ) : null}
            <JobLocationBlock job={item} translated={tr} t={t} />
            <View style={styles.jobMetaRow}>
              <JobMetaGenderOrDeliveryPins job={item} translated={tr} t={t} />
              {(item.status === 'assigned' ||
                item.status === 'work_done' ||
                item.status === 'completed') &&
                item.assignedFreelancer && (
                  <TouchableOpacity
                    style={styles.viewFreelancerMeta}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleViewFreelancer(item);
                    }}
                  >
                    <MaterialIcons name="person" size={16} color={colors.primary.main} />
                    <Text style={styles.viewFreelancerMetaText}>{t('jobs.viewFreelancer')}</Text>
                  </TouchableOpacity>
                )}
            </View>
          </>
        )}

        {/* Status-based action buttons */}
        <View style={styles.actionsRow}>
          {item.status === 'open' && (
            delivery ? (
              <TouchableOpacity
                style={[styles.actionButton, styles.viewOffersButton, styles.viewOffersButtonDeliveryWide]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleViewOffers(item);
                }}
              >
                <MaterialIcons name="local-offer" size={18} color={colors.primary.main} />
                <Text style={[styles.actionButtonText, { color: colors.primary.main }]}>
                  {offersCount > 0 ? `${t('jobs.viewOffers')} (${offersCount})` : t('jobs.viewOffers')}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.actionsRowOpenPair}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.viewOffersButton, styles.openJobActionHalf]}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleViewOffers(item);
                  }}
                >
                  <MaterialIcons name="local-offer" size={18} color={colors.primary.main} />
                  <Text style={[styles.actionButtonText, { color: colors.primary.main }]}>
                    {offersCount > 0 ? `${t('jobs.viewOffers')} (${offersCount})` : t('jobs.viewOffers')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.viewApplicationsButton, styles.openJobActionHalf]}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleViewApplications(item);
                  }}
                >
                  <MaterialIcons name="assignment" size={18} color={colors.primary.main} />
                  <Text style={[styles.actionButtonText, { color: colors.primary.main }]}>
                    {applicationsCount > 0
                      ? `${t('jobs.viewApplications')} (${applicationsCount})`
                      : t('jobs.viewApplications')}
                  </Text>
                </TouchableOpacity>
              </View>
            )
          )}

          {item.status === 'work_done' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.payButton]}
              onPress={(e) => {
                e.stopPropagation();
                handlePay(item);
              }}
            >
              <MaterialIcons name="payment" size={18} color="#FFFFFF" />
              <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>{t('jobs.pay')}</Text>
            </TouchableOpacity>
          )}

          {item.status === 'completed' && (
            <View style={styles.completedBadge}>
              <MaterialIcons name="check-circle" size={18} color={colors.success.main} />
              <Text style={[styles.completedText, { color: colors.success.main }]}>
                {t('jobs.paymentCompleted')}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
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

      {jobs.length === 0 ? (
        <EmptyState
          icon={<MaterialIcons name="work" size={64} color={colors.text.muted} />}
          title={t('jobs.noActiveJobs')}
          description={t('jobs.noActiveJobsDesc')}
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

      <ApplicationsModal
        visible={applicationsModalVisible}
        job={selectedJob}
        onClose={() => {
          setApplicationsModalVisible(false);
          setSelectedJob(null);
        }}
        onApplicationAccepted={loadJobs}
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

      <UserDetailsModal
        visible={freelancerModalVisible}
        user={selectedJob?.assignedFreelancer || null}
        roleLabel={t('common.freelancer')}
        title={t('jobs.freelancerDetails')}
        onClose={() => {
          setFreelancerModalVisible(false);
          // keep selectedJob for other modals; don't clear here
        }}
      />

      {/* Delete Job Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('jobs.deleteJob')}</Text>
            <Text style={styles.modalSubtitle}>
              {t('jobs.deleteJobConfirm')}
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setDeleteModalVisible(false);
                  setDeleteJob(null);
                }}
                disabled={deleting}
              >
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSubmitButton, styles.deleteModalButton]}
                onPress={confirmDeleteJob}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalSubmitText}>{t('common.delete')}</Text>
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
            <Text style={styles.modalTitle}>{t('common.success')}</Text>
            <Text style={styles.modalSubtitle}>{t('jobs.jobDeletedSuccess')}</Text>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalSubmitButton, styles.successModalButton]}
              onPress={() => setSuccessModalVisible(false)}
            >
              <Text style={styles.modalSubmitText}>{t('common.ok')}</Text>
            </TouchableOpacity>
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
  listContent: {
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
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
  jobTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  jobTitle: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
    marginRight: 4,
  },
  editDeleteButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconButton: {
    padding: 4,
    borderRadius: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
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
  viewFreelancerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  viewFreelancerMetaText: {
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
  /** Non-delivery open jobs: View Offers + View Applications side by side, 98% screen, ~50% each */
  actionsRowOpenPair: {
    width: '98%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
  },
  openJobActionHalf: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  /** Delivery open jobs: single View Offers button */
  viewOffersButtonDeliveryWide: {
    width: '95%',
    alignSelf: 'center',
    justifyContent: 'center',
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
  viewApplicationsButton: {
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
    width: '98%',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  successModalButton: {
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 120,
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
  deleteModalButton: {
    backgroundColor: colors.error.main,
  },
});

export default MyJobs;
