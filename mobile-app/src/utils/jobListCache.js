import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = '@people_app_job_list_cache:v1:';

function safeId(user) {
  const id = user?.id || user?._id || null;
  return id ? String(id) : 'anon';
}

function keyFor({ user, scope }) {
  return `${PREFIX}${safeId(user)}:${String(scope)}`;
}

export async function readJobListCache({ user, scope, maxAgeMs = 5 * 60 * 1000 }) {
  const key = keyFor({ user, scope });
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const ts = Number(parsed?.ts || 0);
    const data = parsed?.data;
    if (!Array.isArray(data)) return null;
    if (!Number.isFinite(ts) || Date.now() - ts > maxAgeMs) return null;
    return data;
  } catch {
    return null;
  }
}

export async function writeJobListCache({ user, scope, data }) {
  if (!Array.isArray(data)) return;
  const key = keyFor({ user, scope });
  try {
    await AsyncStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // ignore
  }
}

export async function clearJobListCache({ user, scope }) {
  const key = keyFor({ user, scope });
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // ignore
  }
}

