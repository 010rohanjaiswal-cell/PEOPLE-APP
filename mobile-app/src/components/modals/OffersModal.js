/**
 * Offers Modal - People App
 * Modal for viewing and managing job offers
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
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import { Button } from '../common';
import { clientJobsAPI } from '../../api/clientJobs';

const OffersModal = ({ visible, job, onClose, onOfferAccepted }) => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingOfferId, setProcessingOfferId] = useState(null);

  useEffect(() => {
    if (visible && job) {
      loadOffers();
    }
  }, [visible, job]);

  const loadOffers = async () => {
    if (!job?._id) return;

    try {
      setLoading(true);
      const response = await clientJobsAPI.getOffers(job._id);
      if (response.success) {
        setOffers(response.offers || []);
      }
    } catch (err) {
      console.error('Error loading offers:', err);
      Alert.alert('Error', 'Failed to load offers');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOffer = async (offerId) => {
    if (!job?._id) return;

    Alert.alert('Accept Offer', 'Are you sure you want to accept this offer?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Accept',
        onPress: async () => {
          try {
            setProcessingOfferId(offerId);
            const response = await clientJobsAPI.acceptOffer(job._id, offerId);
            if (response.success) {
              Alert.alert('Success', 'Offer accepted successfully!');
              if (onOfferAccepted) onOfferAccepted();
              onClose();
            } else {
              Alert.alert('Error', response.error || 'Failed to accept offer');
            }
          } catch (err) {
            console.error('Error accepting offer:', err);
            Alert.alert('Error', err.response?.data?.error || 'Failed to accept offer');
          } finally {
            setProcessingOfferId(null);
          }
        },
      },
    ]);
  };

  const handleRejectOffer = async (offerId) => {
    if (!job?._id) return;

    Alert.alert('Reject Offer', 'Are you sure you want to reject this offer?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          try {
            setProcessingOfferId(offerId);
            const response = await clientJobsAPI.rejectOffer(job._id, offerId);
            if (response.success) {
              Alert.alert('Success', 'Offer rejected');
              loadOffers();
            } else {
              Alert.alert('Error', response.error || 'Failed to reject offer');
            }
          } catch (err) {
            console.error('Error rejecting offer:', err);
            Alert.alert('Error', err.response?.data?.error || 'Failed to reject offer');
          } finally {
            setProcessingOfferId(null);
          }
        },
      },
    ]);
  };

  const getOfferStatusColor = (status) => {
    switch (status) {
      case 'accepted':
        return colors.success.main;
      case 'rejected':
        return colors.error.main;
      default:
        return colors.pending.main;
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Job Offers</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary.main} />
            </View>
          ) : offers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="inbox" size={64} color={colors.text.muted} />
              <Text style={styles.emptyText}>No offers yet</Text>
            </View>
          ) : (
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {offers.map((offer) => {
                const freelancer = offer.freelancer || {};
                const isProcessing = processingOfferId === offer._id?.toString();
                const canAccept = offer.status === 'pending';

                return (
                  <View key={offer._id?.toString() || Math.random()} style={styles.offerCard}>
                    <View style={styles.offerHeader}>
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
                            {freelancer.fullName || 'Unknown'}
                          </Text>
                          <Text style={styles.freelancerPhone}>
                            {freelancer.phone || 'N/A'}
                          </Text>
                        </View>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: getOfferStatusColor(offer.status) + '20' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            { color: getOfferStatusColor(offer.status) },
                          ]}
                        >
                          {offer.status?.toUpperCase() || 'PENDING'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.offerAmount}>
                      <Text style={styles.amountLabel}>Offer Amount</Text>
                      <Text style={styles.amountValue}>₹{offer.amount || 0}</Text>
                    </View>

                    {offer.message ? (
                      <View style={styles.messageContainer}>
                        <Text style={styles.messageLabel}>Message:</Text>
                        <Text style={styles.messageText}>{offer.message}</Text>
                      </View>
                    ) : null}

                    {canAccept && (
                      <View style={styles.actions}>
                        <Button
                          variant="outline"
                          onPress={() => handleRejectOffer(offer._id?.toString())}
                          disabled={isProcessing}
                          style={[styles.actionButton, styles.rejectButton]}
                          textStyle={styles.rejectButtonText}
                        >
                          Reject Offer
                        </Button>
                        <Button
                          onPress={() => handleAcceptOffer(offer._id?.toString())}
                          loading={isProcessing}
                          disabled={isProcessing}
                          style={[styles.actionButton, styles.acceptButton]}
                        >
                          Accept Offer
                        </Button>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          )}

          <View style={styles.footer}>
            <Button variant="outline" onPress={onClose}>
              Close
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
  loadingContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.text.muted,
    marginTop: spacing.md,
  },
  content: {
    padding: spacing.lg,
    maxHeight: 500,
  },
  offerCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
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
  freelancerPhone: {
    ...typography.small,
    color: colors.text.secondary,
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
  offerAmount: {
    marginBottom: spacing.sm,
  },
  amountLabel: {
    ...typography.small,
    color: colors.text.secondary,
  },
  amountValue: {
    ...typography.h3,
    color: colors.primary.main,
    fontWeight: '700',
  },
  messageContainer: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.primary.light,
    borderRadius: spacing.xs,
  },
  messageLabel: {
    ...typography.small,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  messageText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  rejectButton: {
    borderColor: colors.error.main,
  },
  rejectButtonText: {
    color: colors.error.main,
  },
  acceptButton: {
    backgroundColor: colors.success.main,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});

export default OffersModal;

