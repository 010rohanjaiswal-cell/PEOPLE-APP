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
  // Environment URLs
  SANDBOX: {
    AUTH_URL: 'https://api-preprod.phonepe.com/apis/identity-manager/v1/oauth/token',
    API_URL: 'https://api-preprod.phonepe.com/apis/pg-sandbox',
  },
  PRODUCTION: {
    AUTH_URL: 'https://api.phonepe.com/apis/identity-manager/v1/oauth/token',
    API_URL: 'https://api.phonepe.com/apis/pg',
  },
};

// Get environment config
const getConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  return isProduction ? PHONEPE_CONFIG.PRODUCTION : PHONEPE_CONFIG.SANDBOX;
};

// Get PhonePe credentials from environment
const getPhonePeCredentials = () => {
  return {
    merchantId: process.env.PHONEPE_MERCHANT_ID,
    clientId: process.env.PHONEPE_CLIENT_ID,
    clientSecret: process.env.PHONEPE_CLIENT_SECRET,
    saltKey: process.env.PHONEPE_SALT_KEY || process.env.PHONEPE_CLIENT_SECRET, // Use client secret as salt if salt key not provided
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

// Get Authorization Token
const getAuthToken = async () => {
  try {
    const credentials = getPhonePeCredentials();
    const config = getConfig();

    // PhonePe OAuth requires application/x-www-form-urlencoded format
    const params = new URLSearchParams();
    params.append('client_id', credentials.clientId);
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

    return response.data.access_token;
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

    // Create order payload
    const orderPayload = {
      merchantId: credentials.merchantId,
      merchantTransactionId: merchantOrderId,
      amount: totalDues * 100, // Amount in paise (multiply by 100)
      merchantUserId: freelancerId.toString(),
      redirectUrl: `${process.env.FRONTEND_URL || 'https://freelancing-platform-backend-backup.onrender.com'}/payment/callback?orderId=${merchantOrderId}`,
      redirectMode: 'REDIRECT',
      callbackUrl: `${process.env.BACKEND_URL || 'https://freelancing-platform-backend-backup.onrender.com'}/api/payment/webhook`,
      mobileNumber: user.phone || '',
      paymentInstrument: {
        type: 'PAY_PAGE',
      },
    };

    // Convert payload to base64
    const base64Payload = Buffer.from(JSON.stringify(orderPayload)).toString('base64');

    // Generate X-VERIFY header
    // Use /pg/v1/pay for standard web-based payments
    const endpoint = '/pg/v1/pay';
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

    // PhonePe returns payment URL in different formats depending on endpoint
    // For /pg/v1/pay: responseData.data.instrumentResponse.redirectInfo.url
    let paymentUrl = null;

    if (responseData.success && responseData.data) {
      // Try different response structures
      if (responseData.data.instrumentResponse?.redirectInfo?.url) {
        paymentUrl = responseData.data.instrumentResponse.redirectInfo.url;
      } else if (responseData.data.url) {
        paymentUrl = responseData.data.url;
      } else if (responseData.data.instrumentResponse?.url) {
        paymentUrl = responseData.data.instrumentResponse.url;
      } else if (responseData.data.instrumentResponse?.redirectInfo?.redirectUrl) {
        paymentUrl = responseData.data.instrumentResponse.redirectInfo.redirectUrl;
      }
    }

    if (!paymentUrl) {
      console.error('PhonePe Order Response:', JSON.stringify(responseData, null, 2));
      return res.status(500).json({
        success: false,
        error: 'Payment URL not received from PhonePe',
        debug: responseData,
      });
    }

    // Store merchant order ID temporarily (you might want to store this in DB)
    // For now, we'll return it and the frontend will poll for status

    res.json({
      success: true,
      merchantOrderId,
      paymentUrl,
      amount: totalDues,
      message: 'Payment order created successfully',
    });
  } catch (error) {
    console.error('Error creating PhonePe order:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
      endpoint: `${config.API_URL}/pg/v1/pay`,
    });
    res.status(500).json({
      success: false,
      error: error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to create payment order',
      debug: process.env.NODE_ENV === 'development' ? {
        endpoint: `${config.API_URL}/pg/v1/pay`,
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
    // Use /pg/v1/status/{merchantId}/{merchantTransactionId} format
    const endpoint = `/pg/v1/status/${credentials.merchantId}/${merchantOrderId}`;
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
    const endpoint = `/pg/v1/status/${credentials.merchantId}/${merchantOrderId}`;
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

