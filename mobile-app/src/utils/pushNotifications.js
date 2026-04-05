/**
 * Push Notifications - People App (Expo Push API / Option A)
 * Registers Expo push token with backend so server can send push when app is in background/closed.
 */

import * as Notifications from 'expo-notifications';
import { Platform, Vibration } from 'react-native';
import Constants from 'expo-constants';
import { userAPI } from '../api/user';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Basename only — must match a file listed under `expo-notifications` → `sounds` in app.json */
export const NOTIFICATION_SOUND = 'new_sound.wav';

/**
 * Must match `expo-notifications` plugin `android.defaultChannel` in app.json and `channelId` in Expo push payloads.
 * Using a stable id avoids stale channels from older builds that pointed at the wrong sound.
 */
export const NOTIFICATION_CHANNEL_ID = 'people-alerts-v2';

/** Pattern: wait, vibrate, pause, vibrate (ms) — keep first pulse short so it does not mask notification sound start on some devices */
export const NOTIFICATION_VIBRATION_PATTERN = [0, 90, 120, 90];

// Show notification when app is in foreground (banner + sound + system can vibrate via channel when background)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Android 8+: custom sound is controlled by the channel; remote pushes must use the same `channelId`.
 * Audio attributes help route the sound through the notification stream (not silent / wrong volume).
 */
export async function ensureNotificationChannelAsync() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
    name: 'People alerts',
    importance: Notifications.AndroidImportance.MAX,
    sound: NOTIFICATION_SOUND,
    vibrationPattern: NOTIFICATION_VIBRATION_PATTERN,
    enableVibrate: true,
    enableLights: true,
    showBadge: true,
    audioAttributes: {
      usage: Notifications.AndroidAudioUsage.NOTIFICATION,
      contentType: Notifications.AndroidAudioContentType.SONIFICATION,
      flags: {
        enforceAudibility: true,
        requestHardwareAudioVideoSynchronization: false,
      },
    },
  });
}

/**
 * Vibrate when any notification is delivered while the app is in the foreground (OS may not vibrate otherwise).
 * Background/killed delivery still uses the channel vibration on Android.
 */
export function subscribeForegroundNotificationVibration() {
  return Notifications.addNotificationReceivedListener(() => {
    if (Platform.OS === 'android') {
      // Let the bundled notification sound start first; immediate heavy vibration can delay or duck sound on some OEMs
      setTimeout(() => {
        Vibration.vibrate(NOTIFICATION_VIBRATION_PATTERN);
      }, 120);
    } else {
      Vibration.vibrate(400);
    }
  });
}

/**
 * Request permission and get Expo push token; register with backend.
 * Call when user is authenticated.
 * @param {string} [userId] - Current user id; required for correct deduping when the same device switches accounts (Expo token stays the same).
 */
export async function registerPushTokenAsync(userId) {
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

    // Per-user key: same Expo token must be re-registered when a different account logs in on this device
    const uid = userId != null ? String(userId) : 'unknown';
    const key = `pushToken:lastRegistered:${uid}:${Platform.OS}`;
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
