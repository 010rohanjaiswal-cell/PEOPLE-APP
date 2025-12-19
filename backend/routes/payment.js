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
// Based on official PhonePe documentation: https://developer.phonepe.com/payment-gateway/mobile-app-integration/standard-checkout-mobile/android-sdk/introduction
const PHONEPE_CONFIG = {
  // Environment URLs
  SANDBOX: {
    // Authorization endpoint for sandbox (from official docs)
    AUTH_URL: 'https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token',
    API_URL: 'https://api-preprod.phonepe.com/apis/pg-sandbox',
  },
  PRODUCTION: {
    // Authorization endpoint for production (identity-manager)
    AUTH_URL: 'https://api.phonepe.com/apis/identity-manager/v1/oauth/token',
    // Payment API URL for production
    API_URL: 'https://api.phonepe.com/apis/pg',
  },
};

// Get environment config
// Use PHONEPE_ENV environment variable to explicitly set environment
// If not set, default to production (since user has working production credentials)
const getConfig = () => {
  const phonepeEnv = process.env.PHONEPE_ENV || 'production'; // Default to production
  return phonepeEnv === 'sandbox' ? PHONEPE_CONFIG.SANDBOX : PHONEPE_CONFIG.PRODUCTION;
};

// Get PhonePe credentials from environment
const getPhonePeCredentials = () => {
  return {
    merchantId: process.env.PHONEPE_MERCHANT_ID,
    clientId: process.env.PHONEPE_CLIENT_ID,
    clientSecret: process.env.PHONEPE_CLIENT_SECRET,
    saltKey:
      process.env.PHONEPE_SALT_KEY ||
      process.env.PHONEPE_CLIENT_SECRET, // Use client secret as salt if salt key not provided
    saltIndex: process.env.PHONEPE_SALT_INDEX || '1',
    // Webhook credentials for Authorization header verification
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
let cachedAuthTokenExpiresAt = null; // JS timestamp (ms)

// Get Authorization Token (with caching based on expires_at / expires_in)
const getAuthToken = async () => {
  try {
    const now = Date.now();

    // If we already have a token and it's not close to expiry, reuse it
    if (cachedAuthToken && cachedAuthTokenExpiresAt && now < cachedAuthTokenExpiresAt - 60 * 1000) {
      return cachedAuthToken;
    }

    const credentials = getPhonePeCredentials();
    const config = getConfig();

    // PhonePe OAuth requires application/x-www-form-urlencoded format
    // Based on official docs: https://developer.phonepe.com/payment-gateway/mobile-app-integration/standard-checkout-mobile/api-reference/authorization
    const params = new URLSearchParams();
    params.append('client_id', credentials.clientId);
    params.append('client_version', '1'); // Required by PhonePe API
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
      console.error('PhonePe auth response missing access_token:', {
        responseData: data,
        status: response.status,
      });
      throw new Error('PhonePe auth response missing access_token');
    }

    // Ensure token is a string and trim whitespace
    const cleanToken = String(accessToken).trim();
    
    if (!cleanToken || cleanToken.length === 0) {
      throw new Error('PhonePe auth token is empty after cleaning');
    }

    // PhonePe docs mention expires_at; if not present, fall back to expires_in
    let expiresAtMs = null;

    if (data.expires_at) {
      // expires_at is usually an epoch timestamp (seconds) – normalise to ms
      const exp = Number(data.expires_at);
      if (!Number.isNaN(exp)) {
        // If value looks like seconds, convert to ms
        expiresAtMs = exp < 10_000_000_000 ? exp * 1000 : exp;
      }
    } else if (data.expires_in) {
      const expIn = Number(data.expires_in);
      if (!Number.isNaN(expIn) && expIn > 0) {
        expiresAtMs = Date.now() + expIn * 1000;
      }
    }

    // If we couldn't parse expiry, default to 10 minutes from now
    if (!expiresAtMs) {
      expiresAtMs = Date.now() + 10 * 60 * 1000;
    }

    cachedAuthToken = cleanToken;
    cachedAuthTokenExpiresAt = expiresAtMs;

    console.log('✅ PhonePe auth token generated:', {
      tokenLength: cleanToken.length,
      tokenPreview: `${cleanToken.substring(0, 20)}...`,
      expiresAt: new Date(expiresAtMs).toISOString(),
    });

    return cleanToken;
  } catch (error) {
    console.error('PhonePe Auth Error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    throw new Error('Failed to get PhonePe authorization token');
  }
};

/**
 * Test route: Generate and return a (masked) PhonePe auth token
 * GET /api/payment/test-auth-token
 * NOTE: For debugging only. Consider disabling in production.
 */
router.get('/test-auth-token', async (req, res) => {
  try {
    const token = await getAuthToken();
    const config = getConfig();

    return res.json({
      success: true,
      // Show only a preview of the token for safety
      tokenPreview: token ? `${token.slice(0, 8)}...` : null,
      tokenLength: token?.length || 0,
      // Expose expiry info so we can verify caching logic
      expiresAt: cachedAuthTokenExpiresAt,
      expiresAtDate: cachedAuthTokenExpiresAt ? new Date(cachedAuthTokenExpiresAt).toISOString() : null,
      config: {
        API_URL: config.API_URL,
        AUTH_URL: config.AUTH_URL,
        environment: process.env.PHONEPE_ENV || 'production',
      },
    });
  } catch (error) {
    console.error('Error testing PhonePe auth token:', error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      error: error.response?.data?.message || error.message || 'Failed to get PhonePe auth token',
    });
  }
});

/**
 * Test route: Test SDK order creation (for debugging)
 * POST /api/payment/test-sdk-order
 * NOTE: For debugging only. Creates a test SDK order to diagnose issues.
 */
router.post('/test-sdk-order', authenticate, async (req, res) => {
  try {
    const credentials = getPhonePeCredentials();
    const config = getConfig();
    const authToken = await getAuthToken();
    
    // Create a test SDK order
    const testOrderId = `TEST_${Date.now()}`;
    const testRequestBody = {
      merchantId: credentials.merchantId,
      merchantOrderId: testOrderId,
      amount: 100, // 1 rupee in paise
      merchantUserId: 'test_user',
      redirectUrl: 'people-app://payment/callback?orderId=' + testOrderId,
      redirectMode: 'REDIRECT',
      callbackUrl: `${process.env.BACKEND_URL || 'https://freelancing-platform-backend-backup.onrender.com'}/api/payment/webhook`,
      paymentFlow: 'SDK',
      paymentInstrument: {
        type: 'UPI_INTENT',
      },
    };

    const endpoint = '/checkout/v2/sdk/order';
    const url = `${config.API_URL}${endpoint}`;

    console.log('🧪 Testing SDK order creation:', {
      url,
      requestBody: testRequestBody,
    });

    const response = await axios.post(url, testRequestBody, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `O-Bearer ${authToken}`,
      },
      timeout: 10000,
      validateStatus: () => true, // Don't throw on any status
    });

    return res.json({
      success: response.status === 200 || response.status === 201,
      status: response.status,
      statusText: response.statusText,
      response: response.data,
      request: {
        url,
        body: testRequestBody,
      },
    });
  } catch (error) {
    console.error('Error testing SDK order:', error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      error: error.response?.data || error.message,
      fullError: error.response ? {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers,
      } : null,
    });
  }
});

