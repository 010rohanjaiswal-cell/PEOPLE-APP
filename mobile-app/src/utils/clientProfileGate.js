/**
 * Client profile completeness for navigation (matches ProfileSetup requirements:
 * non-empty name and a profile photo URL from the server).
 */
export function clientNeedsProfileSetup(user) {
  if (!user || String(user.role || '').trim().toLowerCase() !== 'client') {
    return false;
  }
  const name = String(user.fullName || '').trim();
  const photo = String(user.profilePhoto || '').trim();
  return !name || !photo;
}
