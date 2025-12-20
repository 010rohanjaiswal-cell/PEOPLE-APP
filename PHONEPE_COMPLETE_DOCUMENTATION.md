# PhonePe Integration - Complete Documentation

**Purpose:** This document contains all PhonePe integration details, credentials, code, formats, and configuration needed to switch back to PhonePe payment gateway in the future.

**Date Created:** 2025-01-18  
**Status:** Temporarily disabled (switching to Cashfree), but all code preserved

---

## Table of Contents

1. [Environment Variables & Credentials](#environment-variables--credentials)
2. [Backend Implementation](#backend-implementation)
3. [Mobile App Implementation](#mobile-app-implementation)
4. [API Endpoints](#api-endpoints)
5. [Request/Response Formats](#requestresponse-formats)
6. [Webhook Configuration](#webhook-configuration)
7. [SDK Configuration](#sdk-configuration)
8. [Known Issues & Troubleshooting](#known-issues--troubleshooting)
9. [Testing Scripts](#testing-scripts)

---

## Environment Variables & Credentials

### Backend Environment Variables

Add these to `backend/.env`:

```env
# PhonePe Configuration
PHONEPE_MERCHANT_ID=M23OKIGC1N363
PHONEPE_CLIENT_ID=SU2509171240249286269937
PHONEPE_CLIENT_SECRET=d74141aa-8762-4d1b-bfa1-dfe2a094d310
PHONEPE_SALT_KEY=d74141aa-8762-4d1b-bfa1-dfe2a094d310
PHONEPE_SALT_INDEX=1
PHONEPE_ENV=production
PHONEPE_WEBHOOK_USERNAME=your_webhook_username
PHONEPE_WEBHOOK_PASSWORD=your_webhook_password
BACKEND_URL=https://freelancing-platform-backend-backup.onrender.com
```

### Mobile App Configuration

**File:** `mobile-app/src/config/phonepe.js`

```javascript
const PHONEPE_CONFIG = {
  merchantId: 'M23OKIGC1N363',
  environment: 'PRODUCTION', // 'PRODUCTION' or 'SANDBOX'
};
```

---

## Backend Implementation

### File: `backend/routes/payment.js`

**Complete PhonePe Integration Code:**

```javascript
/**
 * Payment Routes - PhonePe Integration
 * Handles PhonePe payment gateway integration for commission dues payment
 */

const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const { authenticate } = require('../middleware/auth');
const CommissionTransaction = require('../models/CommissionTransaction');

const router = express.Router();

// PhonePe Configuration
const PHONEPE_CONFIG = {
  SANDBOX: {
    AUTH_URL: 'https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token',
    API_URL: 'https://api-preprod.phonepe.com/apis/pg-sandbox',
  },
  PRODUCTION: {
    AUTH_URL: 'https://api.phonepe.com/apis/identity-manager/v1/oauth/token',
    API_URL: 'https://api.phonepe.com/apis/pg',
  },
};

const getConfig = () => {
  const phonepeEnv = process.env.PHONEPE_ENV || 'production';
  return phonepeEnv === 'sandbox' ? PHONEPE_CONFIG.SANDBOX : PHONEPE_CONFIG.PRODUCTION;
};

const getPhonePeCredentials = () => {
  return {
    merchantId: process.env.PHONEPE_MERCHANT_ID,
    clientId: process.env.PHONEPE_CLIENT_ID,
    clientSecret: process.env.PHONEPE_CLIENT_SECRET,
    saltKey: process.env.PHONEPE_SALT_KEY || process.env.PHONEPE_CLIENT_SECRET,
    saltIndex: process.env.PHONEPE_SALT_INDEX || '1',
    webhookUsername: process.env.PHONEPE_WEBHOOK_USERNAME,
    webhookPassword: process.env.PHONEPE_WEBHOOK_PASSWORD,
  };
};

// Generate X-VERIFY header for PhonePe API requests
const generateXVerify = (payload, endpoint) => {
  const credentials = getPhonePeCredentials();
  const string = `${payload}${endpoint}${credentials.saltKey}`;
  const sha256 = crypto.createHash('sha256').update(string).digest('hex');
  return `${sha256}###${credentials.saltIndex}`;
};

// In-memory cache for PhonePe OAuth token
let cachedAuthToken = null;
let cachedAuthTokenExpiresAt = null;

// Get Authorization Token (with caching)
const getAuthToken = async () => {
  try {
    const now = Date.now();
    if (cachedAuthToken && cachedAuthTokenExpiresAt && now < cachedAuthTokenExpiresAt - 60 * 1000) {
      return cachedAuthToken;
    }

    const credentials = getPhonePeCredentials();
    const config = getConfig();

    const params = new URLSearchParams();
    params.append('client_id', credentials.clientId);
    params.append('client_version', '1');
    params.append('client_secret', credentials.clientSecret);
    params.append('grant_type', 'client_credentials');

    const response = await axios.post(
      config.AUTH_URL,
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const data = response.data || {};
    const accessToken = data.access_token;

    if (!accessToken) {
      throw new Error('PhonePe auth response missing access_token');
    }

    const cleanToken = String(accessToken).trim();
    
    let expiresAtMs = null;
    if (data.expires_at) {
      const exp = Number(data.expires_at);
      if (!Number.isNaN(exp)) {
        expiresAtMs = exp < 10_000_000_000 ? exp * 1000 : exp;
      }
    } else if (data.expires_in) {
      const expIn = Number(data.expires_in);
      if (!Number.isNaN(expIn) && expIn > 0) {
        expiresAtMs = Date.now() + expIn * 1000;
      }
    }

    if (!expiresAtMs) {
      expiresAtMs = Date.now() + 10 * 60 * 1000;
    }

    cachedAuthToken = cleanToken;
    cachedAuthTokenExpiresAt = expiresAtMs;

    return cleanToken;
  } catch (error) {
    console.error('PhonePe Auth Error:', error);
    throw new Error('Failed to get PhonePe authorization token');
  }
};

/**
 * Create PhonePe payment order for dues payment
 * POST /api/payment/create-dues-order
 */
router.post('/create-dues-order', authenticate, async (req, res) => {
  const credentials = getPhonePeCredentials();
  const config = getConfig();

  try {
    const user = req.user;
    if (!user || user.role !== 'freelancer') {
      return res.status(403).json({
        success: false,
        error: 'Only freelancers can create dues payment orders',
      });
    }

    const freelancerId = user._id || user.id;

    // Get unpaid commission transactions
    const unpaidTransactions = await CommissionTransaction.find({
      freelancer: freelancerId,
      duesPaid: false,
    }).lean();

    if (unpaidTransactions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No unpaid dues found',
      });
    }

    const totalDues = unpaidTransactions.reduce(
      (sum, t) => sum + (t.platformCommission || 0),
      0
    );

    if (totalDues <= 0) {
      return res.status(400).json({
        success: false,
        error: 'No dues to pay',
      });
    }

    if (!credentials.merchantId || !credentials.clientId || !credentials.clientSecret) {
      return res.status(500).json({
        success: false,
        error: 'PhonePe credentials not configured',
      });
    }

    // Generate merchant order ID (max 63 chars, only underscore and hyphen allowed)
    const merchantOrderId = `DUES_${freelancerId.toString()}_${Date.now()}`.substring(0, 63);

    // Build SDK order request body
    const authToken = await getAuthToken();
    
    const sdkOrderRequestBody = {
      merchantId: credentials.merchantId,
      merchantOrderId: merchantOrderId,
      amount: totalDues * 100, // Amount in paise
      expireAfter: 1200, // Order expiry in seconds (20 minutes)
      merchantUserId: freelancerId.toString(),
      redirectUrl: `people-app://payment/callback?orderId=${merchantOrderId}`,
      redirectMode: 'REDIRECT',
      callbackUrl: `${process.env.BACKEND_URL || 'https://freelancing-platform-backend-backup.onrender.com'}/api/payment/webhook`,
      paymentFlow: {
        type: 'SDK', // Required for SDK orders
      },
      paymentInstrument: {
        type: 'UPI_INTENT', // SDK order uses UPI_INTENT
      },
      // Note: metaInfo is optional. Don't include if all fields are empty
      // Empty udf11-15 fields cause validation errors (400 Bad Request)
    };

    // Add mobileNumber only if it's a valid phone number
    if (user.phone && user.phone.trim().length > 0) {
      sdkOrderRequestBody.mobileNumber = user.phone.trim();
    }

    // Create SDK order using /checkout/v2/sdk/order endpoint
    const sdkOrderEndpoint = '/checkout/v2/sdk/order';
    const sdkOrderUrl = `${config.API_URL}${sdkOrderEndpoint}`;

    const sdkOrderResponse = await axios.post(
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

    // Check for error response
    if (sdkOrderResponse.status !== 200 && sdkOrderResponse.status !== 201) {
      const errorData = sdkOrderResponse.data || {};
      return res.status(500).json({
        success: false,
        error: errorData.message || errorData.error || 'Failed to create SDK order',
        code: errorData.code || 'SDK_ORDER_FAILED',
      });
    }

    const sdkOrderData = sdkOrderResponse.data?.data || sdkOrderResponse.data;
    
    if (!sdkOrderData || !sdkOrderData.orderToken) {
      throw new Error('Failed to create SDK order: missing orderToken in response');
    }

    const orderToken = sdkOrderData.orderToken;
    const phonepeOrderId = sdkOrderData.orderId || merchantOrderId;

    // Return orderToken and orderId for React Native SDK
    res.json({
      success: true,
      merchantOrderId,
      orderId: phonepeOrderId,
      orderToken: orderToken,
      amount: totalDues,
      message: 'Payment order created successfully',
    });
  } catch (error) {
    console.error('Error creating PhonePe order:', error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to create payment order',
    });
  }
});

/**
 * Check order status
 * GET /api/payment/order-status/:merchantOrderId
 */
router.get('/order-status/:merchantOrderId', authenticate, async (req, res) => {
  try {
    const { merchantOrderId } = req.params;
    const credentials = getPhonePeCredentials();
    const config = getConfig();

    if (!credentials.merchantId) {
      return res.status(500).json({
        success: false,
        error: 'PhonePe credentials not configured',
      });
    }

    let authToken = await getAuthToken();
    authToken = authToken.trim();

    const endpoint = `/checkout/v2/order/${merchantOrderId}/status`;
    const fullUrl = `${config.API_URL}${endpoint}`;

    const statusResponse = await axios.get(fullUrl, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `O-Bearer ${authToken}`,
      },
      timeout: 10000,
      validateStatus: (status) => status < 500,
    });

    const responseData = statusResponse.data;

    if (responseData.success === false || responseData.code) {
      return res.status(500).json({
        success: false,
        code: responseData.code || 'UNKNOWN_ERROR',
        error: responseData.message || 'Failed to get order status',
        data: responseData.data || {},
      });
    }

    const state = responseData.state; // PENDING, COMPLETED, FAILED
    const orderId = responseData.orderId;
    const amount = responseData.amount;
    const paymentDetails = responseData.paymentDetails || [];
    
    const latestPayment = paymentDetails.length > 0 ? paymentDetails[paymentDetails.length - 1] : null;
    const transactionId = latestPayment?.transactionId || null;

    const isSuccess = state === 'COMPLETED';
    const isPending = state === 'PENDING';
    const isFailed = state === 'FAILED';

    res.json({
      success: true,
      orderId,
      state,
      amount,
      transactionId,
      isSuccess,
      isPending,
      isFailed,
      paymentDetails,
      data: responseData,
    });
  } catch (error) {
    const errorData = error.response?.data || {};
    const errorMessage = errorData.message || error.message || 'Failed to check order status';
    const httpStatus = error.response?.status;
    
    let errorCode = 'UNKNOWN_ERROR';
    if (httpStatus === 401 || httpStatus === 403) {
      errorCode = 'AUTHORIZATION_FAILED';
    } else if (httpStatus === 404) {
      errorCode = 'ORDER_NOT_FOUND';
    } else if (errorData.code) {
      errorCode = errorData.code;
    }
    
    res.status(httpStatus || 500).json({
      success: false,
      code: errorCode,
      message: errorMessage,
      data: errorData.data || {},
    });
  }
});

/**
 * Verify PhonePe Webhook Authorization Header
 */
const verifyWebhookAuthorization = (authHeader) => {
  const credentials = getPhonePeCredentials();
  
  if (!credentials.webhookUsername || !credentials.webhookPassword) {
    console.warn('⚠️ Webhook credentials not configured.');
    return process.env.NODE_ENV !== 'production';
  }

  const expectedHash = crypto
    .createHash('sha256')
    .update(`${credentials.webhookUsername}:${credentials.webhookPassword}`)
    .digest('hex');

  const receivedHash = authHeader?.replace(/^SHA256\s*/i, '').trim();
  return receivedHash === expectedHash;
};

/**
 * PhonePe Webhook Handler
 * POST /api/payment/webhook
 */
router.post('/webhook', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!verifyWebhookAuthorization(authHeader)) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    const webhookData = req.body;
    const { event, payload } = webhookData;

    if (!event || !payload) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid webhook format' 
      });
    }

    // Handle Order Events
    if (event === 'checkout.order.completed') {
      await handleOrderCompleted(payload);
    } else if (event === 'checkout.order.failed') {
      await handleOrderFailed(payload);
    }
    // Handle Refund Events
    else if (event === 'pg.refund.accepted') {
      await handleRefundAccepted(payload);
    } else if (event === 'pg.refund.completed') {
      await handleRefundCompleted(payload);
    } else if (event === 'pg.refund.failed') {
      await handleRefundFailed(payload);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Error processing PhonePe webhook:', error);
    res.status(200).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * Handle Order Completed Event
 */
const handleOrderCompleted = async (payload) => {
  try {
    const { merchantOrderId, state, amount } = payload;

    if (state !== 'COMPLETED') {
      return;
    }

    if (!merchantOrderId) {
      return;
    }

    // Extract freelancer ID from merchant order ID (format: DUES_{freelancerId}_{timestamp})
    const parts = merchantOrderId.split('_');
    if (parts.length >= 2 && parts[0] === 'DUES') {
      const freelancerId = parts[1];

      await CommissionTransaction.updateMany(
        {
          freelancer: freelancerId,
          duesPaid: false,
        },
        {
          $set: {
            duesPaid: true,
            duesPaidAt: new Date(),
            duesPaymentOrderId: merchantOrderId,
          },
        }
      );

      console.log(`✅ Order completed - Dues payment processed:`, {
        freelancerId,
        merchantOrderId,
        amount: amount ? amount / 100 : null,
      });
    }
  } catch (error) {
    console.error('❌ Error handling order completed:', error);
    throw error;
  }
};

const handleOrderFailed = async (payload) => {
  console.log(`❌ Order failed:`, payload);
};

const handleRefundAccepted = async (payload) => {
  console.log(`✅ Refund accepted:`, payload);
};

const handleRefundCompleted = async (payload) => {
  console.log(`✅ Refund completed:`, payload);
};

const handleRefundFailed = async (payload) => {
  console.log(`❌ Refund failed:`, payload);
};

/**
 * Initiate refund
 * POST /api/payment/refund
 */
router.post('/refund', authenticate, async (req, res) => {
  try {
    const { merchantOrderId, amount } = req.body || {};

    if (!merchantOrderId || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'merchantOrderId and amount (in paisa) are required',
      });
    }

    const credentials = getPhonePeCredentials();
    const config = getConfig();
    const authToken = await getAuthToken();

    const merchantRefundId = `REFUND_${merchantOrderId}_${Date.now()}`.substring(0, 63);
    const endpoint = '/payments/v2/refund';
    const url = `${config.API_URL}${endpoint}`;

    const payload = {
      merchantRefundId,
      originalMerchantOrderId: merchantOrderId,
      amount,
    };

    const refundResponse = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `O-Bearer ${authToken}`,
      },
      timeout: 10000,
      validateStatus: (status) => status < 500,
    });

    res.status(refundResponse.status).json({
      success: true,
      merchantRefundId,
      phonepe: refundResponse.data,
    });
  } catch (error) {
    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message || 'Failed to initiate refund',
    });
  }
});