/**
 * Create PhonePe payment order for dues payment
 * POST /api/payment/create-dues-order
 * Requires authentication as freelancer
 */
router.post('/create-dues-order', authenticate, async (req, res) => {
  // Get PhonePe credentials and config outside try block for error handling
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

    // For React Native SDK, we use SDK Order flow (not direct B2B PG)
    // SDK Order endpoint: /checkout/v2/sdk/order
    // The SDK expects: startTransaction(orderToken, orderId, packageName, appSchema)
    // Build the SDK order request body
    const authToken = await getAuthToken();
    
    // Build SDK order request body
    // Only include mobileNumber if it's a valid phone number
    const sdkOrderRequestBody = {
      merchantId: credentials.merchantId,
      merchantOrderId: merchantOrderId,
      amount: totalDues * 100, // Amount in paise
      merchantUserId: freelancerId.toString(),
      redirectUrl: `people-app://payment/callback?orderId=${merchantOrderId}`,
      redirectMode: 'REDIRECT',
      callbackUrl: `${process.env.BACKEND_URL || 'https://freelancing-platform-backend-backup.onrender.com'}/api/payment/webhook`,
      paymentFlow: 'SDK', // Required for SDK orders
      paymentInstrument: {
        type: 'UPI_INTENT', // SDK order uses UPI_INTENT
      },
    };

    // Add mobileNumber only if it's a valid phone number (not empty)
    if (user.phone && user.phone.trim().length > 0) {
      sdkOrderRequestBody.mobileNumber = user.phone.trim();
    }

    // Create SDK order using /checkout/v2/sdk/order endpoint
    const sdkOrderEndpoint = '/checkout/v2/sdk/order';
    const sdkOrderUrl = `${config.API_URL}${sdkOrderEndpoint}`;

    console.log('📤 Creating SDK order:', {
      endpoint: sdkOrderUrl,
      merchantOrderId,
      amount: totalDues * 100,
      requestBody: {
        ...sdkOrderRequestBody,
        mobileNumber: sdkOrderRequestBody.mobileNumber ? `${sdkOrderRequestBody.mobileNumber.substring(0, 3)}***` : 'not provided',
      },
    });

    let sdkOrderResponse;
    try {
      sdkOrderResponse = await axios.post(
        sdkOrderUrl,
        sdkOrderRequestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `O-Bearer ${authToken}`,
          },
          timeout: 10000,
          validateStatus: (status) => status < 600, // Don't throw on any status
        }
      );
    } catch (requestError) {
      console.error('❌ SDK order request failed:', {
        message: requestError.message,
        code: requestError.code,
        response: requestError.response ? {
          status: requestError.response.status,
          statusText: requestError.response.statusText,
          data: requestError.response.data,
        } : null,
      });
      throw requestError;
    }

    // Log full response for debugging
    const fullResponseData = sdkOrderResponse.data;
    console.log('📥 SDK order response (FULL):', {
      status: sdkOrderResponse.status,
      statusText: sdkOrderResponse.statusText,
      headers: sdkOrderResponse.headers,
      hasData: !!fullResponseData,
      dataType: typeof fullResponseData,
      dataKeys: fullResponseData ? Object.keys(fullResponseData) : [],
      fullResponse: JSON.stringify(fullResponseData, null, 2), // Full response as JSON string
    });

    // Check for error response
    if (sdkOrderResponse.status !== 200 && sdkOrderResponse.status !== 201) {
      const errorData = sdkOrderResponse.data || {};
      console.error('❌ SDK order creation failed - DETAILED ERROR:', {
        status: sdkOrderResponse.status,
        statusText: sdkOrderResponse.statusText,
        error: errorData.message || errorData.error || 'Unknown error',
        code: errorData.code,
        fullResponse: JSON.stringify(errorData, null, 2),
        requestDetails: {
          endpoint: sdkOrderUrl,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `O-Bearer ${authToken ? `${authToken.substring(0, 20)}...` : 'missing'}`,
          },
          requestBody: JSON.stringify(sdkOrderRequestBody, null, 2),
        },
      });
      
      // Return detailed error for debugging
      return res.status(500).json({
        success: false,
        error: errorData.message || errorData.error || 'Failed to create SDK order',
        code: errorData.code || 'SDK_ORDER_FAILED',
        message: 'SDK order creation failed. This might indicate that SDK orders are not enabled for your merchant account, or there is an issue with the request format. Please check the backend logs for detailed error information.',
        debug: {
          phonepeError: errorData,
          endpoint: sdkOrderUrl,
          requestBody: sdkOrderRequestBody,
        },
      });
    }

    const sdkOrderData = sdkOrderResponse.data?.data || sdkOrderResponse.data;
    
    if (!sdkOrderData || !sdkOrderData.orderToken) {
      console.error('❌ SDK order response missing orderToken:', {
        fullResponse: sdkOrderResponse.data,
        hasData: !!sdkOrderData,
        orderToken: sdkOrderData?.orderToken,
      });
      throw new Error('Failed to create SDK order: missing orderToken in response');
    }

    const orderToken = sdkOrderData.orderToken;
    const phonepeOrderId = sdkOrderData.orderId || merchantOrderId;

    console.log('✅ SDK order created:', {
      orderToken: orderToken ? `${orderToken.substring(0, 20)}...` : null,
      orderId: phonepeOrderId,
      merchantOrderId,
    });

    // Return orderToken and orderId for React Native SDK
    const responsePayload = {
      success: true,
      merchantOrderId,
      orderId: phonepeOrderId,
      // For React Native SDK order flow:
      orderToken: orderToken, // Order token for SDK
      amount: totalDues,
      message: 'Payment order created successfully',
    };

    console.log('📤 Sending response to frontend (SDK Order):', {
      hasOrderToken: !!orderToken,
      orderTokenLength: orderToken?.length || 0,
      orderId: phonepeOrderId,
      merchantOrderId,
      endpoint: sdkOrderEndpoint,
    });

    res.json(responsePayload);
  } catch (error) {
    console.error('Error creating PhonePe order:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
      endpoint: `${config.API_URL}/checkout/v2/sdk/order`,
    });
    res.status(500).json({
      success: false,
      error: error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to create payment order',
      debug: process.env.NODE_ENV === 'development' ? {
        endpoint: `${config.API_URL}/checkout/v2/sdk/order`,
        response: error.response?.data,
      } : undefined,
    });
  }
});

