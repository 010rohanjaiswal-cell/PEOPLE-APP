# Cashfree Verification egress (static IP)

## Public Key 2FA (recommended on Render)

If Cashfree **Developers → Two-Factor Authentication → Public Key** is enabled, your **main backend** must send **`X-Cf-Signature`** on every Verification request. Configure there:

- `CASHFREE_VRS_2FA_PUBLIC_KEY` or `CASHFREE_VRS_2FA_PUBLIC_KEY_FILE`

The main backend generates a fresh signature per call and, when using this egress, passes **`cfSignature`** in the `/forward` JSON body; this service forwards it as the `X-Cf-Signature` header to Cashfree.

---

Render **does not** give you a stable outbound IP. If you still use **IP whitelist** 2FA, Cashfree must list the **public IP that reaches Cashfree** — often this egress service’s NAT IP (not each end-user’s phone).

## Architecture

1. Deploy this small Node app on **AWS** (recommended):
   - **VPC** → **private subnet** for the task/instance
   - **NAT Gateway** with an **Elastic IP**
   - Route `0.0.0.0/0` from the private subnet to the NAT
   - Run this service in the private subnet (or public subnet that still uses NAT for outbound, depending on your layout)

2. In **Cashfree** SecureID / IP allowlist: add the **NAT Gateway’s Elastic IP**.

3. On **Render** (main `people-app-backend`): set:
   - `CASHFREE_EGRESS_SERVICE_URL=https://your-egress-host.example.com` (no trailing slash)
   - `CASHFREE_EGRESS_SERVICE_SECRET=<same long random string as on egress>`

4. On **this egress service** set the same Cashfree verification env vars as production (client id/secret, `CASHFREE_VRS_ENV=production`, etc.). You can **remove** those verification secrets from Render if you only call Cashfree verification through egress (optional hardening).

## Do I need a “new service” on Render?

**No** — a second Render Web Service **still won’t fix** static outbound IP for Cashfree. Use **AWS** (or another cloud that offers NAT + fixed egress) for this repo only.

## Run locally (smoke test)

```bash
cd cashfree-verification-egress
cp .env.example .env   # create and fill
npm install
npm start
```

## Endpoints

- `GET /health` — no auth
- `POST /forward` — `Authorization: Bearer <CASHFREE_EGRESS_SERVICE_SECRET>`  
  Body: `{ "method": "POST", "path": "/offline-aadhaar/otp", "body": { "aadhaar_number": "..." }, "cfSignature": "optional-base64-from-main" }`  
  Or multipart: `{ "method": "POST", "path": "/face-match", "multipart": { ... }, "cfSignature": "..." }`

HTTP status and JSON body from Cashfree are passed through to the caller.
