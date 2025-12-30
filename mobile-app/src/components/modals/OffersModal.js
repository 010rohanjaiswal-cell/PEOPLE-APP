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
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import { Button } from '../common';
import { clientJobsAPI } from '../../api/clientJobs';

const OffersModal = ({ visible, job, onClose, onOfferAccepted }) => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [processingOfferId, setProcessingOfferId] = useState(null);
  const [acceptConfirmVisible, setAcceptConfirmVisible] = useState(false);
  const [rejectConfirmVisible, setRejectConfirmVisible] = useState(false);
  const [acceptSuccessVisible, setAcceptSuccessVisible] = useState(false);
  const [rejectSuccessVisible, setRejectSuccessVisible] = useState(false);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedOfferId, setSelectedOfferId] = useState(null);

  useEffect(() => {
    if (visible && job) {
      loadOffers();
    } else if (!visible) {
      // Reset state when modal closes
      setOffers([]);
      setLoading(false);
      setErrorMessage('');
    }
  }, [visible, job]);

  const loadOffers = async () => {
    const jobId = job?._id || job?.id;
    if (!jobId) {
      console.error('No job ID found:', job);
      setErrorMessage('Job ID not found');
      setErrorModalVisible(true);
      setLoading(false);
      return;
    }

    try {
      if (!refreshing) setLoading(true);
      setOffers([]); // Clear previous offers
      const response = await clientJobsAPI.getOffers(jobId);
      console.log('Offers response:', response);
      
      if (response && response.success) {
        // Filter out rejected offers and sort by amount (higher offers first)
        const filteredOffers = (response.offers || []).filter(offer => offer.status !== 'rejected');
        const sortedOffers = filteredOffers.sort((a, b) => {
          const amountA = Number(a.amount) || 0;
          const amountB = Number(b.amount) || 0;
          return amountB - amountA; // Descending order (higher first)
        });
        setOffers(sortedOffers);
        console.log('Loaded offers:', sortedOffers.length);
      } else {
        setOffers([]);
        console.log('No offers in response or response not successful');
      }
    } catch (err) {
      console.error('Error loading offers:', err);
      setErrorMessage(err.response?.data?.error || err.message || 'Failed to load offers');
      setErrorModalVisible(true);
      setOffers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOffers();
  };

  const handleAcceptOffer = (offerId) => {
    setSelectedOfferId(offerId);
    setAcceptConfirmVisible(true);
  };

  const confirmAcceptOffer = async () => {
    const jobId = job?._id || job?.id;
    if (!jobId || !selectedOfferId) return;
    
    setAcceptConfirmVisible(false);
    try {
      setProcessingOfferId(selectedOfferId);
      const response = await clientJobsAPI.acceptOffer(jobId, selectedOfferId);
      if (response.success) {
        setProcessingOfferId(null);
        setAcceptSuccessVisible(true);
      } else {
        setProcessingOfferId(null);
        setErrorMessage(response.error || 'Failed to accept offer');
        setErrorModalVisible(true);
      }
    } catch (err) {
      console.error('Error accepting offer:', err);
      setProcessingOfferId(null);
      setErrorMessage(err.response?.data?.error || 'Failed to accept offer');
      setErrorModalVisible(true);
    }
  };

  const handleAcceptSuccessClose = () => {
    setAcceptSuccessVisible(false);
    if (onOfferAccepted) onOfferAccepted();
    onClose();
  };

  const handleRejectOffer = (offerId) => {
    setSelectedOfferId(offerId);
    setRejectConfirmVisible(true);
  };

  const confirmRejectOffer = async () => {
    const jobId = job?._id || job?.id;
    if (!jobId || !selectedOfferId) return;
    
    setRejectConfirmVisible(false);
    try {
      setProcessingOfferId(selectedOfferId);
      const response = await clientJobsAPI.rejectOffer(jobId, selectedOfferId);
      if (response.success) {
        setProcessingOfferId(null);
        // Remove rejected offer from the list automatically
        setOffers(prevOffers => {
          const filtered = prevOffers.filter(offer => {
            const offerId = (offer._id?.toString() || offer.id?.toString() || '').trim();
            const selectedId = (selectedOfferId?.toString() || '').trim();
            // Remove the offer that was just rejected
            if (offerId === selectedId) {
              return false;
            }
            // Also filter out any offers with rejected status
            return offer.status !== 'rejected';
          });
          console.log('After rejection - Remaining offers:', filtered.length);
          return filtered;
        });
        setRejectSuccessVisible(true);
      } else {
        setProcessingOfferId(null);
        setErrorMessage(response.error || 'Failed to reject offer');
        setErrorModalVisible(true);
      }
    } catch (err) {
      console.error('Error rejecting offer:', err);
      setProcessingOfferId(null);
      setErrorMessage(err.response?.data?.error || 'Failed to reject offer');
      setErrorModalVisible(true);
    }
  };

  const handleRejectSuccessClose = () => {
    setRejectSuccessVisible(false);
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
    <>
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Job Offers</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.contentWrapper}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary.main} />
                <Text style={styles.loadingText}>Loading offers...</Text>
              </View>
            ) : offers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="inbox" size={64} color={colors.text.muted} />
                <Text style={styles.emptyText}>No offers yet</Text>
                <Text style={styles.emptySubtext}>
                  Freelancers can make offers on this job
                </Text>
              </View>
            ) : (
              <ScrollView 
                style={styles.content} 
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={true}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={[colors.primary.main]}
                    tintColor={colors.primary.main}
                  />
                }
              >
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
                        <TouchableOpacity
                          onPress={() => handleRejectOffer(offer._id?.toString())}
                          disabled={isProcessing}
                          style={[styles.actionButtonTouchable, styles.rejectButtonTouchable]}
                        >
                          <Text style={styles.rejectButtonText}>Reject Offer</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleAcceptOffer(offer._id?.toString())}
                          disabled={isProcessing}
                          style={[styles.actionButtonTouchable, styles.acceptButtonTouchable]}
                        >
                          {isProcessing ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                          ) : (
                            <Text style={styles.acceptButtonText}>Accept Offer</Text>
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
              Close
            </Button>
          </View>
        </View>
      </View>
    </Modal>

    {/* Accept Offer Confirmation Modal */}
    <Modal
      visible={acceptConfirmVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setAcceptConfirmVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Accept Offer</Text>
          <Text style={styles.modalSubtitle}>
            Are you sure you want to accept this offer?
          </Text>
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalCancelButton]}
              onPress={() => setAcceptConfirmVisible(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalSubmitButton]}
              onPress={confirmAcceptOffer}
            >
              <Text style={styles.modalSubmitText}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

    {/* Accept Offer Success Modal */}
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
          <Text style={styles.modalTitle}>Offer Accepted</Text>
          <Text style={styles.modalSubtitle}>
            Offer accepted successfully!
          </Text>
          <View style={[styles.modalActions, styles.modalActionsCentered]}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalSubmitButton, styles.successModalButton]}
              onPress={handleAcceptSuccessClose}
            >
              <Text style={styles.modalSubmitText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

    {/* Reject Offer Confirmation Modal */}
    <Modal
      visible={rejectConfirmVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setRejectConfirmVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Reject Offer</Text>
          <Text style={styles.modalSubtitle}>
            Are you sure you want to reject this offer?
          </Text>
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalCancelButton]}
              onPress={() => setRejectConfirmVisible(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalSubmitButton, styles.rejectModalButton]}
              onPress={confirmRejectOffer}
            >
              <Text style={styles.modalSubmitText}>Reject</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

    {/* Reject Offer Success Modal */}
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
          <Text style={styles.modalTitle}>Offer Rejected</Text>
          <Text style={styles.modalSubtitle}>
            Offer rejected successfully
          </Text>
          <View style={[styles.modalActions, styles.modalActionsCentered]}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalSubmitButton, styles.successModalButton]}
              onPress={handleRejectSuccessClose}
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
            <MaterialIcons name="error" size={64} color={colors.error.main} />
          </View>
          <Text style={styles.modalTitle}>Error</Text>
          <Text style={styles.modalSubtitle}>
            {errorMessage}
          </Text>
          <View style={[styles.modalActions, styles.modalActionsCentered]}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalSubmitButton]}
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
  actionButtonTouchable: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  rejectButtonTouchable: {
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.error.main,
  },
  rejectButtonText: {
    ...typography.body,
    color: colors.error.main,
    fontWeight: '600',
  },
  acceptButtonTouchable: {
    backgroundColor: colors.success.main,
  },
  acceptButtonText: {
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

export default OffersModal;

