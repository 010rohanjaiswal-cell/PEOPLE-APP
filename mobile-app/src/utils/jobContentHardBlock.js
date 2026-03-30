/**
 * Same rules as backend/utils/jobContentHardBlock.js — keep patterns in sync.
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

/** @returns {boolean} */
export function isJobTextHardBlocked(title, description) {
  const haystack = combinedText(title, description);
  if (!haystack) return false;
  return BLOCK_PATTERNS.some((re) => re.test(haystack));
}
