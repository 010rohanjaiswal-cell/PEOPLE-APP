/**
 * Cashfree Secure ID — 2FA via **Public Key** (dashboard: Developers → Two-Factor Authentication → Public Key).
 * @see https://www.cashfree.com/docs/api-reference/vrs/getting-started#2fa-api-signature-generation
 *
 * Plaintext: `<clientId>.<unixTimestampSeconds>`
 * Encrypt with RSA **public** key using OAEP (SHA-1), Base64 → header `x-cf-signature` (lowercase; Cashfree rejects if missing).
 * Signature is valid ~5 minutes; generate a fresh value per API call.
 */

const crypto = require('crypto');
const fs = require('fs');

function cleanEnv(value) {
  if (value == null) return '';
  let v = String(value).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

/**
 * Accept full PEM from Cashfree, or bare Base64 body only (common when pasting into Render one block).
 */
function normalizePublicKeyPem(raw) {
  if (!raw) return '';
  let s = String(raw).replace(/^\uFEFF/, '').replace(/\\n/g, '\n').trim();
  if (!s) return '';
  if (/-----BEGIN PUBLIC KEY-----/i.test(s) && /-----END PUBLIC KEY-----/i.test(s)) {
    return s;
  }
  // Bare base64 body (strip line breaks / spaces from dashboard paste)
  const b64 = s.replace(/\s+/g, '');
  if (!b64 || b64.length < 100) return s;
  return `-----BEGIN PUBLIC KEY-----\n${b64}\n-----END PUBLIC KEY-----`;
}

function loadSecureIdPublicKeyPem() {
  let raw = cleanEnv(
    process.env.CASHFREE_VRS_2FA_PUBLIC_KEY || process.env.CASHFREE_SECURE_ID_2FA_PUBLIC_KEY
  );
  if (raw) {
    return normalizePublicKeyPem(raw.replace(/\\n/g, '\n'));
  }
  const filePath = cleanEnv(
    process.env.CASHFREE_VRS_2FA_PUBLIC_KEY_FILE || process.env.CASHFREE_SECURE_ID_2FA_PUBLIC_KEY_FILE
  );
  if (filePath && fs.existsSync(filePath)) {
    return normalizePublicKeyPem(fs.readFileSync(filePath, 'utf8'));
  }
  return '';
}

/**
 * @param {string} clientId Same value as `x-client-id` header.
 * @param {string} publicKeyPem PEM including BEGIN/END PUBLIC KEY lines.
 * @returns {string} Base64 ciphertext for `X-Cf-Signature` header.
 */
function generateXCfSignature(clientId, publicKeyPem) {
  const id = String(clientId || '').trim();
  const pem = String(publicKeyPem || '').trim();
  if (!id || !pem) {
    throw new Error('generateXCfSignature: clientId and public key PEM are required');
  }
  const plain = `${id}.${Math.floor(Date.now() / 1000)}`;
  const buf = Buffer.from(plain, 'utf8');
  const encrypted = crypto.publicEncrypt(
    {
      key: pem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha1',
    },
    buf
  );
  return encrypted.toString('base64');
}

/**
 * @returns {Record<string, string>} e.g. `{ 'x-cf-signature': '...' }` or `{}` if 2FA public key not configured.
 */
function secureId2FAHeaders(clientId) {
  const pem = loadSecureIdPublicKeyPem();
  if (!pem) return {};
  try {
    const sig = generateXCfSignature(clientId, pem);
    return { 'x-cf-signature': sig };
  } catch (e) {
    const msg = e?.message || String(e);
    throw new Error(`Cashfree Secure ID X-Cf-Signature failed: ${msg}`);
  }
}

function secureId2FAEnabled() {
  return !!loadSecureIdPublicKeyPem();
}

module.exports = {
  loadSecureIdPublicKeyPem,
  normalizePublicKeyPem,
  generateXCfSignature,
  secureId2FAHeaders,
  secureId2FAEnabled,
};
