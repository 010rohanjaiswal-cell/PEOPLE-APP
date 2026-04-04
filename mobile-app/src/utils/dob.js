/**
 * Parse DOB strings consistently (YYYY-MM-DD, DD-MM-YYYY from Aadhaar, ISO, etc.)
 * and compute age. Used by Profile, UserDetailsModal, ApplicationsModal.
 */

export function parseDob(value) {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  const s = String(value).trim();
  if (!s) return null;

  // YYYY-MM-DD or YYYY/MM/DD
  if (/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(s)) {
    const [y, m, d] = s.split(/[-/]/).map((p) => parseInt(p, 10));
    const dt = new Date(y, m - 1, d);
    return isNaN(dt.getTime()) ? null : dt;
  }

  // DD-MM-YYYY or DD/MM/YYYY (common on Aadhaar)
  if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(s)) {
    const [d, m, y] = s.split(/[-/]/).map((p) => parseInt(p, 10));
    const dt = new Date(y, m - 1, d);
    return isNaN(dt.getTime()) ? null : dt;
  }

  const dt = new Date(s);
  return isNaN(dt.getTime()) ? null : dt;
}

/**
 * @returns {number|null} Age in full years, or null if DOB missing/invalid
 */
export function calculateAgeFromDob(dob) {
  const birthDate = parseDob(dob);
  if (!birthDate) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  if (age < 0 || age > 150) return null;
  return age;
}
