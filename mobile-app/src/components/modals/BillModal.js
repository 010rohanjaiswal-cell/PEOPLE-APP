/**
 * Bill Modal - People App
 * Modal for payment interface when work is done
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import { useLanguage } from '../../context/LanguageContext';
import { Button } from '../common';
import { paymentAPI } from '../../api';
import { startPhonePeTransaction } from '../../config/phonepe';
import RatingModal from './RatingModal';
import { clientJobsAPI } from '../../api/clientJobs';

const BillModal = ({ visible, job, onClose, onPaymentSuccess }) => {
  const { t } = useLanguage();
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [processing, setProcessing] = useState(false);
  const [merchantOrderId, setMerchantOrderId] = useState(null);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [ratingValue, setRatingValue] = useState(null);
  const [submittingRating, setSubmittingRating] = useState(false);

  const freelancer = job?.assignedFreelancer || {};
  const amount = job?.budget || 0;
  
  // Get freelancer details from user or verification
  const freelancerName = freelancer.verification?.fullName || freelancer.fullName || 'Unknown Freelancer';
  const freelancerPhoto = freelancer.profilePhoto || freelancer.verification?.profilePhoto || null;

  const handlePay = async () => {
    if (!job?._id) return;
    setProcessing(true);
    setErrorMessage('');
    try {
      const resp = await paymentAPI.createJobPaymentOrder(job._id);
      if (!resp?.success || !resp?.merchantOrderId || !resp?.orderToken || !resp?.orderId || !resp?.merchantId) {
        throw new Error(resp?.error || 'Failed to create PhonePe order');
      }
      setMerchantOrderId(resp.merchantOrderId);

      await startPhonePeTransaction({
        orderToken: resp.orderToken,
        orderId: resp.orderId,
        merchantId: resp.merchantId,
        checkSum: resp.checkSum,
        appSchema: 'people-app',
      });

      // After SDK returns, poll backend to confirm & credit wallet
      const id = resp.merchantOrderId;
      if (id) {
        setMerchantOrderId(id);
        confirmJobPayment(id);
      }
    } catch (e) {
      setErrorMessage(e?.response?.data?.error || e?.message || 'Failed to start payment');
      setErrorModalVisible(true);
    } finally {
      setProcessing(false);
    }
  };

  const handlePayCash = async () => {
    if (!job?._id) return;
    setProcessing(true);
    setErrorMessage('');
    try {
      const resp = await clientJobsAPI.payJobCash(job._id);
      if (!resp?.success) throw new Error(resp?.error || 'Failed to record cash payment');
      setSuccessModalVisible(true);
    } catch (e) {
      setErrorMessage(e?.response?.data?.error || e?.message || 'Failed to record cash payment');
      setErrorModalVisible(true);
    } finally {
      setProcessing(false);
    }
  };

  const confirmJobPayment = async (merchantOrderIdToCheck) => {
    const maxRetries = 10;
    const pollInterval = 3000;
    try {
      setProcessing(true);
      for (let i = 0; i < maxRetries; i++) {
        const resp = await paymentAPI.confirmJobPayment(merchantOrderIdToCheck);
        if (resp?.success && resp?.paid) {
          setSuccessModalVisible(true);
          return;
        }
        await new Promise((r) => setTimeout(r, pollInterval));
      }
      setErrorMessage(t('wallet.paymentNotCompleted') || 'Payment not completed');
      setErrorModalVisible(true);
    } catch (e) {
      setErrorMessage(e?.response?.data?.error || e?.message || 'Failed to confirm payment');
      setErrorModalVisible(true);
    } finally {
      setProcessing(false);
    }
  };

  const handleSuccessClose = () => {
    setSuccessModalVisible(false);
    setRatingValue(null);
    setRatingModalVisible(true);
  };

  const submitRating = async () => {
    const jobId = job?._id || job?.id;
    if (!jobId) return;
    if (ratingValue == null) return;
    try {
      setSubmittingRating(true);
      const resp = await clientJobsAPI.rateFreelancer(jobId, ratingValue);
      if (!resp?.success) {
        throw new Error(resp?.error || 'Failed to submit rating');
      }
      setRatingModalVisible(false);
      setSubmittingRating(false);
      if (onPaymentSuccess) onPaymentSuccess();
      onClose();
    } catch (e) {
      setSubmittingRating(false);
      setErrorMessage(e?.response?.data?.error || e?.message || 'Failed to submit rating');
      setErrorModalVisible(true);
    }
  };

  return (
    <>
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Payment</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.freelancerSection}>
              <Text style={styles.sectionTitle}>Freelancer Details</Text>
              <View style={styles.freelancerCard}>
                {freelancerPhoto ? (
                  <Image
                    source={{ uri: freelancerPhoto }}
                    style={styles.profilePhoto}
                  />
                ) : (
                  <View style={styles.profilePhotoPlaceholder}>
                    <MaterialIcons name="person" size={32} color={colors.text.muted} />
                  </View>
                )}
                <View style={styles.freelancerInfo}>
                  <Text style={styles.freelancerName}>
                    {freelancerName}
                  </Text>
                  {freelancer.phone ? (
                    <Text style={styles.freelancerPhone}>{freelancer.phone}</Text>
                  ) : null}
                </View>
              </View>
            </View>

            <View style={styles.paymentMessage}>
              <Text style={styles.paymentMessageText}>
                You are paying {freelancerName} for "{job?.title || 'this job'}"
              </Text>
            </View>

            <View style={styles.amountSection}>
              <View style={styles.amountContainer}>
                <Text style={styles.amountLabel}>Amount to Pay</Text>
                <Text style={styles.amountValue}>₹{amount}</Text>
                <Text style={styles.amountSubLabel}>to freelancer</Text>
              </View>
            </View>

            <View style={styles.noteSection}>
              <Text style={styles.noteText}>
                Please pay ₹{amount} to the freelancer through your preferred method (cash, UPI, bank transfer, etc.)
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Button variant="outline" onPress={handlePayCash} style={styles.cancelButton} size="lg" textStyle={styles.footerButtonText} disabled={processing}>
              Pay Cash
            </Button>
            <Button onPress={handlePay} style={styles.payButton} disabled={processing} size="lg" textStyle={styles.footerButtonText}>
              {processing ? <ActivityIndicator color="#fff" size="small" /> : 'Pay'}
            </Button>
          </View>
        </View>
      </View>
    </Modal>

    {/* Cashfree native SDK handles UI */}

    {/* Payment Success Modal */}
    <Modal
      visible={successModalVisible}
      transparent
      animationType="fade"
      onRequestClose={handleSuccessClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.successIconContainer}>
            <MaterialIcons name="check-circle" size={64} color={colors.success.main} />
          </View>
          <Text style={styles.modalTitle}>{t('bill.paymentSuccessful')}</Text>
          <Text style={styles.modalSubtitle}>
            {t('bill.paymentRecordedSuccess')}
          </Text>
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalSubmitButton, styles.successModalButton]}
              onPress={handleSuccessClose}
            >
              <Text style={styles.modalSubmitText}>{t('common.ok')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

    <RatingModal
      visible={ratingModalVisible}
      userName={freelancerName}
      rating={ratingValue}
      onSetRating={setRatingValue}
      onSubmit={submitRating}
      submitting={submittingRating}
    />

    {/* Error Modal */}
    <Modal
      visible={errorModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setErrorModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.errorIconContainer}>
            <MaterialIcons name="error-outline" size={64} color={colors.error.main} />
          </View>
          <Text style={styles.modalTitle}>{t('common.error')}</Text>
          <Text style={styles.modalSubtitle}>
            {errorMessage}
          </Text>
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalSubmitButton, styles.errorModalButton]}
              onPress={() => setErrorModalVisible(false)}
            >
              <Text style={styles.modalSubmitText}>{t('common.ok')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

    {/* PhonePe SDK handles checkout UI */}
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: spacing.xxl,
  },
  modal: {
    backgroundColor: colors.background,
    borderRadius: spacing.lg,
    maxHeight: '85%',
    width: '90%',
    marginBottom: spacing.xxl,
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
  content: {
    padding: spacing.lg,
  },
  freelancerSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  freelancerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  profilePhoto: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: spacing.md,
  },
  profilePhotoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  freelancerInfo: {
    flex: 1,
  },
  freelancerName: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  freelancerPhone: {
    ...typography.body,
    color: colors.text.secondary,
  },
  paymentMessage: {
    backgroundColor: colors.primary.light,
    borderWidth: 1,
    borderColor: colors.primary.main,
    borderRadius: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  paymentMessageText: {
    ...typography.body,
    color: colors.text.primary,
    textAlign: 'center',
  },
  amountSection: {
    marginBottom: spacing.lg,
  },
  amountContainer: {
    backgroundColor: colors.success.light,
    borderRadius: spacing.md,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.success.main,
  },
  amountLabel: {
    ...typography.small,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  amountValue: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.success.dark,
    marginBottom: spacing.xs,
  },
  amountSubLabel: {
    ...typography.small,
    color: colors.text.secondary,
  },
  noteSection: {
    backgroundColor: colors.text.muted + '20',
    borderRadius: spacing.md,
    padding: spacing.md,
  },
  noteText: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'stretch',
  },
  /** Taller tap targets; avoids label clipping on Android (font padding). */
  cancelButton: {
    flex: 1,
    minHeight: 52,
    height: 52,
  },
  payButton: {
    flex: 1,
    minHeight: 52,
    height: 52,
    backgroundColor: colors.success.main,
  },
  footerButtonText: {
    lineHeight: 22,
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
    maxWidth: 400,
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
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
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
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelText: {
    ...typography.body,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  modalSubmitButton: {
    backgroundColor: colors.primary.main,
  },
  modalSubmitText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  paymentModalButton: {
    backgroundColor: colors.success.main,
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

export default BillModal;

