# Urgent Question for PhonePe Support Team

## Context

You mentioned that everything is already enabled for our merchant account (M23OKIGC1N363), and the 500 error is due to an error in our request format or code.

## What We've Tested

### Test Results

1. **PG_CHECKOUT Flow:**
   - Status: **400 Bad Request** (validation error)
   - Error: Empty udf11-15 fields validation
   - **Conclusion:** Request format is being processed, just has validation issues

2. **SDK Flow (All Variations):**
   - Status: **500 Internal Server Error** (server error)
   - Tested with/without metaInfo
   - Tested with/without redirectUrl, callbackUrl, paymentInstrument
   - Tested minimal request (only your sample fields)
   - **Conclusion:** All SDK requests give 500 error

## Key Question

**Why does `paymentFlow.type = "PG_CHECKOUT"` give 400 (validation error) while `paymentFlow.type = "SDK"` gives 500 (server error)?**

This suggests:
- PG_CHECKOUT format is being validated (400 = format issue)
- SDK format is failing at server level (500 = server cannot process)

## Our Current Request (SDK)

```json
{
  "merchantId": "M23OKIGC1N363",
  "merchantOrderId": "DUES_TEST_...",
  "amount": 100,
  "expireAfter": 1200,
  "merchantUserId": "test_user",
  "redirectUrl": "people-app://payment/callback?orderId=...",
  "redirectMode": "REDIRECT",
  "callbackUrl": "https://.../api/payment/webhook",
  "paymentFlow": {
    "type": "SDK"
  },
  "paymentInstrument": {
    "type": "UPI_INTENT"
  }
}
```

## Your Sample Request

```json
{
  "merchantOrderId": "TX123456",
  "amount": 100,
  "expireAfter": 1200,
  "metaInfo": {
    "udf1": "<additional-information-1>",
    ...
  },
  "paymentFlow": {
    "type": "PG_CHECKOUT"
  }
}
```

## Specific Questions

1. **Is your sample for SDK orders or generic?** It shows `PG_CHECKOUT`, but we need `SDK`.

2. **What are the exact required fields for SDK orders?**
   - Is `merchantId` required in body or only in auth?
   - Is `merchantUserId` required?
   - Is `redirectUrl` required for SDK?
   - Is `callbackUrl` required for SDK?
   - Is `paymentInstrument` required for SDK?
   - Is `redirectMode` required?

3. **Why does SDK give 500 while PG_CHECKOUT gives 400?**
   - Does SDK need different/additional fields?
   - Is there SDK-specific configuration needed?

4. **Can you provide an exact SDK order request example?**
   - Not a generic sample, but specifically for SDK orders
   - With all required fields for SDK flow

## Request

Please provide:
1. **Exact SDK order request format** (all required fields)
2. **List of required vs optional fields** for SDK orders
3. **Explanation of why SDK gives 500** while PG_CHECKOUT gives 400

Thank you for your assistance.

