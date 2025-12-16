/**
 * Bill Modal - People App
 * Modal for payment interface when work is done
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import { Button } from '../common';
import { clientJobsAPI } from '../../api/clientJobs';

const BillModal = ({ visible, job, onClose, onPaymentSuccess }) => {
  const freelancer = job?.assignedFreelancer || {};
  const amount = job?.budget || 0;

  const handlePay = async () => {
    if (!job?._id) return;

    Alert.alert('Confirm Payment', `Mark payment of ₹${amount} as completed?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Paid',
        onPress: async () => {
          try {
            const response = await clientJobsAPI.payJob(job._id);
            if (response.success) {
              Alert.alert('Success', 'Payment recorded successfully!');
              if (onPaymentSuccess) onPaymentSuccess();
              onClose();
            } else {
              Alert.alert('Error', response.error || 'Failed to record payment');
            }
          } catch (err) {
            console.error('Error recording payment:', err);
            Alert.alert('Error', err.response?.data?.error || 'Failed to record payment');
          }
        },
      },
    ]);
  };

  return (
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
                {freelancer.profilePhoto ? (
                  <Image
                    source={{ uri: freelancer.profilePhoto }}
                    style={styles.profilePhoto}
                  />
                ) : (
                  <View style={styles.profilePhotoPlaceholder}>
                    <MaterialIcons name="person" size={32} color={colors.text.muted} />
                  </View>
                )}
                <View style={styles.freelancerInfo}>
                  <Text style={styles.freelancerName}>
                    {freelancer.fullName || 'Unknown Freelancer'}
                  </Text>
                  {freelancer.phone ? (
                    <Text style={styles.freelancerPhone}>{freelancer.phone}</Text>
                  ) : null}
                </View>
              </View>
            </View>

            <View style={styles.paymentMessage}>
              <Text style={styles.paymentMessageText}>
                You are paying {freelancer.fullName || 'the freelancer'} for "{job?.title || 'this job'}"
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
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: colors.background,
    borderTopLeftRadius: spacing.lg,
    borderTopRightRadius: spacing.lg,
    maxHeight: '90%',
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
});

export default BillModal;

