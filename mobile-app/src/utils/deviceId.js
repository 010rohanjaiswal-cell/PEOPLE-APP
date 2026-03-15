/**
 * Stable device identifier for one-device-one-login.
 * Persists a UUID in AsyncStorage so the same device always sends the same id.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = '@people_app_device_id';

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/x/g, () =>
    Math.floor(Math.random() * 16).toString(16)
  );
}

/**
 * Get or create a stable device ID for this app install.
 * @returns {Promise<string>}
 */
export async function getDeviceId() {
  try {
    let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (!id || typeof id !== 'string') {
      id = generateUUID();
      await AsyncStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch (e) {
    return generateUUID();
  }
}
