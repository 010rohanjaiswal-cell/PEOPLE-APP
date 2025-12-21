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
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { colors, spacing, typography } from '../../theme';
import { walletAPI, paymentAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import PaymentWebView from '../../components/PaymentWebView';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const Wallet = () => {
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [ledgerExpandedIds, setLedgerExpandedIds] = useState({});
  const [paying, setPaying] = useState(false);
  const [showPaymentWebView, setShowPaymentWebView] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState(null);
  const [currentOrderId, setCurrentOrderId] = useState(null);

  const loadWallet = async () => {
    try {
      if (!refreshing) setLoading(true);
      setError('');
      const response = await walletAPI.getWallet();
      if (response.success) {
        setWallet(response.wallet);
      } else {
        setError(response.error || 'Failed to load wallet');
      }
    } catch (err) {
      console.error('Error loading wallet:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load wallet');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadWallet();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadWallet();
  };

  const toggleHistory = () => {
    LayoutAnimation.easeInEaseOut();
    setHistoryExpanded((prev) => !prev);
  };

  const toggleLedgerItem = (id) => {
    LayoutAnimation.easeInEaseOut();
    setLedgerExpandedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handlePayDues = async () => {
    if (!wallet || !wallet.totalDues || wallet.totalDues <= 0) return;

    Alert.alert(
      'Pay Dues',
      `Pay ₹${wallet.totalDues} as commission dues?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay',
          onPress: async () => {
            try {
              setPaying(true);

              // Step 1: Create Cashfree payment order
              const orderResponse = await paymentAPI.createDuesOrder();
              
              if (!orderResponse.success) {
                Alert.alert('Error', orderResponse.error || 'Failed to create payment order');
                setPaying(false);
                return;
              }

              const { merchantOrderId, paymentSessionId, paymentUrl: orderPaymentUrl } = orderResponse;

              console.log('📦 Cashfree order created:', {
                merchantOrderId,
                hasPaymentSessionId: !!paymentSessionId,
                hasPaymentUrl: !!orderPaymentUrl,
              });

              // Step 2: Set up deep link listener for payment callback
              const subscription = Linking.addEventListener('url', async (event) => {
                try {
                  const url = event.url;
                  console.log('🔗 Deep link received:', url);
                  
                  // Parse URL: people-app://payment/callback?orderId=...
                  if (url.includes('people-app://payment/callback')) {
                    const urlObj = new URL(url.replace('people-app://', 'https://'));
                    const callbackOrderId = urlObj.searchParams.get('orderId');
                    
                    if (callbackOrderId === merchantOrderId) {
                      subscription.remove();
                      setShowPaymentWebView(false);
                      setPaying(false);
                      console.log('✅ Payment callback received, checking status...');
                      await checkPaymentStatus(merchantOrderId);
                    }
                  }
                } catch (linkError) {
                  console.error('❌ Error handling deep link:', linkError);
                }
              });
              
              // Step 3: Open Cashfree payment page in WebView (in-app)
              try {
                console.log('🚀 Opening Cashfree payment page in-app...');
                
                // Use paymentUrl if available, otherwise construct from paymentSessionId
                const checkoutUrl = orderPaymentUrl || `https://www.cashfree.com/checkout/paylink/${paymentSessionId}`;
                
                setCurrentOrderId(merchantOrderId);
                setPaymentUrl(checkoutUrl);
                setShowPaymentWebView(true);
                setPaying(false); // WebView handles its own loading state
              } catch (paymentError) {
                console.error('❌ Payment error:', paymentError);
                subscription.remove();
                setPaying(false);
                Alert.alert(
                  'Payment Error',
                  paymentError.message || 'Failed to open payment page. Please try again.',
                  [{ text: 'OK' }]
                );
              }
            } catch (err) {
              console.error('Error paying dues:', err);
              Alert.alert(
                'Error',
                err.response?.data?.error || err.message || 'Failed to process payment'
              );
              setPaying(false);
            }
          },
        },
      ]
    );
  };

  const checkPaymentStatus = async (merchantOrderId, retries = 0) => {
    try {
      const maxRetries = 10; // Poll for up to 10 times (50 seconds total)
      const pollInterval = 5000; // 5 seconds

      const pollStatus = async () => {
        let statusResponse;
        try {
          statusResponse = await paymentAPI.checkOrderStatus(merchantOrderId);
        } catch (error) {
          // Handle API errors gracefully
          const errorData = error.response?.data || {};
          const errorCode = errorData.code;
          
          // ORDER_NOT_FOUND is expected for web payments (order created on payment page visit)
          if (errorCode === 'ORDER_NOT_FOUND') {
            statusResponse = {
              success: false,
              code: 'ORDER_NOT_FOUND',
              isPending: true, // Treat as pending, not error
            };
          } else {
            // Other errors - log and continue polling
            console.warn('⚠️ Order status check error:', errorCode || error.message);
            if (retries < maxRetries) {
              setTimeout(() => {
                checkPaymentStatus(merchantOrderId, retries + 1);
              }, pollInterval);
              return false;
            } else {
              Alert.alert('Error', 'Failed to check payment status. Please refresh your wallet.');
              setPaying(false);
              loadWallet();
              return true;
            }
          }
        }

        if (statusResponse.success) {
          if (statusResponse.isSuccess) {
            // Payment successful, process dues
            const processResponse = await paymentAPI.processDuesPayment(merchantOrderId);
            
            if (processResponse.success && processResponse.wallet) {
              setWallet(processResponse.wallet);
              Alert.alert('Success', 'Dues payment completed successfully!');
              setPaying(false);
              return true; // Stop polling
            } else {
              Alert.alert('Error', processResponse.error || 'Failed to process payment');
              setPaying(false);
              return true; // Stop polling
            }
          } else if (statusResponse.isFailed) {
            // Payment failed
            Alert.alert('Payment Failed', 'Payment was not successful. Please try again.');
            setPaying(false);
            return true; // Stop polling
          } else if (statusResponse.isPending && retries < maxRetries) {
            // Still pending, continue polling
            setTimeout(() => {
              checkPaymentStatus(merchantOrderId, retries + 1);
            }, pollInterval);
            return false; // Continue polling
          } else if (retries >= maxRetries) {
            // Max retries reached
            Alert.alert(
              'Payment Status',
              'Payment status is still pending. Please check your wallet or contact support if payment was successful.'
            );
            setPaying(false);
            // Refresh wallet to check if webhook processed it
            loadWallet();
            return true; // Stop polling
          }
        } else {
          // Error checking status or ORDER_NOT_FOUND
          // If ORDER_NOT_FOUND, this is expected for web payments (order created on payment page visit)
          if (statusResponse.code === 'ORDER_NOT_FOUND' || statusResponse.isPending) {
            // Order not found yet - wait longer before retrying (user might not have visited payment page)
            if (retries < maxRetries) {
              // Don't log as error - this is expected for web payments
              setTimeout(() => {
                checkPaymentStatus(merchantOrderId, retries + 1);
              }, pollInterval * 2); // Wait 10 seconds instead of 5 for ORDER_NOT_FOUND
              return false; // Continue polling
            } else {
              // Max retries reached - order still not found
              // User might not have completed payment yet, silently refresh wallet
              loadWallet();
              setPaying(false);
              return true; // Stop polling
            }
          } else if (retries < maxRetries) {
            // Other errors - continue polling with normal interval
            setTimeout(() => {
              checkPaymentStatus(merchantOrderId, retries + 1);
            }, pollInterval);
            return false; // Continue polling
          } else {
            // Max retries reached for other errors
            Alert.alert('Error', 'Failed to check payment status. Please refresh your wallet.');
            setPaying(false);
            loadWallet();
            return true; // Stop polling
          }
        }
      };

      await pollStatus();
    } catch (err) {
      console.error('Error checking payment status:', err);
      if (retries < 10) {
        // Retry after delay
        setTimeout(() => {
          checkPaymentStatus(merchantOrderId, retries + 1);
        }, 5000);
      } else {
        Alert.alert(
          'Error',
          'Failed to verify payment status. Please refresh your wallet to check if payment was processed.'
        );
        setPaying(false);
        loadWallet();
      }
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
              <Text style={[styles.cardTitle, { color: colors.error.dark }]}>Total Dues</Text>
            </View>
            <TouchableOpacity onPress={handleRefresh} style={styles.iconButton}>
              <MaterialIcons name="refresh" size={20} color={colors.error.dark} />
            </TouchableOpacity>
          </View>

          <View style={styles.amountRow}>
            <Text style={styles.duesAmount}>₹{totalDues}</Text>
            <Text style={styles.duesLabel}>Commission dues to be paid</Text>
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
                <Text style={styles.payDuesButtonText}>Pay Dues</Text>
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
            <Text style={[styles.cardTitle, { color: colors.success.dark }]}>Total Dues</Text>
          </View>
          <TouchableOpacity onPress={handleRefresh} style={styles.iconButton}>
            <MaterialIcons name="refresh" size={20} color={colors.success.dark} />
          </TouchableOpacity>
        </View>

        <View style={styles.amountRow}>
          <Text style={styles.noDuesAmount}>₹0.00</Text>
          <Text style={styles.noDuesLabel}>No dues is pending</Text>
        </View>
      </View>
    );
  };

  const renderTransactionHistory = () => {
    const transactions = wallet?.transactions || [];
    const count = transactions.length;

    return (
      <View style={styles.card}>
        <TouchableOpacity onPress={toggleHistory} style={styles.historyHeader}>
          <View style={styles.cardHeaderLeft}>
            <MaterialIcons name="history" size={22} color={colors.text.primary} />
            <Text style={styles.cardTitle}>
              Transaction History {count > 0 ? `(${count})` : ''}
            </Text>
          </View>
          <MaterialIcons
            name={historyExpanded ? 'expand-less' : 'expand-more'}
            size={24}
            color={colors.text.secondary}
          />
        </TouchableOpacity>

        {historyExpanded && (
          <View style={styles.historyList}>
            {count === 0 ? (
              <View style={styles.emptyInner}>
                <MaterialIcons name="receipt-long" size={40} color={colors.text.muted} />
                <Text style={styles.emptyInnerText}>No transactions yet</Text>
              </View>
            ) : (
              transactions.map((tx) => {
                const isPaid = tx.duesPaid;
                return (
                  <View
                    key={tx.id}
                    style={[
                      styles.historyItem,
                      isPaid ? styles.historyItemPaid : styles.historyItemPending,
                    ]}
                  >
                    <View style={styles.historyTopRow}>
                      <Text style={styles.historyJobTitle} numberOfLines={1}>
                        {tx.jobTitle}
                      </Text>
                      <View
                        style={[
                          styles.historyStatusBadge,
                          isPaid ? styles.statusPaidBadge : styles.statusPendingBadge,
                        ]}
                      >
                        <Text
                          style={[
                            styles.historyStatusText,
                            isPaid ? styles.statusPaidText : styles.statusPendingText,
                          ]}
                        >
                          {isPaid ? '✓ Paid' : 'Pending'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.historyDate}>
                      {new Date(tx.createdAt).toLocaleString()}
                    </Text>
                    {tx.duesPaymentOrderId ? (
                      <View style={styles.orderIdChip}>
                        <Text style={styles.orderIdLabel}>Order ID</Text>
                        <Text style={styles.orderIdValue}>{tx.duesPaymentOrderId}</Text>
                      </View>
                    ) : null}
                    <View style={styles.historyAmountsRow}>
                      <Text style={styles.historyAmountReceived}>
                        ₹{tx.amountReceived} received
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
      </View>
    );
  };

  const renderCommissionLedger = () => {
    const transactions = wallet?.transactions || [];

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <MaterialIcons name="request-quote" size={22} color={colors.text.primary} />
            <Text style={styles.cardTitle}>Commission Ledger</Text>
          </View>
        </View>

        {transactions.length === 0 ? (
          <View style={styles.emptyInner}>
            <MaterialIcons name="receipt" size={40} color={colors.text.muted} />
            <Text style={styles.emptyInnerText}>No commission records yet</Text>
            <Text style={styles.emptyInnerSubText}>
              Commission will appear here after jobs are completed
            </Text>
          </View>
        ) : (
          transactions.map((tx) => {
            const expanded = !!ledgerExpandedIds[tx.id];
            const isPaid = tx.duesPaid;
            const duesAmount = tx.platformCommission || 0;
            return (
              <TouchableOpacity
                key={tx.id}
                style={[
                  styles.ledgerItem,
                  isPaid ? styles.ledgerItemPaid : styles.ledgerItemUnpaid,
                ]}
                onPress={() => toggleLedgerItem(tx.id)}
                activeOpacity={0.8}
              >
                <View style={styles.ledgerTopRow}>
                  <View style={styles.ledgerTitleContainer}>
                    <Text style={styles.ledgerJobTitle} numberOfLines={1}>
                      {tx.jobTitle}
                    </Text>
                    <Text style={styles.ledgerDate}>
                      {new Date(tx.createdAt).toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.ledgerRightTop}>
                    <Text style={styles.ledgerAmountReceived}>₹{tx.amountReceived}</Text>
                    <Text style={styles.ledgerDuesAmount}>
                      {isPaid ? 'Dues Paid' : `Dues: ₹${duesAmount}`}
                    </Text>
                    <View
                      style={[
                        styles.ledgerStatusBadge,
                        isPaid ? styles.statusPaidBadge : styles.statusPendingBadge,
                      ]}
                    >
                      <Text
                        style={[
                          styles.ledgerStatusText,
                          isPaid ? styles.statusPaidText : styles.statusPendingText,
                        ]}
                      >
                        {isPaid ? '✓ Paid' : 'Pending'}
                      </Text>
                    </View>
                  </View>
                  <MaterialIcons
                    name={expanded ? 'expand-less' : 'expand-more'}
                    size={24}
                    color={colors.text.secondary}
                  />
                </View>
                {expanded && (
                  <View style={styles.ledgerExpanded}>
                    {tx.clientName ? (
                      <Text style={styles.ledgerDetailText}>Client: {tx.clientName}</Text>
                    ) : null}
                    <Text style={styles.ledgerDetailText}>Job Amount: ₹{tx.jobAmount}</Text>
                    <Text style={styles.ledgerDetailText}>
                      Platform Commission (10%): -₹{tx.platformCommission}
                    </Text>
                    <Text style={styles.ledgerDetailText}>
                      Amount Received: ₹{tx.amountReceived}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
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

  const handlePaymentWebViewClose = useCallback(() => {
    setShowPaymentWebView(false);
    setPaymentUrl(null);
    // Check payment status when WebView is closed
    if (currentOrderId) {
      checkPaymentStatus(currentOrderId);
    }
  }, [currentOrderId]);

  const handlePaymentComplete = useCallback(async (orderId) => {
    setShowPaymentWebView(false);
    setPaymentUrl(null);
    setCurrentOrderId(null);
    setPaying(false);
    await checkPaymentStatus(orderId);
  }, []);

  return (
    <>
      <ScrollView
        style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {renderTotalDuesCard()}
      {renderTransactionHistory()}
      {renderCommissionLedger()}
    </ScrollView>

    {/* Payment WebView Modal */}
    <PaymentWebView
      visible={showPaymentWebView}
      paymentUrl={paymentUrl}
      onClose={handlePaymentWebViewClose}
      onPaymentComplete={handlePaymentComplete}
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
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyList: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  historyItem: {
    borderRadius: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
  },
  historyItemPaid: {
    backgroundColor: colors.success.light,
    borderColor: colors.success.main,
  },
  historyItemPending: {
    backgroundColor: colors.error.light,
    borderColor: colors.error.main,
  },
  historyTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyJobTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
    marginRight: spacing.sm,
  },
  historyStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.xs,
  },
  statusPaidBadge: {
    backgroundColor: colors.success.light,
  },
  statusPendingBadge: {
    backgroundColor: colors.error.light,
  },
  historyStatusText: {
    ...typography.small,
    fontWeight: '600',
  },
  statusPaidText: {
    color: colors.success.dark,
  },
  statusPendingText: {
    color: colors.error.dark,
  },
  historyDate: {
    ...typography.small,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  orderIdChip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.sm,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderIdLabel: {
    ...typography.small,
    color: colors.text.secondary,
    marginRight: spacing.xs,
  },
  orderIdValue: {
    ...typography.small,
    color: colors.text.primary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  historyAmountsRow: {
    marginTop: spacing.sm,
  },
  historyAmountReceived: {
    ...typography.body,
    fontWeight: '600',
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
    backgroundColor: colors.success.light,
    borderColor: colors.success.main,
  },
  ledgerItemUnpaid: {
    backgroundColor: colors.error.light,
    borderColor: colors.error.main,
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
  ledgerAmountReceived: {
    ...typography.body,
    fontWeight: '700',
    color: colors.success.dark,
  },
  ledgerDuesAmount: {
    ...typography.small,
    color: colors.error.dark,
    marginTop: spacing.xs,
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
  ledgerExpanded: {
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  ledgerDetailText: {
    ...typography.small,
    color: colors.text.secondary,
  },
});

export default Wallet;

