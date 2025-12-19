# PhonePe SDK Order Request Headers Verification

## ✅ Confirmation: We ARE using the correct request headers

### Required Headers (Per PhonePe Documentation)
```
Content-Type: application/json
Authorization: O-Bearer <merchant-auth-token>
```

## Code Verification

### Backend Code (`backend/routes/payment.js`)

**Headers Used:**
```javascript
headers: {
  'Content-Type': 'application/json',
  'Authorization': `O-Bearer ${authToken}`,
}
```

**Location:** Line ~363-366 in `create-dues-order` route

**Full Request:**
```javascript
sdkOrderResponse = await axios.post(
  sdkOrderUrl,
  sdkOrderRequestBody,
  {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `O-Bearer ${authToken}`,
    },
    timeout: 10000,
    validateStatus: (status) => status < 600,
  }
);
```

### Test Script (`test-sdk-order-direct.js`)

**Headers Used:**
```javascript
const requestHeaders = {
  "Content-Type": "application/json",
  "Authorization": `O-Bearer ${AUTH_TOKEN}`
};
```

**Location:** Lines 12-15

**Full Request:**
```javascript
const options = {
  method: 'POST',
  url: `${PHONEPE_API_URL}/checkout/v2/sdk/order`,
  headers: requestHeaders,
  data: requestBody
};
```

## Header Details

### 1. Content-Type
- **Header Name:** `Content-Type`
- **Header Value:** `application/json`
- **Status:** ✅ **CORRECT**
- **Purpose:** Tells PhonePe API that request body is JSON format

### 2. Authorization
- **Header Name:** `Authorization`
- **Header Value:** `O-Bearer <merchant-auth-token>`
- **Status:** ✅ **CORRECT**
- **Format:** `O-Bearer` (not `Bearer`) followed by the OAuth token
- **Purpose:** Authenticates the request with PhonePe

## Token Source

The `authToken` is obtained from:
```javascript
const authToken = await getAuthToken();
```

Which calls PhonePe OAuth endpoint:
```
POST https://api.phonepe.com/apis/identity-manager/v1/oauth/token
```

And returns an `access_token` that we use in the Authorization header.

## Complete Request Example

**Endpoint:**
```
POST https://api.phonepe.com/apis/pg/checkout/v2/sdk/order
```

**Headers:**
```
Content-Type: application/json
Authorization: O-Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJpc3MiOiJpZGVudGl0eU1hbmFnZXIiLCJ2ZXJzaW9uIjoiNC4wIiwidGlkIjoiMTEyMTA0NTUtYzdhNy00ZjlhLThkZDktM2M3YjJlNmEyMjhkIiwic2lkIjoiMTBkMWRmMGMtOTJjNC00NjJkLWI4NWEtZjY4YjVhMTcwMDUwIiwiaWF0IjoxNzY2MTI0MzYzLCJleHAiOjE3NjYxMjc5NjN9.lmEiRgREe-c4iPfMDkRAkIgW5IpvHO54X6a03ERtF-av-gywmQnpNTYtIHb9dWfnIbXwUnwcbWWppcq-vxYFug
```

**Body:**
```json
{
  "merchantId": "M23OKIGC1N363",
  "merchantOrderId": "DUES_TEST_...",
  "amount": 100,
  "paymentFlow": "SDK",
  ...
}
```

## Verification Checklist

| Header | Required Value | Our Implementation | Status |
|--------|---------------|-------------------|--------|
| Content-Type | `application/json` | `application/json` | ✅ **CORRECT** |
| Authorization | `O-Bearer <token>` | `O-Bearer ${authToken}` | ✅ **CORRECT** |

## Important Notes

1. **O-Bearer vs Bearer:**
   - PhonePe uses `O-Bearer` (with "O" prefix), not standard `Bearer`
   - Our code correctly uses `O-Bearer`

2. **Token Format:**
   - Token is obtained from PhonePe OAuth endpoint
   - Token is a JWT (JSON Web Token)
   - Token is valid for a limited time (cached and refreshed automatically)

3. **Header Format:**
   - Both headers are correctly formatted
   - Headers match PhonePe documentation exactly

## Conclusion

✅ **YES, we are using the correct request headers:**
- `Content-Type: application/json` ✅
- `Authorization: O-Bearer <merchant-auth-token>` ✅

The headers match PhonePe's documentation requirements exactly. The 500 error we're receiving is not due to incorrect headers - it's because SDK orders are not enabled for the merchant account.

