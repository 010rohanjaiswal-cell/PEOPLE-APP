/**
 * Support Chatbot (page) - Freelancer
 * Full-screen guided chatbot (quick replies) to help troubleshoot common issues.
 *
 * Note: This is intentionally offline / deterministic (no external AI calls).
 * If you want a real AI bot (OpenAI, etc.), we should implement a backend endpoint so no secrets are exposed in the app.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { spacing, typography } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supportAPI } from '../../api';

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
  });
}

export default function SupportChat({ onBack }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, insets), [colors, insets]);

  const [messages, setMessages] = useState([]);
  const [chatStarted, setChatStarted] = useState(false);
  const [nodeId, setNodeId] = useState('root');
  const [ticketId, setTicketId] = useState(null);
  const [ticketStatus, setTicketStatus] = useState('open');

  const flatListRef = useRef(null);

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
          { id: 'wallet_withdraw_not_credited', labelKey: 'supportBot.wallet.withdrawnNotCredited', next: 'wallet_withdraw_not_credited' },
          { id: 'wallet_dues_not_reflecting', labelKey: 'supportBot.wallet.duesNotReflecting', next: 'wallet_dues_not_reflecting' },
          { id: 'wallet_processing', labelKey: 'supportBot.wallet.paymentProcessing', next: 'wallet_processing' },
          { id: 'wallet_status', labelKey: 'supportBot.wallet.paymentStatus', next: 'wallet_status' },
        ],
      },
      withdrawal: {
        botTextKey: 'supportBot.withdrawal.text',
        options: [
          { id: 'withdrawal_add_bank', labelKey: 'supportBot.withdrawal.cannotAddBank', next: 'withdrawal_add_bank' },
          { id: 'withdrawal_status', labelKey: 'supportBot.withdrawal.paymentStatus', next: 'withdrawal_status' },
          { id: 'withdrawal_amount', labelKey: 'supportBot.withdrawal.withdrawalAmount', next: 'withdrawal_amount' },
          { id: 'withdrawal_not_received', labelKey: 'supportBot.withdrawal.notReceived', next: 'withdrawal_not_received' },
        ],
      },
      orders_cancel: { botTextKey: 'supportBot.ordersCancel.text', options: [{ id: 'back', labelKey: 'supportBot.common.back', next: 'orders' }] },
      orders_contact: { botTextKey: 'supportBot.ordersContact.text', options: [{ id: 'back', labelKey: 'supportBot.common.back', next: 'orders' }] },
      orders_customer_cancel: { botTextKey: 'supportBot.ordersCustomerCancel.text', options: [{ id: 'back', labelKey: 'supportBot.common.back', next: 'orders' }] },
      wallet_withdraw_not_credited: { botTextKey: 'supportBot.walletWithdrawNotCredited.text', options: [{ id: 'back', labelKey: 'supportBot.common.back', next: 'wallet' }] },
      wallet_dues_not_reflecting: { botTextKey: 'supportBot.walletDuesNotReflecting.text', options: [{ id: 'back', labelKey: 'supportBot.common.back', next: 'wallet' }] },
      wallet_processing: { botTextKey: 'supportBot.walletProcessing.text', options: [{ id: 'back', labelKey: 'supportBot.common.back', next: 'wallet' }] },
      wallet_status: { botTextKey: 'supportBot.walletStatus.text', options: [{ id: 'back', labelKey: 'supportBot.common.back', next: 'wallet' }] },
      withdrawal_add_bank: { botTextKey: 'supportBot.withdrawalAddBank.text', options: [{ id: 'back', labelKey: 'supportBot.common.back', next: 'withdrawal' }] },
      withdrawal_status: { botTextKey: 'supportBot.withdrawalStatus.text', options: [{ id: 'back', labelKey: 'supportBot.common.back', next: 'withdrawal' }] },
      withdrawal_amount: { botTextKey: 'supportBot.withdrawalAmountHelp.text', options: [{ id: 'back', labelKey: 'supportBot.common.back', next: 'withdrawal' }] },
      withdrawal_not_received: { botTextKey: 'supportBot.withdrawalNotReceived.text', options: [{ id: 'back', labelKey: 'supportBot.common.back', next: 'withdrawal' }] },
      end_ready: { botTextKey: 'supportBot.endReady.text', options: [] },
    }),
    []
  );

  const currentNode = FLOW[nodeId] || FLOW.root;

  const renderTicketText = (m) => {
    const key = m?.textKey;
    let out = key ? t(key) : (m?.text || '');
    const params = m?.params;
    if (out && params && typeof params === 'object') {
      for (const [k, v] of Object.entries(params)) {
        out = out.replace(`{${k}}`, String(v));
      }
    }
    return out;
  };

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
        setTicketStatus('completed');
        await AsyncStorage.removeItem(TICKET_KEY);
      }
    } catch (_) {}
  };

  const selectOption = async (opt) => {
    if (!opt) return;
    const label = t(opt.labelKey);

    // Destructive support action: must confirm before unassign + 8h pickup/apply block
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
      Alert.alert(t('supportBot.orders.cancelConfirmTitle'), t('supportBot.orders.cancelConfirmBody'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('supportBot.orders.cancelConfirmContinue'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
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
                if (resp?.success && resp.ticket) {
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
              } catch (_) {}
              const botTextKey = (FLOW[opt.next] || FLOW.root).botTextKey;
              setNodeId(opt.next);
              setTimeout(() => {
                pushBotNode(opt.next);
                setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
              }, 250);
              try {
                await supportAPI.append(ticketId, { userTextKey: opt.labelKey, botTextKey, nextNodeId: opt.next });
              } catch (_) {}
            })();
          },
        },
      ]);
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
        )}
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

