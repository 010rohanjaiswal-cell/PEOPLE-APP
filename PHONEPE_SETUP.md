# PhonePe Payment Gateway Setup

## Overview
PhonePe Payment Gateway has been integrated into the app for freelancer commission dues payment. This document outlines the setup and configuration required.

## Backend Configuration

### Environment Variables Required

Add the following environment variables to your backend `.env` file and Render.com environment variables:

```env
# PhonePe Payment Gateway (Production Credentials)
PHONEPE_MERCHANT_ID=M23OKIGC1N363
PHONEPE_CLIENT_ID=SU2509171240249286269937
PHONEPE_CLIENT_SECRET=d74141aa-8762-4d1b-bfa1-dfe2a094d310
PHONEPE_SALT_KEY=d74141aa-8762-4d1b-bfa1-dfe2a094d310
PHONEPE_SALT_INDEX=1
# PhonePe Environment: 'production' or 'sandbox' (default: production)
PHONEPE_ENV=production

# Backend and Frontend URLs (for callbacks)
BACKEND_URL=https://freelancing-platform-backend-backup.onrender.com
FRONTEND_URL=https://freelancing-platform-backend-backup.onrender.com
```

### Render.com Setup

1. Go to your Render.com dashboard
2. Navigate to your backend service
3. Go to **Environment** tab
4. Add all the PhonePe environment variables listed above
5. Save and redeploy your service

## API Endpoints

### 1. Create Dues Payment Order
- **Endpoint:** `POST /api/payment/create-dues-order`
- **Auth:** Required (Freelancer only)
- **Response:** Returns `paymentUrl` and `merchantOrderId`

### 2. Check Order Status
- **Endpoint:** `GET /api/payment/order-status/:merchantOrderId`
- **Auth:** Required
- **Response:** Returns payment status (success, pending, failed)

### 3. Process Dues Payment
- **Endpoint:** `POST /api/payment/process-dues/:merchantOrderId`
- **Auth:** Required (Freelancer only)
- **Response:** Updates wallet and returns updated wallet data

### 4. Webhook Handler
- **Endpoint:** `POST /api/payment/webhook`
- **Auth:** None (PhonePe calls this directly)
- **Purpose:** Receives payment callbacks from PhonePe

## Payment Flow

1. **User clicks "Pay Dues"** in Wallet screen
2. **Frontend calls** `POST /api/payment/create-dues-order`
3. **Backend creates** PhonePe order and returns `paymentUrl`
4. **Frontend opens** payment URL in browser (`expo-web-browser`)
5. **User completes** payment on PhonePe
6. **PhonePe sends** webhook to backend
7. **Backend processes** webhook and marks dues as paid
8. **Frontend polls** order status to verify payment
9. **On success**, frontend calls `POST /api/payment/process-dues/:merchantOrderId`
10. **Wallet refreshes** with updated data

## Testing

### Sandbox Environment
- PhonePe uses sandbox URLs when `NODE_ENV !== 'production'`
- Sandbox: `https://api-preprod.phonepe.com/apis/pg-sandbox`
- Production: `https://api.phonepe.com/apis/pg`

### Test Payment Flow
1. Ensure backend environment variables are set
2. Login as freelancer with unpaid dues
3. Navigate to Wallet tab
4. Click "Pay Dues"
5. Complete payment in PhonePe checkout
6. Verify wallet updates after payment

## Webhook Configuration

### PhonePe Dashboard Setup
1. Login to PhonePe Merchant Dashboard
2. Navigate to **Settings** → **Webhooks**
3. Add webhook URL: `https://freelancing-platform-backend-backup.onrender.com/api/payment/webhook`
4. Select events: `PAYMENT_SUCCESS`, `PAYMENT_PENDING`, `PAYMENT_ERROR`

## Troubleshooting

### Payment Order Creation Fails
- Check PhonePe credentials in environment variables
- Verify merchant ID, client ID, and client secret are correct
- Check backend logs for PhonePe API errors

### Webhook Not Received
- Verify webhook URL is configured in PhonePe dashboard
- Check backend logs for webhook requests
- Ensure webhook endpoint is publicly accessible

### Payment Status Polling
- Frontend polls order status every 5 seconds for up to 50 seconds
- If payment is successful but polling times out, webhook should process it
- User can manually refresh wallet to check if payment was processed

## Security Notes

- Never commit `.env` file to Git
- Store all credentials in Render.com environment variables
- Webhook endpoint should verify X-VERIFY header (currently basic implementation)
- Use HTTPS for all payment-related endpoints

## References

- [PhonePe Developer Documentation](https://developer.phonepe.com/)
- [PhonePe Android SDK](https://developer.phonepe.com/payment-gateway/mobile-app-integration/standard-checkout-mobile/android-sdk/introduction)
- [PhonePe React Native SDK](https://developer.phonepe.com/payment-gateway/mobile-app-integration/standard-checkout-mobile/react-native-sdk/introduction)