/**
 * Check order status
 * GET /api/payment/order-status/:merchantOrderId
 * Requires authentication
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

    // Get auth token
    let authToken = await getAuthToken();
    
    if (!authToken) {
      return res.status(500).json({
        success: false,
        code: 'AUTH_TOKEN_MISSING',
        error: 'Failed to get authorization token',
        data: {},
      });
    }

    // Trim any whitespace from token
    authToken = authToken.trim();

    // Order Status API for B2B PG flow:
    // For B2B PG orders created via /pg/v1/pay, we use the SDK order status endpoint
    // GET /checkout/v2/order/{merchantOrderId}/status
    // Headers:
    //   - Content-Type: application/json
    //   - Authorization: O-Bearer <access_token>
    // Note: B2B PG orders can be checked using the SDK order status endpoint
    const endpoint = `/checkout/v2/order/${merchantOrderId}/status`;
    const fullUrl = `${config.API_URL}${endpoint}`;
    
    // SDK order status endpoint uses Authorization header (O-Bearer token)
    // No X-VERIFY checksum needed for this endpoint

    console.log('🔍 Checking order status (B2B PG via SDK endpoint):', {
      merchantOrderId,
      endpoint: fullUrl,
      hasToken: !!authToken,
      tokenPreview: authToken ? `${authToken.substring(0, 20)}...` : null,
      config: {
        API_URL: config.API_URL,
        environment: process.env.PHONEPE_ENV || 'production',
      },
    });

    // Check order status
    let statusResponse;
    try {
      statusResponse = await axios.get(fullUrl, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `O-Bearer ${authToken}`, // SDK order status uses O-Bearer token
        },
        // Add timeout and better error handling
        timeout: 10000,
        validateStatus: (status) => status < 500, // Don't throw on 4xx errors
      });
      
      // Log response for debugging
      console.log('📥 Order status response:', {
        status: statusResponse.status,
        statusText: statusResponse.statusText,
        dataPreview: JSON.stringify(statusResponse.data).substring(0, 200),
      });
    } catch (requestError) {
      // This will be caught by outer catch, but log here for debugging
      console.error('❌ Order status request failed:', {
        message: requestError.message,
        code: requestError.code,
        response: requestError.response ? {
          status: requestError.response.status,
          statusText: requestError.response.statusText,
          data: requestError.response.data,
          headers: requestError.response.headers,
        } : null,
      });
      throw requestError;
    }

    const responseData = statusResponse.data;

    // PhonePe Order Status API returns order data directly (not wrapped in success/data)
    // Response format: { orderId, state, amount, expireAt, paymentDetails, ... }
    // Error format: { success: false, code, message, data: {} }
    
    // Check if it's an error response
    if (responseData.success === false || responseData.code) {
      return res.status(500).json({
        success: false,
        code: responseData.code || 'UNKNOWN_ERROR',
        error: responseData.message || 'Failed to get order status',
        data: responseData.data || {},
      });
    }

    // Success response: order data is directly in responseData
    const state = responseData.state; // PENDING, COMPLETED, FAILED
    const orderId = responseData.orderId;
    const amount = responseData.amount;
    const paymentDetails = responseData.paymentDetails || [];
    
    // Get latest payment attempt details
    const latestPayment = paymentDetails.length > 0 ? paymentDetails[paymentDetails.length - 1] : null;
    const transactionId = latestPayment?.transactionId || null;
    const paymentState = latestPayment?.state || state;

    // Map PhonePe states to our status
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
    
    // Determine error code based on response
    let errorCode = 'UNKNOWN_ERROR';
    if (httpStatus === 401 || httpStatus === 403) {
      errorCode = 'AUTHORIZATION_FAILED';
    } else if (httpStatus === 404) {
      errorCode = 'ORDER_NOT_FOUND';
    } else if (errorData.code) {
      errorCode = errorData.code;
    }
    
    // Check if error message indicates order not found
    const errorMessageLower = errorMessage.toLowerCase();
    if (errorMessageLower.includes('not found') || errorMessageLower.includes('mapping not found') || errorMessageLower.includes('no entry found')) {
      errorCode = 'ORDER_NOT_FOUND';
    }
    
    console.error('❌ Error checking order status:', {
      code: errorCode,
      message: errorMessage,
      status: httpStatus,
      statusText: error.response?.statusText,
      data: errorData,
      url: error.config?.url,
      headers: {
        authorization: error.config?.headers?.Authorization ? 'O-Bearer ***' : 'missing',
      },
      fullErrorResponse: JSON.stringify(errorData, null, 2),
    });
    
    // If authorization failed, try to get a fresh token and log it
    if (errorCode === 'AUTHORIZATION_FAILED') {
      console.log('🔄 Authorization failed - attempting to refresh token...');
      try {
        // Clear cached token to force refresh
        cachedAuthToken = null;
        cachedAuthTokenExpiresAt = null;
        const newToken = await getAuthToken();
        console.log('✅ New token generated:', newToken ? `${newToken.substring(0, 20)}...` : 'null');
      } catch (tokenError) {
        console.error('❌ Failed to refresh token:', tokenError.message);
      }
    }
    
    // For B2B PG orders, if order not found, it might mean the order was never created
    // (e.g., SDK call failed with 404). In this case, suggest checking webhook or retrying payment.
    if (errorCode === 'ORDER_NOT_FOUND') {
      console.log('⚠️ Order not found - This might be a B2B PG order that was never created.');
      console.log('💡 For B2B PG orders, status updates come via webhook. Check webhook logs for payment status.');
    }
    
    res.status(httpStatus || 500).json({
      success: false,
      code: errorCode,
      message: errorMessage,
      data: errorData.data || {},
      // Add helpful message for order not found
      hint: errorCode === 'ORDER_NOT_FOUND' 
        ? 'Order may not exist. For B2B PG orders, status updates come via webhook.' 
        : undefined,
    });
  }
});

/**
 * Verify PhonePe Webhook Authorization Header
 * PhonePe sends: Authorization: SHA256(username:password)
 * We verify it matches our configured webhook credentials
 */
