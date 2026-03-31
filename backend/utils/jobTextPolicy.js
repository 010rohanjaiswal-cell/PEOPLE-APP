/**
 * Job title / description: English (A–Z), Hindi (Devanagari), digits, and spaces only.
 */

const MAX_TITLE_LEN = 120;
const MAX_DESCRIPTION_LEN = 4000;

function hasUnsupportedChars(input) {
  return /[^A-Za-z0-9 \u0900-\u097F]/.test(String(input ?? ''));
}

/** Keep only A–Z, a–z, 0–9, and space; trim ends; collapse repeated spaces to one. */
function normalizeJobTextField(input) {
  let s = String(input ?? '').replace(/[^A-Za-z0-9 \u0900-\u097F]/g, '');
  s = s.trim().replace(/ +/g, ' ');
  return s;
}

/**
 * @param {string} title
 * @returns {{ ok: true, normalized: string } | { ok: false, error: string }}
 */
function assertJobTitleAllowed(title) {
  if (hasUnsupportedChars(title)) {
    return {
      ok: false,
      code: 'JOB_UNSUPPORTED_LANGUAGE',
      error: 'Only English and Hindi are supported for job title and description.',
    };
  }
  const normalized = normalizeJobTextField(title);
  if (!normalized) {
    return {
      ok: false,
      code: 'JOB_UNSUPPORTED_LANGUAGE',
      error:
        'Job title may only contain English letters (A–Z, a–z), Hindi letters, digits (0–9), and spaces. No other characters are allowed.',
    };
  }
  if (normalized.length > MAX_TITLE_LEN) {
    return {
      ok: false,
      error: `Job title must be at most ${MAX_TITLE_LEN} characters after removing invalid characters.`,
    };
  }
  return { ok: true, normalized };
}

/**
 * @param {string|null|undefined} description
 * @returns {{ ok: true, normalized: string|null } | { ok: false, error: string }}
 */
function assertJobDescriptionAllowed(description) {
  if (description === undefined || description === null || String(description).trim() === '') {
    return { ok: true, normalized: null };
  }
  if (hasUnsupportedChars(description)) {
    return {
      ok: false,
      code: 'JOB_UNSUPPORTED_LANGUAGE',
      error: 'Only English and Hindi are supported for job title and description.',
    };
  }
  const normalized = normalizeJobTextField(description);
  if (!normalized) {
    return { ok: true, normalized: null };
  }
  if (normalized.length > MAX_DESCRIPTION_LEN) {
    return {
      ok: false,
      error: `Job description must be at most ${MAX_DESCRIPTION_LEN} characters after removing invalid characters.`,
    };
  }
  return { ok: true, normalized };
}

module.exports = {
  hasUnsupportedChars,
  normalizeJobTextField,
  assertJobTitleAllowed,
  assertJobDescriptionAllowed,
  MAX_TITLE_LEN,
  MAX_DESCRIPTION_LEN,
};
