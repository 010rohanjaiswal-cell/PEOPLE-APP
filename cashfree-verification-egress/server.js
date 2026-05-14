/**
 * Cashfree Verification egress proxy — run on a host with a **stable public outbound IP**
 * (e.g. AWS ECS/Fargate or EC2 in a private subnet + NAT Gateway + Elastic IP).
 *
 * Render Web Services do **not** provide a static outbound IP; use this service on AWS
 * and whitelist the NAT Elastic IP in Cashfree SecureID.
 *
 * Env (same naming as backend config/cashfree.js for verification):
 *   PORT=8790
 *   CASHFREE_EGRESS_SERVICE_SECRET=long_random_shared_with_main_backend
 *   CASHFREE_CLIENT_ID / CASHFREE_CLIENT_SECRET (or CASHFREE_VRS_CLIENT_ID / CASHFREE_VRS_CLIENT_SECRET)
 *   CASHFREE_VRS_ENV=production | sandbox
 *   Optional: CASHFREE_VRS_API_VERSION, CASHFREE_VRS_BASE_URL
 */

require('dotenv').config();

const express = require('express');
const axios = require('axios');
const FormData = require('form-data');

function cleanEnv(value) {
  if (value == null) return '';
  let v = String(value).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

function getVerificationConfig() {
  const explicitVrs = cleanEnv(process.env.CASHFREE_VRS_ENV);
  const explicitCf = cleanEnv(process.env.CASHFREE_ENV);
  const payoutsEnv = cleanEnv(process.env.CASHFREE_PAYOUTS_ENV || '').toLowerCase();
  const nodeEnv = cleanEnv(process.env.NODE_ENV || '').toLowerCase();

  const envRaw = (
    explicitVrs ||
    explicitCf ||
    (payoutsEnv === 'production' ? 'production' : '') ||
    (nodeEnv === 'production' ? 'production' : '') ||
    'sandbox'
  ).toLowerCase();

  const env = envRaw === 'production' ? 'production' : 'sandbox';
  const baseURL =
    cleanEnv(process.env.CASHFREE_VRS_BASE_URL) ||
    (env === 'production' ? 'https://api.cashfree.com/verification' : 'https://sandbox.cashfree.com/verification');
  const vrsClientId = cleanEnv(process.env.CASHFREE_VRS_CLIENT_ID) || cleanEnv(process.env.CASHFREE_CLIENT_ID);
  const vrsClientSecret =
    cleanEnv(process.env.CASHFREE_VRS_CLIENT_SECRET) || cleanEnv(process.env.CASHFREE_CLIENT_SECRET);
  if (!vrsClientId || !vrsClientSecret) {
    throw new Error('Missing CASHFREE_VRS_CLIENT_ID/CASHFREE_CLIENT_ID or secret');
  }
  return {
    env,
    baseURL: String(baseURL).replace(/\/$/, ''),
    apiVersion: cleanEnv(process.env.CASHFREE_VRS_API_VERSION) || '2023-12-18',
    clientId: vrsClientId,
    clientSecret: vrsClientSecret,
  };
}

function vrsHeadersWithSignature(cfSignature) {
  const h = { ...vrsHeaders() };
  const sig = cfSignature != null ? String(cfSignature).trim() : '';
  if (sig) h['x-cf-signature'] = sig;
  return h;
}

function authMiddleware(req, res, next) {
  const expected = cleanEnv(process.env.CASHFREE_EGRESS_SERVICE_SECRET);
  if (!expected) {
    return res.status(500).json({ error: 'CASHFREE_EGRESS_SERVICE_SECRET is not set on egress server' });
  }
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7).trim() : '';
  if (token !== expected) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return next();
}

const app = express();
app.use(express.json({ limit: '25mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'cashfree-verification-egress' });
});

/**
 * POST /forward
 * body: { method, path, query?, body?, multipart? }
 */
app.post('/forward', authMiddleware, async (req, res) => {
  try {
    const cfg = getVerificationConfig();
    const { method, path, query, body, multipart, cfSignature } = req.body || {};
    const p = String(path || '');
    if (!p.startsWith('/')) {
      return res.status(400).json({ error: 'path must start with /' });
    }
    const m = String(method || 'GET').toUpperCase();
    const url = `${cfg.baseURL}${p}`;

    if (multipart && typeof multipart === 'object') {
      const form = new FormData();
      const fields = multipart.fields && typeof multipart.fields === 'object' ? multipart.fields : {};
      for (const [k, v] of Object.entries(fields)) {
        if (v != null) form.append(k, String(v));
      }
      const files = Array.isArray(multipart.files) ? multipart.files : [];
      for (const f of files) {
        if (!f?.name || !f?.base64) continue;
        const buf = Buffer.from(String(f.base64), 'base64');
        form.append(f.name, buf, {
          filename: f.filename || 'file.bin',
          contentType: f.contentType || 'application/octet-stream',
        });
      }
      const hdrs = { ...vrsHeadersWithSignature(cfSignature) };
      delete hdrs['Content-Type'];
      const r = await axios({
        method: 'POST',
        url,
        params: query && typeof query === 'object' ? query : undefined,
        data: form,
        headers: { ...hdrs, ...form.getHeaders() },
        timeout: 40000,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        validateStatus: () => true,
      });
      return res.status(r.status).send(r.data);
    }

    const r = await axios({
      method: m,
      url,
      params: query && typeof query === 'object' ? query : undefined,
      data: body !== undefined && body !== null ? body : undefined,
      headers: vrsHeadersWithSignature(cfSignature),
      timeout: 40000,
      validateStatus: () => true,
    });
    return res.status(r.status).send(r.data);
  } catch (e) {
    const status = e?.response?.status || 502;
    const data = e?.response?.data || { message: e?.message || 'Proxy error' };
    return res.status(status).json(typeof data === 'object' ? data : { message: String(data) });
  }
});

const port = Number(process.env.PORT) || 8790;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`cashfree-verification-egress listening on :${port}`);
});
