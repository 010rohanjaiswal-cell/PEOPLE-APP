# PhonePe SDK Order 500 Error - Diagnosis & Resolution

## 🔴 Current Issue

PhonePe is returning a **500 Internal Server Error** when attempting to create SDK orders via `/checkout/v2/sdk/order`.

### Error Details
- **Status Code**: 500
- **Error Code**: `INTERNAL_SERVER_ERROR`
- **Error Message**: "There is an error trying to process your transaction at the moment. Please try again in a while."
- **Endpoint**: `https://api.phonepe.com/apis/pg/checkout/v2/sdk/order`

## 🔍 Root Cause Analysis

A 500 error from PhonePe typically indicates one of the following:

1. **SDK Orders Not Enabled** (Most Likely)
   - Your merchant account may only support web payments, not SDK orders
   - SDK orders require special activation from PhonePe support

2. **Merchant Account Configuration**
   - Your merchant account type may not support SDK orders
   - Account may be configured for B2C PG only, not SDK flow

3. **Request Format Issue** (Less Likely)
   - Missing required field
   - Incorrect field format or value

## ✅ Verification Steps

### 1. Check Backend Logs
The backend now logs complete error details. Check Render logs for:
- Full PhonePe error response
- Request body sent to PhonePe
- Response headers

### 2. Test Endpoint
Use the test endpoint to verify request format:
```bash
POST /api/payment/test-sdk-order
```

This will create a test SDK order and return the full PhonePe response.

### 3. Verify Request Format
Our current request format:
```json
{
  "merchantId": "M23OKIGC1N363",
  "merchantOrderId": "DUES_...",
  "amount": 10000,
  "merchantUserId": "...",
  "redirectUrl": "people-app://payment/callback?orderId=...",
  "redirectMode": "REDIRECT",
  "callbackUrl": "https://.../api/payment/webhook",
  "paymentFlow": "SDK",
  "paymentInstrument": {
    "type": "UPI_INTENT"
  },
  "mobileNumber": "..." // Optional
}
```

## 🛠️ Resolution Steps

### Step 1: Contact PhonePe Support
**This is the most important step.** PhonePe support needs to:
1. Verify if SDK orders are enabled for merchant ID: `M23OKIGC1N363`
2. Enable SDK orders if not already enabled
3. Verify merchant account configuration supports SDK flow

**Contact Information:**
- PhonePe Developer Support: https://developer.phonepe.com/support
- Include merchant ID: `M23OKIGC1N363`
- Mention you're getting 500 error on `/checkout/v2/sdk/order`
- Share the error message and request format

### Step 2: Verify Dashboard Settings
1. Log into PhonePe Business Dashboard
2. Check Developer Settings
3. Verify SDK integration is enabled
4. Check if there are any account restrictions

### Step 3: Test with Sandbox (If Available)
If you have sandbox credentials, test with sandbox environment first:
- Sandbox URL: `https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/sdk/order`
- This will help isolate if it's a production account issue

## 📋 Current Implementation Status

### ✅ What's Working
- Authorization API (OAuth token generation)
- Request format matches PhonePe documentation
- Error handling and logging
- Web payment fallback (if SDK fails)

### ❌ What's Not Working
- SDK order creation (500 error from PhonePe)
- Native SDK checkout screen (can't appear without orderToken)

## 🔄 Workaround

Until SDK orders are enabled, the system automatically falls back to web payments:
1. SDK order creation fails → Backend generates web payment URL
2. Frontend opens web payment URL in browser
3. User completes payment on PhonePe web page
4. Status polling checks payment status

This workaround works but doesn't provide the native in-app experience.

## 📝 Next Steps

1. **Immediate**: Contact PhonePe support to enable SDK orders
2. **While Waiting**: Use web payment fallback (already implemented)
3. **After SDK Enabled**: Test SDK order creation again
4. **Verify**: Check that native checkout screen appears

## 🔗 Related Files

- `backend/routes/payment.js` - SDK order creation logic
- `mobile-app/src/config/phonepe.js` - SDK initialization
- `mobile-app/src/screens/freelancer/Wallet.js` - Payment flow

## 📞 Support Information

When contacting PhonePe support, provide:
- Merchant ID: `M23OKIGC1N363`
- Error: 500 Internal Server Error
- Endpoint: `/checkout/v2/sdk/order`
- Environment: Production
- Request format: (see above)
- Error message: "There is an error trying to process your transaction at the moment. Please try again in a while."

