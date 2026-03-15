/**
 * Translate text from English to Hindi using MyMemory API (free, no key).
 * Supports Hinglish (Hindi+English in Latin script) for job title, description, address:
 * first tries English→Hindi translation; if input is Hinglish and stays in Latin script,
 * falls back to Roman→Devanagari transliteration. Results are cached in memory.
 */

import Sanscript from '@indic-transliteration/sanscript';

const CACHE = {};
const TRANS_LANG_PAIR = 'en|hi';
const API_URL = 'https://api.mymemory.translated.net/get';

const DEVANAGARI_REGEX = /[\u0900-\u097F]/;
const LATIN_REGEX = /[a-zA-Z]/;

/** MyMemory returns quota/warning messages inside translatedText when free limit is exceeded. */

function isMyMemoryWarning(text) {
  if (!text || typeof text !== 'string') return false;
  const t = text.trim();
  return /mymemory\s+warning/i.test(t) || (/warning/i.test(t) && /free\s*(trial|translation|quota|available)/i.test(t));
}

/** Remove MyMemory warning text if it was prepended or appended to a real translation. */
function stripMyMemoryWarning(text) {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/\s*MYMEMORY\s+WARNING[\s\S]*/i, '')
    .replace(/^[\s·]*MYMEMORY\s+WARNING[\s\S]*/i, '')
    .trim();
}

function isDevanagari(text) {
  if (!text || typeof text !== 'string') return false;
  return DEVANAGARI_REGEX.test(text);
}

function hasLatin(text) {
  if (!text || typeof text !== 'string') return false;
  return LATIN_REGEX.test(text);
}

/**
 * In a mixed Hindi+Latin string, transliterate each maximal Latin segment to Devanagari.
 * e.g. "देखिए thik karana hai" -> "देखिए ठीक करना है"
 */
function transliterateLatinSegments(str) {
  if (!str || !hasLatin(str)) return str;
  return str.replace(/(\s*[a-zA-Z][a-zA-Z\s]*)/g, (match) => {
    const trimmed = match.trim();
    if (!trimmed) return match;
    const lead = match.match(/^\s*/)[0];
    const trail = match.match(/\s*$/)[0];
    return lead + hinglishToDevanagari(trimmed) + trail;
  });
}

/**
 * Try converting one word from Roman to Devanagari using a given scheme.
 * Returns converted string if it produced Devanagari, otherwise null.
 */
function tryTransliterateWord(word, scheme) {
  try {
    const converted = Sanscript.t(word, scheme, 'devanagari', { syncope: true });
    return converted && isDevanagari(converted) ? converted : null;
  } catch {
    return null;
  }
}

/**
 * Transliterate Hinglish (Roman script Hindi / mixed Hindi-English) to Devanagari.
 * Word-by-word so English words stay unchanged. Tries ITRANS first, then Harvard-Kyoto.
 */
function hinglishToDevanagari(text) {
  if (!text || typeof text !== 'string') return text;
  const trimmed = text.trim();
  if (!trimmed) return text;
  const words = trimmed.split(/(\s+)/);
  const out = [];
  for (let i = 0; i < words.length; i++) {
    const token = words[i];
    if (/^\s+$/.test(token)) {
      out.push(token);
      continue;
    }
    const converted = tryTransliterateWord(token, 'itrans') || tryTransliterateWord(token, 'hk');
    out.push(converted || token);
  }
  return out.join('');
}

/**
 * Translate a single text string from English to Hindi.
 * @param {string} text - Text to translate
 * @returns {Promise<string>} - Translated text, or original on error/empty
 */
export async function translateToHindi(text) {
  if (!text || typeof text !== 'string') return text;
  const trimmed = text.trim();
  if (!trimmed) return text;

  const cacheKey = `tr:${trimmed}`;
  if (CACHE[cacheKey] !== undefined) return CACHE[cacheKey];

  try {
    const encoded = encodeURIComponent(trimmed);
    const res = await fetch(`${API_URL}?q=${encoded}&langpair=${TRANS_LANG_PAIR}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    const data = await res.json();
    let translated =
      data?.responseData?.translatedText != null
        ? String(data.responseData.translatedText).trim()
        : '';
    translated = stripMyMemoryWarning(translated);
    if (translated && !isMyMemoryWarning(translated)) {
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
 * Translate or convert to Hindi for one job field (title, description, address).
 * Uses translation first. If the result is mixed (Devanagari + Latin, e.g. "देखिए thik karana hai"),
 * transliterates the remaining Latin segments so the full line is in Hindi.
 */
export async function translateJobFieldToHindi(text) {
  if (!text || typeof text !== 'string') return text;
  const trimmed = String(text).trim();
  if (!trimmed) return text;
  const cacheKey = `job:${trimmed}`;
  if (CACHE[cacheKey] !== undefined) return CACHE[cacheKey];
  const translated = await translateToHindi(trimmed);
  let result = translated || trimmed;
  if (hasLatin(result)) {
    result = transliterateLatinSegments(result);
  }
  if (translated && !isDevanagari(translated)) {
    const hinglishResult = hinglishToDevanagari(trimmed);
    if (isDevanagari(hinglishResult)) result = hinglishResult;
  }
  CACHE[cacheKey] = result;
  return result;
}

/**
 * Translate job fields to Hindi. Title, description, address support Hinglish; pincode is translation only.
 * @param {{ title?: string, description?: string, address?: string, pincode?: string }} job
 * @returns {Promise<{ title: string, description: string, address: string, pincode: string }>}
 */
export async function translateJobToHindi(job) {
  const [title, description, address, pincode] = await Promise.all([
    job.title ? translateJobFieldToHindi(String(job.title)) : Promise.resolve(job.title || ''),
    job.description ? translateJobFieldToHindi(String(job.description)) : Promise.resolve(job.description || ''),
    job.address ? translateJobFieldToHindi(String(job.address)) : Promise.resolve(job.address || ''),
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
