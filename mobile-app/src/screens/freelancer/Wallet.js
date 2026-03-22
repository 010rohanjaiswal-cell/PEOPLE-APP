/**
 * Wallet Tab - Freelancer Dashboard
 * Implements commission/dues wallet as per APP_COMPLETE_DOCUMENTATION.md
 */

import React, { useEffect, useState, useRef, useMemo } from 'react';
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
  KeyboardAvoidingView,
  useWindowDimensions,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import { walletAPI, paymentAPI, cashfreeWalletAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import PaymentWebView from '../../components/PaymentWebView';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const RECENT_ACTIVITY_PER_PAGE = 7;

const Wallet = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { height: windowHeight } = useWindowDimensions();
  const [wallet, setWallet] = useState(null); // legacy dues wallet summary
  const [realWallet, setRealWallet] = useState(null); // real earnings wallet
  const [realLedger, setRealLedger] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
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

  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  /** amount → loading (API) → submitted (confirmation) */
  const [withdrawPhase, setWithdrawPhase] = useState('amount');
  const [withdrawAmount, setWithdrawAmount] = useState('');

  const [bankAccount, setBankAccount] = useState(null);
  const [bankModalVisible, setBankModalVisible] = useState(false);
  const [addingBank, setAddingBank] = useState(false);
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  /** null = not verified yet; true/false from API (no score shown in UI). */
  const [bankNameMatchOk, setBankNameMatchOk] = useState(null);
  const [bankVerifyLoading, setBankVerifyLoading] = useState(false);
  const [bankVerifyError, setBankVerifyError] = useState('');
  const bankVerifySeq = useRef(0);

  const [recentActivityPage, setRecentActivityPage] = useState(1);

  const loadWallet = async () => {
    try {
      if (!refreshing) setLoading(true);
      setError('');
      const [duesResp, realResp, ledgerResp, wdResp] = await Promise.all([
        walletAPI.getWallet(),
        cashfreeWalletAPI.getWallet(),
        cashfreeWalletAPI.getLedger(50),
        cashfreeWalletAPI.getWithdrawals(25).catch(() => ({ success: true, withdrawals: [] })),
      ]);

      if (duesResp?.success) setWallet(duesResp.wallet);
      if (realResp?.success) {
        setRealWallet(realResp.wallet);
        const bankData = realResp.bankAccount || { added: false };
        setBankAccount(bankData);
      }
      if (ledgerResp?.success && Array.isArray(ledgerResp.ledger)) setRealLedger(ledgerResp.ledger);
      if (wdResp?.success && Array.isArray(wdResp.withdrawals)) setWithdrawals(wdResp.withdrawals);

      if (!duesResp?.success && !realResp?.success) {
        setError((duesResp?.error || realResp?.error) ?? t('wallet.failedLoadWallet'));
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

  // Debounced SecureID verify when modal open + account + IFSC look complete
  useEffect(() => {
    if (!bankModalVisible) return undefined;

    const acct = bankAccountNumber.trim().replace(/\s/g, '');
    const ifsc = bankIfsc.trim().toUpperCase();

    if (ifsc.length !== 11 || acct.length < 6) {
      setBankNameMatchOk(null);
      setBankVerifyError('');
      return undefined;
    }

    const delay = setTimeout(() => {
      const seq = ++bankVerifySeq.current;
      (async () => {
        setBankVerifyLoading(true);
        setBankVerifyError('');
        try {
          const r = await cashfreeWalletAPI.verifyBankAccount({ bankAccount: acct, ifsc });
          if (seq !== bankVerifySeq.current) return;
          if (r?.success) {
            setBankNameMatchOk(Boolean(r.nameMatchOk));
          }
        } catch (e) {
          if (seq !== bankVerifySeq.current) return;
          setBankNameMatchOk(null);
          const msg = e?.response?.data?.error || e?.message || 'Verification failed';
          setBankVerifyError(typeof msg === 'string' ? msg : 'Verification failed');
        } finally {
          if (seq === bankVerifySeq.current) setBankVerifyLoading(false);
        }
      })();
    }, 550);

    return () => clearTimeout(delay);
  }, [bankModalVisible, bankAccountNumber, bankIfsc]);

  /** Earnings credited (ledger) + withdrawals still processing — sorted by date */
  const recentActivityItems = useMemo(() => {
    const items = [];
    realLedger.forEach((row) => {
      if (row.type === 'CREDIT_JOB_PAYMENT') {
        items.push({
          key: `ledger-${row._id}`,
          kind: 'earning',
          title: t('wallet.earningsCredited'),
          amount: Number(row.amount),
          date: row.createdAt,
        });
      }
    });
    withdrawals.forEach((w) => {
      const st = String(w.status || '').toUpperCase();
      if (st === 'REQUESTED' || st === 'PROCESSING') {
        items.push({
          key: `wd-${w.id}`,
          kind: 'withdrawal',
          title: t('wallet.withdrawalProcessing'),
          amount: Number(w.amount),
          date: w.createdAt,
        });
      }
    });
    items.sort((a, b) => new Date(b.date) - new Date(a.date));
    return items;
  }, [realLedger, withdrawals, t]);

  const recentActivityTotalPages = Math.max(
    1,
    Math.ceil(recentActivityItems.length / RECENT_ACTIVITY_PER_PAGE)
  );

  useEffect(() => {
    const tp = Math.max(1, Math.ceil(recentActivityItems.length / RECENT_ACTIVITY_PER_PAGE));
    setRecentActivityPage((p) => Math.min(p, tp));
  }, [recentActivityItems.length]);

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
      setPaying(false);
    }
  };

  const renderWalletBalanceCard = () => {
    const available = Number(realWallet?.availableBalance || 0);
    const bankAdded = bankAccount?.added === true;

    return (
      <View
        style={[
          styles.card,
          styles.duesCard,
          {
            borderColor: colors.primary.light,
            backgroundColor: colors.cardBackground,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <MaterialIcons name="account-balance-wallet" size={24} color={colors.primary.main} />
            <Text style={[styles.cardTitle, { color: colors.text.primary }]}>Wallet</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <TouchableOpacity
              onPress={() => {
                setBankAccountNumber('');
                setBankIfsc('');
                setBankNameMatchOk(null);
                setBankVerifyError('');
                setBankModalVisible(true);
              }}
              style={[styles.iconButton, bankAdded ? styles.bankPencilTouch : styles.bankButton]}
              activeOpacity={0.8}
            >
              {bankAdded ? (
                <View style={styles.pencilBox}>
                  <MaterialIcons name="edit" size={18} color={colors.primary.main} />
                </View>
              ) : (
                <Text style={styles.bankButtonText}>Add Bank Account</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.amountRow}>
          <Text style={styles.noDuesAmount}>₹{available.toFixed(2)}</Text>
          <Text style={styles.noDuesLabel}>Available balance</Text>
          {Number(realWallet?.lockedBalance || 0) > 0 ? (
            <Text style={styles.lockedBalanceHint}>
              ₹{Number(realWallet?.lockedBalance || 0).toFixed(2)} processing (withdrawal in progress)
            </Text>
          ) : null}
        </View>

        <TouchableOpacity
          style={[
            styles.payDuesButton,
            { backgroundColor: colors.primary.main },
            (!bankAdded || available <= 0) && { opacity: 0.5 },
          ]}
          onPress={() => {
            setWithdrawPhase('amount');
            const a = Number(realWallet?.availableBalance ?? 0);
            setWithdrawAmount(a > 0 ? a.toFixed(2) : '');
            setWithdrawModalVisible(true);
          }}
          disabled={!bankAdded || available <= 0}
        >
          <>
            <MaterialIcons name="north-east" size={20} color="#FFFFFF" />
            <Text style={styles.payDuesButtonText}>Withdraw</Text>
          </>
        </TouchableOpacity>

        {!bankAdded ? <Text style={styles.inlineHint}>Add bank account to withdraw</Text> : null}
      </View>
    );
  };

  const submitWithdraw = async () => {
    const amt = Number(withdrawAmount);
    const maxAvail = Number(realWallet?.availableBalance ?? 0);
    const MIN_WITHDRAW = 100;
    if (!amt || amt <= 0) {
      setPaymentErrorMessage('Enter a valid amount');
      setPaymentErrorModalVisible(true);
      return;
    }
    if (amt < MIN_WITHDRAW) {
      setPaymentErrorMessage(`Minimum withdrawal is ₹${MIN_WITHDRAW} per transfer (Cashfree payout rule).`);
      setPaymentErrorModalVisible(true);
      return;
    }
    if (amt > maxAvail + 0.001) {
      setPaymentErrorMessage('Amount cannot exceed your available balance.');
      setPaymentErrorModalVisible(true);
      return;
    }
    setWithdrawPhase('loading');
    try {
      const resp = await cashfreeWalletAPI.withdraw({ amount: amt });
      if (!resp?.success) throw new Error(resp?.error || 'Withdrawal failed');
      setWithdrawPhase('submitted');
      await loadWallet();
    } catch (e) {
      setWithdrawPhase('amount');
      setPaymentErrorMessage(e?.response?.data?.error || e?.message || 'Withdrawal failed');
      setPaymentErrorModalVisible(true);
    }
  };

  const closeWithdrawModal = () => {
    if (withdrawPhase === 'loading') return;
    setWithdrawModalVisible(false);
    setWithdrawPhase('amount');
    setWithdrawAmount('');
  };

  const submitBankAccount = async () => {
    try {
      const acct = bankAccountNumber.trim();
      const ifsc = bankIfsc.trim().toUpperCase();
      if (!acct || acct.length < 6) {
        setPaymentErrorMessage('Enter a valid bank account number');
        setPaymentErrorModalVisible(true);
        return;
      }
      if (!ifsc || ifsc.length !== 11) {
        setPaymentErrorMessage('Enter a valid IFSC code');
        setPaymentErrorModalVisible(true);
        return;
      }
      if (bankNameMatchOk === false) {
        setPaymentErrorMessage(
          'Account holder name does not match your profile. Update your profile name or use a bank account registered in your name.'
        );
        setPaymentErrorModalVisible(true);
        return;
      }
      setAddingBank(true);
      const resp = await cashfreeWalletAPI.addBankAccount({ bankAccount: acct, ifsc });
      if (!resp?.success) throw new Error(resp?.error || 'Failed to add bank account');
      setBankModalVisible(false);
      setBankAccountNumber('');
      setBankIfsc('');
      setBankVerifyError('');
      await loadWallet();
    } catch (e) {
      const respData = e?.response?.data;
      const provider = respData?.provider;
      console.log('Add bank account error response:', respData || e);
      const msg =
        respData?.error ||
        e?.message ||
        'Failed to add bank account';
      const providerMsg = provider ? `\n\nCashfree provider:\n${JSON.stringify(provider)}` : '';
      setPaymentErrorMessage(`${msg}${providerMsg}`);
      setPaymentErrorModalVisible(true);
    } finally {
      setAddingBank(false);
    }
  };

  const renderRecentActivity = () => {
    const formatDate = (date) => {
      if (!date) return '—';
      const d = new Date(date);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    const start = (recentActivityPage - 1) * RECENT_ACTIVITY_PER_PAGE;
    const pageItems = recentActivityItems.slice(start, start + RECENT_ACTIVITY_PER_PAGE);
    const showPagination = recentActivityItems.length > RECENT_ACTIVITY_PER_PAGE;

    return (
      <View style={[styles.card, styles.activityCard]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <MaterialIcons name="update" size={22} color={colors.text.primary} />
            <Text style={styles.cardTitle}>{t('wallet.recentActivity')}</Text>
          </View>
        </View>
        {recentActivityItems.length === 0 ? (
          <Text style={styles.emptyWithdrawalsText}>{t('wallet.recentActivityEmpty')}</Text>
        ) : (
          <>
            {pageItems.map((item) => (
              <View key={item.key} style={styles.wdRow}>
                <View style={styles.wdLeft}>
                  <Text style={styles.wdLedgerTitle}>{item.title}</Text>
                  <Text style={styles.wdDate}>{formatDate(item.date)}</Text>
                </View>
                <Text
                  style={[
                    styles.wdLedgerAmount,
                    item.kind === 'earning' ? styles.wdLedgerCredit : styles.wdWithdrawalProcessingAmount,
                  ]}
                >
                  {item.kind === 'earning' ? '+' : ''}₹{Math.abs(item.amount).toFixed(2)}
                </Text>
              </View>
            ))}
            {showPagination ? (
              <View style={styles.paginationContainer}>
                <View style={styles.paginationButtons}>
                  {Array.from({ length: recentActivityTotalPages }, (_, i) => i + 1).map((pageNum) => (
                    <TouchableOpacity
                      key={pageNum}
                      style={[
                        styles.paginationButton,
                        recentActivityPage === pageNum && styles.paginationButtonActive,
                      ]}
                      onPress={() => setRecentActivityPage(pageNum)}
                      accessibilityRole="button"
                      accessibilityLabel={`${t('wallet.page')} ${pageNum}`}
                    >
                      <Text
                        style={[
                          styles.paginationButtonText,
                          recentActivityPage === pageNum && styles.paginationButtonTextActive,
                        ]}
                      >
                        {pageNum}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null}
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

      {renderWalletBalanceCard()}
      {renderRecentActivity()}
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

      <PaymentWebView
        visible={paymentWebViewVisible}
        paymentSessionId={cashfreePaymentSessionId}
        cashfreeMode={'production'}
        orderId={cashfreeOrderId}
        onClose={() => {
          setPaymentWebViewVisible(false);
          setPaying(false);
        }}
        onPaymentComplete={(orderId) => confirmDuesAfterCallback(orderId)}
      />

      {/* Withdraw: amount → loading (API) → submitted */}
      <Modal
        visible={withdrawModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeWithdrawModal}
      >
        <View style={styles.modalOverlay}>
          {withdrawPhase === 'loading' ? (
            <View style={[styles.modalContent, styles.withdrawProcessingBox]}>
              <ActivityIndicator size="large" color={colors.primary.main} />
              <Text style={[styles.modalTitle, styles.withdrawProcessingTitle]}>Submitting request…</Text>
              <Text style={styles.modalSubtitle}>Connecting to payout service.</Text>
            </View>
          ) : withdrawPhase === 'submitted' ? (
            <View style={styles.modalContent}>
              <View style={styles.successIconContainer}>
                <MaterialIcons name="check-circle" size={64} color={colors.success.main} />
              </View>
              <Text style={styles.modalTitle}>Withdrawal request submitted</Text>
              <Text style={styles.modalSubtitle}>
                Your request is in progress. Track status under Withdrawal history — it will show Paid when
                the bank transfer completes.
              </Text>
              <View style={[styles.modalActions, styles.modalActionsCentered]}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalSubmitButton, styles.successModalButton]}
                  onPress={() => {
                    setWithdrawModalVisible(false);
                    setWithdrawPhase('amount');
                    setWithdrawAmount('');
                  }}
                >
                  <Text style={styles.modalSubmitText}>{t('common.ok')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
              style={styles.kbAvoid}
            >
              <ScrollView
                contentContainerStyle={styles.modalScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Withdraw</Text>
                  <Text style={styles.modalSubtitle}>
                    Withdraw available balance to your saved bank account (minimum ₹100 per transfer). You can
                    change the amount below.
                  </Text>

                  <View style={{ gap: spacing.sm }}>
                    <TextInput
                      value={withdrawAmount}
                      onChangeText={setWithdrawAmount}
                      placeholder="Amount (₹)"
                      keyboardType="decimal-pad"
                      placeholderTextColor={colors.text.secondary}
                      style={styles.textInput}
                    />
                    <TouchableOpacity
                      onPress={() => {
                        const a = Number(realWallet?.availableBalance ?? 0);
                        if (a > 0) setWithdrawAmount(a.toFixed(2));
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.withdrawFullBalanceLink}>Use full balance</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.modalCancelButton]}
                      onPress={closeWithdrawModal}
                    >
                      <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.modalSubmitButton]}
                      onPress={submitWithdraw}
                      disabled={withdrawPhase === 'loading'}
                    >
                      <Text style={styles.modalSubmitText}>Withdraw</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          )}
        </View>
      </Modal>

      {/* Add Bank Account Modal */}
      <Modal
        visible={bankModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBankModalVisible(false)}
      >
        <View
          style={[
            styles.modalOverlay,
            styles.modalOverlayTop,
            { paddingTop: Math.max(spacing.lg, windowHeight * 0.2) },
          ]}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 16}
            style={styles.kbAvoidTop}
          >
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContentTop}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Add Bank Account</Text>
                <Text style={styles.modalSubtitle}>
                  Enter your bank details. The account holder name must match your profile name.
                </Text>

                <View style={{ gap: spacing.sm }}>
                  <TextInput
                    value={bankAccountNumber}
                    onChangeText={(v) => {
                      setBankAccountNumber(v);
                      setBankVerifyError('');
                    }}
                    placeholder="Bank account number"
                    keyboardType="default"
                    placeholderTextColor={colors.text.secondary}
                    style={styles.textInput}
                  />
                  <TextInput
                    value={bankIfsc}
                    onChangeText={(v) => {
                      const next = String(v || '')
                        .toUpperCase()
                        .replace(/[^A-Z0-9]/g, '')
                        .slice(0, 11);
                      setBankIfsc(next);
                      setBankVerifyError('');
                    }}
                    placeholder="IFSC code"
                    autoCapitalize="characters"
                    placeholderTextColor={colors.text.secondary}
                    style={styles.textInput}
                  />

                  {bankVerifyLoading ? (
                    <View style={styles.bankVerifyRow}>
                      <ActivityIndicator size="small" color={colors.primary.main} />
                      <Text style={styles.bankVerifyHint}>Verifying with bank…</Text>
                    </View>
                  ) : null}
                  {bankVerifyError ? <Text style={styles.bankVerifyErr}>{bankVerifyError}</Text> : null}
                  {bankNameMatchOk !== null ? (
                    <Text
                      style={[
                        styles.bankNameInline,
                        bankNameMatchOk ? styles.bankNameOk : styles.bankNameBad,
                      ]}
                    >
                      {bankNameMatchOk ? 'Name matches your profile' : 'Name does not match your profile'}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalCancelButton]}
                    onPress={() => setBankModalVisible(false)}
                    disabled={addingBank}
                  >
                    <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalButton,
                      styles.modalSubmitButton,
                      (addingBank ||
                        !bankAccountNumber ||
                        bankIfsc.length !== 11 ||
                        bankNameMatchOk === false) &&
                        styles.modalSubmitButtonDisabled,
                    ]}
                    onPress={submitBankAccount}
                    disabled={
                      addingBank ||
                      !bankAccountNumber ||
                      bankIfsc.length !== 11 ||
                      bankNameMatchOk === false
                    }
                  >
                    {addingBank ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.modalSubmitText}>Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

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
  /** Outlined pill for “Add Bank Account” only — edit uses pencilBox only (single border). */
  bankButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary.main,
  },
  bankPencilTouch: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  bankButtonText: {
    ...typography.small,
    color: colors.primary.main,
    fontWeight: '600',
  },
  pencilBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  amountRow: {
    alignItems: 'flex-start',
    marginBottom: spacing.md,
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
  inlineHint: {
    ...typography.small,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  bankNameInline: {
    ...typography.small,
    marginTop: spacing.xs,
    fontWeight: '600',
  },
  bankNameOk: {
    color: colors.success.main,
  },
  bankNameBad: {
    color: colors.error.main,
  },
  bankVerifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  bankVerifyHint: {
    ...typography.small,
    color: colors.text.secondary,
  },
  bankVerifyErr: {
    ...typography.small,
    color: colors.error.main,
    marginTop: spacing.xs,
  },
  modalSubmitButtonDisabled: {
    opacity: 0.5,
  },
  withdrawProcessingBox: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  withdrawProcessingTitle: {
    marginTop: spacing.md,
    textAlign: 'center',
  },
  withdrawFullBalanceLink: {
    ...typography.small,
    color: colors.primary.main,
    fontWeight: '600',
  },
  activityCard: {
    marginBottom: 0,
  },
  wdLedgerTitle: {
    ...typography.small,
    fontWeight: '600',
    color: colors.text.primary,
  },
  wdLedgerAmount: {
    ...typography.small,
    fontWeight: '700',
    alignSelf: 'center',
  },
  wdLedgerCredit: {
    color: colors.success.dark,
  },
  wdWithdrawalProcessingAmount: {
    color: colors.warning.main,
  },
  lockedBalanceHint: {
    ...typography.small,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  emptyWithdrawalsText: {
    ...typography.small,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  wdRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  wdLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  wdDate: {
    ...typography.small,
    color: colors.text.secondary,
    marginTop: 2,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text.primary,
    backgroundColor: colors.cardBackground,
    minHeight: 48,
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
  paginationContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
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
  modalOverlayTop: {
    justifyContent: 'flex-start',
  },
  kbAvoid: {
    width: '100%',
  },
  kbAvoidCentered: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  kbAvoidTop: {
    flex: 1,
    width: '100%',
  },
  modalSheetWrap: {
    width: '100%',
    paddingBottom: spacing.lg,
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  modalScroll: {
    width: '100%',
  },
  modalScrollContentCentered: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  modalScrollContentTop: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    // keep modal stable during keyboard resize (avoid flexGrow/center)
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

