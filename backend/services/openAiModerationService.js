const axios = require('axios');

const MODERATION_URL = 'https://api.openai.com/v1/moderations';
const DEFAULT_MODEL = 'omni-moderation-latest';

const USER_FACING_REJECTED =
  'This job cannot be posted because it may violate our community guidelines. Please edit the title or description and try again.';

function isEnabled() {
  const key = process.env.OPENAI_API_KEY;
  if (!key || !String(key).trim()) return false;
  if (String(process.env.JOB_OPENAI_MODERATION_ENABLED || '').toLowerCase() === 'false') return false;
  return true;
}

function buildInput(title, description) {
  const t = String(title || '').trim();
  const d = description != null && String(description).trim() !== '' ? String(description).trim() : '';
  if (!t && !d) return '';
  if (!d) return `Job title: ${t}`;
  return `Job title: ${t}\n\nJob description: ${d}`;
}

/**
 * @returns {Promise<{ allowed: true } | { allowed: false, code: 'JOB_MODERATION_REJECTED'|'JOB_MODERATION_UNAVAILABLE', error: string }>}
 */
async function moderateJobText({ title, description }) {
  if (!isEnabled()) return { allowed: true };

  const input = buildInput(title, description);
  if (!input) return { allowed: true };

  const apiKey = process.env.OPENAI_API_KEY.trim();
  const model = process.env.OPENAI_MODERATION_MODEL || DEFAULT_MODEL;

  try {
    const resp = await axios.post(
      MODERATION_URL,
      { model, input },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 20000,
        validateStatus: (s) => s < 500,
      }
    );

    if (resp.status !== 200 || !resp.data?.results?.[0]) {
      console.error('[openAiModeration] unexpected response', { status: resp.status, data: resp.data });
      return {
        allowed: false,
        code: 'JOB_MODERATION_UNAVAILABLE',
        error: 'Job verification is temporarily unavailable. Please try again.',
      };
    }

    const r = resp.data.results[0];
    if (r.flagged) {
      return { allowed: false, code: 'JOB_MODERATION_REJECTED', error: USER_FACING_REJECTED };
    }

    return { allowed: true };
  } catch (err) {
    console.error('[openAiModeration] request failed', err.message || err);
    return {
      allowed: false,
      code: 'JOB_MODERATION_UNAVAILABLE',
      error: 'Job verification is temporarily unavailable. Please try again.',
    };
  }
}

module.exports = {
  isEnabled,
  moderateJobText,
  USER_FACING_REJECTED,
};

