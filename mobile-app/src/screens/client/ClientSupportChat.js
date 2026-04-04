/**
 * Client support chat — guided quick replies for cancel job / unassign freelancer.
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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { spacing, typography } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supportAPI } from '../../api';

const BOT_BLOCKED_8H_TEXT_KEY = 'supportTicket.bot.blocked8hAndEnd';

function ticketMessagesForDisplay(ticket) {
  const msgs = ticket?.messages || [];
  const hasActiveUnassignEffect =
    Boolean(ticket?.effects?.unassignedJobId) || Boolean(ticket?.effects?.pickupBlockedUntil);
  if (hasActiveUnassignEffect) return msgs;
  return msgs.filter((m) => m.textKey !== BOT_BLOCKED_8H_TEXT_KEY);
}

function createStyles(colors, insets) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.cardBackground,
    },
    backButton: { padding: spacing.xs, marginRight: spacing.sm },
    headerName: { flex: 1, ...typography.h3, color: colors.text.primary },
    headerSpacer: { width: 40 },
    messagesContainer: { flex: 1 },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: spacing.xxl,
      paddingHorizontal: spacing.lg,
    },
    emptyText: { ...typography.body, color: colors.text.muted, textAlign: 'center' },
    messagesList: { padding: spacing.md, paddingBottom: spacing.lg },
    messageContainer: { marginBottom: spacing.sm },
    myMessage: { alignItems: 'flex-end' },
    otherMessage: { alignItems: 'flex-start' },
    messageBubble: { maxWidth: '75%', padding: spacing.md, borderRadius: spacing.md },
    myMessageBubble: { backgroundColor: colors.primary.main },
    otherMessageBubble: {
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.border,
    },
    messageText: { ...typography.body, lineHeight: 20 },
    myMessageText: { color: '#FFFFFF' },
    otherMessageText: { color: colors.text.primary },
    messageFooter: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs, gap: spacing.xs },
    messageTime: { ...typography.small, fontSize: 11 },
    myMessageTime: { color: 'rgba(255, 255, 255, 0.7)' },
    otherMessageTime: { color: colors.text.muted },
    composer: {
      padding: spacing.md,
      paddingBottom: spacing.md + Math.max(insets?.bottom || 0, 0),
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.cardBackground,
      gap: spacing.md,
    },
    quickReplies: { flexDirection: 'column', gap: spacing.sm },
    quickReply: {
      borderRadius: spacing.md,
      paddingVertical: 10,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      width: '100%',
    },
    quickReplyPrimary: { borderColor: colors.primary.main, backgroundColor: colors.primary.light },
    quickReplyDanger: { borderColor: colors.error.main, backgroundColor: colors.error.light },
    quickReplyText: { ...typography.small, color: colors.text.primary, fontWeight: '700' },
    startChatButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      borderRadius: spacing.md,
      backgroundColor: colors.primary.main,
    },
    startChatText: { ...typography.button, color: '#FFFFFF' },
    modalRoot: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    modalBackdrop: { ...StyleSheet.absoluteFillObject },
    modalCard: {
      width: '100%',
      maxWidth: 400,
      backgroundColor: colors.cardBackground,
      borderRadius: spacing.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalTitle: { ...typography.h3, color: colors.text.primary, marginBottom: spacing.sm },
    modalBody: { ...typography.body, color: colors.text.secondary, lineHeight: 22, marginBottom: spacing.lg },
    modalActions: { flexDirection: 'row', gap: spacing.sm },
    modalButtonSecondary: {
      flex: 1,
      paddingVertical: spacing.md,
      borderRadius: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      alignItems: 'center',
    },
    modalButtonSecondaryText: { ...typography.button, color: colors.text.primary, fontSize: 15 },
    modalButtonPrimary: {
      flex: 1,
      paddingVertical: spacing.md,
      borderRadius: spacing.md,
      backgroundColor: colors.primary.main,
      alignItems: 'center',
    },
    modalButtonPrimaryText: { ...typography.button, color: '#FFFFFF', fontSize: 15 },
    mainMenuRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.sm,
      marginTop: spacing.xs,
    },
    mainMenuText: { ...typography.small, color: colors.text.muted, fontWeight: '600' },
  });
}

export default function ClientSupportChat({ onBack, bootstrapTicketRef }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, insets), [colors, insets]);

  const FLOW = useMemo(
    () => ({
      client_root: {
        botTextKey: 'supportClientBot.root.text',
        options: [
          {
            id: 'cat_cancel',
            labelKey: 'supportClientBot.category.cancelJob',
            next: 'client_cancel_confirm',
          },
          {
            id: 'cat_unassign',
            labelKey: 'supportClientBot.category.unassignFreelancer',
            next: 'client_unassign_confirm',
          },
        ],
      },
      client_cancel_confirm: {
        botTextKey: 'supportClientBot.cancelJob.detail',
        options: [{ id: 'confirm_cancel_job', labelKey: 'supportClientBot.confirmProceed', action: 'cancel_job' }],
      },
      client_unassign_confirm: {
        botTextKey: 'supportClientBot.unassign.detail',
        options: [{ id: 'confirm_unassign', labelKey: 'supportClientBot.confirmProceed', action: 'unassign' }],
      },
      end_ready: { botTextKey: 'supportBot.endReady.text', options: [] },
    }),
    []
  );

  const [messages, setMessages] = useState([]);
  const [chatStarted, setChatStarted] = useState(false);
  const [nodeId, setNodeId] = useState('client_root');
  const [ticketId, setTicketId] = useState(null);
  const [ticketStatus, setTicketStatus] = useState('open');
  const [destructiveModal, setDestructiveModal] = useState(null);

  const flatListRef = useRef(null);
  const pendingDestructiveRef = useRef(null);
  const skipStorageHydrationRef = useRef(false);

  const nowId = () => `m_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const TICKET_KEY = 'supportTicketId';

  const currentNode = FLOW[nodeId] || FLOW.client_root;

  const renderTicketText = useCallback((m) => {
    const key = m?.textKey;
    let out = key ? t(key) : m?.text || '';
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
    setNodeId(boot.currentNodeId || 'client_root');
    const msgs = ticketMessagesForDisplay(boot).map((m) => ({
      _id: m._id || nowId(),
      sender: m.sender === 'user' ? user?.id || user?._id : m.sender,
      message: renderTicketText(m),
      createdAt: m.createdAt || new Date(),
    }));
    setMessages(msgs);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pushBotNode = (id) => {
    const node = FLOW[id] || FLOW.client_root;
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

  const applyTicketFromResponse = (respTicket) => {
    if (!respTicket) return;
    setNodeId(respTicket.currentNodeId || 'end_ready');
    setTicketStatus(respTicket.status || 'open');
    const msgs = ticketMessagesForDisplay(respTicket).map((m) => ({
      _id: m._id || nowId(),
      sender: m.sender === 'user' ? user?.id || user?._id : m.sender,
      message: renderTicketText(m),
      createdAt: m.createdAt || new Date(),
    }));
    setMessages(msgs);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
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
      setNodeId(resp.ticket.currentNodeId || 'client_root');
      const msgs = ticketMessagesForDisplay(resp.ticket).map((m) => ({
        _id: m._id || nowId(),
        sender: m.sender === 'user' ? user?.id || user?._id : m.sender,
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
    setNodeId('client_root');
    if (ticketId) {
      try {
        await supportAPI.append(ticketId, {
          botTextKey: 'supportClientBot.root.text',
          nextNodeId: 'client_root',
        });
      } catch (_) {}
    }
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, [ticketId]);

  const runDestructiveAction = async () => {
    const p = pendingDestructiveRef.current;
    setDestructiveModal(null);
    pendingDestructiveRef.current = null;
    if (!p || !ticketId) return;
    const { opt, label, action } = p;
    const userMsg = {
      _id: nowId(),
      sender: user?.id || user?._id || 'me',
      message: label,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    try {
      await supportAPI.append(ticketId, { userTextKey: opt.labelKey });
      const resp =
        action === 'cancel_job'
          ? await supportAPI.clientCancelJob(ticketId)
          : await supportAPI.clientUnassign(ticketId);
      if (resp?.success && resp.ticket) {
        applyTicketFromResponse(resp.ticket);
        return;
      }
    } catch (_) {}
    pushBotNode('end_ready');
    setNodeId('end_ready');
  };

  const selectOption = async (opt) => {
    if (!opt) return;
    const label = t(opt.labelKey);

    if (opt.action === 'cancel_job' || opt.action === 'unassign') {
      if (!ticketId) {
        setMessages((prev) => [
          ...prev,
          { _id: nowId(), sender: user?.id || user?._id || 'me', message: label, createdAt: new Date() },
        ]);
        return;
      }
      pendingDestructiveRef.current = { opt, label, action: opt.action };
      setDestructiveModal(opt.action);
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

    const botTextKey = (FLOW[opt.next] || FLOW.client_root).botTextKey;
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
          setNodeId(resp.ticket.currentNodeId || 'client_root');
          const msgs = ticketMessagesForDisplay(resp.ticket).map((m) => ({
            _id: m._id || nowId(),
            sender: m.sender === 'user' ? user?.id || user?._id : m.sender,
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
          </View>
        </View>
      </View>
    );
  };

  const modalTitle =
    destructiveModal === 'cancel_job'
      ? t('supportClientBot.cancelConfirmTitle')
      : destructiveModal === 'unassign'
        ? t('supportClientBot.unassignConfirmTitle')
        : '';
  const modalBody =
    destructiveModal === 'cancel_job'
      ? t('supportClientBot.cancelConfirmBody')
      : destructiveModal === 'unassign'
        ? t('supportClientBot.unassignConfirmBody')
        : '';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
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
                  const isPrimary = opt.id === 'cat_cancel' || opt.id === 'cat_unassign';
                  const isDanger = Boolean(opt.action);
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[
                        styles.quickReply,
                        isPrimary && styles.quickReplyPrimary,
                        isDanger && styles.quickReplyDanger,
                      ]}
                      onPress={() => selectOption(opt)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.quickReplyText}>{t(opt.labelKey)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {nodeId !== 'client_root' ? (
                <TouchableOpacity style={styles.mainMenuRow} onPress={goToMainMenu} activeOpacity={0.7}>
                  <MaterialIcons name="arrow-back" size={18} color={colors.text.muted} />
                  <Text style={styles.mainMenuText}>{t('supportBot.common.mainMenu')}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}
        </View>

        <Modal
          visible={Boolean(destructiveModal)}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setDestructiveModal(null);
            pendingDestructiveRef.current = null;
          }}
        >
          <View style={styles.modalRoot}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={() => {
                setDestructiveModal(null);
                pendingDestructiveRef.current = null;
              }}
            />
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{modalTitle}</Text>
              <Text style={styles.modalBody}>{modalBody}</Text>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalButtonSecondary}
                  onPress={() => {
                    setDestructiveModal(null);
                    pendingDestructiveRef.current = null;
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.modalButtonSecondaryText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalButtonPrimary} onPress={runDestructiveAction} activeOpacity={0.85}>
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
