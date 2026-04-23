/**
 * My Jobs Tab - Freelancer Dashboard
 * Shows assigned jobs and supports full workflow:
 * assigned -> work_done -> waiting for payment -> completed -> fully completed
 */

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { spacing, typography } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import EmptyState from '../../components/common/EmptyState';
import UserDetailsModal from '../../components/modals/UserDetailsModal';
import { freelancerJobsAPI } from '../../api/freelancerJobs';
import { translateJobToHindi } from '../../utils/translate';
import { isDeliveryJob } from '../../utils/jobDisplay';
import { JobLocationBlock, JobMetaGenderOrDeliveryPins } from '../../components/job/JobLocationBlock';
import { useAuth } from '../../context/AuthContext';
import { readJobListCache, writeJobListCache } from '../../utils/jobListCache';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/** Poll assigned jobs while this tab is focused so status changes sync without manual refresh */
const MY_JOBS_POLL_MS = 5000;

function createFreelancerMyJobsStyles(colors, isDark) {
  return StyleSheet.create({
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
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    gap: 8,
  },
  jobTitle: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
  },
  jobCategory: {
    ...typography.small,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  jobBudget: {
    ...typography.body,
    color: colors.primary.main,
    fontWeight: '600',
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryPill: {
    maxWidth: 170,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(37, 99, 235, 0.95)' : 'rgba(37, 99, 235, 0.35)',
    backgroundColor: isDark ? colors.primary.main : '#FFFFFF',
    justifyContent: 'center',
    marginBottom: 2,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 1,
  },
  categoryPillText: {
    ...typography.small,
    color: isDark ? '#FFFFFF' : colors.primary.main,
    fontWeight: '700',
    fontSize: 10,
    lineHeight: 12,
    includeFontPadding: false,
  },
  jobMetaPinsInline: {
    flexGrow: 0,
    flexShrink: 1,
    minWidth: 0,
    flexWrap: 'wrap',
  },
  jobMetaLeftRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  jobHeaderRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
  descriptionBlock: {
    position: 'relative',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  jobDescription: {
    ...typography.small,
    color: colors.text.secondary,
    paddingRight: 0,
  },
  viewMoreButton: {
    paddingVertical: 2,
  },
  viewMoreButtonInline: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: colors.cardBackground,
    paddingLeft: spacing.sm,
  },
  viewMoreButtonBlock: {
    marginTop: spacing.xs,
    width: '100%',
  },
  viewMoreText: {
    ...typography.small,
    color: colors.primary.main,
    fontWeight: '600',
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
    color: '#FFFFFF',
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
  modalActionsCentered: {
    justifyContent: 'center',
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
}

const MyJobs = () => {
  const { t, locale } = useLanguage();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createFreelancerMyJobsStyles(colors, isDark), [colors, isDark]);
  const { user } = useAuth();
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
  const [refreshing, setRefreshing] = useState(false);
  const [expandedDescriptionIds, setExpandedDescriptionIds] = useState({});
  const [translatedJobs, setTranslatedJobs] = useState({});

  const fetchInFlightRef = useRef(false);

  const loadJobs = useCallback(
    async (opts = {}) => {
      const silent = opts.silent === true;
      const pullRefresh = opts.pullRefresh === true;
      if (fetchInFlightRef.current) return;
      fetchInFlightRef.current = true;
      try {
        if (!silent && !pullRefresh) setLoading(true);
        if (!silent) setError('');
        const response = await freelancerJobsAPI.getAssignedJobs();
        if (response?.success && Array.isArray(response.jobs)) {
          setJobs(response.jobs);
          void writeJobListCache({ user, scope: 'freelancer:my_jobs', data: response.jobs });
        } else if (Array.isArray(response)) {
          setJobs(response);
          void writeJobListCache({ user, scope: 'freelancer:my_jobs', data: response });
        } else {
          setJobs([]);
        }
      } catch (err) {
        console.error('Error loading assigned jobs for freelancer:', err);
        if (!silent) {
          setError(err.response?.data?.error || err.message || t('jobs.failedLoadAssigned'));
          setJobs([]);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
        fetchInFlightRef.current = false;
      }
    },
    [t]
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadJobs({ pullRefresh: true });
  };

  // Fast paint from cache (stale-while-revalidate)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = await readJobListCache({ user, scope: 'freelancer:my_jobs', maxAgeMs: 10 * 60 * 1000 });
      if (cancelled) return;
      if (cached && Array.isArray(cached) && cached.length > 0) {
        setJobs(cached);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?._id]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  // Translate job fields for Hindi locale (title/description/address/pincode + delivery fields).
  useEffect(() => {
    if (locale !== 'hi' || !jobs.length) {
      if (locale !== 'hi') setTranslatedJobs({});
      return;
    }
    let cancelled = false;
    const run = async () => {
      for (const job of jobs) {
        if (cancelled) return;
        const id = job?._id || job?.id;
        if (!id) continue;
        try {
          const translated = await translateJobToHindi(job);
          if (cancelled) return;
          setTranslatedJobs((prev) => {
            if (prev && prev[id]) return prev;
            return { ...(prev || {}), [id]: translated };
          });
        } catch {
          // ignore
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [locale, jobs]);

  useFocusEffect(
    useCallback(() => {
      const id = setInterval(() => {
        loadJobs({ silent: true });
      }, MY_JOBS_POLL_MS);
      return () => clearInterval(id);
    }, [loadJobs])
  );

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
        Alert.alert(t('common.error'), response.error || t('jobs.failedMarkWorkDone'));
      }
    } catch (err) {
      console.error('Error marking work as done:', err);
      Alert.alert(
        t('common.error'),
        err.response?.data?.error || err.message || t('jobs.failedMarkWorkDone')
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
        setCompleteJobErrorMessage(response.error || t('jobs.failedCompleteJob'));
        setCompleteJobErrorModalVisible(true);
      }
    } catch (err) {
      console.error('Error fully completing job:', err);
      setCompletingJob(false);
      setCompleteJobErrorMessage(err.response?.data?.error || err.message || t('jobs.failedCompleteJob'));
      setCompleteJobErrorModalVisible(true);
    }
  };

  const handleCompleteJobSuccessClose = () => {
    setCompleteJobSuccessModalVisible(false);
  };

  const handleViewClient = (job) => {
    const client = job.client || null;
    if (!client) {
      Alert.alert(t('common.error'), t('jobs.noClientDetails'));
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
    const jobId = item._id || item.id;
    const statusInfo = getStatusBadgeStyle(item.status);
    const delivery = isDeliveryJob(item);
    const tr = locale === 'hi' && translatedJobs[jobId];
    const title = tr ? tr.title : item.title;
    const description = tr ? tr.description : (item.description || '');

    return (
      <View style={styles.jobCard}>
        <View style={styles.jobHeader}>
          <Text style={styles.jobTitle}>{title}</Text>
          <View style={styles.jobHeaderRight}>
            <View style={styles.jobHeaderRightRow}>
              <View style={styles.budgetRow}>
                <Text style={styles.jobBudget}>₹{item.budget}</Text>
              </View>
              <View
                style={[styles.statusBadge, { backgroundColor: statusInfo.backgroundColor }]}
              >
                <Text style={[styles.statusText, { color: statusInfo.color }]}>
                  {t('status.' + (item.status || 'assigned').replace(/-/g, '_'))}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {!delivery && description ? (
          <View style={styles.descriptionBlock}>
            <Text style={styles.jobDescription} numberOfLines={expandedDescriptionIds[jobId] ? undefined : 2}>
              {description}
            </Text>
            {description.length > 60 ? (
              <TouchableOpacity
                onPress={() => setExpandedDescriptionIds((prev) => ({ ...prev, [jobId]: !prev[jobId] }))}
                style={[
                  styles.viewMoreButton,
                  expandedDescriptionIds[jobId] ? styles.viewMoreButtonBlock : styles.viewMoreButtonInline,
                ]}
                activeOpacity={0.7}
              >
                <Text style={styles.viewMoreText}>
                  {expandedDescriptionIds[jobId] ? t('jobs.viewLess') : t('jobs.viewMore')}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
        <JobLocationBlock job={item} translated={tr} t={t} />
        <View style={styles.jobMetaRow}>
          <View style={styles.jobMetaLeftRow}>
            <JobMetaGenderOrDeliveryPins job={item} translated={tr} t={t} style={styles.jobMetaPinsInline} />
            {item?.category ? (
              <View style={styles.categoryPill}>
                <Text style={styles.categoryPillText} numberOfLines={1}>
                  {String(item.category || '')}
                </Text>
              </View>
            ) : null}
          </View>
          {(item.status === 'assigned' ||
            item.status === 'work_done' ||
            item.status === 'completed') && (
            <TouchableOpacity
              style={styles.viewClientMeta}
              onPress={() => handleViewClient(item)}
            >
              <MaterialIcons name="person" size={16} color={colors.primary.main} />
              <Text style={styles.viewClientMetaText}>{t('jobs.viewClient')}</Text>
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
              <MaterialIcons name="check-circle" size={18} color="#FFFFFF" />
              <Text style={[styles.actionButtonText, styles.workDoneButtonText]}>
                {t('status.work_done')}
              </Text>
            </TouchableOpacity>
          )}

          {item.status === 'work_done' && (
            <View style={styles.waitingPaymentBadge}>
              <MaterialIcons name="access-time" size={18} color={colors.warning.main} />
              <Text style={[styles.waitingPaymentText, { color: colors.warning.main }]}>
                {t('status.waiting_payment')}
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
                {t('status.completed')}
              </Text>
            </TouchableOpacity>
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

      <FlatList
        data={jobs}
        keyExtractor={(item) => item._id || item.id}
        renderItem={renderJobItem}
        ListEmptyComponent={
          jobs.length === 0 && !loading ? (
            <EmptyState
              icon={<MaterialIcons name="check-circle" size={64} color={colors.text.muted} />}
              title={t('jobs.myAssignedJobs')}
              description={t('jobs.myAssignedJobsDesc')}
            />
          ) : null
        }
        contentContainerStyle={[
          styles.listContent,
          jobs.length === 0 && { flexGrow: 1 }
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary.main]}
            tintColor={colors.primary.main}
          />
        }
      />

      <UserDetailsModal
        visible={clientModalVisible}
        user={selectedClient}
        roleLabel={t('common.client')}
        title={t('jobs.clientDetails')}
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
            <Text style={styles.modalTitle}>{t('jobs.markWorkDone')}</Text>
            <Text style={styles.modalSubtitle}>
              {t('jobs.markWorkDoneConfirm')}
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
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSubmitButton, styles.workDoneModalButton]}
                onPress={confirmWorkDone}
                disabled={markingWorkDone}
              >
                {markingWorkDone ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalSubmitText}>{t('jobs.markDone')}</Text>
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
            <Text style={styles.modalSubtitle}>{t('jobs.successWorkDoneMsg')}</Text>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalSubmitButton]}
              onPress={() => setSuccessModalVisible(false)}
            >
              <Text style={styles.modalSubmitText}>{t('common.ok')}</Text>
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
            <Text style={styles.modalTitle}>{t('jobs.completeJob')}</Text>
            <Text style={styles.modalSubtitle}>
              {t('jobs.completeJobConfirm')}
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
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSubmitButton, styles.completeJobModalButton]}
                onPress={confirmFullyComplete}
                disabled={completingJob}
              >
                {completingJob ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalSubmitText}>{t('jobs.complete')}</Text>
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
            <Text style={styles.modalTitle}>{t('jobs.jobCompleted')}</Text>
            <Text style={styles.modalSubtitle}>
              {t('jobs.jobCompletedMsg')}
            </Text>
            <View style={[styles.modalActions, styles.modalActionsCentered]}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSubmitButton, styles.successModalButton]}
                onPress={handleCompleteJobSuccessClose}
              >
                <Text style={styles.modalSubmitText}>{t('common.ok')}</Text>
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
            <Text style={styles.modalTitle}>{t('common.error')}</Text>
            <Text style={styles.modalSubtitle}>
              {completeJobErrorMessage}
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSubmitButton, styles.errorModalButton]}
                onPress={() => setCompleteJobErrorModalVisible(false)}
              >
                <Text style={styles.modalSubmitText}>{t('common.ok')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default MyJobs;

