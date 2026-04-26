/**
 * Hindi translation for jobs and notifications — OpenAI only (gpt-4o-mini).
 * Any source language (Marathi, English, Hinglish, etc.) → standard Hindi (Devanagari).
 *
 * Requires EXPO_PUBLIC_OPENAI_API_KEY. If missing or the API fails, the original text is returned.
 *
 * Security: EXPO_PUBLIC_* keys ship in the app bundle. For production, prefer a backend proxy.
 */

import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isDeliveryJob } from './jobDisplay';

const CACHE = {};
/** Bump when prompt changes so stale cache entries are ignored. */
const CACHE_KEY_VERSION = '4';

const PERSIST_PREFIX = `@people_app_translate_cache:${CACHE_KEY_VERSION}:`;
const IN_FLIGHT = {};

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = 'gpt-4o-mini';

function getOpenAIApiKey() {
  return (
    process.env.EXPO_PUBLIC_OPENAI_API_KEY ||
    Constants.expoConfig?.extra?.openaiApiKey ||
    Constants.manifest?.extra?.openaiApiKey ||
    null
  );
}

function cacheKeyFor(text) {
  return `hi:${CACHE_KEY_VERSION}:${text}`;
}

function storageKeyFor(cacheKey) {
  return `${PERSIST_PREFIX}${cacheKey}`;
}

/**
 * @returns {Promise<string|null>} null if no key, error, or empty response
 */
async function openaiTranslateToHindi(trimmed) {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    console.warn('translate: EXPO_PUBLIC_OPENAI_API_KEY is not set; skipping translation.');
    return null;
  }

  const maxTokens = Math.min(4096, Math.max(256, Math.ceil(trimmed.length * 2) + 128));

  try {
    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.1,
        max_tokens: maxTokens,
        messages: [
          {
            role: 'system',
            content:
              'You translate into standard modern Hindi (Devanagari only for Indic text).\n\n' +
              'Detect the source language. It may be: Marathi, Gujarati, Bengali, Tamil, Telugu, Kannada, Malayalam, Punjabi, Odia, Assamese, Urdu, English, Hinglish, or any other language.\n\n' +
              'CRITICAL: Marathi and Hindi both use Devanagari. If the input is Marathi (मराठी), you must OUTPUT Hindi that expresses the same meaning — not Marathi. Do not copy Marathi wording. Do not reply that it is already Hindi unless it is genuinely standard Hindi.\n\n' +
              'Output rules:\n' +
              '- Return ONLY the Hindi translation. No quotes, markdown, labels, or "Translation:".\n' +
              '- Keep numbers, PIN codes, and amounts like ₹500 unchanged.\n' +
              '- Keep well-known global brand names in Latin if usual in India; otherwise Devanagari.\n' +
              '- Digits-only or trivial punctuation: return unchanged.',
          },
          {
            role: 'user',
            content:
              'Convert this job/app text into natural Hindi (Devanagari). If it is Marathi or any non-Hindi language, translate fully into Hindi:\n\n' +
              trimmed,
          },
        ],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.warn('OpenAI translate HTTP', res.status, errBody?.slice?.(0, 300));
      return null;
    }

    const data = await res.json();
    let out = data?.choices?.[0]?.message?.content;
    if (typeof out !== 'string') return null;
    out = out.trim().replace(/^["'`]+|["'`]+$/g, '').trim();
    return out || null;
  } catch (e) {
    console.warn('OpenAI translate error:', e?.message || e);
    return null;
  }
}

/**
 * Translate a single string to Hindi via OpenAI, or return original if unavailable.
 */
export async function translateToHindi(text) {
  if (!text || typeof text !== 'string') return text;
  const trimmed = text.trim();
  if (!trimmed) return text;

  const key = cacheKeyFor(trimmed);
  if (CACHE[key] !== undefined) return CACHE[key];

  if (/^\d{4,8}$/.test(trimmed)) {
    CACHE[key] = trimmed;
    return trimmed;
  }

  // De-dupe concurrent requests for the same string.
  if (IN_FLIGHT[key]) return IN_FLIGHT[key];

  IN_FLIGHT[key] = (async () => {
    // Persistent cache (AsyncStorage) so fresh app sessions don't re-translate.
    try {
      const stored = await AsyncStorage.getItem(storageKeyFor(key));
      if (stored != null && stored !== '') {
        CACHE[key] = stored;
        return stored;
      }
    } catch (_) {
      // Ignore storage read errors; fall back to live translate.
    }

    const translated = await openaiTranslateToHindi(trimmed);
    const result = translated != null && translated !== '' ? translated : trimmed;
    CACHE[key] = result;

    try {
      // Best-effort persist; safe to ignore failures.
      await AsyncStorage.setItem(storageKeyFor(key), result);
    } catch (_) {}

    return result;
  })();

  try {
    return await IN_FLIGHT[key];
  } finally {
    delete IN_FLIGHT[key];
  }
}

/** Same as translateToHindi (OpenAI-only); kept for call-site clarity. */
export async function translateJobFieldToHindi(text) {
  return translateToHindi(text);
}

/**
 * Translate job fields to Hindi.
 * @param {object} job
 * @returns {Promise<object>}
 */
export async function translateJobToHindi(job) {
  const [title, description, address, pincode] = await Promise.all([
    job.title ? translateToHindi(String(job.title)) : Promise.resolve(job.title || ''),
    job.description ? translateToHindi(String(job.description)) : Promise.resolve(job.description || ''),
    job.address ? translateToHindi(String(job.address)) : Promise.resolve(job.address || ''),
    job.pincode ? translateToHindi(String(job.pincode)) : Promise.resolve(job.pincode || ''),
  ]);
  const out = { title, description, address, pincode };
  if (
    isDeliveryJob(job) &&
    (job.deliveryFromAddress || job.deliveryToAddress || job.deliveryFromPincode || job.deliveryToPincode)
  ) {
    const [df, dfp, dt, dtp] = await Promise.all([
      job.deliveryFromAddress
        ? translateToHindi(String(job.deliveryFromAddress))
        : Promise.resolve(job.deliveryFromAddress || ''),
      job.deliveryFromPincode
        ? translateToHindi(String(job.deliveryFromPincode))
        : Promise.resolve(job.deliveryFromPincode || ''),
      job.deliveryToAddress
        ? translateToHindi(String(job.deliveryToAddress))
        : Promise.resolve(job.deliveryToAddress || ''),
      job.deliveryToPincode
        ? translateToHindi(String(job.deliveryToPincode))
        : Promise.resolve(job.deliveryToPincode || ''),
    ]);
    out.deliveryFromAddress = df;
    out.deliveryFromPincode = dfp;
    out.deliveryToAddress = dt;
    out.deliveryToPincode = dtp;
  }
  return out;
}

/**
 * Translate notification title and message to Hindi.
 * @param {{ title?: string, message?: string }} notification
 * @returns {Promise<{ title: string, message: string }>}
 */
export async function translateNotificationToHindi(notification) {
  const [title, message] = await Promise.all([
    notification.title ? translateToHindi(String(notification.title)) : Promise.resolve(notification.title || ''),
    notification.message ? translateToHindi(String(notification.message)) : Promise.resolve(notification.message || ''),
  ]);
  return { title, message };
}
