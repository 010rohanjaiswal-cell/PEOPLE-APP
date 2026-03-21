const axios = require('axios');

function cleanEnvValue(value) {
  if (value == null) return '';
  let v = String(value).trim();
  // Handle common copy/paste mistakes from dashboards: "value" or 'value'
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

function requiredEnv(name) {
  const v = cleanEnvValue(process.env[name]);
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function getPaymentsConfig() {
  const env = (process.env.CASHFREE_PAYMENTS_ENV || 'sandbox').toLowerCase();
  const baseURL =
    process.env.CASHFREE_PAYMENTS_BASE_URL ||
    (env === 'production' ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg');

  return {
    env,
    baseURL,
    apiVersion: process.env.CASHFREE_PAYMENTS_API_VERSION || '2023-08-01',
    clientId: requiredEnv('CASHFREE_PAYMENTS_CLIENT_ID'),
    clientSecret: requiredEnv('CASHFREE_PAYMENTS_CLIENT_SECRET'),
  };
}

function getPayoutsConfig() {
  const env = (process.env.CASHFREE_PAYOUTS_ENV || 'test').toLowerCase();
  const baseURL =
    process.env.CASHFREE_PAYOUTS_BASE_URL ||
    (env === 'production' ? 'https://payout-api.cashfree.com' : 'https://payout-gamma.cashfree.com');

  return {
    env,
    baseURL,
    clientId: requiredEnv('CASHFREE_PAYOUTS_CLIENT_ID'),
    clientSecret: requiredEnv('CASHFREE_PAYOUTS_CLIENT_SECRET'),
  };
}

function getVerificationConfig() {
  // IMPORTANT: Do not default to sandbox when NODE_ENV is production — prod client id/secret only work
  // against https://api.cashfree.com/verification. Hitting sandbox with prod keys → 401 invalid credentials.
  const explicitVrs = cleanEnvValue(process.env.CASHFREE_VRS_ENV);
  const explicitCf = cleanEnvValue(process.env.CASHFREE_ENV);
  const payoutsEnv = cleanEnvValue(process.env.CASHFREE_PAYOUTS_ENV || '').toLowerCase();
  const nodeEnv = cleanEnvValue(process.env.NODE_ENV || '').toLowerCase();

  const envRaw = (
    explicitVrs ||
    explicitCf ||
    (payoutsEnv === 'production' ? 'production' : '') ||
    (nodeEnv === 'production' ? 'production' : '') ||
    'sandbox'
  ).toLowerCase();

  const env = envRaw === 'production' ? 'production' : 'sandbox';
  const baseURL =
    cleanEnvValue(process.env.CASHFREE_VRS_BASE_URL) ||
    (env === 'production' ? 'https://api.cashfree.com/verification' : 'https://sandbox.cashfree.com/verification');
  const vrsClientId = cleanEnvValue(process.env.CASHFREE_VRS_CLIENT_ID) || cleanEnvValue(process.env.CASHFREE_CLIENT_ID);
  const vrsClientSecret =
    cleanEnvValue(process.env.CASHFREE_VRS_CLIENT_SECRET) || cleanEnvValue(process.env.CASHFREE_CLIENT_SECRET);
  if (!vrsClientId) throw new Error('Missing env var: CASHFREE_VRS_CLIENT_ID (or CASHFREE_CLIENT_ID)');
  if (!vrsClientSecret) {
    throw new Error('Missing env var: CASHFREE_VRS_CLIENT_SECRET (or CASHFREE_CLIENT_SECRET)');
  }

  return {
    env,
    baseURL,
    apiVersion: cleanEnvValue(process.env.CASHFREE_VRS_API_VERSION) || '2023-12-18',
    clientId: vrsClientId,
    clientSecret: vrsClientSecret,
  };
}

function createPaymentsClient() {
  const cfg = getPaymentsConfig();
  return axios.create({
    baseURL: cfg.baseURL,
    timeout: 35000,
    headers: {
      'Content-Type': 'application/json',
      'x-api-version': cfg.apiVersion,
      'x-client-id': cfg.clientId,
      'x-client-secret': cfg.clientSecret,
    },
  });
}

let cachedPayoutAuth = { token: null, expiresAt: 0 };

async function getPayoutAuthToken() {
  const cfg = getPayoutsConfig();
  const now = Date.now();
  if (cachedPayoutAuth.token && cachedPayoutAuth.expiresAt - now > 60_000) {
    return cachedPayoutAuth.token;
  }

  // Production Payouts expects auth via headers (X-Client-Id / X-Client-Secret), not JSON body.
  const authResp = await axios.post(
    `${cfg.baseURL}/payout/v1/authorize`,
    {},
    {
      timeout: 20000,
      headers: {
        'X-Client-Id': cfg.clientId,
        'X-Client-Secret': cfg.clientSecret,
      },
    }
  );

  const token = authResp?.data?.data?.token || authResp?.data?.token || null;
  const expiry = authResp?.data?.data?.expiry || authResp?.data?.expiry || null;
  if (!token) throw new Error('Cashfree Payouts authorize failed (no token)');

  // expiry can be epoch seconds or ms depending on API; fall back to 55 minutes.
  let expiresAt = now + 55 * 60_000;
  if (typeof expiry === 'number') {
    expiresAt = expiry > 10_000_000_000 ? expiry : expiry * 1000;
  }

  cachedPayoutAuth = { token, expiresAt };
  return token;
}

async function createPayoutsClient() {
  const cfg = getPayoutsConfig();
  const token = await getPayoutAuthToken();
  return axios.create({
    baseURL: cfg.baseURL,
    timeout: 35000,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
}

function createVerificationClient() {
  const cfg = getVerificationConfig();
  return axios.create({
    baseURL: cfg.baseURL,
    timeout: 35000,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'x-api-version': cfg.apiVersion,
      'x-client-id': cfg.clientId,
      'x-client-secret': cfg.clientSecret,
    },
  });
}

module.exports = {
  getPaymentsConfig,
  getPayoutsConfig,
  getVerificationConfig,
  createPaymentsClient,
  createPayoutsClient,
  createVerificationClient,
};

