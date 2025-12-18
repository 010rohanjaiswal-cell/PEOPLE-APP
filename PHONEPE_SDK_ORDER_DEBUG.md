# PhonePe SDK Order Creation - Debugging Guide

## Current Issue

SDK order creation is failing with **500 Internal Server Error** from PhonePe:
```
"There is an error trying to process your transaction at the moment. Please try again in a while."
```

## Root Cause Analysis

The error occurs when calling:
- **Endpoint**: `POST https://api.phonepe.com/apis/pg/checkout/v2/sdk/order`
- **Status**: 500 Internal Server Error
- **Error Code**: `INTERNAL_SERVER_ERROR`

## Possible Causes

### 1. Merchant Account Configuration
- **SDK Orders Not Enabled**: Your merchant account might not have SDK orders enabled
- **Action**: Contact PhonePe support to enable SDK orders for your merchant account

### 2. Request Format Issues
- Missing required fields
- Incorrect field values
- Wrong data types

### 3. Merchant Account Limitations
- Account might be configured for web payments only
- SDK orders might require additional approval/configuration

## Current Request Format

```json
{
  "merchantId": "M23OKIGC1N363",
  "merchantOrderId": "DUES_...",
  "amount": 100,
  "merchantUserId": "...",
  "redirectUrl": "people-app://payment/callback?orderId=...",
  "redirectMode": "REDIRECT",
  "callbackUrl": "https://...",
  "paymentFlow": "SDK",
  "paymentInstrument": {
    "type": "UPI_INTENT"
  },
  "mobileNumber": "+911010101010" // Optional
}
```

## Debugging Steps

### Step 1: Check Backend Logs
Check your Render.com backend logs for the detailed error response:
```bash
# Look for these log entries:
📥 SDK order response: { ... }
❌ SDK order creation failed - DETAILED ERROR: { ... }
```

### Step 2: Verify Merchant Account
1. Login to PhonePe Business Dashboard
2. Check if SDK orders are enabled for your merchant account
3. Verify your merchant account supports React Native SDK

### Step 3: Contact PhonePe Support
Contact PhonePe support with:
- Merchant ID: `M23OKIGC1N363`
- Error: 500 Internal Server Error on `/checkout/v2/sdk/order`
- Request format (from logs)
- Ask: "Is SDK order creation enabled for my merchant account?"

### Step 4: Check PhonePe Dashboard
- Go to PhonePe Business Dashboard
- Navigate to Developer Settings
- Check if there are any restrictions or configurations needed for SDK orders

## Next Steps

1. **Check Backend Logs**: Review the detailed error logs on Render.com
2. **Contact PhonePe Support**: Share the error details and request SDK order enablement
3. **Verify Account Configuration**: Ensure your merchant account supports SDK orders
4. **Test with PhonePe Support**: Work with PhonePe to test SDK order creation

## Alternative: Use Web Payment Flow

If SDK orders cannot be enabled, you can use the web payment flow:
- POST to `/pg/v1/pay` to create payment
- Get payment URL from response
- Open URL in browser (or in-app browser)

However, this is not the preferred solution as you want native SDK integration.

## Error Logging

The backend now logs:
- Full request body
- Full response from PhonePe
- Detailed error information
- Request headers (with masked auth token)

Check Render.com logs for complete debugging information.

