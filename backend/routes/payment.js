/**
 * Payment Routes - Cashfree Integration
 * Handles Cashfree payment gateway integration for commission dues payment
 * PhonePe code preserved for future use (see PHONEPE_COMPLETE_DOCUMENTATION.md)
 */

const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const { authenticate } = require('../middleware/auth');
const CommissionTransaction = require('../models/CommissionTransaction');

const router = express.Router();

// ============================================================================
// CASHFREE CONFIGURATION
// ============================================================================

const CASHFREE_CONFIG = {
  PRODUCTION: {
    API_URL: 'https://api.cashfree.com',
  },
  SANDBOX: {
    API_URL: 'https://sandbox.cashfree.com',
  },
};

const getCashfreeConfig = () => {
  const env = process.env.CASHFREE_ENV || 'production';
  return env === 'sandbox' ? CASHFREE_CONFIG.SANDBOX : CASHFREE_CONFIG.PRODUCTION;
};

const getCashfreeCredentials = () => {
  return {
    clientId: process.env.CASHFREE_CLIENT_ID,
    clientSecret: process.env.CASHFREE_CLIENT_SECRET,
    apiVersion: process.env.CASHFREE_API_VERSION || '2023-08-01',
  };
};

// ============================================================================
// PHONEPE CONFIGURATION (PRESERVED FOR FUTURE USE)
// ============================================================================

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
 * Test route: Generate and return PhonePe auth token
 * GET /api/payment/test-auth-token?full=true
 * NOTE: For debugging only. Consider disabling in production.
 * Query params:
 *   - full=true: Returns full token (default: false, shows preview only)
 */