/**
 * Check refund status
 * GET /api/payment/refund-status/:merchantRefundId
 */
router.get('/refund-status/:merchantRefundId', authenticate, async (req, res) => {
  try {
    const { merchantRefundId } = req.params;
    const credentials = getPhonePeCredentials();
    const config = getConfig();
    const authToken = await getAuthToken();

    const endpoint = `/payments/v2/refund/${merchantRefundId}/status`;
    const url = `${config.API_URL}${endpoint}`;

    const statusResponse = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `O-Bearer ${authToken}`,
      },
      timeout: 10000,
      validateStatus: (status) => status < 500,
    });

    res.status(statusResponse.status).json({
      success: true,
      merchantRefundId,
      phonepe: statusResponse.data,
    });
  } catch (error) {
    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message || 'Failed to check refund status',
    });
  }
});

module.exports = router;
```

---

## Mobile App Implementation

### File: `mobile-app/src/config/phonepe.js`

```javascript
/**
 * PhonePe SDK Configuration
 * Initializes PhonePe React Native SDK for native payment flow
 */

import PhonePe from 'react-native-phonepe-pg';

const PHONEPE_CONFIG = {
  merchantId: 'M23OKIGC1N363',
  environment: 'PRODUCTION', // 'PRODUCTION' or 'SANDBOX'
};