const verifyWebhookAuthorization = (authHeader) => {
  const credentials = getPhonePeCredentials();
  
  if (!credentials.webhookUsername || !credentials.webhookPassword) {
    console.warn('⚠️ Webhook credentials not configured. Skipping authorization verification.');
    // In development, allow webhooks without credentials
    // In production, you should always have credentials configured
    return process.env.NODE_ENV !== 'production';
  }

  // Generate expected hash: SHA256(username:password)
  const expectedHash = crypto
    .createHash('sha256')
    .update(`${credentials.webhookUsername}:${credentials.webhookPassword}`)
    .digest('hex');

  // PhonePe sends: Authorization: SHA256(username:password)
  // Extract the hash from the header (remove "SHA256" prefix if present, or use as-is)
  const receivedHash = authHeader?.replace(/^SHA256\s*/i, '').trim();

  const isValid = receivedHash === expectedHash;

  if (!isValid) {
    console.error('❌ Webhook authorization failed:', {
      receivedHash: receivedHash ? `${receivedHash.substring(0, 20)}...` : 'missing',
      expectedHash: `${expectedHash.substring(0, 20)}...`,
    });
  }

  return isValid;
};

/**
 * PhonePe Webhook Handler
 * POST /api/payment/webhook
 * 
 * Handles all PhonePe webhook events:
 * - checkout.order.completed: Order successfully completed
 * - checkout.order.failed: Order failed
 * - pg.refund.accepted: Refund accepted
 * - pg.refund.completed: Refund successfully completed
 * - pg.refund.failed: Refund failed
 * 
 * Documentation: https://developer.phonepe.com/payment-gateway/mobile-app-integration/standard-checkout-mobile/api-reference/webhook-handling
 */
