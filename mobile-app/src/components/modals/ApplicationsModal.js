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
  Pressable,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import { useLanguage } from '../../context/LanguageContext';
import { clientJobsAPI } from '../../api/clientJobs';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

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
  const [photoPreviewUri, setPhotoPreviewUri] = useState(null);
  const [profileFreelancer, setProfileFreelancer] = useState(null);

  useEffect(() => {
    if (visible && job) {
      loadApplications();
    } else if (!visible) {
      setApplications([]);
      setLoading(false);
      setErrorMessage('');
      setAutoPickEnabled(true);
      setPhotoPreviewUri(null);
      setProfileFreelancer(null);
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

  const calculateAge = (dob) => {
    if (!dob) return null;
    try {
      let birthDate;
      if (typeof dob === 'string' && dob.includes('-')) {
        const parts = dob.split('-');
        if (parts.length === 3) {
          birthDate = new Date(
            parseInt(parts[0], 10),
            parseInt(parts[1], 10) - 1,
            parseInt(parts[2], 10)
          );
        } else {
          birthDate = new Date(dob);
        }
      } else {
        birthDate = new Date(dob);
      }
      if (isNaN(birthDate.getTime())) return null;
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age < 0 || age > 150) return null;
      return age;
    } catch {
      return null;
    }
  };

  const genderDisplay = (g) => {
    if (!g || typeof g !== 'string') return null;
    const key = g.trim().toLowerCase();
    if (key === 'male') return t('common.gender.male');
    if (key === 'female') return t('common.gender.female');
    return g.trim();
  };

  const ageLabel = (f) => {
    const v = f?.verification;
    const age = calculateAge(v?.dob);
    if (age == null) return t('applications.notProvided');
    return String(age);
  };

  const genderLabel = (f) => {
    const g = f?.verification?.gender;
    const label = genderDisplay(g);
    return label || t('applications.notProvided');
  };

  const addressLabel = (f) => {
    const addr = f?.verification?.address;
    if (addr && String(addr).trim()) return String(addr).trim();
    return t('applications.notProvided');
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
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
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
                              <TouchableOpacity
                                activeOpacity={0.85}
                                accessibilityRole="button"
                                accessibilityLabel={t('applications.viewPhoto')}
                                onPress={() => setPhotoPreviewUri(freelancer.profilePhoto)}
                              >
                                <Image
                                  source={{ uri: freelancer.profilePhoto }}
                                  style={styles.profilePhoto}
                                />
                              </TouchableOpacity>
                            ) : (
                              <View style={styles.profilePhotoPlaceholder}>
                                <MaterialIcons name="person" size={24} color={colors.text.muted} />
                              </View>
                            )}
                            <TouchableOpacity
                              style={styles.freelancerDetailsTouchable}
                              activeOpacity={0.7}
                              onPress={() => setProfileFreelancer(freelancer)}
                            >
                              <View style={styles.freelancerDetails}>
                                <Text style={styles.freelancerName}>
                                  {freelancer.fullName || '—'}
                                </Text>
                                <Text style={styles.ratingText}>
                                  {t('applications.rating')}: {ratingLabel(freelancer)}
                                </Text>
                              </View>
                            </TouchableOpacity>
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
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!photoPreviewUri}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoPreviewUri(null)}
      >
        <Pressable style={styles.photoPreviewOverlay} onPress={() => setPhotoPreviewUri(null)}>
          <SafeAreaView style={styles.photoPreviewSafe} edges={['top', 'left', 'right']}>
            <TouchableOpacity
              style={styles.photoPreviewClose}
              onPress={() => setPhotoPreviewUri(null)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <MaterialIcons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.photoPreviewInner} pointerEvents="box-none">
              <Image
                source={{ uri: photoPreviewUri || undefined }}
                style={styles.photoPreviewImage}
                resizeMode="contain"
              />
              <Text style={styles.photoPreviewHint}>{t('applications.tapToClosePhoto')}</Text>
            </View>
          </SafeAreaView>
        </Pressable>
      </Modal>

      <Modal
        visible={!!profileFreelancer}
        transparent
        animationType="fade"
        onRequestClose={() => setProfileFreelancer(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setProfileFreelancer(null)} />
          <View style={styles.freelancerProfileCard}>
            <View style={styles.freelancerProfileHeader}>
              <Text style={styles.freelancerProfileTitle}>{t('applications.freelancerProfile')}</Text>
              <TouchableOpacity
                onPress={() => setProfileFreelancer(null)}
                style={styles.closeButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialIcons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.freelancerProfileScroll}
              contentContainerStyle={styles.freelancerProfileScrollContent}
              showsVerticalScrollIndicator
              nestedScrollEnabled
            >
              <View style={styles.freelancerProfileHero}>
                {profileFreelancer?.profilePhoto ? (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setPhotoPreviewUri(profileFreelancer.profilePhoto)}
                  >
                    <Image
                      source={{ uri: profileFreelancer.profilePhoto }}
                      style={styles.freelancerProfilePhotoLarge}
                    />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.freelancerProfilePhotoLargePlaceholder}>
                    <MaterialIcons name="person" size={48} color={colors.text.muted} />
                  </View>
                )}
                <Text style={styles.freelancerProfileName}>
                  {profileFreelancer?.fullName || '—'}
                </Text>
              </View>
              <View style={styles.freelancerProfileRow}>
                <Text style={styles.freelancerProfileLabel}>{t('applications.rating')}</Text>
                <Text style={styles.freelancerProfileValue}>{ratingLabel(profileFreelancer)}</Text>
              </View>
              <View style={styles.freelancerProfileRow}>
                <Text style={styles.freelancerProfileLabel}>{t('applications.age')}</Text>
                <Text style={styles.freelancerProfileValue}>{ageLabel(profileFreelancer)}</Text>
              </View>
              <View style={styles.freelancerProfileRow}>
                <Text style={styles.freelancerProfileLabel}>{t('applications.gender')}</Text>
                <Text style={styles.freelancerProfileValue}>{genderLabel(profileFreelancer)}</Text>
              </View>
              <View style={styles.freelancerProfileRow}>
                <Text style={styles.freelancerProfileLabel}>{t('postJob.address')}</Text>
                <Text style={styles.freelancerProfileValue}>{addressLabel(profileFreelancer)}</Text>
              </View>
            </ScrollView>
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
    maxHeight: '88%',
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
    flex: 1,
    minHeight: 0,
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
    paddingBottom: spacing.xxl,
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
  freelancerDetailsTouchable: {
    flex: 1,
    minWidth: 0,
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
  photoPreviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
  },
  photoPreviewSafe: {
    flex: 1,
  },
  photoPreviewClose: {
    alignSelf: 'flex-end',
    padding: spacing.md,
    zIndex: 2,
  },
  photoPreviewInner: {
    flex: 1,
    width: SCREEN_W,
    maxHeight: SCREEN_H * 0.88,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  photoPreviewImage: {
    width: SCREEN_W - spacing.lg * 2,
    height: SCREEN_H * 0.68,
  },
  photoPreviewHint: {
    marginTop: spacing.lg,
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    textAlign: 'center',
  },
  freelancerProfileCard: {
    backgroundColor: colors.background,
    borderRadius: spacing.lg,
    width: '90%',
    maxWidth: 440,
    maxHeight: SCREEN_H * 0.82,
    overflow: 'hidden',
    zIndex: 1,
  },
  freelancerProfileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  freelancerProfileTitle: {
    ...typography.h3,
    color: colors.text.primary,
    fontWeight: '600',
    flex: 1,
  },
  freelancerProfileScroll: {
    maxHeight: SCREEN_H * 0.68,
  },
  freelancerProfileScrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  freelancerProfileHero: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  freelancerProfilePhotoLarge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: spacing.sm,
  },
  freelancerProfilePhotoLargePlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: spacing.sm,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freelancerProfileName: {
    ...typography.h3,
    color: colors.text.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  freelancerProfileRow: {
    marginBottom: spacing.md,
  },
  freelancerProfileLabel: {
    ...typography.small,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  freelancerProfileValue: {
    ...typography.body,
    color: colors.text.primary,
  },
});

export default ApplicationsModal;