/**
 * Initialize PhonePe SDK
 */
export const initializePhonePe = async () => {
  try {
    const isProduction = PHONEPE_CONFIG.environment === 'PRODUCTION';
    const enableLogging = !isProduction;
    
    const result = await PhonePe.init(
      PHONEPE_CONFIG.environment,
      PHONEPE_CONFIG.merchantId,
      null, // appId (optional)
      enableLogging
    );
    console.log('✅ PhonePe SDK initialized');
    return true;
  } catch (error) {
    console.error('❌ Error initializing PhonePe SDK:', error);
    return false;
  }
};

/**
 * Start PhonePe transaction using SDK
 */
export const startPhonePeTransaction = async (params) => {
  try {
    const {
      orderToken,
      orderId,
      packageName = null,
      appSchema = 'people-app',
    } = params;

    if (!orderToken || !orderId) {
      throw new Error('Order token and order ID are required');
    }

    if (!PhonePe.startTransaction || typeof PhonePe.startTransaction !== 'function') {
      throw new Error('PhonePe.startTransaction method not available');
    }

    const response = await PhonePe.startTransaction(
      orderToken,
      orderId,
      packageName,
      appSchema
    );
    
    return response;
  } catch (error) {
    console.error('❌ PhonePe transaction error:', error);
    throw error;
  }
};