router.post('/webhook', async (req, res) => {
  try {
    // Verify Authorization header
    const authHeader = req.headers.authorization;
    if (!verifyWebhookAuthorization(authHeader)) {
      console.error('❌ Webhook authorization verification failed');
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    // PhonePe sends webhook as JSON with event and payload structure
    const webhookData = req.body;
    const { event, payload } = webhookData;

    console.log('📥 PhonePe Webhook Received:', {
      event,
      merchantOrderId: payload?.merchantOrderId || payload?.originalMerchantOrderId,
      state: payload?.state,
      amount: payload?.amount,
    });

    // Use 'event' parameter (not 'type') to identify event type
    // Use 'payload.state' for payment status
    if (!event || !payload) {
      console.error('❌ Invalid webhook format: missing event or payload');
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
    } else {
      console.warn('⚠️ Unknown webhook event:', event);
    }

    // Always return success to PhonePe (200 OK)
    // PhonePe will retry if we return error status
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Error processing PhonePe webhook:', {
      error: error.message,
      stack: error.stack,
      body: req.body,
    });
    // Still return 200 to prevent PhonePe from retrying
    // Log the error for manual investigation
    res.status(200).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * Handle Order Completed Event
 * Event: checkout.order.completed
 * State: COMPLETED
 */
const handleOrderCompleted = async (payload) => {
  try {
    const { merchantOrderId, state, amount } = payload;

    // Verify state is COMPLETED
    if (state !== 'COMPLETED') {
      console.warn('⚠️ Order completed event but state is not COMPLETED:', state);
      return;
    }

    if (!merchantOrderId) {
      console.error('❌ Missing merchantOrderId in order completed webhook');
      return;
    }

    // Extract freelancer ID from merchant order ID (format: DUES_{freelancerId}_{timestamp})
    const parts = merchantOrderId.split('_');
    if (parts.length >= 2 && parts[0] === 'DUES') {
      const freelancerId = parts[1];

      // Mark all unpaid transactions as paid
      const updateResult = await CommissionTransaction.updateMany(
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
        amount: amount ? amount / 100 : null, // Convert paisa to rupees
        transactionsUpdated: updateResult.modifiedCount,
      });
    } else {
      console.warn('⚠️ Invalid merchant order ID format:', merchantOrderId);
    }
  } catch (error) {
    console.error('❌ Error handling order completed:', error);
    throw error;
  }
};

/**
 * Handle Order Failed Event
 * Event: checkout.order.failed
 * State: FAILED
 */
const handleOrderFailed = async (payload) => {
  try {
    const { merchantOrderId, state, errorCode, detailedErrorCode } = payload;

    // Verify state is FAILED
    if (state !== 'FAILED') {
      console.warn('⚠️ Order failed event but state is not FAILED:', state);
      return;
    }

    console.log(`❌ Order failed:`, {
      merchantOrderId,
      errorCode,
      detailedErrorCode,
    });

    // You can add logic here to:
    // - Notify the user about payment failure
    // - Log failure reason for analytics
    // - Update order status in database
  } catch (error) {
    console.error('❌ Error handling order failed:', error);
    throw error;
  }
};

/**
 * Handle Refund Accepted Event
 * Event: pg.refund.accepted
 * State: CONFIRMED
 */
const handleRefundAccepted = async (payload) => {
  try {
    const { merchantRefundId, originalMerchantOrderId, state, amount } = payload;

    console.log(`✅ Refund accepted:`, {
      merchantRefundId,
      originalMerchantOrderId,
      state,
      amount: amount ? amount / 100 : null, // Convert paisa to rupees
    });

    // You can add logic here to:
    // - Update refund status in database
    // - Notify user that refund is being processed
  } catch (error) {
    console.error('❌ Error handling refund accepted:', error);
    throw error;
  }
};

/**
 * Handle Refund Completed Event
 * Event: pg.refund.completed
 * State: COMPLETED
 */
const handleRefundCompleted = async (payload) => {
  try {
    const { merchantRefundId, originalMerchantOrderId, state, amount } = payload;

    // Verify state is COMPLETED
    if (state !== 'COMPLETED') {
      console.warn('⚠️ Refund completed event but state is not COMPLETED:', state);
      return;
    }

    console.log(`✅ Refund completed:`, {
      merchantRefundId,
      originalMerchantOrderId,
      amount: amount ? amount / 100 : null, // Convert paisa to rupees
    });

    // Extract freelancer ID from original merchant order ID (format: DUES_{freelancerId}_{timestamp})
    if (originalMerchantOrderId) {
      const parts = originalMerchantOrderId.split('_');
      if (parts.length >= 2 && parts[0] === 'DUES') {
        const freelancerId = parts[1];

        // You can add logic here to:
        // - Mark refund as completed in database
        // - Revert dues payment status if needed
        // - Notify user that refund is complete
        console.log(`✅ Refund completed for freelancer: ${freelancerId}`);
      }
    }
  } catch (error) {
    console.error('❌ Error handling refund completed:', error);
    throw error;
  }
};

/**
 * Handle Refund Failed Event
 * Event: pg.refund.failed
 * State: FAILED
 */
const handleRefundFailed = async (payload) => {
  try {
    const { merchantRefundId, originalMerchantOrderId, state, errorCode, detailedErrorCode } = payload;

    // Verify state is FAILED
    if (state !== 'FAILED') {
      console.warn('⚠️ Refund failed event but state is not FAILED:', state);
      return;
    }

    console.log(`❌ Refund failed:`, {
      merchantRefundId,
      originalMerchantOrderId,
      errorCode,
      detailedErrorCode,
    });

    // You can add logic here to:
    // - Update refund status in database
    // - Notify user about refund failure
    // - Log failure reason for investigation
  } catch (error) {
    console.error('❌ Error handling refund failed:', error);
    throw error;
  }
};

/**
 * Initiate refund for a successful PhonePe transaction
 * POST /api/payment/refund
 *
 * Docs:
 * - Initiate refund: https://developer.phonepe.com/payment-gateway/mobile-app-integration/standard-checkout-mobile/api-reference/refund#nav-initiating-refund-request
 * - Environment:     https://developer.phonepe.com/payment-gateway/mobile-app-integration/standard-checkout-mobile/api-reference/refund#nav-environment
 *
 * Body:
 * - merchantOrderId (string, required)  -> originalMerchantOrderId in PhonePe
 * - amount          (number, optional)  -> amount to refund in paisa; if omitted, full order amount should be used (we keep it required for now)
 */
router.post('/refund', authenticate, async (req, res) => {
  try {
    const { merchantOrderId, amount } = req.body || {};

    if (!merchantOrderId) {
      return res.status(400).json({
        success: false,
        error: 'merchantOrderId is required',
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'amount (in paisa) is required and must be > 0',
      });
    }

    const credentials = getPhonePeCredentials();
    const config = getConfig();

    if (!credentials.merchantId || !credentials.clientId || !credentials.clientSecret) {
      return res.status(500).json({
        success: false,
        error: 'PhonePe credentials not configured',
      });
    }

    // Get auth token (O-Bearer) as per docs
    const authToken = await getAuthToken();

    // Generate unique merchantRefundId for this refund
    // Format: REFUND_{orderId}_{timestamp} (max 63 chars)
    const rawRefundId = `REFUND_${merchantOrderId}_${Date.now()}`;
    const merchantRefundId = rawRefundId.substring(0, 63);

    // Refund API (production): POST /apis/pg/payments/v2/refund
    // See docs: https://developer.phonepe.com/payment-gateway/mobile-app-integration/standard-checkout-mobile/api-reference/refund#nav-environment
    const endpoint = '/payments/v2/refund';
    const url = `${config.API_URL}${endpoint}`;

    const payload = {
      merchantRefundId,
      originalMerchantOrderId: merchantOrderId,
      amount, // amount in paisa
    };

    console.log('🔁 Initiating PhonePe refund:', {
      url,
      payload,
    });

    const refundResponse = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `O-Bearer ${authToken}`,
      },
      timeout: 10000,
      validateStatus: (status) => status < 500,
    });

    console.log('📥 Refund initiation response:', {
      status: refundResponse.status,
      dataPreview: JSON.stringify(refundResponse.data).substring(0, 200),
    });

    const data = refundResponse.data || {};

    // Pass through PhonePe response, but ensure our success flag
    res.status(refundResponse.status).json({
      success: true,
      merchantRefundId,
      phonepe: data,
    });
  } catch (error) {
    console.error('❌ Error initiating PhonePe refund:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error:
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to initiate refund',
      data: error.response?.data || {},
    });
  }
});

