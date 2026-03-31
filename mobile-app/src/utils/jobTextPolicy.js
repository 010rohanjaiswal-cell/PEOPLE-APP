/**
 * Job title / description: English (A–Z), Hindi (Devanagari), digits, spaces.
 * (Keep backend and mobile in sync.)
 */

export const MAX_JOB_TITLE_LEN = 120;
export const MAX_JOB_DESCRIPTION_LEN = 4000;

/** Remove any character that is not A–Z, a–z, 0–9, Devanagari, or space. */
export function sanitizeJobTextInput(raw) {
  return String(raw ?? '').replace(/[^A-Za-z0-9 \u0900-\u097F]/g, '');
}

/** Trim ends and collapse repeated spaces (same as server save). */
export function normalizeJobTextForValidation(raw) {
  return sanitizeJobTextInput(raw)
    .trim()
    .replace(/ +/g, ' ');
}

export function isValidJobTitle(text) {
  const t = normalizeJobTextForValidation(text);
  if (!t || t.length > MAX_JOB_TITLE_LEN) return false;
  return /[A-Za-z0-9\u0900-\u097F]/.test(t);
}

/** Empty description is valid; otherwise same rules as title (length cap). */
export function isValidJobDescription(text) {
  const d = normalizeJobTextForValidation(text);
  if (!d) return true;
  if (d.length > MAX_JOB_DESCRIPTION_LEN) return false;
  return /[A-Za-z0-9\u0900-\u097F]/.test(d);
}