export default PhonePe;
```

### File: `mobile-app/src/screens/freelancer/Wallet.js` (Payment Flow)

**Key Payment Flow Code:**

```javascript
import { startPhonePeTransaction } from '../../config/phonepe';
import * as Linking from 'expo-linking';

const handlePayDues = async () => {
  if (!wallet || !wallet.totalDues || wallet.totalDues <= 0) return;

  Alert.alert(
    'Pay Dues',
    `Pay ₹${wallet.totalDues} as commission dues?`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Pay',
        onPress: async () => {
          try {
            setPaying(true);

            // Step 1: Create PhonePe payment order
            const orderResponse = await paymentAPI.createDuesOrder();
            
            if (!orderResponse.success) {
              Alert.alert('Error', orderResponse.error || 'Failed to create payment order');
              setPaying(false);
              return;
            }

            const { merchantOrderId, orderToken, orderId } = orderResponse;

            if (!orderToken || !orderId) {
              throw new Error('SDK order creation failed: Missing orderToken or orderId');
            }

            // Step 2: Set up deep link listener BEFORE calling SDK
            let deepLinkHandled = false;
            
            const handleDeepLink = async (event) => {
              try {
                const url = event.url;
                if (url.includes('people-app://payment/callback')) {
                  const urlObj = new URL(url.replace('people-app://', 'https://'));
                  const callbackOrderId = urlObj.searchParams.get('orderId');
                  
                  if (callbackOrderId === merchantOrderId && !deepLinkHandled) {
                    deepLinkHandled = true;
                    subscription.remove();
                    await checkPaymentStatus(merchantOrderId);
                  }
                }
              } catch (linkError) {
                console.error('❌ Error handling deep link:', linkError);
              }
            };
            
            const subscription = Linking.addEventListener('url', handleDeepLink);
            
            // Step 3: Start PhonePe Android Native SDK transaction
            await startPhonePeTransaction({
              orderToken: orderToken,
              orderId: orderId,
              packageName: null,
              appSchema: 'people-app',
            });

            // Poll for status in case deep link doesn't fire
            setTimeout(() => {
              if (!deepLinkHandled) {
                checkPaymentStatus(merchantOrderId);
              }
            }, 5000);
          } catch (err) {
            console.error('Error paying dues:', err);
            Alert.alert('Error', err.message || 'Failed to process payment');
            setPaying(false);
          }
        },
      },
    ]
  );
};
```

### File: `mobile-app/App.js` (SDK Initialization)

```javascript
import { initializePhonePe } from './src/config/phonepe';

