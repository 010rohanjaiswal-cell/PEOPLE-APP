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

    // For React Native SDK, we use B2C PG direct flow (not SDK order flow)
    // B2C PG endpoint: /pg/v1/pay
    // The SDK expects: startTransaction(base64Body, checksum, packageName, appSchema)
    // Build the B2C PG request body for SDK
    const b2cPgRequestBody = {
      merchantId: credentials.merchantId,
      merchantTransactionId: merchantOrderId,
      amount: totalDues * 100, // Amount in paise
      merchantUserId: freelancerId.toString(),
      redirectUrl: `people-app://payment/callback?orderId=${merchantOrderId}`,
      redirectMode: 'REDIRECT',
      callbackUrl: `${process.env.BACKEND_URL || 'https://freelancing-platform-backend-backup.onrender.com'}/api/payment/webhook`,
      mobileNumber: user.phone || '',
      paymentInstrument: {
        type: 'PAY_PAGE', // B2C PG uses PAY_PAGE for standard checkout
      },
    };

    // Base64 encode the body for SDK
    const base64Body = Buffer.from(JSON.stringify(b2cPgRequestBody)).toString('base64');

    // Generate checksum for B2C PG request (X-VERIFY format)
    // Checksum = SHA256(base64Body + /pg/v1/pay + saltKey) + ### + saltIndex
    const b2cPgEndpoint = '/pg/v1/pay';
    const checksum = generateXVerify(base64Body, b2cPgEndpoint);

    // Return base64Body and checksum for React Native SDK B2C PG flow
    const responsePayload = {
      success: true,
      merchantOrderId,
      orderId: merchantOrderId, // Use merchantOrderId as orderId for B2C PG flow
      // For React Native SDK B2C PG flow:
      base64Body: base64Body, // Base64 encoded request body
      checksum: checksum, // Checksum for SDK
      amount: totalDues,
      message: 'Payment order created successfully',
    };

    console.log('📤 Sending response to frontend (B2C PG):', {
      hasBase64Body: !!base64Body,
      hasChecksum: !!checksum,
      base64BodyLength: base64Body?.length || 0,
      checksumLength: checksum?.length || 0,
      merchantOrderId,
      endpoint: b2cPgEndpoint,
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

    // Order Status API for SDK flow:
    // GET /checkout/v2/order/{merchantOrderId}/status
    // Headers:
    //   - Content-Type: application/json
    //   - Authorization: O-Bearer <merchant-auth-token>
    // No X-VERIFY required for this endpoint as per latest docs
    const endpoint = `/checkout/v2/order/${merchantOrderId}/status`;
    const fullUrl = `${config.API_URL}${endpoint}`;
    
    // Build authorization header - ensure no extra spaces
    const authHeader = `O-Bearer ${authToken}`.trim();

    console.log('🔍 Checking order status:', {
      merchantOrderId,
      endpoint: fullUrl,
      hasToken: !!authToken,
      tokenLength: authToken?.length || 0,
      tokenPreview: authToken ? `${authToken.substring(0, 20)}...` : null,
      authHeaderPreview: authHeader.substring(0, 30) + '...',
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
          'Authorization': authHeader,
        },
        // Optional query params: details, errorContext
        params: {
          details: false,
          errorContext: false,
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
 * PhonePe Webhook Handler
 * POST /api/payment/webhook
 * This endpoint receives callbacks from PhonePe after payment
 */
router.post('/webhook', async (req, res) => {
  try {
    // PhonePe sends webhook as JSON
    const webhookData = req.body;
    const { merchantTransactionId, transactionId, code } = webhookData;

    console.log('PhonePe Webhook Received:', {
      merchantTransactionId,
      transactionId,
      code,
    });

    // Verify webhook (you should verify X-VERIFY header in production)
    // For now, we'll process if code is PAYMENT_SUCCESS

    if (code === 'PAYMENT_SUCCESS' && merchantTransactionId) {
      // Extract freelancer ID from merchant order ID (format: DUES_{freelancerId}_{timestamp})
      const parts = merchantTransactionId.split('_');
      if (parts.length >= 2 && parts[0] === 'DUES') {
        const freelancerId = parts[1];

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
              duesPaymentOrderId: merchantTransactionId,
            },
          }
        );

        console.log(`✅ Dues payment processed for freelancer: ${freelancerId}, Order: ${merchantTransactionId}`);
      }
    }

    // Always return success to PhonePe
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing PhonePe webhook:', error);
    // Still return success to prevent PhonePe from retrying
    res.status(200).json({ success: false, error: error.message });
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

