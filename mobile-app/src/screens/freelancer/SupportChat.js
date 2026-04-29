/**
 * Support Chatbot (page) - Freelancer
 * Full-screen guided chatbot (quick replies) to help troubleshoot common issues.
 *
 * Note: This is intentionally offline / deterministic (no external AI calls).
 * If you want a real AI bot (OpenAI, etc.), we should implement a backend endpoint so no secrets are exposed in the app.
 */

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { spacing, typography } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supportAPI, walletAPI } from '../../api';

/** Must match backend key for the 8h pickup block bot line (strip when cancel finds no job). */
const BOT_BLOCKED_8H_TEXT_KEY = 'supportTicket.bot.blocked8hAndEnd';

/** Hide orphaned 8h bubbles when this ticket has no active unassign / block side-effects. */
function ticketMessagesForDisplay(ticket) {
  const msgs = ticket?.messages || [];
  const hasActiveUnassignEffect =
    Boolean(ticket?.effects?.unassignedJobId) || Boolean(ticket?.effects?.pickupBlockedUntil);
  if (hasActiveUnassignEffect) return msgs;
  return msgs.filter((m) => m.textKey !== BOT_BLOCKED_8H_TEXT_KEY);
}

function createStyles(colors, insets) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.cardBackground,
    },
    backButton: {
      padding: spacing.xs,
      marginRight: spacing.sm,
    },
    headerName: {
      flex: 1,
      ...typography.h3,
      color: colors.text.primary,
    },
    headerSpacer: {
      width: 40,
    },
    messagesContainer: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: spacing.xxl,
      paddingHorizontal: spacing.lg,
    },
    emptyText: {
      ...typography.body,
      color: colors.text.muted,
      textAlign: 'center',
    },
    messagesList: {
      padding: spacing.md,
      paddingBottom: spacing.lg,
    },
    messageContainer: {
      marginBottom: spacing.sm,
    },
    myMessage: {
      alignItems: 'flex-end',
    },
    otherMessage: {
      alignItems: 'flex-start',
    },
    messageBubble: {
      maxWidth: '75%',
      padding: spacing.md,
      borderRadius: spacing.md,
    },
    myMessageBubble: {
      backgroundColor: colors.primary.main,
    },
    otherMessageBubble: {
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.border,
    },
    messageText: {
      ...typography.body,
      lineHeight: 20,
    },
    myMessageText: {
      color: '#FFFFFF',
    },
    otherMessageText: {
      color: colors.text.primary,
    },
    messageFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.xs,
      gap: spacing.xs,
    },
    messageTime: {
      ...typography.small,
      fontSize: 11,
    },
    myMessageTime: {
      color: 'rgba(255, 255, 255, 0.7)',
    },
    otherMessageTime: {
      color: colors.text.muted,
    },
    statusIcon: {
      marginLeft: spacing.xs,
    },
    composer: {
      padding: spacing.md,
      paddingBottom: spacing.md + Math.max(insets?.bottom || 0, 0),
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.cardBackground,
      gap: spacing.md,
    },
    quickReplies: {
      flexDirection: 'column',
      gap: spacing.sm,
      justifyContent: 'flex-start',
    },
    quickReply: {
      borderRadius: spacing.md,
      paddingVertical: 10,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      width: '100%',
    },
    quickReplyPrimary: {
      borderColor: colors.primary.main,
      backgroundColor: colors.primary.light,
    },
    quickReplyDanger: {
      borderColor: colors.error.main,
      backgroundColor: colors.error.light,
    },
    quickReplyText: {
      ...typography.small,
      color: colors.text.primary,
      fontWeight: '700',
    },
    startChatButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      borderRadius: spacing.md,
      backgroundColor: colors.primary.main,
    },
    startChatText: {
      ...typography.button,
      color: '#FFFFFF',
    },
    modalRoot: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    modalCard: {
      width: '100%',
      maxWidth: 400,
      backgroundColor: colors.cardBackground,
      borderRadius: spacing.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      elevation: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
    },
    modalTitle: {
      ...typography.h3,
      color: colors.text.primary,
      marginBottom: spacing.sm,
    },
    modalBody: {
      ...typography.body,
      color: colors.text.secondary,
      lineHeight: 22,
      marginBottom: spacing.lg,
    },
    modalActions: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    modalButtonSecondary: {
      flex: 1,
      paddingVertical: spacing.md,
      borderRadius: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalButtonSecondaryText: {
      ...typography.button,
      color: colors.text.primary,
      fontSize: 15,
    },
    modalButtonPrimary: {
      flex: 1,
      paddingVertical: spacing.md,
      borderRadius: spacing.md,
      backgroundColor: colors.primary.main,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalButtonPrimaryText: {
      ...typography.button,
      color: '#FFFFFF',
      fontSize: 15,
    },
    mainMenuRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.sm,
      marginTop: spacing.xs,
    },
    mainMenuText: {
      ...typography.small,
      color: colors.text.muted,
      fontWeight: '600',
    },
    composerStack: {
      gap: spacing.sm,
    },
    mainMenuRowInline: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
  });
}

