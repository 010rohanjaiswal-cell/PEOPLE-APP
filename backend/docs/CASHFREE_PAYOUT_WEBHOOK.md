# Cashfree Payouts — Webhook setup

Your backend exposes:

- **`POST`** `https://YOUR_PUBLIC_BACKEND_URL/api/cashfree/webhooks/payout` — real events from Cashfree (JSON body + signatures).
- **`GET`** / **`HEAD`** same URL — returns **200** so the Cashfree dashboard “test URL” / verification does not get **404** (only POST was registered before; dashboard checks often use GET).

## 1. Cashfree Dashboard

1. Log in to **Cashfree** → **Payouts** (or **Global Payouts**).
2. Open **Developers** / **Webhooks** (wording may vary by dashboard version).
3. **Add webhook URL** (production):  
   `https://<your-render-or-domain>/api/cashfree/webhooks/payout`
4. In the **Add Webhook** dialog, set **Webhook version** to **V2** (you only receive V2 payloads when this is selected; this backend expects V2-style `type` + `data` payloads).
5. Subscribe to **transfer** / **payout** events (success, failed, reversed — enable all transfer lifecycle events you are offered).
6. Save. Use the **same** **Client ID / Client Secret** as `CASHFREE_PAYOUTS_CLIENT_ID` / `CASHFREE_PAYOUTS_CLIENT_SECRET` — the webhook HMAC uses the **Payouts** client secret (**oldest active** secret if keys were rotated).

