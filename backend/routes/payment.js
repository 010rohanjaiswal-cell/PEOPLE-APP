/**
 * Payment Routes - PhonePe React Native SDK Integration
 * Handles PhonePe payment gateway integration for commission dues payment
 * Uses React Native SDK flow (SDK orders with orderToken)
 */

const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const { authenticate } = require('../middleware/auth');
const CommissionTransaction = require('../models/CommissionTransaction');
const User = require('../models/User');

const router = express.Router();

// ============================================================================
// PHONEPE CONFIGURATION
// ============================================================================

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

// In-memory cache for PhonePe OAuth token
let cachedAuthToken = null;
let cachedAuthTokenExpiresAt = null;

const getAuthToken = async () => {
  try {
    // Return cached token if still valid (with 5 minute buffer)
    if (cachedAuthToken && cachedAuthTokenExpiresAt && Date.now() < cachedAuthTokenExpiresAt - 5 * 60 * 1000) {
      return cachedAuthToken;
    }

    const credentials = getPhonePeCredentials();
    const config = getConfig();

    if (!credentials.clientId || !credentials.clientSecret) {
      throw new Error('PhonePe credentials not configured');
    }

    // Get OAuth token
    const authResponse = await axios.post(
      config.AUTH_URL,
      {
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        grant_type: 'client_credentials',
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        timeout: 10000,
      }
    );

    if (authResponse.status !== 200 || !authResponse.data?.access_token) {
      throw new Error('Failed to get PhonePe auth token');
    }

    const { access_token, expires_in } = authResponse.data;

    // Cache token
    cachedAuthToken = access_token;
    cachedAuthTokenExpiresAt = Date.now() + (expires_in * 1000);

    return access_token;
  } catch (error) {
    console.error('Error getting PhonePe auth token:', error);
    throw error;
  }
};

// ============================================================================
// PAYMENT ROUTES
// ============================================================================

/**
 * Create PhonePe SDK order for dues payment
 * POST /api/payment/create-dues-order
 * Requires authentication as freelancer
 * 
 * For React Native SDK flow:
 * 1. Backend creates SDK order using /checkout/v2/sdk/order
 * 2. Backend returns orderToken and orderId
 * 3. Mobile app uses PhonePe.startTransaction(orderToken, orderId, ...)
 */
