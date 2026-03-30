/**
 * Tier B job review: OpenAI Chat Completions (structured JSON).
 * Interprets title + description + category for legitimate domestic/service work.
 * Catches evasions that keyword moderation misses (e.g. "bring drugs", vague "i want a girl").
 *
 * Env (same key as moderation):
 *   OPENAI_API_KEY
 *   JOB_LEGITIMACY_ENABLED     — default enabled when key is set; "false" to skip
 *   OPENAI_JOB_LEGITIMACY_MODEL — default gpt-4o-mini
 *   JOB_LEGITIMACY_FAIL_OPEN    — "true" = allow post if the LLM call fails (default "false")
 */

const axios = require('axios');

const CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4o-mini';

const USER_FACING =
  'This job cannot be posted because it may violate our community guidelines. Please edit the title or description and try again.';

function isLegitimacyEnabled() {
  const key = process.env.OPENAI_API_KEY;
  if (!key || !String(key).trim()) return false;
  if (String(process.env.JOB_LEGITIMACY_ENABLED || '').toLowerCase() === 'false') return false;
  return true;
}

function failOpenOnLegitimacyError() {
  return String(process.env.JOB_LEGITIMACY_FAIL_OPEN || 'false').toLowerCase() === 'true';
}

/**
 * @param {{ title: string, description: string|null, category: string }} params
 * @returns {Promise<{ allowed: boolean, error?: string, skipped?: boolean, apiError?: boolean }>}
 */
async function assessJobPostingLegitimacy({ title, description, category }) {
  if (!isLegitimacyEnabled()) {
    return { allowed: true, skipped: true };
  }

  const apiKey = process.env.OPENAI_API_KEY.trim();
  const model = process.env.OPENAI_JOB_LEGITIMACY_MODEL || DEFAULT_MODEL;

  const payload = {
    title: String(title || '').trim(),
    description:
      description != null && String(description).trim() !== '' ? String(description).trim() : '',
    category: String(category || '').trim(),
  };

  const system = `You are a safety reviewer for a domestic and local services marketplace in India (cleaning, cooking, delivery, plumbing, electrical, drivers, care workers, tailors, barbers, laundry, mechanics, etc.).

Decide if this job posting describes LEGITIMATE, LEGAL work appropriate for that platform.

REJECT (allowed=false) if it suggests or could reasonably mean:
- Illegal drugs, controlled substances, drug dealing, or asking someone to bring/buy/sell drugs
- Sexual services, escorting, prostitution, or coded "companionship" when there is no real service job
- Violence, weapons, harm to people, or other illegal activity
- Human trafficking, exploitation, or coercion
- Scams, money laundering, or requests that are clearly not genuine paid service work

ALLOW (allowed=true) for ordinary lawful service work. A stated gender preference for a real role (e.g. female caretaker, male driver) together with a clear service category is ALLOWED.

Vague or minimal titles with no legitimate service context (for example only "i want a girl" or "need a girl" with category Other and no real job description) must be REJECTED.

Respond with ONLY a JSON object: {"allowed":true} or {"allowed":false}. No other text.`;

  const user = `Classify this posting:\n${JSON.stringify(payload)}`;

  try {
    const resp = await axios.post(
      CHAT_URL,
      {
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.1,
        max_tokens: 80,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 45000,
        validateStatus: (s) => s < 500,
      }
    );

    if (resp.status !== 200 || !resp.data?.choices?.[0]?.message?.content) {
      console.error('[jobLegitimacy] unexpected response', { status: resp.status });
      if (failOpenOnLegitimacyError()) {
        return { allowed: true, apiError: true };
      }
      return {
        allowed: false,
        error:
          'We could not verify this job right now. Please try again in a moment.',
      };
    }

    const raw = resp.data.choices[0].message.content;
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error('[jobLegitimacy] invalid JSON', raw?.slice?.(0, 200));
      if (failOpenOnLegitimacyError()) {
        return { allowed: true, apiError: true };
      }
      return {
        allowed: false,
        error:
          'We could not verify this job right now. Please try again in a moment.',
      };
    }

    if (typeof parsed.allowed !== 'boolean') {
      console.error('[jobLegitimacy] missing allowed boolean', parsed);
      if (failOpenOnLegitimacyError()) {
        return { allowed: true, apiError: true };
      }
      return {
        allowed: false,
        error:
          'We could not verify this job right now. Please try again in a moment.',
      };
    }

    if (!parsed.allowed) {
      console.warn('[jobLegitimacy] LLM rejected job text');
      return { allowed: false, error: USER_FACING };
    }

    return { allowed: true };
  } catch (err) {
    console.error('[jobLegitimacy] request failed', err.message || err);
    if (failOpenOnLegitimacyError()) {
      return { allowed: true, apiError: true };
    }
    return {
      allowed: false,
      error:
        'We could not verify this job right now. Please try again in a moment.',
    };
  }
}

module.exports = {
  assessJobPostingLegitimacy,
  isLegitimacyEnabled,
  USER_FACING,
};
