const axios = require('axios');

function requiredEnv(name) {
  const v = process.env[name];
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

  const authResp = await axios.post(
    `${cfg.baseURL}/payout/v1/authorize`,
    { clientId: cfg.clientId, clientSecret: cfg.clientSecret },
    { timeout: 20000, headers: { 'Content-Type': 'application/json' } }
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

module.exports = {
  getPaymentsConfig,
  getPayoutsConfig,
  createPaymentsClient,
  createPayoutsClient,
};

