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

  try {
    const resp = await axios.post(
      CHAT_URL,
      {
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userMsg },
        ],
        temperature: 0.15,
        max_tokens: 200,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 28000,
        validateStatus: (s) => s < 500,
      }
    );

    if (resp.status !== 200 || !resp.data?.choices?.[0]?.message?.content) {
      console.error('[jobChatGate] unexpected response', { status: resp.status });
      if (failOpenOnError()) return { allowed: true, skipped: true };
      return {
        allowed: false,
        error: VERIFICATION_ERROR_MESSAGE,
        reason: 'verification_error',
      };
    }

    const raw = resp.data.choices[0].message.content;
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error('[jobChatGate] invalid JSON', raw?.slice?.(0, 200));
      if (failOpenOnError()) return { allowed: true, skipped: true };
      return {
        allowed: false,
        error: VERIFICATION_ERROR_MESSAGE,
        reason: 'verification_error',
      };
    }

    const allowed = coerceAllowed(parsed.allowed);
    if (allowed === null) {
      console.error('[jobChatGate] missing allowed boolean', parsed);
      if (failOpenOnError()) return { allowed: true, skipped: true };
      return {
        allowed: false,
        error: VERIFICATION_ERROR_MESSAGE,
        reason: 'verification_error',
      };
    }

    if (!allowed) {
      const msg = sanitizeAiUserMessage(parsed.message);
      console.warn('[jobChatGate] rejected by model');
      return {
        allowed: false,
        error: msg || GENERIC_REJECT,
        reason: 'policy',
      };
    }

    return { allowed: true };
  } catch (err) {
    console.error('[jobChatGate] request failed', err.message || err);
    if (failOpenOnError()) return { allowed: true, skipped: true };
    return {
      allowed: false,
      error: VERIFICATION_ERROR_MESSAGE,
      reason: 'verification_error',
    };
  }
}

module.exports = {
  assessJobPostingWithChatGPT,
  isChatGateEnabled,
  GENERIC_REJECT,
  VERIFICATION_ERROR_MESSAGE,
};
