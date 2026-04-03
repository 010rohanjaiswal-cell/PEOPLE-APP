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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { spacing, typography } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

function createStyles(colors) {
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
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.cardBackground,
      gap: spacing.md,
    },
    quickReplies: {
      flexDirection: 'row',
      flexWrap: 'wrap',
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
      flexGrow: 0,
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
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [messages, setMessages] = useState([]);
  const [chatStarted, setChatStarted] = useState(false);
  const [nodeId, setNodeId] = useState('root');

  const flatListRef = useRef(null);

  const nowId = () => `m_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const FLOW = useMemo(
    () => ({
      root: {
        botTextKey: 'supportBot.root.text',
        options: [
          { id: 'orders', labelKey: 'supportBot.root.orders', next: 'orders' },
          { id: 'wallet', labelKey: 'supportBot.root.wallet', next: 'wallet' },
          { id: 'withdrawal', labelKey: 'supportBot.root.withdrawal', next: 'withdrawal' },
          { id: 'cancel', labelKey: 'supportBot.common.cancelChat', next: 'cancel' },
        ],
      },
      orders: {
        botTextKey: 'supportBot.orders.text',
        options: [
          { id: 'orders_cancel', labelKey: 'supportBot.orders.cancelOrder', next: 'orders_cancel' },
          { id: 'orders_contact', labelKey: 'supportBot.orders.cannotContact', next: 'orders_contact' },
          { id: 'orders_customer_cancel', labelKey: 'supportBot.orders.customerAskingCancel', next: 'orders_customer_cancel' },
          { id: 'cancel', labelKey: 'supportBot.common.cancelChat', next: 'cancel' },
        ],
      },
      wallet: {
        botTextKey: 'supportBot.wallet.text',
        options: [
          { id: 'wallet_withdraw_not_credited', labelKey: 'supportBot.wallet.withdrawnNotCredited', next: 'wallet_withdraw_not_credited' },
          { id: 'wallet_dues_not_reflecting', labelKey: 'supportBot.wallet.duesNotReflecting', next: 'wallet_dues_not_reflecting' },
          { id: 'wallet_processing', labelKey: 'supportBot.wallet.paymentProcessing', next: 'wallet_processing' },
          { id: 'wallet_status', labelKey: 'supportBot.wallet.paymentStatus', next: 'wallet_status' },
          { id: 'cancel', labelKey: 'supportBot.common.cancelChat', next: 'cancel' },
        ],
      },
      withdrawal: {
        botTextKey: 'supportBot.withdrawal.text',
        options: [
          { id: 'withdrawal_add_bank', labelKey: 'supportBot.withdrawal.cannotAddBank', next: 'withdrawal_add_bank' },
          { id: 'withdrawal_status', labelKey: 'supportBot.withdrawal.paymentStatus', next: 'withdrawal_status' },
          { id: 'withdrawal_amount', labelKey: 'supportBot.withdrawal.withdrawalAmount', next: 'withdrawal_amount' },
          { id: 'withdrawal_not_received', labelKey: 'supportBot.withdrawal.notReceived', next: 'withdrawal_not_received' },
          { id: 'cancel', labelKey: 'supportBot.common.cancelChat', next: 'cancel' },
        ],
      },
      orders_cancel: { botTextKey: 'supportBot.ordersCancel.text', options: [{ id: 'back', labelKey: 'supportBot.common.back', next: 'orders' }, { id: 'cancel', labelKey: 'supportBot.common.cancelChat', next: 'cancel' }] },
      orders_contact: { botTextKey: 'supportBot.ordersContact.text', options: [{ id: 'back', labelKey: 'supportBot.common.back', next: 'orders' }, { id: 'cancel', labelKey: 'supportBot.common.cancelChat', next: 'cancel' }] },
      orders_customer_cancel: { botTextKey: 'supportBot.ordersCustomerCancel.text', options: [{ id: 'back', labelKey: 'supportBot.common.back', next: 'orders' }, { id: 'cancel', labelKey: 'supportBot.common.cancelChat', next: 'cancel' }] },
      wallet_withdraw_not_credited: { botTextKey: 'supportBot.walletWithdrawNotCredited.text', options: [{ id: 'back', labelKey: 'supportBot.common.back', next: 'wallet' }, { id: 'cancel', labelKey: 'supportBot.common.cancelChat', next: 'cancel' }] },
      wallet_dues_not_reflecting: { botTextKey: 'supportBot.walletDuesNotReflecting.text', options: [{ id: 'back', labelKey: 'supportBot.common.back', next: 'wallet' }, { id: 'cancel', labelKey: 'supportBot.common.cancelChat', next: 'cancel' }] },
      wallet_processing: { botTextKey: 'supportBot.walletProcessing.text', options: [{ id: 'back', labelKey: 'supportBot.common.back', next: 'wallet' }, { id: 'cancel', labelKey: 'supportBot.common.cancelChat', next: 'cancel' }] },
      wallet_status: { botTextKey: 'supportBot.walletStatus.text', options: [{ id: 'back', labelKey: 'supportBot.common.back', next: 'wallet' }, { id: 'cancel', labelKey: 'supportBot.common.cancelChat', next: 'cancel' }] },
      withdrawal_add_bank: { botTextKey: 'supportBot.withdrawalAddBank.text', options: [{ id: 'back', labelKey: 'supportBot.common.back', next: 'withdrawal' }, { id: 'cancel', labelKey: 'supportBot.common.cancelChat', next: 'cancel' }] },
      withdrawal_status: { botTextKey: 'supportBot.withdrawalStatus.text', options: [{ id: 'back', labelKey: 'supportBot.common.back', next: 'withdrawal' }, { id: 'cancel', labelKey: 'supportBot.common.cancelChat', next: 'cancel' }] },
      withdrawal_amount: { botTextKey: 'supportBot.withdrawalAmountHelp.text', options: [{ id: 'back', labelKey: 'supportBot.common.back', next: 'withdrawal' }, { id: 'cancel', labelKey: 'supportBot.common.cancelChat', next: 'cancel' }] },
      withdrawal_not_received: { botTextKey: 'supportBot.withdrawalNotReceived.text', options: [{ id: 'back', labelKey: 'supportBot.common.back', next: 'withdrawal' }, { id: 'cancel', labelKey: 'supportBot.common.cancelChat', next: 'cancel' }] },
    }),
    []
  );

  const currentNode = FLOW[nodeId] || FLOW.root;

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

  const resetChat = () => {
    setChatStarted(false);
    setNodeId('root');
    setMessages([]);
  };

  const startChat = () => {
    if (!user) return;
    setChatStarted(true);
    setNodeId('root');
    setMessages([
      {
        _id: nowId(),
        sender: 'bot',
        message: t('supportBot.greeting'),
        createdAt: new Date(),
      },
      {
        _id: nowId(),
        sender: 'bot',
        message: t(FLOW.root.botTextKey),
        createdAt: new Date(),
      },
    ]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
  };

  const selectOption = (opt) => {
    if (!opt) return;
    const label = t(opt.labelKey);
    setMessages((prev) => [
      ...prev,
      {
        _id: nowId(),
        sender: user?.id || user?._id || 'me',
        message: label,
        createdAt: new Date(),
      },
    ]);

    if (opt.next === 'cancel') {
      resetChat();
      return;
    }

    setNodeId(opt.next);
    setTimeout(() => {
      pushBotNode(opt.next);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
    }, 250);
  };

  useEffect(() => {
    // keep empty until Start chat
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
        ) : (
          <View style={styles.quickReplies}>
            {(currentNode?.options || []).map((opt) => {
              const isCancel = opt.next === 'cancel';
              const isPrimary = opt.id === 'orders' || opt.id === 'wallet' || opt.id === 'withdrawal';
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.quickReply,
                    isPrimary && styles.quickReplyPrimary,
                    isCancel && styles.quickReplyDanger,
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
  );
}

