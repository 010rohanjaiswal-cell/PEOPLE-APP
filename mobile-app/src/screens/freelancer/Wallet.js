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
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { colors, spacing, typography } from '../../theme';
import { walletAPI, paymentAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { startPhonePeTransaction } from '../../config/phonepe';

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
  const [paying, setPaying] = useState(false);

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

              // Step 1: Create PhonePe SDK order (returns orderToken and orderId)
              const orderResponse = await paymentAPI.createDuesOrder();
              
              if (!orderResponse.success) {
                Alert.alert('Error', orderResponse.error || 'Failed to create payment order');
                setPaying(false);
                return;
              }

              const { merchantOrderId, orderToken, orderId, merchantId, checkSum } = orderResponse;

              if (!orderToken || !orderId || !merchantId || !checkSum) {
                Alert.alert('Error', 'Invalid payment order response. Missing orderToken, orderId, merchantId, or checkSum.');
                setPaying(false);
                return;
              }

              console.log('📦 PhonePe SDK order created:', {
                merchantOrderId,
                orderId,
                hasOrderToken: !!orderToken,
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
                      setPaying(false);
                      console.log('✅ Payment callback received, checking status...');
                      await checkPaymentStatus(merchantOrderId);
                    }
                  }
                } catch (linkError) {
                  console.error('❌ Error handling deep link:', linkError);
                }
              });
              
              // Step 3: Start PhonePe transaction using React Native SDK
              try {
                console.log('🚀 Starting PhonePe React Native SDK transaction...');
                
                // Get merchantId from order response (already extracted above)
                const appSchema = 'people-app'; // Deep link scheme (optional, not needed for Android)
                
                // Start transaction using PhonePe React Native SDK
                // Request body will be constructed inside startPhonePeTransaction
                const sdkResponse = await startPhonePeTransaction({
                  orderToken,
                  orderId,
                  merchantId,
                  checkSum, // Checksum generated by backend
                  appSchema,
                });
                
                console.log('✅ PhonePe SDK transaction response:', sdkResponse);
                console.log('Response type:', typeof sdkResponse);
                console.log('Response status:', sdkResponse?.status);
                
                // Check response status
                if (sdkResponse && sdkResponse.status === 'SUCCESS') {
                  // Payment successful - check status immediately (deep link may not always fire)
                  console.log('✅ Payment successful - checking status immediately...');
                  subscription.remove();
                  // Check payment status immediately and also set up a fallback timer
                  setTimeout(async () => {
                    await checkPaymentStatus(merchantOrderId);
                  }, 2000); // Wait 2 seconds for PhonePe to update status
                  // Also keep deep link listener as backup
                } else if (sdkResponse && sdkResponse.status === 'FAILURE') {
                  // Payment failed or cancelled
                  console.error('❌ Payment failed:', sdkResponse.error);

                  const errorStr = sdkResponse.error || '';
                  const isUserCancel =
                    typeof errorStr === 'string' &&
                    (errorStr.includes('USER_CANCEL') ||
                      errorStr.toLowerCase().includes('user_cancel') ||
                      errorStr.toLowerCase().includes('cancel'));

                  subscription.remove();
                  setPaying(false);

                  if (isUserCancel) {
                    // User explicitly cancelled in PhonePe UI – treat as a normal cancel, not an error
                    console.log('⚠️ Payment cancelled by user in PhonePe UI');
                    // Optional: show a light info message instead of an error
                    // Alert.alert('Payment Cancelled', 'You cancelled the payment.');
                  } else {
                    // Actual failure – try to fetch more details from backend / PhonePe
                    let detailedReason = '';
                    try {
                      const statusResp = await paymentAPI.checkOrderStatus(merchantOrderId);
                      if (statusResp?.success && statusResp.isFailed) {
                        const detailedErrorCode =
                          statusResp.detailedErrorCode || statusResp.errorCode;
                        console.log('🔍 PhonePe order status after FAILURE:', statusResp);

                        if (detailedErrorCode === 'ORDER_EXPIRED') {
                          detailedReason =
                            'Your payment order has expired. Please tap Pay Dues again and complete the payment within a few minutes.';
                        } else if (detailedErrorCode) {
                          detailedReason = `PhonePe error: ${detailedErrorCode}`;
                        }
                      }
                    } catch (statusErr) {
                      console.warn('⚠️ Failed to fetch PhonePe order status after FAILURE:', statusErr);
                    }

                    // Show best available error message
                    Alert.alert(
                      'Payment Failed',
                      detailedReason || sdkResponse.error || 'Payment transaction failed. Please try again.',
                      [{ text: 'OK' }]
                    );
                  }
                } else if (sdkResponse && sdkResponse.status === 'INTERRUPTED') {
                  // Payment interrupted by user
                  console.log('⚠️ Payment interrupted by user');
                  subscription.remove();
                  setPaying(false);
                  // Don't show error for user cancellation
                } else if (sdkResponse && sdkResponse.status === 'PENDING') {
                  // Payment flow initiated - SDK will handle the UI
                  console.log('⏳ Payment flow initiated - SDK handling payment UI');
                  // Don't set paying to false - SDK is handling the flow
                  // The deep link listener will catch the callback
                } else {
                  // SDK handles the payment flow internally
                  // The deep link listener will catch the callback
                  console.log('⏳ Payment flow in progress - waiting for SDK to complete');
                  // Don't set paying to false yet - wait for deep link or SDK response
                }
              } catch (paymentError) {
                console.error('❌ PhonePe SDK transaction error:', paymentError);
                console.error('Error details:', {
                  message: paymentError.message,
                  code: paymentError.code,
                  status: paymentError.status,
                  error: paymentError.error,
                  stack: paymentError.stack,
                });
                subscription.remove();
                setPaying(false);
                
                // Extract error message
                let errorMessage = 'Failed to start payment. Please try again.';
                if (paymentError.message) {
                  errorMessage = paymentError.message;
                } else if (paymentError.error) {
                  errorMessage = paymentError.error;
                } else if (typeof paymentError === 'string') {
                  errorMessage = paymentError;
                }
                
                Alert.alert(
                  'Payment Error',
                  errorMessage,
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
            console.log('✅ Payment status confirmed as successful, processing dues...');
            const processResponse = await paymentAPI.processDuesPayment(merchantOrderId);
            
            if (processResponse.success && processResponse.wallet) {
              console.log('✅ Dues processed successfully, wallet updated');
              setWallet(processResponse.wallet);
              setPaying(false);
              // Refresh wallet to ensure latest data
              loadWallet();
              Alert.alert('Success', 'Dues payment completed successfully!');
              return true; // Stop polling
            } else {
              console.error('❌ Failed to process dues:', processResponse.error);
              Alert.alert('Error', processResponse.error || 'Failed to process payment');
              setPaying(false);
              // Still refresh wallet in case webhook processed it
              loadWallet();
              return true; // Stop polling
            }
          } else if (statusResponse.isFailed) {
            // Payment failed
            const detailedErrorCode = statusResponse.detailedErrorCode || statusResponse.errorCode;

            if (detailedErrorCode === 'ORDER_EXPIRED') {
              // Special UX for expired orders
              Alert.alert(
                'Order Expired',
                'Your payment order has expired. Please tap Pay Dues again and complete the payment within a few minutes.'
              );
            } else {
              Alert.alert('Payment Failed', 'Payment was not successful. Please try again.');
            }

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
            const isPaid = tx.duesPaid;
            const duesAmount = tx.platformCommission || 0;
            return (
              <View
                key={tx.id}
                style={[
                  styles.ledgerItem,
                  isPaid ? styles.ledgerItemPaid : styles.ledgerItemUnpaid,
                ]}
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
                    <Text style={styles.ledgerDuesLabel}>Dues</Text>
                    <Text style={styles.ledgerDuesAmount}>
                      {isPaid ? 'Paid' : `₹${duesAmount}`}
                    </Text>
                    {isPaid && (
                      <View
                        style={[
                          styles.ledgerStatusBadge,
                          styles.statusPaidBadge,
                        ]}
                      >
                        <Text
                          style={[
                            styles.ledgerStatusText,
                            styles.statusPaidText,
                          ]}
                        >
                          ✓ Paid
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
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
});

export default Wallet;