router.get('/test-auth-token', async (req, res) => {
  try {
    const token = await getAuthToken();
    const config = getConfig();
    const showFull = req.query.full === 'true' || req.query.full === '1';

    const response = {
      success: true,
      tokenLength: token?.length || 0,
      // Expose expiry info so we can verify caching logic
      expiresAt: cachedAuthTokenExpiresAt,
      expiresAtDate: cachedAuthTokenExpiresAt ? new Date(cachedAuthTokenExpiresAt).toISOString() : null,
      config: {
        API_URL: config.API_URL,
        AUTH_URL: config.AUTH_URL,
        environment: process.env.PHONEPE_ENV || 'production',
      },
    };

    // Return full token if requested, otherwise show preview
    if (showFull) {
      response.token = token;
      response.tokenPreview = token ? `${token.slice(0, 20)}...` : null;
    } else {
      response.tokenPreview = token ? `${token.slice(0, 8)}...` : null;
      response.message = 'Add ?full=true to get the complete token';
    }

    return res.json(response);
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
      paymentFlow: {
        type: 'SDK', // Using Object format as per PhonePe docs
      },
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
 * Create Cashfree payment order for dues payment
 * POST /api/payment/create-dues-order
 * Requires authentication as freelancer
 */
router.post('/create-dues-order', authenticate, async (req, res) => {
  // Use PhonePe for WebView payment flow (Cashfree has 403 issues with WebView)
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

    // Generate merchant order ID (max 63 chars for PhonePe)
    const merchantOrderId = `DUES_${freelancerId.toString()}_${Date.now()}`.substring(0, 63);

    // PhonePe web redirect flow for WebView (same format as web version)
    // Use SDK endpoint but without paymentInstrument to get web redirect URL
    const authToken = await getAuthToken();
    
    const orderRequestBody = {
      merchantId: credentials.merchantId,
      merchantOrderId: merchantOrderId,
      amount: totalDues * 100, // Amount in paise
      expireAfter: 1200, // Order expiry in seconds (20 minutes)
      merchantUserId: freelancerId.toString(),
      redirectUrl: `${process.env.BACKEND_URL || 'https://freelancing-platform-backend-backup.onrender.com'}/api/payment/return?orderId=${merchantOrderId}`,
      redirectMode: 'REDIRECT',
      callbackUrl: `${process.env.BACKEND_URL || 'https://freelancing-platform-backend-backup.onrender.com'}/api/payment/webhook`,
      paymentFlow: {
        type: 'SDK', // Use SDK flow (same as web version)
      },
      // Include paymentInstrument - PhonePe requires this for SDK orders
      // Even for web redirect, we need this field
      paymentInstrument: {
        type: 'UPI_INTENT', // Required for SDK orders
      },
    };

    // Add mobileNumber if available
    if (user.phone && user.phone.trim().length > 0) {
      orderRequestBody.mobileNumber = user.phone.trim();
    }

    // Use the SAME endpoint that works on web: /checkout/v2/sdk/order
    // This endpoint works for both SDK and web redirect flows
    const orderEndpoint = '/checkout/v2/sdk/order';
    const orderUrl = `${config.API_URL}${orderEndpoint}`;

    console.log('📤 Creating PhonePe order (WebView redirect - same as web):', {
      endpoint: orderUrl,
      merchantOrderId,
      amount: totalDues,
      paymentFlow: orderRequestBody.paymentFlow,
    });

    // For /checkout/v2/sdk/order, we use Authorization header (not X-VERIFY)
    // X-VERIFY is only for /pg/v1/pay endpoint (which doesn't exist)

    let orderResponse;
    try {
      // Use Authorization header (not X-VERIFY) for /checkout/v2/sdk/order
      // This is the same format that works on web
      orderResponse = await axios.post(
        orderUrl,
        orderRequestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `O-Bearer ${authToken}`,
            'Accept': 'application/json',
          },
          timeout: 10000,
          validateStatus: (status) => status < 600,
        }
      );
    } catch (requestError) {
      console.error('❌ PhonePe order request failed:', {
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

    // Check for error response
    if (orderResponse.status !== 200 && orderResponse.status !== 201) {
      const errorData = orderResponse.data || {};
      console.error('❌ PhonePe order creation failed:', {
        status: orderResponse.status,
        error: errorData.message || errorData.error || 'Unknown error',
        fullResponse: JSON.stringify(errorData, null, 2),
      });
      
      return res.status(500).json({
        success: false,
        error: errorData.message || errorData.error || 'Failed to create payment order',
        code: errorData.code || 'ORDER_CREATION_FAILED',
      });
    }

    const orderData = orderResponse.data?.data || orderResponse.data;
    
    // PhonePe /checkout/v2/sdk/order response format for PAY_PAGE flow
    // Check for redirectInfo or direct URL in response (same as web version)
    let paymentUrl = null;
    let phonepeOrderId = merchantOrderId;
    
    // Log full response to see what PhonePe returns
    console.log('📋 PhonePe order response structure:', {
      hasData: !!orderData,
      dataKeys: orderData ? Object.keys(orderData) : null,
      fullResponse: JSON.stringify(orderResponse.data, null, 2).substring(0, 500),
    });
    
    if (orderData?.instrumentResponse?.redirectInfo?.url) {
      // Standard redirect response format (most common)
      paymentUrl = orderData.instrumentResponse.redirectInfo.url;
      phonepeOrderId = orderData.orderId || merchantOrderId;
      console.log('✅ Found redirect URL in instrumentResponse.redirectInfo.url');
    } else if (orderData?.redirectInfo?.url) {
      // Alternative format: redirectInfo directly in orderData
      paymentUrl = orderData.redirectInfo.url;
      phonepeOrderId = orderData.orderId || merchantOrderId;
      console.log('✅ Found redirect URL in redirectInfo.url');
    } else if (orderData?.redirectUrl) {
      // Direct redirect URL in response
      paymentUrl = orderData.redirectUrl;
      phonepeOrderId = orderData.orderId || merchantOrderId;
      console.log('✅ Found redirect URL in redirectUrl');
    } else if (orderData?.url) {
      // URL directly in response
      paymentUrl = orderData.url;
      phonepeOrderId = orderData.orderId || merchantOrderId;
      console.log('✅ Found redirect URL in url');
    } else if (orderData?.orderToken) {
      // If we get orderToken instead of redirect URL, construct payment URL
      // PhonePe web payment URL format: https://mercury-uat.phonepe.com/v4/pay?token={orderToken}
      // For production: https://mercury.phonepe.com/v4/pay?token={orderToken}
      const isProduction = process.env.PHONEPE_ENV !== 'sandbox';
      const baseUrl = isProduction 
        ? 'https://mercury.phonepe.com' 
        : 'https://mercury-uat.phonepe.com';
      paymentUrl = `${baseUrl}/v4/pay?token=${orderData.orderToken}`;
      phonepeOrderId = orderData.orderId || merchantOrderId;
      console.log('✅ Constructed payment URL from orderToken');
    } else {
      console.error('❌ PhonePe order response missing payment URL:', {
        fullResponse: JSON.stringify(orderResponse.data, null, 2),
        orderDataKeys: orderData ? Object.keys(orderData) : null,
      });
      throw new Error('Failed to create order: missing payment URL in response. Check logs for full response structure.');
    }
    
    console.log('✅ PhonePe order created (WebView redirect):', {
      orderId: phonepeOrderId,
      merchantOrderId,
      hasPaymentUrl: !!paymentUrl,
      paymentUrl: paymentUrl || '(not provided)',
    });

    // Log full response for debugging
    console.log('📋 Full PhonePe order response:', JSON.stringify(orderData, null, 2));
    
    const responsePayload = {
      success: true,
      merchantOrderId,
      orderId: phonepeOrderId,
      paymentUrl: paymentUrl, // PhonePe redirect URL for WebView
      amount: totalDues,
      message: 'Payment order created successfully',
    };

    console.log('📤 Sending response to frontend (PhonePe WebView):', {
      orderId: phonepeOrderId,
      merchantOrderId,
      paymentUrl: paymentUrl ? paymentUrl.substring(0, 100) + '...' : '(not provided)',
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
    const authToken = await getAuthToken();

    if (!credentials.merchantId) {
      return res.status(500).json({
        success: false,
        error: 'PhonePe credentials not configured',
      });
    }

    // PhonePe order status endpoint
    const endpoint = `/checkout/v2/order/${merchantOrderId}/status`;
    const fullUrl = `${config.API_URL}${endpoint}`;

    console.log('🔍 Checking PhonePe order status:', {
      merchantOrderId,
      endpoint: fullUrl,
    });

    // Check order status
    let statusResponse;
    try {
      statusResponse = await axios.get(fullUrl, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `O-Bearer ${authToken}`,
          'Accept': 'application/json',
        },
        timeout: 10000,
        validateStatus: (status) => status < 500,
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

    const responseData = statusResponse.data?.data || statusResponse.data;

    // PhonePe order status response format
    // Check if it's an error response
    if (responseData.status === 'ERROR' || responseData.message) {
      return res.status(500).json({
        success: false,
        code: responseData.code || 'UNKNOWN_ERROR',
        error: responseData.message || 'Failed to get order status',
        data: responseData.data || {},
      });
    }

    // PhonePe order status: COMPLETED, PENDING, FAILED, etc.
    const orderStatus = responseData.state || responseData.status; // COMPLETED, PENDING, FAILED
    const orderId = responseData.orderId || responseData.order_id;
    const orderAmount = responseData.amount ? responseData.amount / 100 : null; // Convert from paise to rupees
    const transactionId = responseData.transactionId || responseData.transaction_id;
    
    // Map PhonePe status to our status
    const isSuccess = orderStatus === 'COMPLETED' || orderStatus === 'PAYMENT_SUCCESS';
    const isPending = orderStatus === 'PENDING' || orderStatus === 'PAYMENT_PENDING';
    const isFailed = orderStatus === 'FAILED' || orderStatus === 'PAYMENT_ERROR' || orderStatus === 'PAYMENT_DECLINED';

    res.json({
      success: true,
      orderId,
      state: orderStatus,
      amount: orderAmount,
      transactionId: transactionId || null,
      isSuccess,
      isPending,
      isFailed,
      paymentDetails: responseData.paymentDetails || responseData.payment_details || [],
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
 * Cashfree Payment Return Handler
 * GET /api/payment/return
 * Handles payment return from Cashfree (redirects to deep link for mobile app)
 */
router.get('/return', async (req, res) => {
  try {
    const { orderId } = req.query;
    
    if (!orderId) {
      return res.status(400).send('Order ID is required');
    }
    
    // Redirect to deep link for mobile app
    // The WebView will detect this and handle it
    const deepLinkUrl = `people-app://payment/callback?orderId=${orderId}`;
    
    // Return HTML that attempts to open deep link and shows fallback
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Processing</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: #f5f5f5;
            }
            .container {
              text-align: center;
              padding: 20px;
            }
            .success {
              color: #4CAF50;
              font-size: 24px;
              margin-bottom: 10px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success">✓ Payment Processing</div>
            <p>Redirecting to app...</p>
            <script>
              // Try to open deep link
              window.location.href = '${deepLinkUrl}';
              
              // Fallback: If deep link doesn't work, show message
              setTimeout(function() {
                document.body.innerHTML = '<div class="container"><div class="success">✓ Payment Successful</div><p>You can close this window and return to the app.</p></div>';
              }, 2000);
            </script>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('❌ Error handling payment return:', error);
    res.status(500).send('Error processing payment return');
  }
});

/**
 * Cashfree Webhook Handler
 * POST /api/payment/webhook
 * 
 * Handles Cashfree webhook events for payment status updates
 * Cashfree sends webhook when payment status changes
 */
router.post('/webhook', async (req, res) => {
  try {
    // Cashfree webhook data
    const webhookData = req.body;
    
    console.log('📥 Cashfree Webhook Received:', {
      type: webhookData.type,
      orderId: webhookData.data?.order?.order_id,
      orderStatus: webhookData.data?.order?.order_status,
      paymentStatus: webhookData.data?.payment?.payment_status,
    });

    // Cashfree webhook structure: { type, data: { order: {...}, payment: {...} } }
    if (!webhookData.type || !webhookData.data) {
      console.error('❌ Invalid Cashfree webhook format');
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid webhook format' 
      });
    }

    // Handle payment status updates
    const orderData = webhookData.data?.order;
    const paymentData = webhookData.data?.payment;

    if (orderData && paymentData) {
      const orderStatus = orderData.order_status;
      const paymentStatus = paymentData.payment_status;
      const orderId = orderData.order_id;

      // If payment is successful, process dues
      if (orderStatus === 'PAID' && paymentStatus === 'SUCCESS') {
        await handleCashfreeOrderCompleted({
          merchantOrderId: orderId,
          amount: orderData.order_amount,
        });
      } else if (paymentStatus === 'FAILED' || orderStatus === 'EXPIRED') {
        console.log('❌ Payment failed or expired:', {
          orderId,
          orderStatus,
          paymentStatus,
        });
      }
    }

    // Always return success to Cashfree (200 OK)
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Error processing Cashfree webhook:', {
      error: error.message,
      stack: error.stack,
      body: req.body,
    });
    // Still return 200 to prevent Cashfree from retrying
    res.status(200).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * Handle Cashfree Order Completed Event
 */
const handleCashfreeOrderCompleted = async (payload) => {
  try {
    const { merchantOrderId, amount } = payload;

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

      console.log(`✅ Cashfree order completed - Dues payment processed:`, {
        freelancerId,
        merchantOrderId,
        amount: amount || null,
        transactionsUpdated: updateResult.modifiedCount,
      });
    } else {
      console.warn('⚠️ Invalid merchant order ID format:', merchantOrderId);
    }
  } catch (error) {
    console.error('❌ Error handling Cashfree order completed:', error);
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

