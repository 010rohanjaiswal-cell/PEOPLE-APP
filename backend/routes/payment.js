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
      throw new Error('PhonePe auth response missing access_token');
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

    cachedAuthToken = accessToken;
    cachedAuthTokenExpiresAt = expiresAtMs;

    return accessToken;
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

    return res.json({
      success: true,
      // Show only a preview of the token for safety
      tokenPreview: token ? `${token.slice(0, 8)}...` : null,
      // Expose expiry info so we can verify caching logic
      expiresAt: cachedAuthTokenExpiresAt,
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

    // Get auth token
    const authToken = await getAuthToken();

    // Generate merchant order ID
    const merchantOrderId = `DUES_${freelancerId.toString()}_${Date.now()}`;

    // Create order payload for SDK
    // For SDK endpoint, use UPI_INTENT payment instrument type
    const orderPayload = {
      merchantId: credentials.merchantId,
      merchantTransactionId: merchantOrderId,
      amount: totalDues * 100, // Amount in paise (multiply by 100)
      merchantUserId: freelancerId.toString(),
      redirectUrl: `people-app://payment/callback?orderId=${merchantOrderId}`, // Deep link for app callback
      redirectMode: 'REDIRECT',
      callbackUrl: `${process.env.BACKEND_URL || 'https://freelancing-platform-backend-backup.onrender.com'}/api/payment/webhook`,
      mobileNumber: user.phone || '',
      paymentInstrument: {
        type: 'UPI_INTENT', // UPI_INTENT for native SDK (not PAY_PAGE)
      },
    };

    // Convert payload to base64
    const base64Payload = Buffer.from(JSON.stringify(orderPayload)).toString('base64');

    // Generate X-VERIFY header
    // For native SDK payments (React Native/Android/iOS), use /checkout/v2/sdk/order endpoint
    // This endpoint returns an order token that the SDK uses to launch native checkout
    const endpoint = '/checkout/v2/sdk/order';
    const xVerify = generateXVerify(base64Payload, endpoint);

    // Create order via PhonePe API
    const orderResponse = await axios.post(
      `${config.API_URL}${endpoint}`,
      {
        request: base64Payload,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'X-VERIFY': xVerify,
          'X-MERCHANT-ID': credentials.merchantId,
        },
      }
    );

    const responseData = orderResponse.data;

    // For SDK endpoint (/checkout/v2/sdk/order), PhonePe returns:
    // - orderToken: Token to pass to SDK (in redirectInfo.url or token field)
    // - orderId: Order ID for status checks
    // - paymentUrl: May also be present for fallback
    let orderToken = null;
    let orderId = null;
    let paymentUrl = null;

    if (responseData.success && responseData.data) {
      // SDK endpoint response structure
      if (responseData.data.instrumentResponse?.redirectInfo?.url) {
        // Order token is in the URL or response
        const url = responseData.data.instrumentResponse.redirectInfo.url;
        // Extract order token from URL or use the full URL
        if (url.includes('token=')) {
          orderToken = url.split('token=')[1]?.split('&')[0] || url;
        } else {
          orderToken = url;
        }
      } else if (responseData.data.instrumentResponse?.redirectInfo?.redirectUrl) {
        const redirectUrl = responseData.data.instrumentResponse.redirectInfo.redirectUrl;
        if (redirectUrl.includes('token=')) {
          orderToken = redirectUrl.split('token=')[1]?.split('&')[0] || redirectUrl;
        } else {
          orderToken = redirectUrl;
        }
      } else if (responseData.data.token) {
        // Direct token in response
        orderToken = responseData.data.token;
      } else if (responseData.data.instrumentResponse?.token) {
        orderToken = responseData.data.instrumentResponse.token;
      } else if (responseData.data.url) {
        // Fallback: use URL if token not found
        paymentUrl = responseData.data.url;
      }

      // Get order ID from response
      orderId = responseData.data.orderId || merchantOrderId;
    }

    if (!orderToken && !paymentUrl) {
      console.error('PhonePe SDK Order Response:', JSON.stringify(responseData, null, 2));
      return res.status(500).json({
        success: false,
        error: 'Order token or payment URL not received from PhonePe',
        debug: responseData,
      });
    }

    // Return order token for SDK and order ID for status checks
    res.json({
      success: true,
      merchantOrderId,
      orderId: orderId || merchantOrderId,
      orderToken: orderToken || null, // Token for SDK
      paymentUrl: paymentUrl || null, // Fallback URL if token not available
      amount: totalDues,
      message: 'Payment order created successfully',
    });
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
    const authToken = await getAuthToken();

    // Generate X-VERIFY for status check
    // For SDK orders, use /checkout/v2/order/{merchantOrderId}/status
    const endpoint = `/checkout/v2/order/${merchantOrderId}/status`;
    const xVerify = generateXVerify('', endpoint);

    // Check order status
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

    const responseData = statusResponse.data;

    if (responseData.success && responseData.data) {
      const orderData = responseData.data;
      const code = orderData.code;
      const transactionId = orderData.transactionId;

      // Check if payment is successful
      const isSuccess = code === 'PAYMENT_SUCCESS' || code === 'PAYMENT_PENDING';

      res.json({
        success: true,
        orderStatus: code,
        transactionId,
        isSuccess: code === 'PAYMENT_SUCCESS',
        isPending: code === 'PAYMENT_PENDING',
        isFailed: code === 'PAYMENT_ERROR' || code === 'PAYMENT_DECLINED',
        data: orderData,
      });
    } else {
      res.json({
        success: false,
        orderStatus: 'UNKNOWN',
        message: responseData.message || 'Failed to get order status',
      });
    }
  } catch (error) {
    console.error('Error checking order status:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.message || error.message || 'Failed to check order status',
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

