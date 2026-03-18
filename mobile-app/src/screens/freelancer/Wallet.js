/**
 * Wallet Tab - Freelancer Dashboard
 * Implements commission/dues wallet as per APP_COMPLETE_DOCUMENTATION.md
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  LayoutAnimation,
  UIManager,
  Platform,
  RefreshControl,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import { walletAPI, paymentAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import PaymentWebView from '../../components/PaymentWebView';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const Wallet = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(false);
  const [confirmPayModalVisible, setConfirmPayModalVisible] = useState(false);
  const [paymentSuccessModalVisible, setPaymentSuccessModalVisible] = useState(false);
  const [paymentErrorModalVisible, setPaymentErrorModalVisible] = useState(false);
  const [paymentErrorMessage, setPaymentErrorMessage] = useState('');
  const [paymentWebViewVisible, setPaymentWebViewVisible] = useState(false);
  const [cashfreeOrderId, setCashfreeOrderId] = useState(null);
  const [cashfreePaymentSessionId, setCashfreePaymentSessionId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const loadWallet = async () => {
    try {
      if (!refreshing) setLoading(true);
      setError('');
      const response = await walletAPI.getWallet();
      if (response.success) {
        setWallet(response.wallet);
      } else {
setError(response.error || t('wallet.failedLoadWallet'));
    }
    } catch (err) {
      console.error('Error loading wallet:', err);
      setError(err.response?.data?.error || err.message || t('wallet.failedLoadWallet'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadWallet();
  }, []);

  // Reset pagination to page 1 when payment transactions change
  useEffect(() => {
    const paymentTransactions = wallet?.paymentTransactions || [];
    const totalPages = Math.ceil(paymentTransactions.length / itemsPerPage);
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [wallet?.paymentTransactions?.length, currentPage, itemsPerPage]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadWallet();
  };

  const handlePayDues = async () => {
    if (!wallet || !wallet.totalDues || wallet.totalDues <= 0) return;
    setConfirmPayModalVisible(true);
  };

  const confirmPayDues = async () => {
    setConfirmPayModalVisible(false);
    if (!wallet || !wallet.totalDues || wallet.totalDues <= 0) return;

    try {
      setPaying(true);

      const orderResponse = await paymentAPI.createDuesOrder();

      if (!orderResponse.success || !orderResponse.orderId || !orderResponse.paymentSessionId) {
        setPaymentErrorMessage(orderResponse.error || t('wallet.failedCreateOrder'));
        setPaymentErrorModalVisible(true);
        setPaying(false);
        return;
      }

      setCashfreeOrderId(orderResponse.orderId);
      setCashfreePaymentSessionId(orderResponse.paymentSessionId);
      setPaymentWebViewVisible(true);
    } catch (err) {
      console.error('Error paying dues:', err);
      setPaymentErrorMessage(err.response?.data?.error || err.message || t('wallet.failedProcessPayment'));
      setPaymentErrorModalVisible(true);
      setPaying(false);
    } finally {
      setConfirmPayModalVisible(false);
    }
  };

  const confirmDuesAfterCallback = async (callbackOrderId) => {
    const maxRetries = 10;
    const pollInterval = 3000;

    try {
      for (let i = 0; i < maxRetries; i++) {
        const resp = await paymentAPI.confirmDuesPayment(callbackOrderId);
        if (resp?.success && resp?.paid) {
          if (resp.wallet) setWallet(resp.wallet);
          await loadWallet();
          setPaymentSuccessModalVisible(true);
          setPaymentWebViewVisible(false);
          setPaying(false);
          return;
        }
        await new Promise((r) => setTimeout(r, pollInterval));
      }

      setPaymentErrorMessage(t('wallet.paymentNotCompleted'));
      setPaymentErrorModalVisible(true);
    } catch (err) {
      console.error('Error confirming dues payment:', err);
      setPaymentErrorMessage(err.response?.data?.error || err.message || t('wallet.failedVerifyStatus'));
      setPaymentErrorModalVisible(true);
    } finally {
      setPaymentWebViewVisible(false);
      setPaying(false);
    }
  };

  const renderTotalDuesCard = () => {
    const totalDues = wallet?.totalDues || 0;
    const hasDues = totalDues > 0;

    if (hasDues) {
      // Dues > 0: red card
      return (
        <View
          style={[
            styles.card,
            styles.duesCard,
            {
              borderColor: colors.error.light,
              backgroundColor: colors.gradient.red.from,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <MaterialIcons name="receipt-long" size={24} color={colors.error.dark} />
              <Text style={[styles.cardTitle, { color: colors.error.dark }]}>{t('wallet.totalDues')}</Text>
            </View>
            <TouchableOpacity onPress={handleRefresh} style={styles.iconButton}>
              <MaterialIcons name="refresh" size={20} color={colors.error.dark} />
            </TouchableOpacity>
          </View>

          <View style={styles.amountRow}>
            <Text style={styles.duesAmount}>₹{totalDues}</Text>
            <Text style={styles.duesLabel}>{t('wallet.commissionDuesToBePaid')}</Text>
          </View>

          <TouchableOpacity
            style={styles.payDuesButton}
            onPress={handlePayDues}
            disabled={paying}
          >
            {paying ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <MaterialIcons name="credit-card" size={20} color="#FFFFFF" />
                <Text style={styles.payDuesButtonText}>{t('wallet.payDues')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      );
    }

    // Dues = 0: green card
    return (
      <View
        style={[
          styles.card,
          styles.duesCard,
          {
            borderColor: colors.success.light,
            backgroundColor: colors.gradient.green.from,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <MaterialIcons name="receipt-long" size={24} color={colors.success.dark} />
            <Text style={[styles.cardTitle, { color: colors.success.dark }]}>{t('wallet.totalDues')}</Text>
          </View>
          <TouchableOpacity onPress={handleRefresh} style={styles.iconButton}>
            <MaterialIcons name="refresh" size={20} color={colors.success.dark} />
          </TouchableOpacity>
        </View>

        <View style={styles.amountRow}>
          <Text style={styles.noDuesAmount}>₹0.00</Text>
          <Text style={styles.noDuesLabel}>{t('wallet.noDuesPending')}</Text>
        </View>
      </View>
    );
  };


  const renderCommissionLedger = () => {
    const paymentTransactions = wallet?.paymentTransactions || [];
    const totalPages = Math.ceil(paymentTransactions.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedPayments = paymentTransactions.slice(startIndex, endIndex);

    const formatDate = (date) => {
      if (!date) return 'N/A';
      const d = new Date(date);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <MaterialIcons name="payment" size={22} color={colors.text.primary} />
            <Text style={styles.cardTitle}>{t('wallet.paymentHistory')}</Text>
          </View>
        </View>

        {paymentTransactions.length === 0 ? (
          <View style={styles.emptyInner}>
            <MaterialIcons name="account-balance-wallet" size={40} color={colors.text.muted} />
            <Text style={styles.emptyInnerText}>{t('wallet.noPaymentRecords')}</Text>
            <Text style={styles.emptyInnerSubText}>
              {t('wallet.paymentHistoryEmptyDesc')}
            </Text>
          </View>
        ) : (
          <>
            {paginatedPayments.map((payment) => (
              <View
                key={payment.id}
                style={styles.ledgerItem}
              >
                <View style={styles.ledgerTopRow}>
                  <View style={styles.ledgerTitleContainer}>
                    <Text style={styles.ledgerJobTitle} numberOfLines={1}>
                      {t('wallet.duesPayment')}
                    </Text>
                    <Text style={styles.ledgerDate}>
                      {formatDate(payment.paymentDate)}
                    </Text>
                    {payment.transactionCount > 1 && (
                      <Text style={styles.ledgerSubText}>
                        {payment.transactionCount} {t('wallet.transactionsCleared')}
                      </Text>
                    )}
                  </View>
                  <View style={styles.ledgerRightTop}>
                    <Text style={styles.ledgerDuesLabel}>{t('wallet.amountPaid')}</Text>
                    <Text style={[styles.ledgerDuesAmount, styles.paymentAmount]}>
                      ₹{payment.amount}
                    </Text>
                    <View style={[styles.ledgerStatusBadge, styles.statusPaidBadge]}>
                      <Text style={[styles.ledgerStatusText, styles.statusPaidText]}>
                        {t('wallet.paid')}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <View style={styles.paginationContainer}>
                <View style={styles.paginationButtons}>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <TouchableOpacity
                      key={pageNum}
                      style={[
                        styles.paginationButton,
                        currentPage === pageNum && styles.paginationButtonActive,
                      ]}
                      onPress={() => setCurrentPage(pageNum)}
                    >
                      <Text
                        style={[
                          styles.paginationButtonText,
                          currentPage === pageNum && styles.paginationButtonTextActive,
                        ]}
                      >
                        {pageNum}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </>
        )}
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
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary.main]}
            tintColor={colors.primary.main}
          />
        }
      >
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {renderTotalDuesCard()}
      {renderCommissionLedger()}
    </ScrollView>

      {/* Pay Dues Confirmation Modal */}
      <Modal
        visible={confirmPayModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmPayModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <MaterialIcons name="account-balance-wallet" size={64} color={colors.primary.main} />
            </View>
            <Text style={styles.modalTitle}>{t('wallet.payDuesConfirmTitle')}</Text>
            <Text style={styles.modalSubtitle}>
              {t('wallet.payDuesConfirmMessage').replace('{amount}', wallet?.totalDues ?? 0)}
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setConfirmPayModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSubmitButton]}
                onPress={confirmPayDues}
                disabled={paying}
              >
                {paying ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalSubmitText}>{t('jobs.pay')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Payment Success Modal */}
      <Modal
        visible={paymentSuccessModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPaymentSuccessModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIconContainer}>
              <MaterialIcons name="check-circle" size={64} color={colors.success.main} />
            </View>
            <Text style={styles.modalTitle}>{t('wallet.duesPaymentCompleted')}</Text>
            <Text style={styles.modalSubtitle}>
              {t('wallet.duesPaymentSuccessMessage')}
            </Text>
            <View style={[styles.modalActions, styles.modalActionsCentered]}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSubmitButton, styles.successModalButton]}
                onPress={() => setPaymentSuccessModalVisible(false)}
              >
                <Text style={styles.modalSubmitText}>{t('common.ok')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Payment Error Modal */}
      <Modal
        visible={paymentErrorModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPaymentErrorModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.errorIconContainer}>
              <MaterialIcons name="error-outline" size={64} color={colors.error.main} />
            </View>
            <Text style={styles.modalTitle}>{t('wallet.paymentNotCompletedTitle')}</Text>
            <Text style={styles.modalSubtitle}>{paymentErrorMessage}</Text>
            <View style={[styles.modalActions, styles.modalActionsCentered]}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSubmitButton, styles.errorModalButton]}
                onPress={() => setPaymentErrorModalVisible(false)}
              >
                <Text style={styles.modalSubmitText}>{t('common.ok')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cashfree Payment WebView */}
      <PaymentWebView
        visible={paymentWebViewVisible}
        paymentSessionId={cashfreePaymentSessionId}
        cashfreeMode={'sandbox'}
        orderId={cashfreeOrderId}
        onClose={() => {
          setPaymentWebViewVisible(false);
          setPaying(false);
        }}
        onPaymentComplete={(orderId) => {
          confirmDuesAfterCallback(orderId);
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    backgroundColor: colors.error.light,
    borderRadius: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.error.main,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.small,
    color: colors.error.main,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  duesCard: {
    padding: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.h3,
    color: colors.text.primary,
  },
  iconButton: {
    padding: spacing.xs,
  },
  amountRow: {
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  duesAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.error.dark,
  },
  duesLabel: {
    ...typography.body,
    color: colors.error.main,
    marginTop: spacing.xs,
  },
  payDuesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.error.main,
    borderRadius: spacing.sm,
    paddingVertical: spacing.md,
  },
  payDuesButtonText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  noDuesAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.success.dark,
  },
  noDuesLabel: {
    ...typography.body,
    color: colors.success.main,
    marginTop: spacing.xs,
  },
  statusPaidBadge: {
    backgroundColor: colors.success.light,
  },
  statusPaidText: {
    color: colors.success.dark,
  },
  emptyInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  emptyInnerText: {
    ...typography.body,
    color: colors.text.muted,
  },
  emptyInnerSubText: {
    ...typography.small,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  ledgerItem: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: spacing.sm,
    borderWidth: 1,
  },
  ledgerItemPaid: {
    backgroundColor: colors.cardBackground,
    borderColor: colors.border,
  },
  ledgerItemUnpaid: {
    backgroundColor: colors.cardBackground,
    borderColor: colors.border,
  },
  ledgerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  ledgerTitleContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  ledgerJobTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text.primary,
  },
  ledgerDate: {
    ...typography.small,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  ledgerRightTop: {
    alignItems: 'flex-end',
    marginRight: spacing.sm,
  },
  ledgerDuesLabel: {
    ...typography.small,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  ledgerDuesAmount: {
    ...typography.body,
    fontWeight: '700',
    color: '#000000',
  },
  ledgerStatusBadge: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.xs,
  },
  ledgerStatusText: {
    ...typography.small,
    fontWeight: '600',
  },
  ledgerSubText: {
    ...typography.small,
    color: colors.text.muted,
    marginTop: spacing.xs / 2,
    fontSize: 11,
  },
  paymentAmount: {
    color: colors.success.main,
    fontSize: 16,
  },
  paginationContainer: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  paginationButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  paginationButton: {
    minWidth: 36,
    height: 36,
    borderRadius: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  paginationButtonActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  paginationButtonText: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '500',
    fontSize: 14,
  },
  paginationButtonTextActive: {
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
    width: '90%',
    backgroundColor: colors.cardBackground,
    borderRadius: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalIconContainer: {
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  successIconContainer: {
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelButton: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
  },
  modalSubmitButton: {
    backgroundColor: colors.primary.main,
  },
  successModalButton: {
    alignSelf: 'center',
    minWidth: 120,
  },
  errorIconContainer: {
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  errorModalButton: {
    alignSelf: 'center',
    minWidth: 120,
    backgroundColor: colors.error.main,
  },
  modalCancelText: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  modalSubmitText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default Wallet;

