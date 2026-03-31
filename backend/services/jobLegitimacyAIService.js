/**
 * Single ChatGPT gate for job posts: title + description (+ category) only.
 * Works with English, Hindi, Hinglish, and mixed text.
 *
 * Env:
 *   OPENAI_API_KEY           — required (no posts verified without it, unless gate disabled)
 *   JOB_CHAT_GATE_ENABLED    — "false" to skip and allow all (dev only)
 *   OPENAI_JOB_CHAT_MODEL    — default gpt-4o-mini (fast)
 *   JOB_CHAT_GATE_FAIL_OPEN  — "true" = allow post if OpenAI call fails (default "false")
 */

const axios = require('axios');
const crypto = require('crypto');

const CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4o-mini';

const GENERIC_REJECT =
  'This job cannot be posted. Please edit the title or description and try again.';

const VERIFICATION_ERROR_MESSAGE =
  'We could not verify this job right now. Please try again in a moment.';

function isChatGateEnabled() {
  if (String(process.env.JOB_CHAT_GATE_ENABLED || '').toLowerCase() === 'false') {
    return false;
  }
  const key = process.env.OPENAI_API_KEY;
  return Boolean(key && String(key).trim());
}

function failOpenOnError() {
  return String(process.env.JOB_CHAT_GATE_FAIL_OPEN || 'false').toLowerCase() === 'true';
}

function sanitizeAiUserMessage(s) {
  if (!s || typeof s !== 'string') return '';
  return s.replace(/[\r\n<>]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 280);
}

function coerceAllowed(value) {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** OpenAI returns 429 when RPM/TPM limits are hit; short retries help transient bursts. */
const CHAT_MAX_ATTEMPTS = 3;

function getMaxConcurrency() {
  const v = parseInt(process.env.JOB_CHAT_GATE_MAX_CONCURRENCY || '2', 10);
  if (!Number.isFinite(v)) return 2;
  return Math.max(1, Math.min(6, v));
}

function getCacheTtlMs() {
  const v = parseInt(process.env.JOB_CHAT_GATE_CACHE_TTL_MS || '300000', 10); // 5 min
  if (!Number.isFinite(v)) return 300000;
  return Math.max(0, Math.min(3600000, v));
}

// In-memory cache (best-effort): avoids repeated charges + helps prevent bursts.
const decisionCache = new Map(); // key -> { expiresAt, value }
function cacheGet(key) {
  const hit = decisionCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    decisionCache.delete(key);
    return null;
  }
  return hit.value;
}
function cacheSet(key, value, ttlMs) {
  if (!ttlMs || ttlMs <= 0) return;
  decisionCache.set(key, { expiresAt: Date.now() + ttlMs, value });
  // Light pruning so the map can’t grow without bound.
  if (decisionCache.size > 5000) {
    const now = Date.now();
    for (const [k, v] of decisionCache) {
      if (v.expiresAt <= now) decisionCache.delete(k);
      if (decisionCache.size <= 3500) break;
    }
  }
}

// Simple async semaphore: prevents many parallel OpenAI calls causing 429.
let inFlight = 0;
const waiters = [];
async function acquire() {
  const max = getMaxConcurrency();
  if (inFlight < max) {
    inFlight++;
    return;
  }
  await new Promise((resolve) => waiters.push(resolve));
  inFlight++;
}
function release() {
  inFlight = Math.max(0, inFlight - 1);
  const next = waiters.shift();
  if (next) next();
}

async function postChatCompletion(body, headers, timeoutMs) {
  let lastResp = null;
  for (let attempt = 0; attempt < CHAT_MAX_ATTEMPTS; attempt++) {
    if (attempt > 0 && lastResp?.status === 429) {
      const ra = parseInt(lastResp.headers?.['retry-after'], 10);
      const waitMs = Number.isFinite(ra) && ra > 0
        ? Math.min(60000, ra * 1000)
        : Math.min(12000, 2000 * 2 ** (attempt - 1));
      console.warn(`[jobChatGate] OpenAI rate limit (429), retry ${attempt + 1}/${CHAT_MAX_ATTEMPTS} after ${waitMs}ms`);
      await sleep(waitMs);
    }
    lastResp = await axios.post(CHAT_URL, body, {
      headers,
      timeout: timeoutMs,
      validateStatus: (s) => s < 500,
    });
    if (lastResp.status === 200 && lastResp.data?.choices?.[0]?.message?.content) {
      return lastResp;
    }
    if (lastResp.status !== 429) {
      return lastResp;
    }
  }
  return lastResp;
}

/**
 * @param {{ title: string, description: string|null, category: string }} params
 * @returns {Promise<{ allowed: boolean, error?: string, skipped?: boolean, reason?: 'policy'|'verification_error' }>}
 */