/**
 * Check refund status
 * GET /api/payment/refund-status/:merchantRefundId
 *
 * Docs:
 * - Refund status: https://developer.phonepe.com/payment-gateway/mobile-app-integration/standard-checkout-mobile/api-reference/refund
 *
 * Path params:
 * - merchantRefundId (string, required)
 */
router.get('/refund-status/:merchantRefundId', authenticate, async (req, res) => {
  try {
    const { merchantRefundId } = req.params;

    if (!merchantRefundId) {
      return res.status(400).json({
        success: false,
        error: 'merchantRefundId is required',
      });
    }

    const credentials = getPhonePeCredentials();
    const config = getConfig();

    if (!credentials.merchantId || !credentials.clientId || !credentials.clientSecret) {
      return res.status(500).json({
        success: false,
        error: 'PhonePe credentials not configured',
      });
    }

    const authToken = await getAuthToken();

    // Refund status API (production):
    // GET /apis/pg/payments/v2/refund/{merchantRefundId}/status
    const endpoint = `/payments/v2/refund/${merchantRefundId}/status`;
    const url = `${config.API_URL}${endpoint}`;

    console.log('🔍 Checking PhonePe refund status:', {
      url,
      merchantRefundId,
    });

    const statusResponse = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `O-Bearer ${authToken}`,
      },
      timeout: 10000,
      validateStatus: (status) => status < 500,
    });

    console.log('📥 Refund status response:', {
      status: statusResponse.status,
      dataPreview: JSON.stringify(statusResponse.data).substring(0, 200),
    });

    const data = statusResponse.data || {};

    // From docs, expected response shape:
    // {
    //   "originalMerchantOrderId": "",
    //   "refundId": "OMRxxxxx",
    //   "amount": 1234,
    //   "state": "FAILED" | "PENDING" | "COMPLETED",
    //   ...
    // }

    res.status(statusResponse.status).json({
      success: true,
      merchantRefundId,
      phonepe: data,
    });
  } catch (error) {
    console.error('❌ Error checking PhonePe refund status:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error:
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to check refund status',
      data: error.response?.data || {},
    });
  }
});

