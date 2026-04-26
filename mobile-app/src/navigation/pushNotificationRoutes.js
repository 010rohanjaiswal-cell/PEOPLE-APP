/**
 * Maps Expo push `data.type` + user role to in-app navigation (see AppNavigator + dashboards).
 * Push payloads stringify values; normalize before use.
 */

export function normalizeExpoPushData(data) {
  if (!data || typeof data !== 'object') return {};
  const out = { ...data };
  if (out.type != null) out.type = String(out.type).trim();
  if (out.jobId != null) out.jobId = String(out.jobId);
  return out;
}

/**
 * @returns {{ tab: 'MyJobs' | 'Dashboard' | 'Wallet', openApplicationsJobId?: string | null } | null}
 * null = only navigate to root dashboard screen (existing default).
 */
export function resolvePushActionFromNotificationData(normalizedData, userRole) {
  const type = normalizedData.type || '';
  const jobId = normalizedData.jobId || null;

  if (userRole === 'client') {
    if (
      type === 'offer_received' ||
      type === 'work_done' ||
      type === 'job_assigned' ||
      type === 'auto_pick'
    ) {
      return { tab: 'MyJobs', openApplicationsJobId: null };
    }
    if (type === 'application_received') {
      return { tab: 'MyJobs', openApplicationsJobId: jobId };
    }
    return null;
  }

  if (userRole === 'freelancer') {
    if (type === 'offer_accepted' || type === 'job_assigned' || type === 'auto_pick') {
      return { tab: 'MyJobs' };
    }
    if (type === 'payment_received') {
      return { tab: 'Wallet' };
    }
    if (type === 'offer_rejected' || type === 'application_rejected') {
      return { tab: 'Dashboard' };
    }
    return null;
  }

  return null;
}
