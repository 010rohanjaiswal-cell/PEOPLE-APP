import { clientNeedsProfileSetup } from './clientProfileGate';
import {
  freelancerNeedsVerification,
  isFreelancerRole,
  isFreelancerVerified,
  resolveFreelancerRoute,
} from './freelancerVerificationGate';

/**
 * Post-login stack route (intro vs dashboard handled via introGate).
 * @param {{ ready: boolean, showIntro: boolean }} introGate
 */
export function resolveAuthenticatedRoute(user, introGate = { ready: true, showIntro: false }) {
  if (!user?.role) return 'Login';

  if (isFreelancerRole(user)) {
    return resolveFreelancerRoute(user, introGate);
  }

  if (user.role === 'client') {
    if (clientNeedsProfileSetup(user)) {
      return 'ProfileSetup';
    }
    if (introGate.ready && introGate.showIntro) {
      return 'ClientIntro';
    }
    return 'ClientDashboard';
  }

  return 'Login';
}

export { isFreelancerVerified, freelancerNeedsVerification, isFreelancerRole };