Official reference: [Cashfree docs index](https://www.cashfree.com/docs/llms.txt) → Webhooks V2 for Payouts (signature: `timestamp + rawBody`, HMAC-SHA256 → base64).

## 2. How verification works

The handler verifies `x-webhook-signature` and `x-webhook-timestamp` using:

`HMAC_SHA256(secret, timestamp + rawBody)` → **base64**, compared to the signature header (see Cashfree’s current docs for exact algorithm if verification fails).

## 3. Environment

| Variable | Purpose |
|----------|---------|
| `CASHFREE_PAYOUTS_CLIENT_SECRET` | **Must** match the **Payouts** app client secret in Cashfree. If you rotated secrets, Cashfree signs webhooks with the **oldest active** secret — use that value or verification returns **401**. |
| `CASHFREE_PAYOUT_WEBHOOK_SECRET` | Optional. If set, tried **first** for HMAC (useful if you store a dedicated value). |
| `CASHFREE_CLIENT_SECRET` | Fallback only if the above are wrong — same as Payments app secret in some setups. |
| `CASHFREE_PAYOUT_WEBHOOK_SKIP_VERIFY` | Set to `1` **only** to confirm the dashboard “test” path; **never** in production. |

### Webhook test returns **401 Invalid signature**

1. In Render, `CASHFREE_PAYOUTS_CLIENT_SECRET` must be **exactly** the **Payouts (Global Payouts)** client secret — not the PG / SecureID secret unless they are the same app.
2. Copy the secret again from **Payouts → Developers / Credentials** (no spaces/quotes).
3. If you **rotated** the secret, try the **previous / oldest** active secret (Cashfree docs).
4. **Raw body**: Cashfree signs the **exact raw HTTP body**. If your server parses JSON first and re-stringifies it, or if `express.raw` never reads the body (wrong `Content-Type` match), verification **always** fails. This backend uses `express.raw({ type: () => true })` for the webhook route so **any** Content-Type still captures bytes.
5. Temporarily set `CASHFREE_PAYOUT_WEBHOOK_SKIP_VERIFY=1`, redeploy, run **Test** again. If it succeeds, the URL is fine and only HMAC / raw-body path was wrong — remove skip verify after fixing.
6. Optional: set `CASHFREE_PAYOUT_WEBHOOK_DEBUG=1` to log body length and headers (no secrets) in server logs.

### Webhook **401** vs Payouts API **401** (different checks)

| What fails | Meaning |
|------------|---------|
| **Dashboard “Test & Add Webhook” → 401** | Your server rejected the request: **HMAC** on `x-webhook-signature` does not match. Fix `CASHFREE_PAYOUTS_CLIENT_SECRET` (same as Payouts app, **oldest active** secret). Authorize curl can still be **200**. |
| **`/payout/v1/authorize` → 401** | **Client ID / Secret** are wrong **or** you’re calling the **wrong host** (e.g. sandbox keys against production URL). Fix keys or `CASHFREE_PAYOUTS_ENV` + URL. |

### Verify Payouts API keys with **curl** (same flow as this backend)

The app calls **`POST /payout/v1/authorize`** with empty JSON body and headers `X-Client-Id` / `X-Client-Secret`. If this succeeds (**HTTP 200** and a `token` in the JSON), your **Payouts** keys and **environment URL** match.

**Production** (`CASHFREE_PAYOUTS_ENV=production`):

```bash
curl -sS -w "\nHTTP_CODE:%{http_code}\n" \
  -X POST "https://payout-api.cashfree.com/payout/v1/authorize" \
  -H "Content-Type: application/json" \
  -H "X-Client-Id: YOUR_PAYOUTS_CLIENT_ID" \
  -H "X-Client-Secret: YOUR_PAYOUTS_CLIENT_SECRET" \
  -d '{}'
```

**Sandbox / test** (`CASHFREE_PAYOUTS_ENV=test` or not production):

```bash
curl -sS -w "\nHTTP_CODE:%{http_code}\n" \
  -X POST "https://payout-gamma.cashfree.com/payout/v1/authorize" \
  -H "Content-Type: application/json" \
  -H "X-Client-Id: YOUR_PAYOUTS_CLIENT_ID" \
  -H "X-Client-Secret: YOUR_PAYOUTS_CLIENT_SECRET" \
  -d '{}'
```

- **200** + `data.token` (or `token` in body) → keys work for that host.  
- **401** → wrong ID/secret or **mismatched env** (use gamma URL for sandbox keys, `payout-api.cashfree.com` for production keys).  
- Webhook signature still uses the **same** client secret string; if authorize works but webhook test fails, focus on **oldest active secret**, no body parsing before HMAC, and deployed env value.

## 4. Behaviour in this app

Cashfree’s docs state a transfer is **fully successful** when `status` is `SUCCESS` and `status_code` is `COMPLETED`. In practice you may also get **`TRANSFER_SUCCESS`** with other `status_code` values (e.g. `SENT_TO_BENEFICIARY` in samples). This app marks **`PAID`** when:

- **`TRANSFER_SUCCESS`** and `status` is `SUCCESS`, or  
- **`TRANSFER_ACKNOWLEDGED`** with `SUCCESS` + **`COMPLETED`** (matches the acknowledged sample in V2 docs).

- On **transfer failed / reversed / rejected**: withdrawal status → `FAILED`, **locked** refunded to **available**, optional failure reason stored.
- The app shows **Processing** until the webhook updates the row (pull to refresh on Wallet).

If your firewall requires IP allowlists, Cashfree publishes **UAT** and **Prod** webhook sender IPs in their Webhooks V2 documentation — allow **HTTPS (443)** from those IPs only if your infra requires it.

## 5. Local testing

Use **ngrok** (or similar) to expose `http://localhost:3001` and register the ngrok URL in Cashfree sandbox.  
Or use `CASHFREE_PAYOUT_WEBHOOK_SKIP_VERIFY=1` and POST a JSON body that includes your `transferId` (see `cashfreePayoutWebhook.js` parsing).

## 6. Limitations

- HTTP **200** from `requestTransfer` only means Cashfree **accepted** the request; final settlement is confirmed via **webhook** (or manual reconciliation in Cashfree dashboard).
- If webhooks are missed, you can add a **cron** to poll Cashfree transfer status API — not implemented here.
