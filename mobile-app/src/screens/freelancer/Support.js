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
    ticketStatus: {
      ...typography.small,
      color: colors.text.secondary,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    ticketTime: {
      ...typography.small,
      color: colors.text.muted,
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
    phoneHint: {
      ...typography.small,
      color: colors.text.muted,
      textAlign: 'center',
      marginTop: spacing.xs,
    },
  });
}

export default function Support({ onNavigate }) {
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

  const startChat = async () => {
    try {
      const resp = await supportAPI.startTicket();
      if (resp?.success && resp.ticket?._id) {
        await AsyncStorage.setItem(SUPPORT_TICKET_ID_KEY, String(resp.ticket._id));
        onNavigate?.('SupportChat');
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
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.action} onPress={handleCall} activeOpacity={0.85}>
            <MaterialIcons name="phone" size={20} color={colors.text.primary} />
            <Text style={styles.actionText}>{t('support.callToUs')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.action, styles.actionPrimary]}
            onPress={startChat}
            activeOpacity={0.85}
          >
            <MaterialIcons name="chat" size={20} color="#FFFFFF" />
            <Text style={[styles.actionText, styles.actionTextPrimary]}>{t('support.chatWithUs')}</Text>
          </TouchableOpacity>
        </View>

        {/* Phone hint intentionally hidden to keep buttons compact */}
      </View>

      <View style={styles.ticketsCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.ticketsTitle}>{t('wallet.recentActivity')}</Text>
          {loadingTickets ? <ActivityIndicator size="small" color={colors.primary.main} /> : null}
        </View>
        {tickets.length === 0 && !loadingTickets ? (
          <Text style={styles.ticketPreview}>{t('wallet.recentActivityEmpty')}</Text>
        ) : (
          tickets.map((tk, idx) => {
            const last = (tk.messages || []).slice(-1)[0];
            return (
              <TouchableOpacity
                key={tk._id || idx}
                style={[styles.ticketRow, idx === 0 && styles.ticketRowFirst]}
                onPress={() => openTicket(tk._id)}
                activeOpacity={0.85}
              >
                <View style={styles.ticketTop}>
                  <Text style={styles.ticketStatus}>{tk.status || 'open'}</Text>
                  <Text style={styles.ticketTime}>
                    {tk.updatedAt ? new Date(tk.updatedAt).toLocaleString() : ''}
                  </Text>
                </View>
                <Text style={styles.ticketPreview} numberOfLines={2}>
                  {last?.textKey ? t(last.textKey) : (last?.text || '')}
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

