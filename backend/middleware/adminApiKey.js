/**
 * Admin API Key Middleware - People App Backend
 *
 * For server-to-server admin panel access without embedding JWT secrets in the panel.
 * Use header: X-Admin-API-Key: <key>
 *
 * Configure in environment:
 *   ADMIN_PANEL_API_KEY=...
 */

function authenticateAdminApiKey(req, res, next) {
  const configured = process.env.ADMIN_PANEL_API_KEY;
  if (!configured) {
    return res.status(500).json({
      success: false,
      error: 'ADMIN_PANEL_API_KEY is not configured on the server',
    });
  }

  const headerKey =
    req.headers['x-admin-api-key'] ||
    req.headers['x-admin-api_key'] ||
    req.headers['x-admin-apikey'] ||
    null;

  const provided = headerKey != null ? String(headerKey).trim() : '';
  if (!provided || provided !== String(configured).trim()) {
    return res.status(401).json({
      success: false,
      error: 'Invalid admin API key',
    });
  }

  // Attach a minimal admin identity for downstream handlers
  req.user = { id: 'admin_api_key', role: 'admin' };
  req.userId = 'admin_api_key';
  return next();
}

/**
 * Allow either:
 * - JWT admin (authenticate + requireRole('admin'))
 * - Admin API key (server-to-server)
 */
function allowAdminJwtOrApiKey(authenticate, requireRole) {
  return async (req, res, next) => {
    const authHeader = String(req.headers.authorization || '');
    if (authHeader.startsWith('Bearer ')) {
      try {
        await authenticate(req, res, () => {});
        // If authenticate returned a response (401), it will have ended the request.
        if (!req.user) return;
        return requireRole('admin')(req, res, next);
      } catch (_) {
        // fall through to api key
      }
    }
    return authenticateAdminApiKey(req, res, next);
  };
}

module.exports = {
  authenticateAdminApiKey,
  allowAdminJwtOrApiKey,
};

