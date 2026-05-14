/**
 * All Cashfree **Verification** (SecureID / VRS) HTTP calls should go through this module.
 *
 * **2FA Public Key** (recommended on dynamic IPs like Render): set `CASHFREE_VRS_2FA_PUBLIC_KEY`
 * (PEM) or `CASHFREE_VRS_2FA_PUBLIC_KEY_FILE` so each request sends `x-cf-signature` per Cashfree docs.
 *
 * **Egress** (optional): when `CASHFREE_EGRESS_SERVICE_URL` + `CASHFREE_EGRESS_SERVICE_SECRET` are set,
 * requests are proxied; `x-cf-signature` is generated on this host and forwarded to egress.
 */

const axios = require('axios');
const FormData = require('form-data');
const { getVerificationConfig } = require('../config/cashfree');
const { secureId2FAHeaders, secureId2FAEnabled } = require('../utils/cashfreeSecureIdSignature');

let warnedMissingSecureId2fa = false;
function warnIfMissing2faOnce() {
  if (secureId2FAEnabled()) return;
  if (warnedMissingSecureId2fa) return;
  warnedMissingSecureId2fa = true;
  const hasRaw =
    !!cleanEnv(process.env.CASHFREE_VRS_2FA_PUBLIC_KEY) ||
    !!cleanEnv(process.env.CASHFREE_SECURE_ID_2FA_PUBLIC_KEY);
  if (hasRaw) {
    console.warn(
      '[Cashfree SecureID] 2FA public key env is set but PEM could not be parsed — check multiline / quotes. Cashfree will return x-cf-signature missing.'
    );
  } else {
    console.warn(
      '[Cashfree SecureID] Set CASHFREE_VRS_2FA_PUBLIC_KEY (Secure ID dashboard PEM) on this server or Cashfree returns x-cf-signature missing.'
    );
  }
}

function cleanEnv(value) {
  if (value == null) return '';
  let v = String(value).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

function egressConfigured() {
  return !!(cleanEnv(process.env.CASHFREE_EGRESS_SERVICE_URL) && cleanEnv(process.env.CASHFREE_EGRESS_SERVICE_SECRET));
}

function getVerificationBaseUrl() {
  const cfg = getVerificationConfig();
  return String(cfg.baseURL || '').replace(/\/$/, '');
}

function getCashfreeVrsHeaders(extra = {}) {
  const cfg = getVerificationConfig();
  const twoFa = secureId2FAHeaders(cfg.clientId);
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'x-client-id': cfg.clientId,
    'x-client-secret': cfg.clientSecret,
    'x-api-version': cfg.apiVersion,
    ...twoFa,
    ...extra,
  };
}

/**
 * JSON or query-only verification request.
 * @param {{ method: string, path: string, params?: object, data?: any, headers?: object, timeout?: number, responseType?: string }} opts
 * @returns {Promise<import('axios').AxiosResponse>}
 */
async function cashfreeVerificationRequest(opts) {
  const {
    method,
    path,
    params,
    data,
    headers: extraHeaders,
    timeout = 35000,
    responseType,
  } = opts;
  if (!path || !String(path).startsWith('/')) {
    throw new Error(`cashfreeVerificationRequest: path must start with /, got: ${path}`);
  }
  const m = String(method || 'GET').toUpperCase();

  if (egressConfigured()) {
    const base = cleanEnv(process.env.CASHFREE_EGRESS_SERVICE_URL).replace(/\/$/, '');
    const secret = cleanEnv(process.env.CASHFREE_EGRESS_SERVICE_SECRET);
    const cfg = getVerificationConfig();
    const twoFa = secureId2FAHeaders(cfg.clientId);
    const cfSignature = twoFa['x-cf-signature'] || null;
    return axios.post(
      `${base}/forward`,
      {
        method: m,
        path,
        query: params && typeof params === 'object' ? params : null,
        body: data !== undefined ? data : null,
        cfSignature,
      },
      {
        headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
        timeout: Math.max(timeout, 5000),
        responseType,
      }
    );
  }

  warnIfMissing2faOnce();

  const baseUrl = getVerificationBaseUrl();
  return axios({
    method: m,
    url: `${baseUrl}${path}`,
    params: params || undefined,
    data: data !== undefined ? data : undefined,
    headers: { ...getCashfreeVrsHeaders(), ...(extraHeaders || {}) },
    timeout,
    responseType,
  });
}

/**
 * Multipart POST (e.g. /face-match).
 * @param {{ path: string, fields: Record<string, string>, files: Array<{ name: string, filename: string, contentType: string, buffer: Buffer }>, timeout?: number }} opts
 * @returns {Promise<import('axios').AxiosResponse>}
 */
async function cashfreeVerificationMultipartPost(opts) {
  const { path, fields, files, timeout = 35000 } = opts;
  if (!path || !String(path).startsWith('/')) {
    throw new Error(`cashfreeVerificationMultipartPost: path must start with /, got: ${path}`);
  }

  if (egressConfigured()) {
    const base = cleanEnv(process.env.CASHFREE_EGRESS_SERVICE_URL).replace(/\/$/, '');
    const secret = cleanEnv(process.env.CASHFREE_EGRESS_SERVICE_SECRET);
    const cfg = getVerificationConfig();
    const twoFa = secureId2FAHeaders(cfg.clientId);
    const cfSignature = twoFa['x-cf-signature'] || null;
    const multipart = {
      fields: fields || {},
      files: (files || []).map((f) => ({
        name: f.name,
        filename: f.filename,
        contentType: f.contentType,
        base64: Buffer.isBuffer(f.buffer) ? f.buffer.toString('base64') : String(f.buffer || ''),
      })),
    };
    return axios.post(
      `${base}/forward`,
      { method: 'POST', path, query: null, body: null, multipart, cfSignature },
      {
        headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
        timeout: Math.max(timeout, 5000),
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );
  }

  warnIfMissing2faOnce();

  const baseUrl = getVerificationBaseUrl();
  const form = new FormData();
  const f = fields || {};
  for (const [k, v] of Object.entries(f)) {
    if (v != null) form.append(k, String(v));
  }
  for (const file of files || []) {
    form.append(file.name, file.buffer, { filename: file.filename, contentType: file.contentType });
  }
  const hdrs = { ...getCashfreeVrsHeaders() };
  delete hdrs['Content-Type'];
  return axios.post(`${baseUrl}${path}`, form, {
    headers: {
      ...hdrs,
      ...form.getHeaders(),
    },
    timeout,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });
}

module.exports = {
  egressConfigured,
  getVerificationBaseUrl,
  getCashfreeVrsHeaders,
  cashfreeVerificationRequest,
  cashfreeVerificationMultipartPost,
};
