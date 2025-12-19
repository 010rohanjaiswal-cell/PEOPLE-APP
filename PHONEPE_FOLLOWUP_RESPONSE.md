# Response to PhonePe Support Team

## Subject
Re: SDK Order Creation - Request Format Clarification

---

## Message Body

Dear Darshan Naik and PhonePe Integration Team,

Thank you for providing the sample request. We have updated our implementation to include the `expireAfter` field as shown in your sample.

However, we have a few clarifications regarding the sample request format:

### 1. paymentFlow.type

**Your Sample Shows:**
```json
"paymentFlow": {
  "type": "PG_CHECKOUT"
}
```

**Our Implementation:**
```json
"paymentFlow": {
  "type": "SDK"
}
```

**Question:** We are trying to create **SDK orders** (for Android Native SDK integration), not web checkout. Should we use `"type": "SDK"` or is there a different value we should use?

### 2. Additional Required Fields for SDK Orders

Your sample request shows only the core fields. However, for SDK orders, we understand that additional fields are required:

- `merchantId` - Required for authentication
- `redirectUrl` - Required for deep link callback after payment
- `callbackUrl` - Required for webhook notifications
- `paymentInstrument` - Required to specify payment method (e.g., `{ "type": "UPI_INTENT" }`)

**Question:** Should these fields be included in the SDK order request, or is your sample a minimal example?

### 3. Our Current Request Format

After incorporating your sample, our request now looks like this:

```json
{
  "merchantId": "M23OKIGC1N363",
  "merchantOrderId": "DUES_TEST_17661417613N",
  "amount": 100,
  "expireAfter": 1200,
  "merchantUserId": "test_user",
  "redirectUrl": "people-app://payment/callback?orderId=DUES_TEST_17661417613N",
  "redirectMode": "REDIRECT",
  "callbackUrl": "https://freelancing-platform-backend-backup.onrender.com/api/payment/webhook",
  "paymentFlow": {
    "type": "SDK"
  },
  "paymentInstrument": {
    "type": "UPI_INTENT"
  },
  "metaInfo": {
    "udf1": "",
    "udf2": "",
    "udf3": "",
    "udf4": "",
    "udf5": "",
    "udf6": "",
    "udf7": "",
    "udf8": "",
    "udf9": "",
    "udf10": "",
    "udf11": "",
    "udf12": "",
    "udf13": "",
    "udf14": "",
    "udf15": ""
  }
}
```

### 4. Current Error

We are still receiving a 500 Internal Server Error with the message:
```
"There is an error trying to process your transaction at the moment. Please try again in a while."
```

**Question:** 
- Is this error due to the request format, or is it because SDK orders are not enabled for our merchant account (M23OKIGC1N363)?
- Are there any other fields or format requirements we should be aware of?

### Request

Could you please clarify:
1. Should `paymentFlow.type` be `"SDK"` for SDK orders, or is there a different value?
2. Are the additional fields (merchantId, redirectUrl, callbackUrl, paymentInstrument) required for SDK orders?
3. Is the 500 error due to request format or account configuration?
4. Do we need to enable SDK orders separately in the dashboard, or is there a different process?

We appreciate your assistance and look forward to resolving this issue.

Thank you.

Best regards,
[Your Name]
[Your Company Name]
[Contact Email]
[Contact Phone Number]

---

## Quick Response Version

Dear PhonePe Team,

Thank you for the sample. We've added `expireAfter` as shown.

**Clarifications needed:**
1. For SDK orders, should `paymentFlow.type` be `"SDK"` (we're using this) or something else?
2. Are fields like `merchantId`, `redirectUrl`, `callbackUrl`, `paymentInstrument` required for SDK orders?
3. Is the 500 error due to format or SDK orders not being enabled for merchant M23OKIGC1N363?

Our current request includes all fields from your sample plus SDK-specific fields. Still getting 500 error.

Please advise.

Thank you.

[Your Contact Details]

