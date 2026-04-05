/**
 * Shown on freelancer dashboard when OS notification permission is not granted.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, AppState, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { spacing, typography } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { registerPushTokenAsync } from '../../utils/pushNotifications';
import { useAuth } from '../../context/AuthContext';

export default function NotificationPermissionBanner() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { colors } = useTheme();
  const [status, setStatus] = useState(null);

  const refresh = useCallback(async () => {
    if (Platform.OS === 'web') {
      setStatus('denied');
      return;
    }
    try {
      const { status: s } = await Notifications.getPermissionsAsync();
      setStatus(s);
    } catch {
      setStatus('denied');
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Instant updates: refresh on any app state change + poll while app is foregrounded.
  useEffect(() => {
    let intervalId = null;
    const POLL_MS = 1500;

    const startPolling = () => {
      if (intervalId) return;
      intervalId = setInterval(() => {
        refresh();
      }, POLL_MS);
    };
    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const sub = AppState.addEventListener('change', (nextState) => {
      refresh();
      if (nextState === 'active') {
        startPolling();
      } else {
        stopPolling();
      }
    });

    if (AppState.currentState === 'active') {
      startPolling();
    }

    return () => {
      sub?.remove();
      stopPolling();
    };
  }, [refresh]);

  const onAllow = async () => {
    const { status: next } = await Notifications.requestPermissionsAsync();
    setStatus(next);
    if (next === 'granted') {
      const uid = user?._id || user?.id;
      await registerPushTokenAsync(uid);
    }
  };

  if (status === null || status === 'granted' || status === 'provisional') return null;

  const styles = createStyles(colors);

  return (
    <View style={styles.wrapper}>
      <View style={styles.banner}>
        <MaterialIcons name="notifications-off" size={18} color="#FFFFFF" />
        <Text style={styles.text} numberOfLines={3}>
          {t('permissions.notificationsBanner')}
        </Text>
        {status === 'undetermined' ? (
          <TouchableOpacity style={styles.actionBtn} onPress={onAllow} activeOpacity={0.85}>
            <Text style={styles.actionText}>{t('permissions.allowNotifications')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.actionBtn} onPress={() => Linking.openSettings()} activeOpacity={0.85}>
            <Text style={styles.actionText}>{t('permissions.openSettings')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    wrapper: {
      marginHorizontal: spacing.md,
      marginBottom: spacing.xs,
      maxWidth: '100%',
    },
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      backgroundColor: colors.primary.main,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      gap: spacing.xs,
      borderRadius: 10,
      overflow: 'hidden',
    },
    text: {
      ...typography.small,
      color: '#FFFFFF',
      fontWeight: '600',
      flex: 1,
      flexShrink: 1,
      minWidth: 0,
    },
    actionBtn: {
      paddingVertical: 4,
      paddingHorizontal: spacing.sm,
    },
    actionText: {
      ...typography.small,
      color: '#FFFFFF',
      fontWeight: '700',
      textDecorationLine: 'underline',
    },
  });
}