router.post('/create-dues-order', authenticate, async (req, res) => {
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

    const credentials = getPhonePeCredentials();
    const config = getConfig();

    if (!credentials.merchantId || !credentials.clientId || !credentials.clientSecret) {
      return res.status(500).json({
        success: false,
        error: 'PhonePe credentials not configured',
      });
    }

    // Generate merchant order ID (max 63 chars for PhonePe)
    const merchantOrderId = `DUES_${freelancerId.toString()}_${Date.now()}`.substring(0, 63);

    // Get OAuth token
    const authToken = await getAuthToken();

    // PhonePe SDK Order Request Body
    // For React Native SDK, we need to create an SDK order that returns orderToken
    // Minimal request format for SDK orders (removed fields that might cause 500 error)
    const orderRequestBody = {
      merchantId: credentials.merchantId,
      merchantOrderId: merchantOrderId,
      amount: totalDues * 100, // Amount in paise
      expireAfter: 1200, // Order expiry in seconds (20 minutes)
      redirectUrl: `${process.env.BACKEND_URL || 'https://freelancing-platform-backend-backup.onrender.com'}/api/payment/return?orderId=${merchantOrderId}`,
      callbackUrl: `${process.env.BACKEND_URL || 'https://freelancing-platform-backend-backup.onrender.com'}/api/payment/webhook`,
      paymentFlow: {
        type: 'SDK', // SDK flow for React Native SDK
      },
      // NOTE: Removed merchantUserId, redirectMode, and paymentInstrument
      // These fields might be causing the 500 error for SDK orders
    };

    // Add mobileNumber if available (optional field)
    if (user.phone && user.phone.trim().length > 0) {
      orderRequestBody.mobileNumber = user.phone.trim();
    }

    // PhonePe SDK Order endpoint
    const orderEndpoint = '/checkout/v2/sdk/order';
    const orderUrl = `${config.API_URL}${orderEndpoint}`;

    // Log complete request body for debugging
    console.log('📤 Creating PhonePe SDK order (React Native SDK):', {
      endpoint: orderUrl,
      merchantOrderId,
      amount: totalDues,
      amountInPaise: totalDues * 100,
    });
    
    console.log('📋 Complete PhonePe SDK order request body:', JSON.stringify(orderRequestBody, null, 2));
    console.log('📋 Request headers:', {
      'Content-Type': 'application/json',
      'Authorization': `O-Bearer ${authToken ? authToken.substring(0, 20) + '...' : 'missing'}`,
      'Accept': 'application/json',
    });

    let orderResponse;
    try {
      // PhonePe API requires explicit JSON string and Content-Type header
      // Ensure the request body is properly formatted
      orderResponse = await axios.post(
        orderUrl,
        JSON.stringify(orderRequestBody), // Explicitly stringify the body
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
      console.error('❌ PhonePe SDK order request failed:', {
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
      console.error('❌ PhonePe SDK order creation failed:', {
        status: orderResponse.status,
        statusText: orderResponse.statusText,
        error: errorData.message || errorData.error || 'Unknown error',
        code: errorData.code,
        fullResponse: JSON.stringify(errorData, null, 2),
        requestBody: JSON.stringify(orderRequestBody, null, 2),
      });
      
      // Return the exact error from PhonePe
      return res.status(orderResponse.status).json({
        success: false,
        error: errorData.message || errorData.error || 'Failed to create payment order',
        code: errorData.code || 'ORDER_CREATION_FAILED',
        debug: process.env.NODE_ENV === 'development' ? {
          phonepeResponse: errorData,
          requestBody: orderRequestBody,
        } : undefined,
      });
    }

    const orderData = orderResponse.data?.data || orderResponse.data;
    
    // PhonePe SDK order response should contain orderToken and orderId
    // These are required for React Native SDK startTransaction
    let orderToken = null;
    let phonepeOrderId = merchantOrderId;
    
    console.log('📋 PhonePe SDK order response structure:', {
      hasData: !!orderData,
      dataKeys: orderData ? Object.keys(orderData) : null,
      fullResponse: JSON.stringify(orderResponse.data, null, 2),
    });
    
    // Extract orderToken and orderId from response
    if (orderData?.orderToken) {
      orderToken = orderData.orderToken;
      phonepeOrderId = orderData.orderId || merchantOrderId;
      console.log('✅ Found orderToken in SDK order response');
    } else if (orderData?.instrumentResponse?.orderToken) {
      orderToken = orderData.instrumentResponse.orderToken;
      phonepeOrderId = orderData.orderId || merchantOrderId;
      console.log('✅ Found orderToken in instrumentResponse');
    } else {
      console.error('❌ PhonePe SDK order response missing orderToken:', {
        fullResponse: JSON.stringify(orderResponse.data, null, 2),
        orderDataKeys: orderData ? Object.keys(orderData) : null,
      });
      throw new Error('Failed to create SDK order: missing orderToken in response. Check logs for full response structure.');
    }
    
    console.log('✅ PhonePe SDK order created:', {
      orderId: phonepeOrderId,
      merchantOrderId,
      hasOrderToken: !!orderToken,
      orderTokenLength: orderToken?.length || 0,
    });

    // Return orderToken and orderId for React Native SDK
    const responsePayload = {
      success: true,
      merchantOrderId,
      orderId: phonepeOrderId,
      orderToken: orderToken, // Required for React Native SDK startTransaction
      merchantId: credentials.merchantId, // Required for React Native SDK request body
      amount: totalDues,
      message: 'Payment order created successfully',
    };

    console.log('📤 Sending response to frontend (PhonePe React Native SDK):', {
      orderId: phonepeOrderId,
      merchantOrderId,
      hasOrderToken: !!orderToken,
    });

    res.json(responsePayload);
  } catch (error) {
    console.error('Error creating PhonePe SDK order:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    res.status(500).json({
      success: false,
      error: error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to create payment order',
      debug: process.env.NODE_ENV === 'development' ? {
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
      
      console.log('📥 Order status response:', {
        status: statusResponse.status,
        statusText: statusResponse.statusText,
        dataPreview: JSON.stringify(statusResponse.data).substring(0, 200),
      });
    } catch (statusError) {
      console.error('❌ Error checking order status:', {
        message: statusError.message,
        response: statusError.response?.data,
      });
      throw statusError;
    }

    if (statusResponse.status !== 200) {
      const errorData = statusResponse.data || {};
      return res.status(statusResponse.status).json({
        success: false,
        error: errorData.message || errorData.error || 'Failed to check order status',
        code: errorData.code || 'STATUS_CHECK_FAILED',
      });
    }

    const statusData = statusResponse.data?.data || statusResponse.data;
    const orderStatus = statusData?.status || statusData?.orderStatus || 'UNKNOWN';
    const paymentStatus = statusData?.paymentStatus || statusData?.payment?.status || 'UNKNOWN';

    // Determine if payment is successful
    const isSuccess = orderStatus === 'PAYMENT_SUCCESS' || 
                     orderStatus === 'SUCCESS' ||
                     paymentStatus === 'SUCCESS' ||
                     paymentStatus === 'PAYMENT_SUCCESS';

    res.json({
      success: true,
      orderStatus,
      paymentStatus,
      isSuccess,
      data: statusData,
    });
  } catch (error) {
    console.error('Error checking order status:', error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to check order status',
    });
  }
});

/**
 * Payment Return Handler
 * GET /api/payment/return
 * Handles payment return from PhonePe (redirects to deep link for mobile app)
 */
router.get('/return', async (req, res) => {
  try {
    const { orderId } = req.query;
    
    if (!orderId) {
      return res.status(400).send('Order ID is required');
    }
    
    // Redirect to deep link for mobile app
    const deepLinkUrl = `people-app://payment/callback?orderId=${orderId}`;
    
    // Return HTML that redirects to deep link
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
    console.error('Error in payment return handler:', error);
    res.status(500).send('Error processing payment return');
  }
});

/**
 * Webhook Handler
 * POST /api/payment/webhook
 * Handles PhonePe webhook events for payment status updates
 */
router.post('/webhook', async (req, res) => {
  try {
    const webhookData = req.body;
    
    console.log('📥 PhonePe Webhook Received:', {
      type: webhookData.type,
      orderId: webhookData.data?.order?.merchantOrderId,
      orderStatus: webhookData.data?.order?.status,
      paymentStatus: webhookData.data?.payment?.status,
    });

    // PhonePe webhook structure: { type, data: { order: {...}, payment: {...} } }
    if (!webhookData.type || !webhookData.data) {
      console.error('❌ Invalid PhonePe webhook format');
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid webhook format' 
      });
    }

    // Handle payment status updates
    const orderData = webhookData.data?.order;
    const paymentData = webhookData.data?.payment;

    if (orderData && paymentData) {
      const orderStatus = orderData.status;
      const paymentStatus = paymentData.status;
      const merchantOrderId = orderData.merchantOrderId;

      // If payment is successful, process dues
      if (orderStatus === 'PAYMENT_SUCCESS' && paymentStatus === 'SUCCESS') {
        await handlePhonePeOrderCompleted({
          merchantOrderId: merchantOrderId,
          amount: orderData.amount / 100, // Convert from paise to rupees
        });
      } else if (paymentStatus === 'FAILED' || orderStatus === 'PAYMENT_ERROR') {
        console.log('❌ Payment failed:', {
          merchantOrderId,
          orderStatus,
          paymentStatus,
        });
      }
    }

    // Always return success to PhonePe (200 OK)
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Error processing PhonePe webhook:', {
      error: error.message,
      stack: error.stack,
      body: req.body,
    });
    // Still return 200 to prevent PhonePe from retrying
    res.status(200).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * Handle PhonePe Order Completed Event
 */
const handlePhonePeOrderCompleted = async (payload) => {
  try {
    const { merchantOrderId, amount } = payload;

    // Extract freelancer ID from merchantOrderId (format: DUES_{freelancerId}_{timestamp})
    const match = merchantOrderId.match(/^DUES_([^_]+)_/);
    if (!match) {
      console.error('❌ Invalid merchantOrderId format:', merchantOrderId);
      return;
    }

    const freelancerId = match[1];

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

    console.log(`✅ PhonePe order completed - Dues payment processed:`, {
      merchantOrderId,
      freelancerId,
      amount,
    });
  } catch (error) {
    console.error('❌ Error handling PhonePe order completed:', error);
  }
};

/**
 * Process dues payment after successful payment
 * POST /api/payment/process-dues/:merchantOrderId
 * Requires authentication as freelancer
 */
router.post('/process-dues/:merchantOrderId', authenticate, async (req, res) => {
  try {
    const { merchantOrderId } = req.params;
    const user = req.user;

    if (!user || user.role !== 'freelancer') {
      return res.status(403).json({
        success: false,
        error: 'Only freelancers can process dues payments',
      });
    }

    const freelancerId = user._id || user.id;

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

    // Get updated wallet data
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
      wallet: {
        totalDues,
        canWork,
        transactions: mappedTransactions,
      },
      message: 'Dues payment processed successfully',
    });
  } catch (error) {
    console.error('Error processing dues payment:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process dues payment',
    });
  }
});

module.exports = router;
