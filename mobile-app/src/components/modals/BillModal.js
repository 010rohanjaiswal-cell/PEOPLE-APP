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
import { Button } from '../common';
import { clientJobsAPI } from '../../api/clientJobs';

const BillModal = ({ visible, job, onClose, onPaymentSuccess }) => {
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [processing, setProcessing] = useState(false);

  const freelancer = job?.assignedFreelancer || {};
  const amount = job?.budget || 0;
  
  // Get freelancer details from user or verification
  const freelancerName = freelancer.verification?.fullName || freelancer.fullName || 'Unknown Freelancer';
  const freelancerPhoto = freelancer.profilePhoto || freelancer.verification?.profilePhoto || null;

  const handlePay = () => {
    if (!job?._id) return;
    setConfirmModalVisible(true);
  };

  const confirmPayment = async () => {
    setConfirmModalVisible(false);
    setProcessing(true);
    try {
      const response = await clientJobsAPI.payJob(job._id);
      if (response.success) {
        setProcessing(false);
        setSuccessModalVisible(true);
      } else {
        setProcessing(false);
        setErrorMessage(response.error || 'Failed to record payment');
        setErrorModalVisible(true);
      }
    } catch (err) {
      console.error('Error recording payment:', err);
      setProcessing(false);
      setErrorMessage(err.response?.data?.error || 'Failed to record payment');
      setErrorModalVisible(true);
    }
  };

  const handleSuccessClose = () => {
    setSuccessModalVisible(false);
    if (onPaymentSuccess) onPaymentSuccess();
    onClose();
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
            <Button variant="outline" onPress={onClose} style={styles.cancelButton}>
              Cancel
            </Button>
            <Button onPress={handlePay} style={styles.payButton}>
              Paid
            </Button>
          </View>
        </View>
      </View>
    </Modal>

    {/* Payment Confirmation Modal */}
    <Modal
      visible={confirmModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setConfirmModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Confirm Payment</Text>
          <Text style={styles.modalSubtitle}>
            Mark payment of ₹{amount} as completed?
          </Text>
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalCancelButton]}
              onPress={() => setConfirmModalVisible(false)}
              disabled={processing}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalSubmitButton, styles.paymentModalButton]}
              onPress={confirmPayment}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.modalSubmitText}>Paid</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

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
          <Text style={styles.modalTitle}>Payment Successful</Text>
          <Text style={styles.modalSubtitle}>
            Payment recorded successfully!
          </Text>
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalSubmitButton, styles.successModalButton]}
              onPress={handleSuccessClose}
            >
              <Text style={styles.modalSubmitText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

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
          <Text style={styles.modalTitle}>Error</Text>
          <Text style={styles.modalSubtitle}>
            {errorMessage}
          </Text>
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalSubmitButton, styles.errorModalButton]}
              onPress={() => setErrorModalVisible(false)}
            >
              <Text style={styles.modalSubmitText}>OK</Text>
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
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelButton: {
    flex: 1,
  },
  payButton: {
    flex: 1,
    backgroundColor: colors.success.main,
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
    justifyContent: 'flex-end',
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