/**
 * Process dues payment after successful PhonePe payment
 * POST /api/payment/process-dues/:merchantOrderId
 * Requires authentication as freelancer
 */
router.post('/process-dues/:merchantOrderId', authenticate, async (req, res) => {
  try {
    const user = req.user;

    if (!user || user.role !== 'freelancer') {
      return res.status(403).json({
        success: false,
        error: 'Only freelancers can process dues payment',
      });
    }

    const freelancerId = user._id || user.id;
    const { merchantOrderId } = req.params;

    // Verify merchant order ID belongs to this freelancer
    if (!merchantOrderId.startsWith(`DUES_${freelancerId.toString()}_`)) {
      return res.status(403).json({
        success: false,
        error: 'Invalid order ID',
      });
    }

    // Check order status first
    const credentials = getPhonePeCredentials();
    const config = getConfig();
    const authToken = await getAuthToken();
    const endpoint = `/checkout/v2/order/${merchantOrderId}/status`;
    const xVerify = generateXVerify('', endpoint);

    const statusResponse = await axios.get(
      `${config.API_URL}${endpoint}`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'X-VERIFY': xVerify,
          'X-MERCHANT-ID': credentials.merchantId,
        },
      }
    );

    const orderData = statusResponse.data?.data;
    const code = orderData?.code;

    if (code !== 'PAYMENT_SUCCESS') {
      return res.status(400).json({
        success: false,
        error: `Payment not successful. Status: ${code}`,
      });
    }

    // Mark all unpaid transactions as paid
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

    // Return updated wallet data
    const transactions = await CommissionTransaction.find({
      freelancer: freelancerId,
    })
      .sort({ createdAt: -1 })
      .lean();

    const totalDues = transactions
      .filter((t) => !t.duesPaid)
      .reduce((sum, t) => sum + (t.platformCommission || 0), 0);

    const canWork = totalDues <= 0;

    const mappedTransactions = transactions.map((t) => ({
      id: t._id.toString(),
      jobId: t.job,
      jobTitle: t.jobTitle,
      clientName: t.clientName || null,
      jobAmount: t.jobAmount,
      platformCommission: t.platformCommission,
      amountReceived: t.amountReceived,
      duesPaid: t.duesPaid,
      duesPaidAt: t.duesPaidAt,
      duesPaymentOrderId: t.duesPaymentOrderId,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      status: t.duesPaid ? 'paid' : 'pending',
    }));

    res.json({
      success: true,
      message: 'Dues payment processed successfully',
      wallet: {
        totalDues,
        canWork,
        transactions: mappedTransactions,
      },
    });
  } catch (error) {
    console.error('Error processing dues payment:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.message || error.message || 'Failed to process dues payment',
    });
  }
});

module.exports = router;