useEffect(() => {
  // Initialize PhonePe SDK on app start
  initializePhonePe().catch((error) => {
    console.error('Failed to initialize PhonePe SDK:', error);
  });
}, []);
```

### File: `mobile-app/package.json` (Dependencies)

```json
{
  "dependencies": {
    "react-native-phonepe-pg": "https://phonepe.mycloudrepo.io/public/repositories/phonepe-mobile-react-native-sdk/releases/v2/react-native-phonepe-pg.tgz"
  }
}
```

### File: `mobile-app/app.json` (Deep Link Configuration)

```json
{
  "expo": {
    "scheme": "people-app",
    "plugins": [
      "./plugins/withPhonePeMaven"
    ]
  }
}
```

### File: `mobile-app/plugins/withPhonePeMaven.js`

```javascript
/**
 * Expo Config Plugin for PhonePe Maven Repository
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withPhonePeMaven(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const buildGradlePath = path.join(
        config.modRequest.platformProjectRoot,
        'build.gradle'
      );
      
      let buildGradle = fs.readFileSync(buildGradlePath, 'utf8');
      
      if (!buildGradle.includes('phonepe-intentsdk-android')) {
        const mavenRepo = `\n        maven {\n            url "https://phonepe.mycloudrepo.io/public/repositories/phonepe-intentsdk-android"\n        }`;
        
        buildGradle = buildGradle.replace(
          /(allprojects\s*\{[\s\S]*?repositories\s*\{)/,
          `$1${mavenRepo}`
        );
        
        fs.writeFileSync(buildGradlePath, buildGradle);
      }
      
      return config;
    },
  ]);
};
```

---

## API Endpoints

### Backend Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/payment/create-dues-order` | Create PhonePe SDK order | Yes (Freelancer) |
| GET | `/api/payment/order-status/:merchantOrderId` | Check order status | Yes |
| POST | `/api/payment/webhook` | PhonePe webhook handler | No (SHA256 auth) |
| POST | `/api/payment/refund` | Initiate refund | Yes |
| GET | `/api/payment/refund-status/:merchantRefundId` | Check refund status | Yes |
| GET | `/api/payment/test-auth-token` | Test auth token generation | No |

### PhonePe API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/apis/identity-manager/v1/oauth/token` | Get OAuth token (Production) |
| POST | `/apis/pg/checkout/v2/sdk/order` | Create SDK order |
| GET | `/apis/pg/checkout/v2/order/{merchantOrderId}/status` | Check order status |
| POST | `/apis/pg/payments/v2/refund` | Initiate refund |
| GET | `/apis/pg/payments/v2/refund/{merchantRefundId}/status` | Check refund status |

---

## Request/Response Formats

### SDK Order Request

```json
{
  "merchantId": "M23OKIGC1N363",
  "merchantOrderId": "DUES_693fde59f1b50d589bf27285_17661256063N",
  "amount": 10000,
  "expireAfter": 1200,
  "merchantUserId": "693fde59f1b50d589bf27285",
  "redirectUrl": "people-app://payment/callback?orderId=DUES_...",
  "redirectMode": "REDIRECT",
  "callbackUrl": "https://.../api/payment/webhook",
  "paymentFlow": {
    "type": "SDK"
  },
  "paymentInstrument": {
    "type": "UPI_INTENT"
  },
  "mobileNumber": "+919876543210"
}
```

### SDK Order Response

```json
{
  "success": true,
  "data": {
    "orderToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "orderId": "OMO2403282020198641071317",
    "merchantOrderId": "DUES_...",
    "amount": 10000
  }
}
```

### Order Status Response

```json
{
  "orderId": "OMO2403282020198641071317",
  "merchantOrderId": "DUES_...",
  "state": "COMPLETED",
  "amount": 10000,
  "expireAt": 1724866793837,
  "paymentDetails": [
    {
      "paymentMode": "UPI_INTENT",
      "transactionId": "OM12334",
      "timestamp": 1724866793837,
      "amount": 10000,
      "state": "COMPLETED"
    }
  ]
}
```

### Webhook Request (Order Completed)

```json
{
  "event": "checkout.order.completed",
  "payload": {
    "orderId": "OMO2403282020198641071317",
    "merchantId": "M23OKIGC1N363",
    "merchantOrderId": "DUES_...",
    "state": "COMPLETED",
    "amount": 10000,
    "expireAt": 1724866793837,
    "paymentDetails": [...]
  }
}
```

**Webhook Headers:**
```
Authorization: SHA256(username:password)
Content-Type: application/json
```

---

## Webhook Configuration

### Webhook Setup in PhonePe Dashboard

1. Log in to PhonePe Business Dashboard
2. Navigate to Developer Settings → Webhook tab
3. Click "Create Webhook"
4. Fill in:
   - **Webhook URL:** `https://your-backend-url.com/api/payment/webhook`
   - **Username:** Your webhook username
   - **Password:** Your webhook password
   - **Description:** Payment webhook for dues
5. Select events:
   - `checkout.order.completed`
   - `checkout.order.failed`
   - `pg.refund.accepted`
   - `pg.refund.completed`
   - `pg.refund.failed`
6. Click "Create"

### Webhook Authorization

PhonePe sends webhook with Authorization header:
```
Authorization: SHA256(username:password)
```

Backend verifies by generating:
```javascript
SHA256(webhookUsername:webhookPassword)
```

---

## SDK Configuration

### React Native SDK Installation

```bash
npm install react-native-phonepe-pg@https://phonepe.mycloudrepo.io/public/repositories/phonepe-mobile-react-native-sdk/releases/v2/react-native-phonepe-pg.tgz
```

### SDK Initialization

```javascript
import PhonePe from 'react-native-phonepe-pg';

await PhonePe.init(
  'PRODUCTION',        // environment
  'M23OKIGC1N363',     // merchantId
  null,                // appId (optional)
  false                // enableLogging (false in production)
);
```

### SDK Transaction

```javascript
await PhonePe.startTransaction(
  orderToken,    // From SDK order
  orderId,       // From SDK order
  packageName,   // Optional
  appSchema      // 'people-app'
);
```

---

## Known Issues & Troubleshooting

### Issue 1: 500 Internal Server Error on SDK Order Creation

**Symptom:** All SDK order requests return 500 error

**Status:** Unresolved - PhonePe confirmed everything is enabled, but 500 persists

**Possible Causes:**
- SDK orders may need different/additional fields
- SDK-specific configuration missing in dashboard
- Request format issue (but PhonePe says format is correct)

**Test Results:**
- `paymentFlow.type = "PG_CHECKOUT"` → 400 Bad Request (validation error)
- `paymentFlow.type = "SDK"` → 500 Internal Server Error (server error)
- All SDK variations tested → All return 500

**Next Steps:**
- Wait for PhonePe support response
- Request exact SDK order request format from PhonePe

### Issue 2: Empty metaInfo Fields Validation Error

**Symptom:** Empty `udf11-15` fields cause 400 validation error

**Solution:** Don't include `metaInfo` if all fields are empty

**Error Message:**
```
udf11-15 should only contain alphanumeric characters, underscores, hyphens, spaces, @, ., and +
```

### Issue 3: Deep Link Not Firing

**Symptom:** Payment completes but deep link callback doesn't fire

**Solution:** 
- Set up deep link listener BEFORE calling SDK
- Poll for status as fallback
- Check `app.json` has correct scheme

---

## Testing Scripts

### Test Auth Token Generation

```bash
curl -X GET "https://your-backend-url.com/api/payment/test-auth-token?full=true" \
  -H "Content-Type: application/json"
```

### Test SDK Order Creation

**File:** `test-sdk-order-direct.js`

```javascript
const axios = require('axios');

const AUTH_TOKEN = 'your_auth_token';
const MERCHANT_ID = 'M23OKIGC1N363';
const MERCHANT_ORDER_ID = 'DUES_TEST_' + Date.now();

const requestBody = {
  merchantId: MERCHANT_ID,
  merchantOrderId: MERCHANT_ORDER_ID,
  amount: 100,
  expireAfter: 1200,
  merchantUserId: 'test_user',
  redirectUrl: 'people-app://payment/callback?orderId=' + MERCHANT_ORDER_ID,
  redirectMode: 'REDIRECT',
  callbackUrl: 'https://your-backend-url.com/api/payment/webhook',
  paymentFlow: {
    type: 'SDK'
  },
  paymentInstrument: {
    type: 'UPI_INTENT'
  }
};

axios.post('https://api.phonepe.com/apis/pg/checkout/v2/sdk/order', requestBody, {
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'O-Bearer ' + AUTH_TOKEN
  }
}).then(response => {
  console.log('Success:', response.data);
}).catch(error => {
  console.error('Error:', error.response?.data || error.message);
});
```

---

## Documentation References

- [PhonePe Developer Documentation](https://developer.phonepe.com/)
- [PhonePe React Native SDK](https://developer.phonepe.com/v1/docs/reactnative-sdk-integration/)
- [PhonePe Android SDK](https://developer.phonepe.com/payment-gateway/mobile-app-integration/standard-checkout-mobile/android-sdk/introduction)
- [PhonePe API Reference](https://developer.phonepe.com/payment-gateway/mobile-app-integration/standard-checkout-mobile/api-reference/)

---

## Notes for Future Integration

1. **All code is preserved** in `backend/routes/payment.js` (commented or conditionally disabled)
2. **Mobile app code** is preserved in `mobile-app/src/config/phonepe.js`
3. **Environment variables** are documented above
4. **Webhook configuration** is documented above
5. **SDK configuration** is documented above

**To re-enable PhonePe:**
1. Uncomment/restore PhonePe code in backend
2. Re-enable PhonePe SDK in mobile app
3. Ensure all environment variables are set
4. Test auth token generation
5. Test SDK order creation
6. Verify webhook is configured in PhonePe dashboard

---

**End of Documentation**

