# Message to PhonePe Support Team

## Subject
Request to Enable SDK Orders for Merchant Account - 500 Error on SDK Order Creation

---

## Message Body

Dear PhonePe Support Team,

I am writing to request assistance with enabling SDK orders for our merchant account. We are experiencing a 500 Internal Server Error when attempting to create SDK orders through the PhonePe Payment Gateway API.

### Merchant Details
- **Merchant ID:** M23OKIGC1N363
- **Environment:** Production
- **Integration Type:** Android Native SDK (React Native)

### Issue Description

We are trying to integrate PhonePe Native SDK for in-app payments in our Android application. However, when we attempt to create an SDK order using the `/checkout/v2/sdk/order` endpoint, we receive a 500 Internal Server Error from PhonePe's servers.

### Technical Details

**API Endpoint:**
```
POST https://api.phonepe.com/apis/pg/checkout/v2/sdk/order
```

**Request Headers:**
```
Content-Type: application/json
Authorization: O-Bearer <access_token>
```

**Request Body:**
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

**Error Response:**
```json
{
  "success": false,
  "code": "INTERNAL_SERVER_ERROR",
  "message": "There is an error trying to process your transaction at the moment. Please try again in a while.",
  "data": {}
}
```

**HTTP Status Code:** 500 Internal Server Error

### What We've Verified

1. ✅ **Authorization Token:** Successfully generated and validated
2. ✅ **Request Format:** Matches PhonePe SDK documentation
3. ✅ **All Required Fields:** Present in request body
4. ✅ **Headers:** Properly formatted with O-Bearer token
5. ✅ **Merchant ID:** Valid and active

### Expected Behavior

According to PhonePe SDK documentation, a successful SDK order creation should return:
```json
{
  "success": true,
  "data": {
    "orderToken": "hq4wOGdzX31IuPyyh7/7...",
    "orderId": "OMO2403282020198641071317"
  }
}
```

### Request

We believe this error indicates that **SDK orders are not enabled** for our merchant account. We would like to request:

1. **Enable SDK orders** for merchant account `M23OKIGC1N363`
2. **Verify merchant account configuration** supports SDK order flow
3. **Confirm** if any additional setup or approval is required

### Additional Information

- **Integration Type:** Android Native SDK (React Native)
- **SDK Package:** `react-native-phonepe-pg` (version 2.0.2)
- **Payment Flow:** SDK Order Flow (`paymentFlow: "SDK"`)
- **Payment Instrument:** UPI_INTENT

### Documentation Reference

We are following the official PhonePe documentation:
- Android SDK Integration: https://developer.phonepe.com/payment-gateway/mobile-app-integration/standard-checkout-mobile/android-sdk
- SDK Order API: https://developer.phonepe.com/payment-gateway/mobile-app-integration/standard-checkout-mobile/api-reference/create-payment

### Contact Information

Please let us know if you need any additional information or if there are any steps we need to complete on our end. We are ready to provide any documentation or details required to enable SDK orders for our merchant account.

Thank you for your assistance.

Best regards,
[Your Name]
[Your Company Name]
[Contact Email]
[Contact Phone Number]

---

## Alternative Shorter Version

**Subject:** SDK Order Creation Failing - 500 Error - Merchant ID: M23OKIGC1N363

Dear PhonePe Support,

We are experiencing a 500 Internal Server Error when creating SDK orders for merchant account **M23OKIGC1N363**.

**Issue:**
- Endpoint: `POST /checkout/v2/sdk/order`
- Error: 500 Internal Server Error
- Response: `{"success": false, "code": "INTERNAL_SERVER_ERROR", "message": "There is an error trying to process your transaction at the moment. Please try again in a while."}`

**Request Format:**
```json
{
  "merchantId": "M23OKIGC1N363",
  "merchantOrderId": "DUES_TEST_...",
  "amount": 100,
  "paymentFlow": "SDK",
  "paymentInstrument": {"type": "UPI_INTENT"},
  "redirectUrl": "people-app://payment/callback?orderId=...",
  "callbackUrl": "https://.../api/payment/webhook"
}
```

**What We've Verified:**
- ✅ Auth token is valid
- ✅ Request format matches documentation
- ✅ All required fields present

**Request:**
Please enable SDK orders for merchant account M23OKIGC1N363 or confirm if additional setup is required.

Thank you.

[Your Contact Details]

