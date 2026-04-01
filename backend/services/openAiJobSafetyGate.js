const axios = require('axios');

const CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4o-mini';

const USER_FACING_REJECTED =
  'This job cannot be posted because it may violate our community guidelines. Please edit the title or description and try again.';

function isEnabled() {
  const key = process.env.OPENAI_API_KEY;
  if (!key || !String(key).trim()) return false;
  if (String(process.env.JOB_OPENAI_SAFETY_GATE_ENABLED || 'true').toLowerCase() === 'false') return false;
  return true;
}

function buildPayload(title, description) {
  const t = String(title || '').trim();
  const d = description != null && String(description).trim() !== '' ? String(description).trim() : '';
  return { title: t, description: d };
}

/**
 * Strict multilingual safety gate.
 * - Translate to English first (internally)
 * - Reject sexual solicitation, escorting, prostitution, porn, explicit content, illegal activity, etc.
 *
 * @returns {Promise<{ allowed: true } | { allowed: false, code: 'JOB_SAFETY_REJECTED'|'JOB_SAFETY_UNAVAILABLE', error: string }>}
 */
async function safetyGateJobText({ title, description }) {
  if (!isEnabled()) return { allowed: true };

  const apiKey = process.env.OPENAI_API_KEY.trim();
  const model = process.env.OPENAI_SAFETY_GATE_MODEL || DEFAULT_MODEL;
  const payload = buildPayload(title, description);

  const system = `You are a strict safety reviewer for a local services marketplace.\n\nThe user may write in ANY language. First, translate the title+description into English (internally), then decide if it is OK to publish.\n\nREJECT if it includes or strongly implies:\n- Sexual solicitation, seeking sex/partners, escorting/prostitution, porn, explicit content\n- Requests for illegal drugs, weapons, violence, scams, trafficking, etc.\n- Any content that is unsafe or illegal.\n\nALLOW only for legitimate, legal service requests.\n\nReturn ONLY JSON with:\n{\"allowed\":true}\nOR\n{\"allowed\":false}\nNo extra text.`;

  try {
    const resp = await axios.post(
      CHAT_URL,
      {
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: JSON.stringify(payload) },
        ],
        temperature: 0,
        max_tokens: 30,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 20000,
        validateStatus: (s) => s < 500,
      }
    );

    if (resp.status !== 200 || !resp.data?.choices?.[0]?.message?.content) {
      console.error('[openAiSafetyGate] unexpected response', { status: resp.status, data: resp.data });
      return {
        allowed: false,
        code: 'JOB_SAFETY_UNAVAILABLE',
        error: 'Job verification is temporarily unavailable. Please try again.',
      };
    }

    let parsed;
    try {
      parsed = JSON.parse(resp.data.choices[0].message.content);
    } catch (e) {
      console.error('[openAiSafetyGate] invalid JSON', resp.data.choices[0].message.content);
      return {
        allowed: false,
        code: 'JOB_SAFETY_UNAVAILABLE',
        error: 'Job verification is temporarily unavailable. Please try again.',
      };
    }

    if (parsed?.allowed === true) return { allowed: true };
    if (parsed?.allowed === false) return { allowed: false, code: 'JOB_SAFETY_REJECTED', error: USER_FACING_REJECTED };

    console.error('[openAiSafetyGate] missing allowed boolean', parsed);
    return {
      allowed: false,
      code: 'JOB_SAFETY_UNAVAILABLE',
      error: 'Job verification is temporarily unavailable. Please try again.',
    };
  } catch (err) {
    console.error('[openAiSafetyGate] request failed', err.message || err);
    return {
      allowed: false,
      code: 'JOB_SAFETY_UNAVAILABLE',
      error: 'Job verification is temporarily unavailable. Please try again.',
    };
  }
}

module.exports = {
  isEnabled,
  safetyGateJobText,
  USER_FACING_REJECTED,
};

