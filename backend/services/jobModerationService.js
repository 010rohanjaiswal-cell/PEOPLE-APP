/**
 * Tier A job moderation: OpenAI Moderation API (managed model).
 * Screens job title + description before posts are saved.
 *
 * Env:
 *   OPENAI_API_KEY          — required for moderation to run
 *   JOB_MODERATION_ENABLED  — set to "false" to disable (default: enabled when key is set)
 *   OPENAI_MODERATION_MODEL — default "omni-moderation-latest"
 *   JOB_MODERATION_FAIL_OPEN — "false" to block posts when the API errors (default: "true" = allow on error)
 */

const axios = require('axios');

const MODERATION_URL = 'https://api.openai.com/v1/moderations';
const DEFAULT_MODEL = 'omni-moderation-latest';

const USER_FACING_ERROR =
  'This job cannot be posted because it may violate our community guidelines. Please edit the title or description and try again.';

function isModerationEnabled() {
  const key = process.env.OPENAI_API_KEY;
  if (!key || !String(key).trim()) return false;
  if (String(process.env.JOB_MODERATION_ENABLED || '').toLowerCase() === 'false') return false;
  return true;
}

function failOpenOnError() {
  return String(process.env.JOB_MODERATION_FAIL_OPEN || 'true').toLowerCase() !== 'false';
}

function buildModerationInput(title, description) {
  const t = String(title || '').trim();
  const d = description != null && String(description).trim() !== '' ? String(description).trim() : '';
  if (!t && !d) return '';
  if (!d) return `Job title: ${t}`;
  return `Job title: ${t}\n\nJob description: ${d}`;
}

/**
 * @param {{ title: string, description: string|null }} params
 * @returns {Promise<{ allowed: boolean, error?: string, skipped?: boolean, apiError?: boolean }>}
 */
async function moderateJobContent({ title, description }) {
  if (!isModerationEnabled()) {
    return { allowed: true, skipped: true };
  }

  const input = buildModerationInput(title, description);
  if (!input) {
    return { allowed: true, skipped: true };
  }

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
      console.error('[jobModeration] OpenAI moderation unexpected response', {
        status: resp.status,
        data: resp.data,
      });
      if (failOpenOnError()) {
        return { allowed: true, apiError: true };
      }
      return {
        allowed: false,
        error: 'Job moderation is temporarily unavailable. Please try again in a few minutes.',
      };
    }

    const result = resp.data.results[0];
    if (result.flagged) {
      const cats = result.categories || {};
      const flaggedNames = Object.keys(cats).filter((k) => cats[k] === true);
      console.warn('[jobModeration] Blocked job text', { flaggedCategories: flaggedNames });
      return { allowed: false, error: USER_FACING_ERROR };
    }

    return { allowed: true };
  } catch (err) {
    console.error('[jobModeration] OpenAI request failed', err.message || err);
    if (failOpenOnError()) {
      return { allowed: true, apiError: true };
    }
    return {
      allowed: false,
      error: 'Job moderation is temporarily unavailable. Please try again in a few minutes.',
    };
  }
}

module.exports = {
  moderateJobContent,
  isModerationEnabled,
  USER_FACING_ERROR,
};
