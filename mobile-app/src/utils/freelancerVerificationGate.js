/**
 * Client-side freelancer verification gate — must match backend approved rules.
 */

export function isFreelancerRole(user) {
  return String(user?.role || '').trim() === 'freelancer';
}

export function isFreelancerVerified(user) {
  return isFreelancerRole(user) && user?.verificationStatus === 'approved';
}

export function freelancerNeedsVerification(user) {
  if (!isFreelancerRole(user)) return true;
  return !isFreelancerVerified(user);
}

export function resolveFreelancerRoute(user, introGate = { ready: true, showIntro: false }) {
  if (!isFreelancerRole(user)) return 'Login';
  if (freelancerNeedsVerification(user)) return 'Verification';
  if (introGate.ready && introGate.showIntro) return 'FreelancerIntro';
  return 'FreelancerDashboard';
}
