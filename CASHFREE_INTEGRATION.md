# Cashfree Payment Gateway Integration

## ✅ Integration Complete

Cashfree payment gateway has been successfully integrated to replace PhonePe for commission dues payments.

## 🔑 Credentials

**App ID (x-client-id):** `YOUR_CASHFREE_CLIENT_ID`  
**Secret Key (x-secret-key):** `YOUR_CASHFREE_CLIENT_SECRET`  
**Environment:** Production  
**API Version:** 2023-08-01

> **Note:** Actual credentials are stored in environment variables, not in code or documentation.

## 📋 Environment Variables

Add these to `backend/.env`:

```env
CASHFREE_CLIENT_ID=your_cashfree_client_id
CASHFREE_CLIENT_SECRET=your_cashfree_client_secret
CASHFREE_API_VERSION=2023-08-01
CASHFREE_ENV=production
BACKEND_URL=https://freelancing-platform-backend-backup.onrender.com
```

## 🔄 Changes Made

### Backend (`backend/routes/payment.js`)

1. **Added Cashfree Configuration:**
   - `CASHFREE_CONFIG` with production/sandbox URLs
   - `getCashfreeConfig()` function
   - `getCashfreeCredentials()` function

2. **Updated `/api/payment/create-dues-order` endpoint:**
   - Creates Cashfree order using `/pg/orders` endpoint
   - Returns `paymentSessionId` and `paymentUrl`
   - Request format:
     ```json
     {
       "order_id": "DUES_{freelancerId}_{timestamp}",
       "order_amount": 100,
       "order_currency": "INR",
       "customer_details": {...},
       "order_meta": {
         "return_url": "people-app://payment/callback?orderId=...",
         "notify_url": "https://.../api/payment/webhook"
       }
     }
     ```

3. **Updated `/api/payment/order-status/:merchantOrderId` endpoint:**
   - Checks Cashfree order status using `/pg/orders/{orderId}` endpoint
   - Maps Cashfree status (`PAID`, `ACTIVE`, `EXPIRED`) to our status

4. **Updated `/api/payment/webhook` endpoint:**
   - Handles Cashfree webhook events
   - Processes payment status updates
   - Marks dues as paid when payment is successful

### Mobile App

1. **Created `mobile-app/src/components/PaymentWebView.js`:**
   - In-app WebView component for payment flow
   - Modal interface with header and back button
   - Detects deep link callbacks within WebView
   - Loading indicators and error handling

2. **Updated `mobile-app/src/screens/freelancer/Wallet.js`:**
   - Removed PhonePe SDK integration
   - Integrated PaymentWebView component
   - Payment flow runs entirely inside the app (no external browser)
   - Handles deep link callbacks

2. **Updated `mobile-app/src/api/payment.js`:**
   - Updated comments to reflect Cashfree integration
   - API methods remain the same (backend handles the difference)

## 📱 Payment Flow (In-App WebView)

1. **User initiates payment** → `handlePayDues()`
2. **Frontend calls backend** → `paymentAPI.createDuesOrder()`
3. **Backend creates Cashfree order** → `POST /pg/orders`
4. **Backend returns** → `paymentSessionId` and `paymentUrl`
5. **Frontend opens PaymentWebView modal** → In-app WebView component
6. **User completes payment** → Inside the app (no external browser)
7. **Cashfree redirects to deep link** → `people-app://payment/callback?orderId=...`
8. **WebView detects callback** → Closes modal and verifies transaction
9. **App verifies transaction** → `checkPaymentStatus(merchantOrderId)`
10. **Backend processes dues** → Via webhook or status check

**Key Feature:** ✅ **Entire payment flow runs inside the app** - no external browser opens!

## 🔗 Deep Link Configuration

The app uses deep link: `people-app://payment/callback?orderId={merchantOrderId}`

This is configured in:
- `mobile-app/app.json` → `scheme: "people-app"`
- Backend order creation → `return_url: "people-app://payment/callback?orderId=..."`

## 📡 Webhook Configuration

**Webhook URL:** `https://your-backend-url.com/api/payment/webhook`

**Cashfree Webhook Format:**
```json
{
  "type": "PAYMENT_SUCCESS_WEBHOOK",
  "data": {
    "order": {
      "order_id": "DUES_...",
      "order_status": "PAID",
      "order_amount": 100
    },
    "payment": {
      "payment_status": "SUCCESS",
      "payment_session_id": "..."
    }
  }
}
```

**To configure webhook in Cashfree dashboard:**
1. Log in to Cashfree Dashboard
2. Go to Settings → Webhooks
3. Add webhook URL: `https://your-backend-url.com/api/payment/webhook`
4. Select events: Payment Success, Payment Failure

## 🧪 Testing

### Test Order Creation

```bash
curl -X POST https://your-backend-url.com/api/payment/create-dues-order \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Test Order Status

```bash
curl -X GET https://your-backend-url.com/api/payment/order-status/DUES_... \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📚 API Endpoints

### Cashfree API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/pg/orders` | Create payment order |
| GET | `/pg/orders/{order_id}` | Get order status |
| POST | `/pg/orders/{order_id}/payments` | Create payment session |

### Backend API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payment/create-dues-order` | Create Cashfree order |
| GET | `/api/payment/order-status/:merchantOrderId` | Check order status |
| POST | `/api/payment/webhook` | Cashfree webhook handler |

## ⚠️ Important Notes

1. **PhonePe code is preserved** in `backend/routes/payment.js` (commented) for future use
2. **Cashfree uses in-app WebView** - payment flow runs entirely inside the app
3. **react-native-webview** is required - native module, needs EAS build rebuild
4. **Deep link handling** is required for payment callbacks
5. **Webhook is recommended** for reliable payment status updates
6. **IP Whitelisting** may be required in Cashfree dashboard for API access

## 🔧 Dependencies

### Required Packages

- `react-native-webview` - For in-app payment WebView (native module)
  ```bash
  npx expo install react-native-webview
  ```

### Build Requirements

Since `react-native-webview` is a native module, you need to rebuild your EAS dev build:

```bash
cd mobile-app
eas build --profile development --platform android
```

## 🔄 Switching Back to PhonePe

If you need to switch back to PhonePe:
1. See `PHONEPE_COMPLETE_DOCUMENTATION.md` for all PhonePe details
2. Uncomment PhonePe code in `backend/routes/payment.js`
3. Comment out Cashfree code
4. Update mobile app to use PhonePe SDK
5. Update environment variables

## 📖 Documentation References

- [Cashfree Payment Gateway Docs](https://docs.cashfree.com/)
- [Cashfree API Reference](https://docs.cashfree.com/payments/api-reference)
- [Cashfree Webhooks](https://docs.cashfree.com/payments/webhooks)

---

**Integration Date:** 2025-01-18  
**Status:** ✅ Complete and Ready for Testing

