# Cashfree Payouts — Webhook setup

Your backend exposes:

`POST https://YOUR_PUBLIC_BACKEND_URL/api/cashfree/webhooks/payout`

## 1. Cashfree Dashboard

1. Log in to **Cashfree** → **Payouts** (or **Global Payouts**).
2. Open **Developers** / **Webhooks** (wording may vary by dashboard version).
3. **Add webhook URL** (production):  
   `https://<your-render-or-domain>/api/cashfree/webhooks/payout`
4. Subscribe to **transfer** / **payout** events (success, failed, reversed — enable all transfer lifecycle events you are offered).
5. Save. Use the **same** **Client ID / Client Secret** as `CASHFREE_PAYOUTS_CLIENT_ID` / `CASHFREE_PAYOUTS_CLIENT_SECRET` — the webhook HMAC uses the **Payouts** client secret.

## 2. How verification works

The handler verifies `x-webhook-signature` and `x-webhook-timestamp` using:

`HMAC_SHA256(secret, timestamp + rawBody)` → **base64**, compared to the signature header (see Cashfree’s current docs for exact algorithm if verification fails).

## 3. Environment

| Variable | Purpose |
|----------|---------|
| `CASHFREE_PAYOUTS_CLIENT_SECRET` | Used for HMAC verification (required in production). |
| `CASHFREE_PAYOUT_WEBHOOK_SKIP_VERIFY` | Set to `1` **only** for local debugging without valid signatures. **Never** in production. |

## 4. Behaviour in this app

- On **transfer success**: withdrawal status → `PAID`, **locked** balance reduced (funds left the wallet).
- On **transfer failed / reversed**: withdrawal status → `FAILED`, **locked** refunded to **available**, optional failure reason stored.
- The app shows **Processing** until the webhook updates the row (pull to refresh on Wallet).

## 5. Local testing

Use **ngrok** (or similar) to expose `http://localhost:3001` and register the ngrok URL in Cashfree sandbox.  
Or use `CASHFREE_PAYOUT_WEBHOOK_SKIP_VERIFY=1` and POST a JSON body that includes your `transferId` (see `cashfreePayoutWebhook.js` parsing).

## 6. Limitations

- HTTP **200** from `requestTransfer` only means Cashfree **accepted** the request; final settlement is confirmed via **webhook** (or manual reconciliation in Cashfree dashboard).
- If webhooks are missed, you can add a **cron** to poll Cashfree transfer status API — not implemented here.
