/**
 * Translate text from English to Hindi using MyMemory API (free, no key).
 * Results are cached in memory to avoid duplicate requests.
 */

const CACHE = {};
const LANG_PAIR = 'en|hi';
const API_URL = 'https://api.mymemory.translated.net/get';

/**
 * Translate a single text string from English to Hindi.
 * @param {string} text - Text to translate
 * @returns {Promise<string>} - Translated text, or original on error/empty
 */
export async function translateToHindi(text) {
  if (!text || typeof text !== 'string') return text;
  const trimmed = text.trim();
  if (!trimmed) return text;

  const cacheKey = trimmed;
  if (CACHE[cacheKey] !== undefined) return CACHE[cacheKey];

  try {
    const encoded = encodeURIComponent(trimmed);
    const res = await fetch(`${API_URL}?q=${encoded}&langpair=${LANG_PAIR}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    const data = await res.json();
    const translated =
      data?.responseData?.translatedText?.trim() ||
      data?.responseData?.translatedText;
    if (translated) {
      CACHE[cacheKey] = translated;
      return translated;
    }
  } catch (e) {
    console.warn('Translate API error:', e?.message || e);
  }
  CACHE[cacheKey] = trimmed;
  return trimmed;
}

/**
 * Translate job fields (title, description, address, pincode) to Hindi.
 * @param {{ title?: string, description?: string, address?: string, pincode?: string }} job
 * @returns {Promise<{ title: string, description: string, address: string, pincode: string }>}
 */
export async function translateJobToHindi(job) {
  const [title, description, address, pincode] = await Promise.all([
    job.title ? translateToHindi(String(job.title)) : Promise.resolve(job.title || ''),
    job.description ? translateToHindi(String(job.description)) : Promise.resolve(job.description || ''),
    job.address ? translateToHindi(String(job.address)) : Promise.resolve(job.address || ''),
    job.pincode ? translateToHindi(String(job.pincode)) : Promise.resolve(job.pincode || ''),
  ]);
  return { title, description, address, pincode };
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
