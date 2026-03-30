/**
 * Deterministic blocklist for job title + description (runs before OpenAI).
 * Keep patterns conservative to limit false positives; extend as needed.
 *
 * SYNC: mobile-app/src/utils/jobContentHardBlock.js — update both when changing rules.
 */

const USER_FACING =
  'This job cannot be posted because it may violate our community guidelines. Please edit the title or description and try again.';

/**
 * Case-insensitive patterns against combined title + description.
 * Uses word boundaries where appropriate to reduce false positives (e.g. "Sussex").
 */
const BLOCK_PATTERNS = [
  /\bsex\b/i,
  /\bsexual\b/i,
  /\bsexy\b/i,
  /\bporn\b/i,
  /\bporno\b/i,
  /\bpornography\b/i,
  /\bxxx\b/i,
  /\bnsfw\b/i,
  /\bhookup\b/i,
  /\bprostitut/i,
  /\bescort\b/i,
  /\bcall\s*girl\b/i,
  /\bcall\s*boy\b/i,
  /\bphone\s*sex\b/i,
  /\bsex\s*chat\b/i,
  /\bsex\s*service\b/i,
  /\bsex\s*work/i,
  /\bnude\b/i,
  /\bnudes\b/i,
  /\bstripper\b/i,
  /\blapdance\b/i,
  /girl\s+for\s+sex/i,
  /boy\s+for\s+sex/i,
  /man\s+for\s+sex/i,
  /woman\s+for\s+sex/i,
  /women\s+for\s+sex/i,
  /want\s+.*\s+sex\b/i,
  /\bfor\s+sex\b/i,
  /\bsex\s+expectation/i,
  /\brape\b/i,
  /\bchild\s+sex/i,
  /\bminor\s+sex/i,
  /\bdrugs?\b/i,
  /\bcocaine\b/i,
  /\bheroin\b/i,
  /\bmethamphetamine\b/i,
  /\becstasy\b/i,
  /\blsd\b/i,
  /\bopioid/i,
  /\bmarijuana\b/i,
  /\bcannabis\b/i,
  /\bget\s+me\s+high\b/i,
  /\bbring\s+.*\bdrugs?\b/i,
];

function combinedText(title, description) {
  const t = String(title || '').trim();
  const d = description != null && String(description).trim() !== '' ? String(description).trim() : '';
  return `${t} ${d}`.trim();
}

/**
 * @returns {{ blocked: boolean, reason?: string }}
 */
function checkHardBlockedJobText(title, description) {
  if (String(process.env.JOB_HARD_BLOCK_ENABLED || 'true').toLowerCase() === 'false') {
    return { blocked: false };
  }
  const haystack = combinedText(title, description);
  if (!haystack) return { blocked: false };

  for (const re of BLOCK_PATTERNS) {
    if (re.test(haystack)) {
      return { blocked: true, reason: USER_FACING };
    }
  }
  return { blocked: false };
}

module.exports = {
  checkHardBlockedJobText,
  USER_FACING,
};