export default function SupportChat({ onBack, bootstrapTicketRef }) {
  const { colors } = useTheme();
  const { t, locale } = useLanguage();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, insets), [colors, insets]);

  const [messages, setMessages] = useState([]);
  const [chatStarted, setChatStarted] = useState(false);
  const [nodeId, setNodeId] = useState('root');
  const [ticketId, setTicketId] = useState(null);
  const [ticketStatus, setTicketStatus] = useState('open');
  const [cancelModalVisible, setCancelModalVisible] = useState(false);

  const flatListRef = useRef(null);
  const cancelOrderPayloadRef = useRef(null);
  const skipStorageHydrationRef = useRef(false);

  const nowId = () => `m_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const TICKET_KEY = 'supportTicketId';

  const FLOW = useMemo(
    () => ({
      root: {
        botTextKey: 'supportBot.root.text',
        options: [
          { id: 'orders', labelKey: 'supportBot.root.orders', next: 'orders' },
          { id: 'wallet', labelKey: 'supportBot.root.wallet', next: 'wallet' },
          { id: 'withdrawal', labelKey: 'supportBot.root.withdrawal', next: 'withdrawal' },
        ],
      },
      orders: {
        botTextKey: 'supportBot.orders.text',
        options: [
          { id: 'orders_cancel', labelKey: 'supportBot.orders.cancelOrder', next: 'orders_cancel' },
          { id: 'orders_contact', labelKey: 'supportBot.orders.cannotContact', next: 'orders_contact' },
          { id: 'orders_customer_cancel', labelKey: 'supportBot.orders.customerAskingCancel', next: 'orders_customer_cancel' },
        ],
      },
      wallet: {
        botTextKey: 'supportBot.wallet.text',
        options: [
          { id: 'wallet_dues_not_reflecting', labelKey: 'supportBot.wallet.duesNotReflecting', next: 'wallet_dues_not_reflecting' },
          { id: 'wallet_processing', labelKey: 'supportBot.wallet.paymentProcessing', next: 'wallet_processing' },
        ],
      },
      withdrawal: {
        botTextKey: 'supportBot.withdrawal.text',
        options: [
          { id: 'withdrawal_add_bank', labelKey: 'supportBot.withdrawal.cannotAddBank', next: 'withdrawal_add_bank' },
          { id: 'withdrawal_not_credited', labelKey: 'supportBot.withdrawal.withdrawalNotCredited', next: 'withdrawal_not_credited' },
        ],
      },
      orders_cancel: { botTextKey: 'supportBot.ordersCancel.text', options: [{ id: 'back', labelKey: 'supportBot.common.back', next: 'orders' }] },
      orders_contact: { botTextKey: 'supportBot.ordersContact.text', options: [] },
      orders_customer_cancel: { botTextKey: 'supportBot.ordersCustomerCancel.text', options: [] },
      withdrawal_not_credited: { botTextKey: 'supportBot.withdrawalNotCredited.text', options: [{ id: 'back', labelKey: 'supportBot.common.back', next: 'withdrawal' }] },
      wallet_dues_ask_confirm: {
        botTextKey: 'supportBot.root.text',
        options: [
          { id: 'wallet_dues_confirm_yes', labelKey: 'supportBot.common.yes', next: 'wallet_dues_after_yes' },
          { id: 'wallet_dues_confirm_no', labelKey: 'supportBot.common.no', next: 'wallet_dues_after_no' },
        ],
      },
      wallet_dues_after_yes: { botTextKey: 'supportBot.walletDuesAfterYes.text', options: [] },
      wallet_dues_after_no: { botTextKey: 'supportBot.walletDuesAfterNo.text', options: [] },
      wallet_received_ask_confirm: {
        botTextKey: 'supportBot.root.text',
        options: [
          { id: 'wallet_received_confirm_yes', labelKey: 'supportBot.common.yes', next: 'wallet_received_after_yes' },
          { id: 'wallet_received_confirm_no', labelKey: 'supportBot.common.no', next: 'wallet_received_after_no' },
        ],
      },
      wallet_received_after_yes: { botTextKey: 'supportBot.walletReceivedAfterYes.text', options: [] },
      wallet_received_after_no: { botTextKey: 'supportBot.walletReceivedAfterNo.text', options: [] },
      withdrawal_add_bank: { botTextKey: 'supportBot.withdrawalAddBank.text', options: [] },
      end_ready: { botTextKey: 'supportBot.endReady.text', options: [] },
    }),
    []
  );

  const currentNode = FLOW[nodeId] || FLOW.root;

  const renderTicketText = useCallback((m) => {
    const key = m?.textKey;
    let out = key ? t(key) : (m?.text || '');
    const params = m?.params;
    if (out && params && typeof params === 'object') {
      for (const [k, v] of Object.entries(params)) {
        out = out.replace(`{${k}}`, String(v));
      }
    }
    return out;
  }, [t]);

  useLayoutEffect(() => {
    const boot = bootstrapTicketRef?.current;
    if (!boot?._id) return;
    bootstrapTicketRef.current = null;
    skipStorageHydrationRef.current = true;
    setTicketId(String(boot._id));
    setTicketStatus(boot.status || 'open');
    setChatStarted(boot.status === 'open');
    setNodeId(boot.currentNodeId || 'root');
    const msgs = ticketMessagesForDisplay(boot).map((m) => ({
      _id: m._id || nowId(),
      sender: m.sender === 'user' ? (user?.id || user?._id) : m.sender,
      message: renderTicketText(m),
      createdAt: m.createdAt || new Date(),
    }));
    setMessages(msgs);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 0);
    // Parent sets ref before mount when opening from Support after startTicket / getTicket.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap ref is read once on mount
  }, []);

  const pushBotNode = (id) => {
    const node = FLOW[id] || FLOW.root;
    setMessages((prev) => [
      ...prev,
      {
        _id: nowId(),
        sender: 'bot',
        message: t(node.botTextKey),
        createdAt: new Date(),
      },
    ]);
  };

  const pushBotRawMessage = useCallback((text) => {
    setMessages((prev) => [
      ...prev,
      {
        _id: nowId(),
        sender: 'bot',
        message: text,
        createdAt: new Date(),
      },
    ]);
  }, []);

  const buildWalletDuesBotMessage = useCallback(
    (lastPayment) => {
      if (!lastPayment) return t('supportBot.walletDuesNoPaidRecordBlock');
      const amount =
        lastPayment.amount != null ? `₹${Math.round(Number(lastPayment.amount))}` : '—';
      const dateSrc = lastPayment.paymentDate || lastPayment.createdAt;
      const dateStr = dateSrc
        ? new Date(dateSrc).toLocaleString(locale === 'hi' ? 'hi-IN' : 'en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : '—';
      const orderRef = String(lastPayment.orderId || lastPayment.id || '—');
      return t('supportBot.walletDuesLastPaidBlock')
        .replace('{amount}', amount)
        .replace('{date}', dateStr)
        .replace('{orderId}', orderRef);
    },
    [t, locale]
  );

  const buildWalletReceivedBotMessage = useCallback(
    (lastOnline) => {
      if (!lastOnline) return t('supportBot.walletReceivedNoPaidBlock');
      const amount =
        lastOnline.amount != null ? `₹${Math.round(Number(lastOnline.amount))}` : '—';
      const dateSrc = lastOnline.paidAt;
      const dateStr = dateSrc
        ? new Date(dateSrc).toLocaleString(locale === 'hi' ? 'hi-IN' : 'en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : '—';
      const jobTitle = lastOnline.jobTitle ? String(lastOnline.jobTitle) : '—';
      const orderRef = lastOnline.merchantOrderId ? String(lastOnline.merchantOrderId) : '—';
      return t('supportBot.walletReceivedLastPaidBlock')
        .replace('{amount}', amount)
        .replace('{jobTitle}', jobTitle)
        .replace('{date}', dateStr)
        .replace('{orderId}', orderRef);
    },
    [t, locale]
  );

  const startChat = async () => {
    if (!user) return;
    const resp = await supportAPI.startTicket();
    if (resp?.success && resp.ticket?._id) {
      const id = String(resp.ticket._id);
      await AsyncStorage.setItem(TICKET_KEY, id);
      setTicketId(id);
      setTicketStatus(resp.ticket.status || 'open');
      setChatStarted(true);
      setNodeId(resp.ticket.currentNodeId || 'root');
      const msgs = ticketMessagesForDisplay(resp.ticket).map((m) => ({
        _id: m._id || nowId(),
        sender: m.sender === 'user' ? (user?.id || user?._id) : m.sender,
        message: renderTicketText(m),
        createdAt: m.createdAt || new Date(),
      }));
      setMessages(msgs);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  const endChat = async () => {
    if (!ticketId) return;
    try {
      const resp = await supportAPI.complete(ticketId);
      if (resp?.success) {
        await AsyncStorage.removeItem(TICKET_KEY);
        onBack?.();
      }
    } catch (_) {}
  };

  const goToMainMenu = useCallback(async () => {
    setNodeId('root');
    if (ticketId) {
      try {
        await supportAPI.append(ticketId, {
          botTextKey: 'supportBot.root.text',
          nextNodeId: 'root',
        });
      } catch (_) {}
    }
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, [ticketId]);

  const runCancelOrderAfterConfirm = async (opt, label) => {
    if (!ticketId) return;
    const userMsg = {
      _id: nowId(),
      sender: user?.id || user?._id || 'me',
      message: label,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    try {
      await supportAPI.append(ticketId, { userTextKey: opt.labelKey });
      const resp = await supportAPI.cancelOrderAction(ticketId);
      if (!resp?.success) {
        throw new Error(resp?.error || t('common.error'));
      }
      if (resp?.ticket) {
        // Ensure cooldown banner updates instantly across devices by syncing auth user state
        // from the action response (instead of waiting for a later profile refresh).
        if (typeof mergeUser === 'function') {
          if (resp.pickupBlockedUntil) {
            mergeUser({ freelancerPickupBlockedUntil: resp.pickupBlockedUntil });
          } else if (resp.unassigned === false) {
            // "No assigned job found" path should not leave a stale cooldown in UI.
            mergeUser({ freelancerPickupBlockedUntil: null });
          }
        }

        setNodeId(resp.ticket.currentNodeId || 'end_ready');
        setTicketStatus(resp.ticket.status || 'open');
        const msgs = ticketMessagesForDisplay(resp.ticket).map((m) => ({
          _id: m._id || nowId(),
          sender: m.sender === 'user' ? (user?.id || user?._id) : m.sender,
          message: renderTicketText(m),
          createdAt: m.createdAt || new Date(),
        }));
        setMessages(msgs);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
        return;
      }
      throw new Error(t('common.error'));
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || t('common.error');
      Alert.alert(t('common.error'), msg);
      // Do not fake a "successful" bot flow when the backend action failed.
      // Keep the user on the current node so they can retry.
    }
  };

  const closeCancelModal = () => {
    setCancelModalVisible(false);
    cancelOrderPayloadRef.current = null;
  };

  const confirmCancelOrder = () => {
    const p = cancelOrderPayloadRef.current;
    setCancelModalVisible(false);
    cancelOrderPayloadRef.current = null;
    if (p) void runCancelOrderAfterConfirm(p.opt, p.label);
  };

  const selectOption = async (opt) => {
    if (!opt) return;
    const label = t(opt.labelKey);

    // Destructive support action: must confirm before unassign + pickup/apply block
    if (opt.id === 'orders_cancel') {
      if (!ticketId) {
        const userMsg = {
          _id: nowId(),
          sender: user?.id || user?._id || 'me',
          message: label,
          createdAt: new Date(),
        };
        setMessages((prev) => [...prev, userMsg]);
        return;
      }
      cancelOrderPayloadRef.current = { opt, label };
      setCancelModalVisible(true);
      return;
    }

    if (opt.id === 'wallet_dues_not_reflecting') {
      const userMsg = {
        _id: nowId(),
        sender: user?.id || user?._id || 'me',
        message: label,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);

      const run = async () => {
        let botText = t('supportBot.walletDuesNoPaidRecordBlock');
        try {
          const wResp = await walletAPI.getWallet();
          const list = wResp?.wallet?.paymentTransactions;
          const last = Array.isArray(list) && list.length > 0 ? list[0] : null;
          botText = buildWalletDuesBotMessage(last);
        } catch (_) {
          /* keep fallback */
        }

        setTimeout(() => {
          pushBotRawMessage(botText);
          setNodeId('wallet_dues_ask_confirm');
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
        }, 250);

        if (ticketId) {
          try {
            await supportAPI.append(ticketId, {
              userTextKey: opt.labelKey,
              botText,
              nextNodeId: 'wallet_dues_ask_confirm',
            });
          } catch (_) {}
        }
      };
      void run();
      return;
    }

    if (opt.id === 'wallet_processing') {
      const userMsg = {
        _id: nowId(),
        sender: user?.id || user?._id || 'me',
        message: label,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);

      const run = async () => {
        let botText = t('supportBot.walletReceivedNoPaidBlock');
        try {
          const wResp = await walletAPI.getWallet();
          const last = wResp?.wallet?.lastOnlineClientPayment || null;
          botText = buildWalletReceivedBotMessage(last);
        } catch (_) {
          /* keep fallback */
        }

        setTimeout(() => {
          pushBotRawMessage(botText);
          setNodeId('wallet_received_ask_confirm');
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
        }, 250);

        if (ticketId) {
          try {
            await supportAPI.append(ticketId, {
              userTextKey: opt.labelKey,
              botText,
              nextNodeId: 'wallet_received_ask_confirm',
            });
          } catch (_) {}
        }
      };
      void run();
      return;
    }

    if (opt.id === 'wallet_received_confirm_yes') {
      const userMsg = {
        _id: nowId(),
        sender: user?.id || user?._id || 'me',
        message: label,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      if (!ticketId) return;
      const botTextKey = FLOW.wallet_received_after_yes.botTextKey;
      setNodeId('end_ready');
      setTimeout(() => {
        pushBotNode('wallet_received_after_yes');
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
      }, 250);
      try {
        await supportAPI.append(ticketId, {
          userTextKey: opt.labelKey,
          botTextKey,
          nextNodeId: 'end_ready',
        });
      } catch (_) {}
      return;
    }

    if (opt.id === 'wallet_received_confirm_no') {
      const userMsg = {
        _id: nowId(),
        sender: user?.id || user?._id || 'me',
        message: label,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      if (!ticketId) return;
      const botTextKey = FLOW.wallet_received_after_no.botTextKey;
      setNodeId('end_ready');
      setTimeout(() => {
        pushBotNode('wallet_received_after_no');
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
      }, 250);
      try {
        await supportAPI.append(ticketId, {
          userTextKey: opt.labelKey,
          botTextKey,
          nextNodeId: 'end_ready',
        });
      } catch (_) {}
      return;
    }

    if (opt.id === 'wallet_dues_confirm_yes') {
      const userMsg = {
        _id: nowId(),
        sender: user?.id || user?._id || 'me',
        message: label,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      if (!ticketId) return;
      const botTextKey = FLOW.wallet_dues_after_yes.botTextKey;
      setNodeId('end_ready');
      setTimeout(() => {
        pushBotNode('wallet_dues_after_yes');
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
      }, 250);
      try {
        await supportAPI.append(ticketId, {
          userTextKey: opt.labelKey,
          botTextKey,
          nextNodeId: 'end_ready',
        });
      } catch (_) {}
      return;
    }

    if (opt.id === 'wallet_dues_confirm_no') {
      const userMsg = {
        _id: nowId(),
        sender: user?.id || user?._id || 'me',
        message: label,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      if (!ticketId) return;
      const botTextKey = FLOW.wallet_dues_after_no.botTextKey;
      setNodeId('end_ready');
      setTimeout(() => {
        pushBotNode('wallet_dues_after_no');
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
      }, 250);
      try {
        await supportAPI.append(ticketId, {
          userTextKey: opt.labelKey,
          botTextKey,
          nextNodeId: 'end_ready',
        });
      } catch (_) {}
      return;
    }

    if (opt.id === 'orders_contact') {
      const userMsg = {
        _id: nowId(),
        sender: user?.id || user?._id || 'me',
        message: label,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      if (!ticketId) return;
      const botTextKey = FLOW.orders_contact.botTextKey;
      setNodeId('end_ready');
      setTimeout(() => {
        pushBotNode('orders_contact');
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
      }, 250);
      try {
        await supportAPI.append(ticketId, {
          userTextKey: opt.labelKey,
          botTextKey,
          nextNodeId: 'end_ready',
        });
      } catch (_) {}
      return;
    }

    if (opt.id === 'orders_customer_cancel') {
      const userMsg = {
        _id: nowId(),
        sender: user?.id || user?._id || 'me',
        message: label,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      if (!ticketId) return;
      const botTextKey = FLOW.orders_customer_cancel.botTextKey;
      setNodeId('end_ready');
      setTimeout(() => {
        pushBotNode('orders_customer_cancel');
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
      }, 250);
      try {
        await supportAPI.append(ticketId, {
          userTextKey: opt.labelKey,
          botTextKey,
          nextNodeId: 'end_ready',
        });
      } catch (_) {}
      return;
    }

    if (opt.id === 'withdrawal_add_bank') {
      const userMsg = {
        _id: nowId(),
        sender: user?.id || user?._id || 'me',
        message: label,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      if (!ticketId) return;
      const botTextKey = FLOW.withdrawal_add_bank.botTextKey;
      setNodeId('end_ready');
      setTimeout(() => {
        pushBotNode('withdrawal_add_bank');
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
      }, 250);
      try {
        await supportAPI.append(ticketId, {
          userTextKey: opt.labelKey,
          botTextKey,
          nextNodeId: 'end_ready',
        });
      } catch (_) {}
      return;
    }

    const userMsg = {
      _id: nowId(),
      sender: user?.id || user?._id || 'me',
      message: label,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);

    if (!ticketId) return;

    const botTextKey = (FLOW[opt.next] || FLOW.root).botTextKey;
    setNodeId(opt.next);
    setTimeout(() => {
      pushBotNode(opt.next);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
    }, 250);
    try {
      await supportAPI.append(ticketId, { userTextKey: opt.labelKey, botTextKey, nextNodeId: opt.next });
    } catch (_) {}
  };

  useEffect(() => {
    (async () => {
      if (skipStorageHydrationRef.current) {
        skipStorageHydrationRef.current = false;
        return;
      }
      const id = await AsyncStorage.getItem(TICKET_KEY);
      if (!id) return;
      setTicketId(id);
      try {
        const resp = await supportAPI.getTicket(id);
        if (resp?.success && resp.ticket) {
          setChatStarted(resp.ticket.status === 'open');
          setTicketStatus(resp.ticket.status || 'open');
          setNodeId(resp.ticket.currentNodeId || 'root');
          const msgs = ticketMessagesForDisplay(resp.ticket).map((m) => ({
            _id: m._id || nowId(),
            sender: m.sender === 'user' ? (user?.id || user?._id) : m.sender,
            message: renderTicketText(m),
            createdAt: m.createdAt || new Date(),
          }));
          setMessages(msgs);
        }
      } catch (_) {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderMessage = ({ item }) => {
    const senderId = item.sender?._id || item.sender?.id || item.sender;
    const isMyMessage = senderId !== 'bot' && senderId === (user?.id || user?._id);
    return (
      <View style={[styles.messageContainer, isMyMessage ? styles.myMessage : styles.otherMessage]}>
        <View
          style={[
            styles.messageBubble,
            isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
          ]}
        >
          <Text style={[styles.messageText, isMyMessage ? styles.myMessageText : styles.otherMessageText]}>
            {item.message}
          </Text>
          <View style={styles.messageFooter}>
            <Text style={[styles.messageTime, isMyMessage ? styles.myMessageTime : styles.otherMessageTime]}>
              {new Date(item.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {/* Bot chat has no delivery/read status */}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerName}>{t('support.chatTitle')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.messagesContainer}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(it) => it._id || it.id || `msg_${it.createdAt}`}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t('supportBot.tapStart')}</Text>
            </View>
          }
        />
      </View>

      <View style={styles.composer}>
        {!chatStarted ? (
          <TouchableOpacity style={styles.startChatButton} onPress={startChat} activeOpacity={0.85}>
            <MaterialIcons name="chat" size={20} color="#FFFFFF" />
            <Text style={styles.startChatText}>{t('supportBot.startChat')}</Text>
          </TouchableOpacity>
        ) : nodeId === 'end_ready' && ticketStatus === 'open' ? (
          <TouchableOpacity style={styles.startChatButton} onPress={endChat} activeOpacity={0.85}>
            <MaterialIcons name="check-circle" size={20} color="#FFFFFF" />
            <Text style={styles.startChatText}>{t('supportBot.endChat')}</Text>
          </TouchableOpacity>
        ) : (
          <View>
            <View style={styles.quickReplies}>
              {(currentNode?.options || []).map((opt) => {
                const isPrimary = opt.id === 'orders' || opt.id === 'wallet' || opt.id === 'withdrawal';
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.quickReply,
                      isPrimary && styles.quickReplyPrimary,
                    ]}
                    onPress={() => selectOption(opt)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.quickReplyText}>{t(opt.labelKey)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {nodeId !== 'root' ? (
              <TouchableOpacity style={styles.mainMenuRow} onPress={goToMainMenu} activeOpacity={0.7}>
                <MaterialIcons name="arrow-back" size={18} color={colors.text.muted} />
                <Text style={styles.mainMenuText}>{t('supportBot.common.mainMenu')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </View>
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeCancelModal}
      >
        <View style={styles.modalRoot}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closeCancelModal} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('supportBot.orders.cancelConfirmTitle')}</Text>
            <Text style={styles.modalBody}>{t('supportBot.orders.cancelConfirmBody')}</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalButtonSecondary} onPress={closeCancelModal} activeOpacity={0.85}>
                <Text style={styles.modalButtonSecondaryText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButtonPrimary} onPress={confirmCancelOrder} activeOpacity={0.85}>
                <Text style={styles.modalButtonPrimaryText}>{t('supportBot.orders.cancelConfirmContinue')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

