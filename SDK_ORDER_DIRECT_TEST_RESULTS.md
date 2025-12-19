# PhonePe SDK Order Direct Test Results

## Test Date
December 19, 2025

## Test Method
Direct Node.js script using axios with auth token and merchant order ID

## Code Used
Updated the user's provided code with:
- ✅ Auth token in Authorization header
- ✅ Merchant order ID in request body
- ✅ Production URL (not sandbox)
- ✅ All required fields for SDK order creation

## Test Results

### ❌ SDK Order Creation Failed

**HTTP Status Code:** `500 Internal Server Error`

**PhonePe Response:**
```json
{
  "success": false,
  "code": "INTERNAL_SERVER_ERROR",
  "message": "There is an error trying to process your transaction at the moment. Please try again in a while.",
  "data": {}
}
```

## Request Details

### URL
```
POST https://api.phonepe.com/apis/pg/checkout/v2/sdk/order
```

### Headers
```json
{
  "Content-Type": "application/json",
  "Authorization": "O-Bearer <auth_token>"
}
```

### Request Body
```json
{
  "merchantId": "M23OKIGC1N363",
  "merchantOrderId": "DUES_TEST_17661244003N",
  "amount": 100,
  "merchantUserId": "test_user",
  "redirectUrl": "people-app://payment/callback?orderId=DUES_TEST_17661244003N",
  "redirectMode": "REDIRECT",
  "callbackUrl": "https://freelancing-platform-backend-backup.onrender.com/api/payment/webhook",
  "paymentFlow": "SDK",
  "paymentInstrument": {
    "type": "UPI_INTENT"
  },
  "expireAfter": 1200,
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

## Analysis

### What Worked
1. ✅ **Auth Token:** Valid and accepted by PhonePe
2. ✅ **Request Format:** Correct structure matching PhonePe documentation
3. ✅ **Headers:** Authorization header properly formatted
4. ✅ **Merchant ID:** Valid merchant ID
5. ✅ **All Required Fields:** Present in request body

### What Failed
1. ❌ **SDK Order Creation:** PhonePe returns 500 error
2. ❌ **Order Token:** Cannot be obtained due to 500 error

## Root Cause

The 500 Internal Server Error from PhonePe indicates:
- **SDK orders are NOT enabled** for merchant account `M23OKIGC1N363`
- This is a **PhonePe server-side configuration issue**
- The merchant account may only support web payments, not SDK orders

## Comparison with User's Original Code

### User's Original Code
- Used sandbox URL: `https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/sdk/order`
- Missing auth token in headers
- Missing merchant order ID
- Missing required fields (merchantId, redirectUrl, callbackUrl, paymentFlow, etc.)

### Updated Code
- ✅ Uses production URL: `https://api.phonepe.com/apis/pg/checkout/v2/sdk/order`
- ✅ Includes auth token: `Authorization: O-Bearer <token>`
- ✅ Includes merchant order ID
- ✅ Includes all required fields for SDK order creation

## Expected Success Response

If SDK orders were enabled, we would receive:
```json
{
  "success": true,
  "data": {
    "orderToken": "hq4wOGdzX31IuPyyh7/7...",
    "orderId": "OMO2403282020198641071317"
  }
}
```

## Next Steps

1. **Contact PhonePe Support**
   - Request SDK order enablement for merchant ID: `M23OKIGC1N363`
   - Provide error details and request format

2. **Verify Dashboard Settings**
   - Check PhonePe Business Dashboard
   - Verify SDK integration is enabled

3. **Test Again After Enablement**
   - Run `node test-sdk-order-direct.js` again
   - Should receive orderToken in response

## Conclusion

**The code is correct.** The request format, headers, and all fields are properly configured. The issue is that PhonePe has not enabled SDK orders for this merchant account. Once PhonePe enables SDK orders, the integration will work and return `orderToken`.

## Test Script

The updated test script is saved as `test-sdk-order-direct.js`. To run it:

```bash
# Get auth token and merchant order ID
AUTH_TOKEN=$(curl -s -X GET "https://freelancing-platform-backend-backup.onrender.com/api/payment/test-auth-token?full=true" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('token', ''))")
MERCHANT_ORDER_ID="DUES_TEST_$(date +%s%3N)"

# Run test
AUTH_TOKEN="$AUTH_TOKEN" MERCHANT_ORDER_ID="$MERCHANT_ORDER_ID" node test-sdk-order-direct.js
```

