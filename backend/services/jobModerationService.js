/**
 * Job post check: single ChatGPT JSON decision on title + description (+ category).
 * English, Hindi, Hinglish supported. No separate Moderation API or regex hard block here.
 *
 * Env: see jobLegitimacyAIService.js (JOB_CHAT_GATE_*, OPENAI_JOB_CHAT_MODEL, OPENAI_API_KEY)
 */

const { assessJobPostingWithChatGPT, isChatGateEnabled } = require('./jobLegitimacyAIService');

const USER_FACING_ERROR =
  'This job cannot be posted because it may violate our community guidelines. Please edit the title or description and try again.';

/**
 * @param {{ title: string, description: string|null, category?: string }} params
 * @returns {Promise<{ allowed: boolean, error?: string, aiRejected?: boolean, verificationError?: boolean }>}
 */
async function moderateJobContent({ title, description, category }) {
  const categoryStr = String(category || '').trim();

  const result = await assessJobPostingWithChatGPT({
    title,
    description,
    category: categoryStr,
  });

  if (!result.allowed) {
    const policy = result.reason === 'policy';
    return {
      allowed: false,
      error: result.error || USER_FACING_ERROR,
      aiRejected: policy,
      verificationError: !policy,
    };
  }

  return { allowed: true };
}

module.exports = {
  moderateJobContent,
  isChatGateEnabled,
  USER_FACING_ERROR,
};
