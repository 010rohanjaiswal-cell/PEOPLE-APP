import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { spacing, typography } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supportAPI } from '../../api';

const SUPPORT_PHONE = '+917021098460';
const SUPPORT_TICKET_ID_KEY = 'supportTicketId';

function createStyles(colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: spacing.lg,
      gap: spacing.lg,
    },
    title: {
      ...typography.h2,
      color: colors.text.primary,
    },
    subtitle: {
      ...typography.body,
      color: colors.text.secondary,
      marginTop: spacing.xs,
    },
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      gap: spacing.md,
    },
    ticketsCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    ticketsTitle: {
      ...typography.h3,
      color: colors.text.primary,
    },
    ticketRow: {
      paddingVertical: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 4,
    },
    ticketRowFirst: {
      borderTopWidth: 0,
      paddingTop: 0,
    },
    ticketTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    ticketTime: {
      ...typography.small,
      color: colors.text.muted,
      flex: 1,
    },
    ticketBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      flexShrink: 0,
    },
    ticketBadgeOpen: {
      backgroundColor: colors.pending?.light || '#FEF9C3',
    },
    ticketBadgeCompleted: {
      backgroundColor: colors.success.light,
    },
    ticketBadgeText: {
      ...typography.small,
      fontWeight: '700',
    },
    ticketBadgeTextOpen: {
      color: colors.pending?.main || '#CA8A04',
    },
    ticketBadgeTextCompleted: {
      color: colors.success.dark,
    },
    ticketPreview: {
      ...typography.body,
      color: colors.text.primary,
    },
    actionRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    action: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      borderRadius: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    actionPrimary: {
      backgroundColor: colors.primary.main,
      borderColor: colors.primary.main,
    },
    actionText: {
      ...typography.button,
      color: colors.text.primary,
    },
    actionTextPrimary: {
      color: '#FFFFFF',
    },
    sectionLabel: {
      ...typography.small,
      color: colors.text.muted,
      fontWeight: '700',
      marginBottom: spacing.xs,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    categoryRow: {
      gap: spacing.sm,
    },
    categoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderRadius: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    categoryChipText: {
      ...typography.body,
      color: colors.text.primary,
      fontWeight: '600',
      flex: 1,
    },
  });
}

export default function ClientSupport({ onNavigate }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const handleCall = () => {
    Linking.openURL(`tel:${SUPPORT_PHONE}`);
  };

  const loadTickets = async () => {
    try {
      setLoadingTickets(true);
      const resp = await supportAPI.listTickets(7);
      if (resp?.success) {
        const list = resp.tickets || [];
        setTickets(list);
        const ids = new Set(list.map((tk) => String(tk._id)));
        const stored = await AsyncStorage.getItem(SUPPORT_TICKET_ID_KEY);
        if (stored && !ids.has(stored)) {
          await AsyncStorage.removeItem(SUPPORT_TICKET_ID_KEY);
        }
      } else {
        setTickets([]);
      }
    } catch (_) {
      setTickets([]);
    } finally {
      setLoadingTickets(false);
    }
  };

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await loadTickets();
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const startChat = async (category) => {
    try {
      const body =
        category === 'cancel_job' || category === 'unassign_freelancer' ? { category } : {};
      const resp = await supportAPI.startTicket(body);
      if (resp?.success && resp.ticket?._id) {
        await AsyncStorage.setItem(SUPPORT_TICKET_ID_KEY, String(resp.ticket._id));
        onNavigate?.('SupportChat', { bootstrapTicket: resp.ticket });
        loadTickets();
        return;
      }
    } catch (_) {
      // fallthrough
    }
    onNavigate?.('SupportChat');
  };

  const openTicket = async (ticketId) => {
    await AsyncStorage.setItem(SUPPORT_TICKET_ID_KEY, String(ticketId));
    try {
      const resp = await supportAPI.getTicket(String(ticketId));
      if (resp?.success && resp.ticket) {
        onNavigate?.('SupportChat', { bootstrapTicket: resp.ticket });
        return;
      }
    } catch (_) {
      // fallthrough
    }
    onNavigate?.('SupportChat');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ gap: spacing.lg }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary.main]}
          tintColor={colors.primary.main}
        />
      }
    >
      <View>
        <Text style={styles.title}>{t('support.title')}</Text>
        <Text style={styles.subtitle}>{t('support.subtitle')}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>{t('support.categoriesTitle')}</Text>
        <View style={styles.categoryRow}>
          <TouchableOpacity
            style={styles.categoryChip}
            onPress={() => startChat('cancel_job')}
            activeOpacity={0.85}
          >
            <MaterialIcons name="cancel" size={22} color={colors.error.main} />
            <Text style={styles.categoryChipText}>{t('supportClientBot.category.cancelJob')}</Text>
            <MaterialIcons name="chevron-right" size={22} color={colors.text.muted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.categoryChip}
            onPress={() => startChat('unassign_freelancer')}
            activeOpacity={0.85}
          >
            <MaterialIcons name="person-off" size={22} color={colors.text.primary} />
            <Text style={styles.categoryChipText}>{t('supportClientBot.category.unassignFreelancer')}</Text>
            <MaterialIcons name="chevron-right" size={22} color={colors.text.muted} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.action} onPress={handleCall} activeOpacity={0.85}>
            <MaterialIcons name="phone" size={20} color={colors.text.primary} />
            <Text style={styles.actionText}>{t('support.callToUs')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.action, styles.actionPrimary]}
            onPress={() => startChat()}
            activeOpacity={0.85}
          >
            <MaterialIcons name="chat" size={20} color="#FFFFFF" />
            <Text style={[styles.actionText, styles.actionTextPrimary]}>{t('support.chatWithUs')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.ticketsCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.ticketsTitle}>{t('support.recentTickets')}</Text>
          {loadingTickets ? <ActivityIndicator size="small" color={colors.primary.main} /> : null}
        </View>
        {tickets.length === 0 && !loadingTickets ? (
          <Text style={styles.ticketPreview}>{t('support.recentTicketsEmpty')}</Text>
        ) : (
          tickets.map((tk, idx) => {
            const last = (tk.messages || []).slice(-1)[0];
            const statusRaw = (tk.status || 'open').toString().toLowerCase();
            const isCompleted = statusRaw === 'completed';
            return (
              <TouchableOpacity
                key={tk._id || idx}
                style={[styles.ticketRow, idx === 0 && styles.ticketRowFirst]}
                onPress={() => openTicket(tk._id)}
                activeOpacity={0.85}
              >
                <View style={styles.ticketTop}>
                  <Text style={styles.ticketTime} numberOfLines={1}>
                    {tk.updatedAt ? new Date(tk.updatedAt).toLocaleString() : ''}
                  </Text>
                  <View
                    style={[
                      styles.ticketBadge,
                      isCompleted ? styles.ticketBadgeCompleted : styles.ticketBadgeOpen,
                    ]}
                  >
                    <Text
                      style={[
                        styles.ticketBadgeText,
                        isCompleted ? styles.ticketBadgeTextCompleted : styles.ticketBadgeTextOpen,
                      ]}
                    >
                      {isCompleted ? t('support.ticketStatusCompleted') : t('support.ticketStatusOpen')}
                    </Text>
                  </View>
                </View>
                <Text style={styles.ticketPreview} numberOfLines={2}>
                  {last?.textKey ? t(last.textKey) : last?.text || ''}
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}
