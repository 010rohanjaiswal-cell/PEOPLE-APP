/**
 * Applications Modal - non-delivery jobs: view applicants sorted by rating (high → low)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Switch,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import { useLanguage } from '../../context/LanguageContext';
import { Button } from '../common';
import { clientJobsAPI } from '../../api/clientJobs';

const ApplicationsModal = ({ visible, job, onClose, onApplicationAccepted }) => {
  const { t } = useLanguage();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [acceptConfirmVisible, setAcceptConfirmVisible] = useState(false);
  const [rejectConfirmVisible, setRejectConfirmVisible] = useState(false);
  const [acceptSuccessVisible, setAcceptSuccessVisible] = useState(false);
  const [rejectSuccessVisible, setRejectSuccessVisible] = useState(false);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedApplicationId, setSelectedApplicationId] = useState(null);
  const [autoPickEnabled, setAutoPickEnabled] = useState(true);
  const [autoPickSaving, setAutoPickSaving] = useState(false);

  useEffect(() => {
    if (visible && job) {
      loadApplications();
    } else if (!visible) {
      setApplications([]);
      setLoading(false);
      setErrorMessage('');
      setAutoPickEnabled(true);
    }
  }, [visible, job]);

  const loadApplications = async () => {
    const jobId = job?._id || job?.id;
    if (!jobId) {
      setErrorMessage(t('offers.jobIdNotFound'));
      setErrorModalVisible(true);
      setLoading(false);
      return;
    }

    try {
      if (!refreshing) setLoading(true);
      setApplications([]);
      const response = await clientJobsAPI.getApplications(jobId);
      if (response && response.success) {
        const list = response.applications || [];
        setApplications(list);
        if (typeof response.autoPickEnabled === 'boolean') {
          setAutoPickEnabled(response.autoPickEnabled);
        } else {
          setAutoPickEnabled(true);
        }
      } else {
        setApplications([]);
      }
    } catch (err) {
      console.error('Error loading applications:', err);
      setErrorMessage(err.response?.data?.error || err.message || t('applications.failedLoad'));
      setErrorModalVisible(true);
      setApplications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadApplications();
  };

  const handleAutoPickToggle = async (value) => {
    const jobId = job?._id || job?.id;
    if (!jobId) return;
    setAutoPickSaving(true);
    try {
      const resp = await clientJobsAPI.setAutoPick(jobId, value);
      if (resp?.success) {
        setAutoPickEnabled(resp.autoPickEnabled !== false);
      }
    } catch (err) {
      console.error('Auto pick toggle:', err);
      setErrorMessage(err.response?.data?.error || err.message || t('common.error'));
      setErrorModalVisible(true);
    } finally {
      setAutoPickSaving(false);
    }
  };

  const handleAccept = (applicationId) => {
    setSelectedApplicationId(applicationId);
    setAcceptConfirmVisible(true);
  };

  const confirmAccept = async () => {
    const jobId = job?._id || job?.id;
    if (!jobId || !selectedApplicationId) return;

    setAcceptConfirmVisible(false);
    try {
      setProcessingId(selectedApplicationId);
      const response = await clientJobsAPI.acceptApplication(jobId, selectedApplicationId);
      if (response.success) {
        setProcessingId(null);
        setAcceptSuccessVisible(true);
      } else {
        setProcessingId(null);
        setErrorMessage(response.error || t('applications.failedAccept'));
        setErrorModalVisible(true);
      }
    } catch (err) {
      console.error('Error accepting application:', err);
      setProcessingId(null);
      setErrorMessage(err.response?.data?.error || t('applications.failedAccept'));
      setErrorModalVisible(true);
    }
  };

  const handleAcceptSuccessClose = () => {
    setAcceptSuccessVisible(false);
    if (onApplicationAccepted) onApplicationAccepted();
    onClose();
  };

  const handleReject = (applicationId) => {
    setSelectedApplicationId(applicationId);
    setRejectConfirmVisible(true);
  };

  const confirmReject = async () => {
    const jobId = job?._id || job?.id;
    if (!jobId || !selectedApplicationId) return;

    setRejectConfirmVisible(false);
    try {
      setProcessingId(selectedApplicationId);
      const response = await clientJobsAPI.rejectApplication(jobId, selectedApplicationId);
      if (response.success) {
        setProcessingId(null);
        setApplications((prev) =>
          prev.filter((a) => (a._id?.toString() || '') !== (selectedApplicationId?.toString() || ''))
        );
        setRejectSuccessVisible(true);
      } else {
        setProcessingId(null);
        setErrorMessage(response.error || t('applications.failedReject'));
        setErrorModalVisible(true);
      }
    } catch (err) {
      console.error('Error rejecting application:', err);
      setProcessingId(null);
      setErrorMessage(err.response?.data?.error || t('applications.failedReject'));
      setErrorModalVisible(true);
    }
  };

  const handleRejectSuccessClose = () => {
    setRejectSuccessVisible(false);
  };

  const ratingLabel = (f) => {
    const r = f?.averageRating;
    const n = f?.ratingCount;
    if (r == null || Number.isNaN(Number(r))) return '—';
    const stars = Number(r).toFixed(1);
    if (n != null && n > 0) return `${stars} (${n})`;
    return stars;
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.header}>
              <Text style={styles.title}>{t('applications.title')}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <MaterialIcons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.autoPickRow}>
              <View style={styles.autoPickTextCol}>
                <Text style={styles.autoPickTitle}>{t('applications.autoPick')}</Text>
                <Text style={styles.autoPickHint}>{t('applications.autoPickHint')}</Text>
              </View>
              <Switch
                value={autoPickEnabled}
                onValueChange={handleAutoPickToggle}
                disabled={autoPickSaving || loading}
                trackColor={{ false: colors.border, true: colors.primary.light }}
                thumbColor={autoPickEnabled ? colors.primary.main : colors.text.muted}
              />
            </View>

            <View style={styles.contentWrapper}>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary.main} />
                  <Text style={styles.loadingText}>{t('applications.loading')}</Text>
                </View>
              ) : applications.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <MaterialIcons name="inbox" size={64} color={colors.text.muted} />
                  <Text style={styles.emptyText}>{t('applications.empty')}</Text>
                  <Text style={styles.emptySubtext}>{t('applications.emptySub')}</Text>
                </View>
              ) : (
                <ScrollView
                  style={styles.content}
                  contentContainerStyle={styles.contentContainer}
                  showsVerticalScrollIndicator
                  refreshControl={
                    <RefreshControl
                      refreshing={refreshing}
                      onRefresh={onRefresh}
                      colors={[colors.primary.main]}
                      tintColor={colors.primary.main}
                    />
                  }
                >
                  {applications.map((app) => {
                    const freelancer = app.freelancer || {};
                    const aid = app._id?.toString();
                    const isProcessing = processingId === aid;
                    const canAct = app.status === 'pending';

                    return (
                      <View key={aid || Math.random()} style={styles.card}>
                        <View style={styles.cardHeader}>
                          <View style={styles.freelancerInfo}>
                            {freelancer.profilePhoto ? (
                              <Image
                                source={{ uri: freelancer.profilePhoto }}
                                style={styles.profilePhoto}
                              />
                            ) : (
                              <View style={styles.profilePhotoPlaceholder}>
                                <MaterialIcons name="person" size={24} color={colors.text.muted} />
                              </View>
                            )}
                            <View style={styles.freelancerDetails}>
                              <Text style={styles.freelancerName}>
                                {freelancer.fullName || '—'}
                              </Text>
                              <Text style={styles.ratingText}>
                                {t('applications.rating')}: {ratingLabel(freelancer)}
                              </Text>
                            </View>
                          </View>
                          <View
                            style={[
                              styles.statusBadge,
                              { backgroundColor: colors.pending.light },
                            ]}
                          >
                            <Text style={[styles.statusText, { color: colors.pending.main }]}>
                              {app.status?.toUpperCase() || 'PENDING'}
                            </Text>
                          </View>
                        </View>

                        {canAct && (
                          <View style={styles.actions}>
                            <TouchableOpacity
                              onPress={() => handleReject(aid)}
                              disabled={isProcessing}
                              style={[styles.actionTouchable, styles.rejectTouchable]}
                            >
                              <Text style={styles.rejectText}>{t('applications.reject')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleAccept(aid)}
                              disabled={isProcessing}
                              style={[styles.actionTouchable, styles.acceptTouchable]}
                            >
                              {isProcessing ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                              ) : (
                                <Text style={styles.acceptText}>{t('applications.accept')}</Text>
                              )}
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            <View style={styles.footer}>
              <Button variant="outline" onPress={onClose} style={styles.closeButtonFooter}>
                {t('applications.closeFooter')}
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={acceptConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAcceptConfirmVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('applications.acceptTitle')}</Text>
            <Text style={styles.modalSubtitle}>{t('applications.acceptConfirm')}</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setAcceptConfirmVisible(false)}
              >
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSubmitButton]}
                onPress={confirmAccept}
              >
                <Text style={styles.modalSubmitText}>{t('applications.accept')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={acceptSuccessVisible}
        transparent
        animationType="fade"
        onRequestClose={handleAcceptSuccessClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIconContainer}>
              <MaterialIcons name="check-circle" size={64} color={colors.success.main} />
            </View>
            <Text style={styles.modalTitle}>{t('applications.acceptedTitle')}</Text>
            <Text style={styles.modalSubtitle}>{t('applications.acceptedMsg')}</Text>
            <View style={[styles.modalActions, styles.modalActionsCentered]}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSubmitButton, styles.successModalButton]}
                onPress={handleAcceptSuccessClose}
              >
                <Text style={styles.modalSubmitText}>{t('common.ok')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={rejectConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectConfirmVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('applications.rejectTitle')}</Text>
            <Text style={styles.modalSubtitle}>{t('applications.rejectConfirm')}</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setRejectConfirmVisible(false)}
              >
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSubmitButton, styles.rejectModalButton]}
                onPress={confirmReject}
              >
                <Text style={styles.modalSubmitText}>{t('applications.reject')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={rejectSuccessVisible}
        transparent
        animationType="fade"
        onRequestClose={handleRejectSuccessClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIconContainer}>
              <MaterialIcons name="check-circle" size={64} color={colors.success.main} />
            </View>
            <Text style={styles.modalTitle}>{t('applications.rejectedTitle')}</Text>
            <Text style={styles.modalSubtitle}>{t('applications.rejectedMsg')}</Text>
            <View style={[styles.modalActions, styles.modalActionsCentered]}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSubmitButton, styles.successModalButton]}
                onPress={handleRejectSuccessClose}
              >
                <Text style={styles.modalSubmitText}>{t('common.ok')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
              <MaterialIcons name="error" size={64} color={colors.error.main} />
            </View>
            <Text style={styles.modalTitle}>{t('common.error')}</Text>
            <Text style={styles.modalSubtitle}>{errorMessage}</Text>
            <View style={[styles.modalActions, styles.modalActionsCentered]}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSubmitButton]}
                onPress={() => setErrorModalVisible(false)}
              >
                <Text style={styles.modalSubmitText}>{t('common.ok')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modal: {
    backgroundColor: colors.background,
    borderRadius: spacing.lg,
    height: '80%',
    width: '100%',
    maxWidth: 500,
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
  },
  closeButton: {
    padding: spacing.xs,
  },
  autoPickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.cardBackground,
  },
  autoPickTextCol: {
    flex: 1,
    paddingRight: spacing.md,
  },
  autoPickTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text.primary,
  },
  autoPickHint: {
    ...typography.small,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  contentWrapper: {
    flexShrink: 1,
    flexGrow: 1,
    minHeight: 200,
  },
  loadingContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  loadingText: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  emptyContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  emptyText: {
    ...typography.h3,
    color: colors.text.primary,
    marginTop: spacing.md,
    fontWeight: '600',
  },
  emptySubtext: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  freelancerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profilePhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: spacing.sm,
  },
  profilePhotoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  freelancerDetails: {
    flex: 1,
  },
  freelancerName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text.primary,
  },
  ratingText: {
    ...typography.small,
    color: colors.text.secondary,
    marginTop: 2,
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
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionTouchable: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  rejectTouchable: {
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.error.main,
  },
  rejectText: {
    ...typography.body,
    color: colors.error.main,
    fontWeight: '600',
  },
  acceptTouchable: {
    backgroundColor: colors.success.main,
  },
  acceptText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderRadius: spacing.lg,
    padding: spacing.xl,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalTitle: {
    ...typography.h3,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  modalSubtitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
    marginTop: spacing.md,
  },
  modalActionsCentered: {
    justifyContent: 'center',
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  modalCancelButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelText: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  modalSubmitButton: {
    backgroundColor: colors.primary.main,
  },
  modalSubmitText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  rejectModalButton: {
    backgroundColor: colors.error.main,
  },
  successModalButton: {
    backgroundColor: colors.success.main,
  },
  successIconContainer: {
    marginBottom: spacing.md,
  },
  errorIconContainer: {
    marginBottom: spacing.md,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  closeButtonFooter: {
    minHeight: 50,
    paddingVertical: spacing.md,
  },
});

export default ApplicationsModal;