async function assessJobPostingWithChatGPT({ title, description, category }) {
  if (!isChatGateEnabled()) {
    return { allowed: true, skipped: true };
  }

  const apiKey = process.env.OPENAI_API_KEY.trim();
  const model = process.env.OPENAI_JOB_CHAT_MODEL || DEFAULT_MODEL;

  const payload = {
    title: String(title || '').trim(),
    description:
      description != null && String(description).trim() !== '' ? String(description).trim() : '',
    category: String(category || '').trim(),
  };

  const cacheKey = crypto
    .createHash('sha256')
    .update(JSON.stringify({ v: 1, payload, model: process.env.OPENAI_JOB_CHAT_MODEL || DEFAULT_MODEL }))
    .digest('hex');
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const system = `You are the only approval step for job posts on a local services app in India (home help, cleaning, cooking, plumbing, electrical, driver, delivery, mechanic, tailor, barber, care taker, laundry, etc.).

You receive JSON with:
- "title" (what the client typed)
- "description" (optional, may be empty string)
- "category" (app category name)

The client may write in English, Hindi (Devanagari), Roman Hindi (Hinglish), or any mix. Understand slang, typos, and short informal lines.

Your job: decide if it is LEGAL and OK to publish this as a job listing on such an app.

ALLOW (allowed: true) when:
- It is normal hiring or booking of a service worker, OR it could reasonably be that, OR the text is messy/short but clearly about domestic/local service work.
- When unsure but nothing clearly illegal, choose ALLOW.

REJECT (allowed: false) ONLY when it is CLEARLY:
- Illegal (drugs, weapons, violence, fraud, scams, trafficking, sexual services / prostitution, etc.), OR
- Obviously not a real job request at all.

If you reject, include "message": one short, polite sentence for the user in the SAME language style they used (English, Hindi, or Hinglish as in their title/description).

Reply with ONLY valid JSON (no markdown):
{"allowed":true}
or
{"allowed":false,"message":"..."}`;

  const userMsg = `Is this OK to post as a job?\n${JSON.stringify(payload)}`;

  const requestBody = {
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: userMsg },
    ],
    temperature: 0.15,
    max_tokens: 200,
    response_format: { type: 'json_object' },
  };
  const requestHeaders = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  await acquire();
  try {
    const resp = await postChatCompletion(requestBody, requestHeaders, 28000);

    if (resp.status !== 200 || !resp.data?.choices?.[0]?.message?.content) {
      console.error('[jobChatGate] unexpected response', { status: resp.status });
      if (failOpenOnError()) return { allowed: true, skipped: true };
      const out = {
        allowed: false,
        error: VERIFICATION_ERROR_MESSAGE,
        reason: 'verification_error',
      };
      cacheSet(cacheKey, out, getCacheTtlMs());
      return out;
    }

    const raw = resp.data.choices[0].message.content;
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error('[jobChatGate] invalid JSON', raw?.slice?.(0, 200));
      if (failOpenOnError()) return { allowed: true, skipped: true };
      const out = {
        allowed: false,
        error: VERIFICATION_ERROR_MESSAGE,
        reason: 'verification_error',
      };
      cacheSet(cacheKey, out, getCacheTtlMs());
      return out;
    }

    const allowed = coerceAllowed(parsed.allowed);
    if (allowed === null) {
      console.error('[jobChatGate] missing allowed boolean', parsed);
      if (failOpenOnError()) return { allowed: true, skipped: true };
      const out = {
        allowed: false,
        error: VERIFICATION_ERROR_MESSAGE,
        reason: 'verification_error',
      };
      cacheSet(cacheKey, out, getCacheTtlMs());
      return out;
    }

    if (!allowed) {
      const msg = sanitizeAiUserMessage(parsed.message);
      console.warn('[jobChatGate] rejected by model');
      const out = {
        allowed: false,
        error: msg || GENERIC_REJECT,
        reason: 'policy',
      };
      cacheSet(cacheKey, out, getCacheTtlMs());
      return out;
    }

    const out = { allowed: true };
    cacheSet(cacheKey, out, getCacheTtlMs());
    return out;
  } catch (err) {
    console.error('[jobChatGate] request failed', err.message || err);
    if (failOpenOnError()) return { allowed: true, skipped: true };
    const out = {
      allowed: false,
      error: VERIFICATION_ERROR_MESSAGE,
      reason: 'verification_error',
    };
    cacheSet(cacheKey, out, getCacheTtlMs());
    return out;
  } finally {
    release();
  }
}

module.exports = {
  assessJobPostingWithChatGPT,
  isChatGateEnabled,
  GENERIC_REJECT,
  VERIFICATION_ERROR_MESSAGE,
};
