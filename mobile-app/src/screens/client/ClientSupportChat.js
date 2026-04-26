/**
 * Client support chat — guided quick replies for cancel job / unassign freelancer.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { spacing, typography } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supportAPI } from '../../api';
import clientJobsAPI from '../../api/clientJobs';

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
    loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: spacing.xxl },
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

export default function ClientSupportChat({ onBack, onEndChat, bootstrapTicketRef }) {
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
          },
          {
            id: 'cat_unassign',
            labelKey: 'supportClientBot.category.unassignFreelancer',
          },
        ],
      },
      client_cancel_ask_job: {
        botTextKey: 'supportClientBot.root.text',
        options: [
          {
            id: 'cancel_job_yes',
            labelKey: 'supportBot.common.yes',
            action: 'confirm_delete_job',
          },
          {
            id: 'cancel_job_no',
            labelKey: 'supportBot.common.no',
            action: 'reject_cancel_not_this_job',
          },
        ],
      },
      client_unassign_ask: {
        botTextKey: 'supportClientBot.unassignAskAboutJob',
        options: [
          {
            id: 'unassign_yes',
            labelKey: 'supportBot.common.yes',
            action: 'unassign_confirm_yes',
          },
          {
            id: 'unassign_no',
            labelKey: 'supportBot.common.no',
            action: 'unassign_confirm_no',
          },
        ],
      },
      end_ready: { botTextKey: 'supportBot.endReady.text', options: [] },
    }),
    []
  );

  const [messages, setMessages] = useState([]);
  const [initializing, setInitializing] = useState(true);
  const [initError, setInitError] = useState(null);
  const [nodeId, setNodeId] = useState('client_root');
  const [ticketId, setTicketId] = useState(null);
  const [ticketStatus, setTicketStatus] = useState('open');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [unassignLoading, setUnassignLoading] = useState(false);
  const [pendingCancelJobId, setPendingCancelJobId] = useState(null);
  const [pendingUnassignJobId, setPendingUnassignJobId] = useState(null);

  const flatListRef = useRef(null);

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

  const hydrateFromTicket = useCallback(
    (ticket) => {
      setTicketId(String(ticket._id));
      setTicketStatus(ticket.status || 'open');
      setNodeId(ticket.currentNodeId || 'client_root');
      const msgs = ticketMessagesForDisplay(ticket).map((m) => ({
        _id: m._id || nowId(),
        sender: m.sender === 'user' ? user?.id || user?._id : m.sender,
        message: renderTicketText(m),
        createdAt: m.createdAt || new Date(),
      }));
      setMessages(msgs);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 0);
    },
    [renderTicketText, user?.id, user?._id]
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setInitializing(true);
      setInitError(null);

      const boot = bootstrapTicketRef?.current;
      if (boot?._id) {
        bootstrapTicketRef.current = null;
        hydrateFromTicket(boot);
        if (!cancelled) setInitializing(false);
        return;
      }

      try {
        const id = await AsyncStorage.getItem(TICKET_KEY);
        if (id) {
          const resp = await supportAPI.getTicket(id);
          if (!cancelled && resp?.success && resp.ticket && resp.ticket.status === 'open') {
            hydrateFromTicket(resp.ticket);
            setInitializing(false);
            return;
          }
          await AsyncStorage.removeItem(TICKET_KEY);
        }

        const resp = await supportAPI.startTicket();
        if (cancelled) return;
        if (resp?.success && resp.ticket?._id) {
          await AsyncStorage.setItem(TICKET_KEY, String(resp.ticket._id));
          hydrateFromTicket(resp.ticket);
        } else {
          setInitError(t('support.clientInitFailed'));
        }
      } catch (_) {
        if (!cancelled) setInitError(t('support.clientInitFailed'));
      } finally {
        if (!cancelled) setInitializing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-time load; avoid re-init when user/hydrate updates
  }, []);

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

  const retryInit = async () => {
    setInitError(null);
    setInitializing(true);
    try {
      const resp = await supportAPI.startTicket();
      if (resp?.success && resp.ticket?._id) {
        await AsyncStorage.setItem(TICKET_KEY, String(resp.ticket._id));
        hydrateFromTicket(resp.ticket);
      } else {
        setInitError(t('support.clientInitFailed'));
      }
    } catch (_) {
      setInitError(t('support.clientInitFailed'));
    } finally {
      setInitializing(false);
    }
  };

  const endChat = async () => {
    if (!ticketId) return;
    try {
      const resp = await supportAPI.complete(ticketId);
      if (resp?.success) {
        await AsyncStorage.removeItem(TICKET_KEY);
        // After ending, always return to Support page (avoid immediately creating a new ticket).
        if (typeof onEndChat === 'function') {
          onEndChat();
        } else {
          onBack?.();
        }
      }
    } catch (_) {}
  };

  const goToMainMenu = useCallback(async () => {
    setNodeId('client_root');
    setPendingCancelJobId(null);
    setPendingUnassignJobId(null);
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

  const handleOption = async (opt) => {
    if (!opt) return;
    if (!ticketId) return;
    const label = t(opt.labelKey);

    if (opt.id === 'cat_cancel') {
      setCancelLoading(true);
      setPendingCancelJobId(null);
      try {
        let r = await supportAPI.append(ticketId, {
          userTextKey: 'supportClientBot.category.cancelJob',
        });
        if (r?.ticket) applyTicketFromResponse(r.ticket);

        const ctx = await clientJobsAPI.getSupportCancelContext();
        if (!ctx?.success || !ctx.hasJob) {
          r = await supportAPI.append(ticketId, {
            botTextKey: 'supportClientBot.cancelNoActiveJob',
            nextNodeId: 'end_ready',
          });
          if (r?.ticket) applyTicketFromResponse(r.ticket);
          return;
        }

        const budget = Math.round(Number(ctx.job.budget ?? 0));
        r = await supportAPI.append(ticketId, {
          botTextKey: 'supportClientBot.cancelAskAboutJob',
          botParams: { title: ctx.job.title || '—', budget: String(budget) },
          nextNodeId: 'client_cancel_ask_job',
        });
        if (r?.ticket) applyTicketFromResponse(r.ticket);
        setPendingCancelJobId(String(ctx.job._id));
        setNodeId('client_cancel_ask_job');
      } catch (_) {
        /* ignore */
      } finally {
        setCancelLoading(false);
      }
      return;
    }

    if (opt.id === 'cat_unassign') {
      setUnassignLoading(true);
      setPendingUnassignJobId(null);
      try {
        let r = await supportAPI.append(ticketId, {
          userTextKey: 'supportClientBot.category.unassignFreelancer',
        });
        if (r?.ticket) applyTicketFromResponse(r.ticket);

        const ctx = await clientJobsAPI.getSupportUnassignContext();
        if (!ctx?.success || !ctx.hasJob) {
          r = await supportAPI.append(ticketId, {
            botTextKey: 'supportClientBot.unassignNoActiveJob',
            nextNodeId: 'end_ready',
          });
          if (r?.ticket) applyTicketFromResponse(r.ticket);
          return;
        }

        r = await supportAPI.append(ticketId, {
          botTextKey: 'supportClientBot.unassignAskAboutJob',
          botParams: {
            title: ctx.job.title || '—',
            freelancerName: ctx.job.freelancerName || '—',
          },
          nextNodeId: 'client_unassign_ask',
        });
        if (r?.ticket) applyTicketFromResponse(r.ticket);
        setPendingUnassignJobId(String(ctx.job._id));
        setNodeId('client_unassign_ask');
      } catch (_) {
        /* ignore */
      } finally {
        setUnassignLoading(false);
      }
      return;
    }

    if (opt.action === 'unassign_confirm_yes') {
      if (!pendingUnassignJobId) return;
      try {
        let r = await supportAPI.append(ticketId, { userTextKey: 'supportBot.common.yes' });
        if (r?.ticket) applyTicketFromResponse(r.ticket);
        const resp = await supportAPI.clientUnassign(ticketId, pendingUnassignJobId);
        if (resp?.success && resp.ticket) {
          applyTicketFromResponse(resp.ticket);
          setPendingUnassignJobId(null);
        }
      } catch (_) {}
      return;
    }

    if (opt.action === 'unassign_confirm_no') {
      try {
        const r = await supportAPI.append(ticketId, {
          userTextKey: 'supportBot.common.no',
          botTextKey: 'supportClientBot.unassignRejectNo',
          nextNodeId: 'end_ready',
        });
        if (r?.ticket) applyTicketFromResponse(r.ticket);
        setPendingUnassignJobId(null);
      } catch (_) {}
      return;
    }

    if (opt.action === 'confirm_delete_job') {
      if (!pendingCancelJobId) return;
      try {
        const r = await supportAPI.clientConfirmDeleteJob(ticketId, pendingCancelJobId);
        if (r?.success && r.ticket) {
          applyTicketFromResponse(r.ticket);
          setPendingCancelJobId(null);
        }
      } catch (_) {}
      return;
    }

    if (opt.action === 'reject_cancel_not_this_job') {
      try {
        const r = await supportAPI.append(ticketId, {
          userTextKey: 'supportBot.common.no',
          botTextKey: 'supportClientBot.cancelWrongJob',
          nextNodeId: 'end_ready',
        });
        if (r?.ticket) applyTicketFromResponse(r.ticket);
        setPendingCancelJobId(null);
      } catch (_) {}
      return;
    }
  };

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
          {initializing ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.primary.main} />
            </View>
          ) : initError ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{initError}</Text>
              <TouchableOpacity style={[styles.startChatButton, { marginTop: spacing.lg }]} onPress={retryInit} activeOpacity={0.85}>
                <Text style={styles.startChatText}>{t('common.retry')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
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
                  <Text style={styles.emptyText}>{t('support.recentTicketsEmpty')}</Text>
                </View>
              }
            />
          )}
        </View>

        <View style={styles.composer}>
          {initializing || initError ? null : cancelLoading || unassignLoading ? (
            <View style={{ paddingVertical: spacing.md, alignItems: 'center' }}>
              <ActivityIndicator color={colors.primary.main} />
            </View>
          ) : ticketStatus !== 'open' ? null : nodeId === 'end_ready' ? (
            <TouchableOpacity style={styles.startChatButton} onPress={endChat} activeOpacity={0.85}>
              <MaterialIcons name="check-circle" size={20} color="#FFFFFF" />
              <Text style={styles.startChatText}>{t('supportBot.endChat')}</Text>
            </TouchableOpacity>
          ) : (
            <View>
              <View style={styles.quickReplies}>
                {(currentNode?.options || []).map((opt) => {
                  const isPrimary =
                    opt.id === 'cat_cancel' ||
                    opt.id === 'cat_unassign' ||
                    opt.id === 'cancel_job_yes' ||
                    opt.id === 'unassign_yes';
                  const isDanger = false;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[
                        styles.quickReply,
                        isPrimary && styles.quickReplyPrimary,
                        isDanger && styles.quickReplyDanger,
                      ]}
                      onPress={() => handleOption(opt)}
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
