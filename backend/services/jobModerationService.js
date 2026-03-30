/**
 * Job posting safety pipeline:
 * 1) Deterministic hard block (regex)
 * 2) OpenAI Moderation API (when enabled)
 * 3) OpenAI Chat JSON legitimacy review (when enabled) — contextual, catches evasions
 *
 * Env:
 *   OPENAI_API_KEY          — required for OpenAI steps
 *   JOB_MODERATION_ENABLED  — set to "false" to skip moderation API (default: enabled when key is set)
 *   OPENAI_MODERATION_MODEL — default "omni-moderation-latest"
 *   JOB_MODERATION_FAIL_OPEN — "false" to block posts when moderation API errors (default: "true")
 *
 * Legitimacy (see jobLegitimacyAIService.js):
 *   JOB_LEGITIMACY_ENABLED, OPENAI_JOB_LEGITIMACY_MODEL, JOB_LEGITIMACY_FAIL_OPEN
 */

const axios = require('axios');
const { checkHardBlockedJobText } = require('../utils/jobContentHardBlock');
const { assessJobPostingLegitimacy } = require('./jobLegitimacyAIService');

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
 * @param {{ title: string, description: string|null, category?: string }} params
 * @returns {Promise<{ allowed: boolean, error?: string, skipped?: boolean, apiError?: boolean, hardBlock?: boolean, legitimacyBlock?: boolean }>}
 */
async function moderateJobContent({ title, description, category }) {
  const hard = checkHardBlockedJobText(title, description);
  if (hard.blocked) {
    return {
      allowed: false,
      error: hard.reason || USER_FACING_ERROR,
      hardBlock: true,
    };
  }

  const categoryStr = String(category || '').trim();

  if (isModerationEnabled()) {
    const input = buildModerationInput(title, description);
    if (input) {
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
          if (!failOpenOnError()) {
            return {
              allowed: false,
              error: 'Job moderation is temporarily unavailable. Please try again in a few minutes.',
            };
          }
        } else {
          const result = resp.data.results[0];
          if (result.flagged) {
            const cats = result.categories || {};
            const flaggedNames = Object.keys(cats).filter((k) => cats[k] === true);
            console.warn('[jobModeration] Blocked job text', { flaggedCategories: flaggedNames });
            return { allowed: false, error: USER_FACING_ERROR };
          }
        }
      } catch (err) {
        console.error('[jobModeration] OpenAI request failed', err.message || err);
        if (!failOpenOnError()) {
          return {
            allowed: false,
            error: 'Job moderation is temporarily unavailable. Please try again in a few minutes.',
          };
        }
      }
    }
  }

  const legitimacy = await assessJobPostingLegitimacy({
    title,
    description,
    category: categoryStr,
  });
  if (!legitimacy.allowed) {
    return {
      allowed: false,
      error: legitimacy.error || USER_FACING_ERROR,
      legitimacyBlock: true,
    };
  }

  return { allowed: true };
}

module.exports = {
  moderateJobContent,
  isModerationEnabled,
  USER_FACING_ERROR,
};
