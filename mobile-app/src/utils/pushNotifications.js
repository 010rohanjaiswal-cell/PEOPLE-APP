/**
 * Push Notifications - People App (Expo Push API / Option A)
 * Registers Expo push token with backend so server can send push when app is in background/closed.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { userAPI } from '../api/user';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Basename only — must match a file listed under `expo-notifications` → `sounds` in app.json */
export const NOTIFICATION_SOUND = 'notification_sound.wav';

// Show notification when app is in foreground (optional: banner + sound)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Android 8+: custom sound plays only if the channel is configured with the same filename.
 * Call once at app startup (before pushes are received).
 */
export async function ensureNotificationChannelAsync() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.MAX,
    sound: NOTIFICATION_SOUND,
    vibrationPattern: [0, 250, 250, 250],
    enableVibrate: true,
  });
}

/**
 * Request permission and get Expo push token; register with backend.
 * Call when user is authenticated.
 */
export async function registerPushTokenAsync() {
  if (Platform.OS === 'web') return null;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let final = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      final = status;
    }
    if (final !== 'granted') return null;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const tokenResult = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    const token = tokenResult?.data;
    if (!token) return null;

    // Avoid spamming backend on every user/profile refresh
    const key = `pushToken:lastRegistered:${Platform.OS}`;
    const last = await AsyncStorage.getItem(key);
    if (last && last === token) {
      return token;
    }

    await userAPI.registerPushToken(token, Platform.OS);
    await AsyncStorage.setItem(key, token);
    return token;
  } catch (e) {
    console.warn('Push registration failed:', e?.message);
    return null;
  }
}

/**
 * Add listener for when user taps a notification. Pass a callback that receives the notification data.
 * @param {function(data: object)} onNotificationTapped - callback with data (type, notificationId, etc.)
 */
export function addNotificationResponseListener(onNotificationTapped) {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data || {};
    onNotificationTapped(data);
  });
}

/** Current OS notification permission; 'granted' | 'denied' | 'undetermined' */
export async function getNotificationPermissionStatus() {
  if (Platform.OS === 'web') return 'denied';
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  } catch {
    return 'denied';
  }
}

export async function requestNotificationPermissionFromSettingsFlow() {
  if (Platform.OS === 'web') return false;
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}
