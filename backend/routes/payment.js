/**
 * Payment Routes - PhonePe Node.js SDK Integration
 * Handles PhonePe payment gateway integration for commission dues payment
 * Uses PhonePe official Node.js SDK (v2.0.3)
 */

const express = require('express');
const { StandardCheckoutClient, Env, CreateSdkOrderRequest } = require('pg-sdk-node');
const { authenticate } = require('../middleware/auth');
const CommissionTransaction = require('../models/CommissionTransaction');
const User = require('../models/User');
const crypto = require('crypto');

const router = express.Router();

// ============================================================================
// PHONEPE SDK INITIALIZATION
// ============================================================================

// Initialize PhonePe SDK client (singleton - can only be initialized once)
let phonePeClient = null;

const getPhonePeClient = () => {
  if (!phonePeClient) {
    const clientId = process.env.PHONEPE_CLIENT_ID;
    const clientSecret = process.env.PHONEPE_CLIENT_SECRET;
    const clientVersion = parseInt(process.env.PHONEPE_CLIENT_VERSION || '1', 10);
    const env = process.env.PHONEPE_ENV === 'sandbox' ? Env.SANDBOX : Env.PRODUCTION;

    if (!clientId || !clientSecret) {
      throw new Error('PhonePe credentials not configured');
    }

    console.log('🔧 Initializing PhonePe Node.js SDK:', {
      clientId: clientId ? `${clientId.substring(0, 10)}...` : 'missing',
      clientVersion,
      env: env === Env.PRODUCTION ? 'PRODUCTION' : 'SANDBOX',
    });

    phonePeClient = StandardCheckoutClient.getInstance(
      clientId,
      clientSecret,
      clientVersion,
      env
    );

    console.log('✅ PhonePe Node.js SDK initialized successfully');
  }

  return phonePeClient;
};

// ============================================================================
// PAYMENT ROUTES
// ============================================================================

/**
 * Create PhonePe SDK order for dues payment
 * POST /api/payment/create-dues-order
 * Requires authentication as freelancer
 * 
 * Uses PhonePe Node.js SDK to create SDK order
 * Returns orderToken and orderId for React Native SDK
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

    // Generate merchant order ID (max 63 chars for PhonePe)
    const merchantOrderId = `DUES_${freelancerId.toString()}_${Date.now()}`.substring(0, 63);

    // Get PhonePe SDK client
    const client = getPhonePeClient();

    // Build SDK order request using PhonePe SDK
    // NOTE: For pure native SDK flow, redirectUrl is optional and can sometimes
    // cause CHECKOUT_ORDER_FAILED if it doesn't match PhonePe config exactly.
    // We'll omit redirectUrl here and rely on appSchema + callbackUrl/webhook.

    const sdkOrderRequest = CreateSdkOrderRequest.StandardCheckoutBuilder()
      .merchantOrderId(merchantOrderId)
      .amount(totalDues * 100) // Amount in paise
      .expireAfter(1200) // 20 minutes in seconds
      .build();

    console.log('📤 Creating PhonePe SDK order using Node.js SDK:', {
      merchantOrderId,
      amount: totalDues,
      amountInPaise: totalDues * 100,
      note: 'redirectUrl omitted for native SDK flow to avoid CHECKOUT_ORDER_FAILED',
    });

    // Create SDK order using PhonePe SDK
    const sdkOrderResponse = await client.createSdkOrder(sdkOrderRequest);

    console.log('✅ PhonePe SDK order created:', {
      orderId: sdkOrderResponse.orderId,
      merchantOrderId,
      state: sdkOrderResponse.state,
      hasToken: !!sdkOrderResponse.token,
      expireAt: sdkOrderResponse.expireAt,
    });

    // Generate checksum for React Native SDK startTransaction
    // PhonePe checksum format: SHA256(base64(request body) + salt key + /pg/v1/pay)
    // For SDK orders, the request body will be: {orderId, merchantId, token, paymentMode: {type: "PAY_PAGE"}}
    const sdkRequestBody = {
      orderId: sdkOrderResponse.orderId,
      merchantId: process.env.PHONEPE_MERCHANT_ID,
      token: sdkOrderResponse.token,
      paymentMode: {
        type: 'PAY_PAGE',
      },
    };
    const sdkRequestBodyString = JSON.stringify(sdkRequestBody);
    
    // Generate checksum for React Native SDK startTransaction
    // Matching sample app approach - calculate checksum from the JSON string that will be sent to SDK
    // The SDK might handle base64 encoding internally, so checksum should match the JSON string format
    const saltKey = process.env.PHONEPE_CLIENT_SECRET;
    
    // Try Format: SHA256(base64(JSON) + salt) - Standard PhonePe format
    // Base64 encode the JSON string for checksum calculation
    const base64RequestBody = Buffer.from(sdkRequestBodyString).toString('base64');
    
    // Standard PhonePe checksum: SHA256(base64(body) + salt)
    let checkSum = crypto.createHash('sha256').update(base64RequestBody + saltKey).digest('hex');
    
    // Alternative formats to try if Format 1 doesn't work:
    // Format 2: SHA256(base64(body) + salt) - Base64 first, then salt (current)
    // Format 3: SHA256(base64(body) + salt + endpoint) - With endpoint
    // Format 4: SHA256(body + salt) - Without base64 encoding
    
    console.log('🔐 Generated checksum for SDK transaction:', {
      requestBody: sdkRequestBodyString,
      requestBodyLength: sdkRequestBodyString.length,
      base64RequestBody: base64RequestBody,
      base64Length: base64RequestBody.length,
      checkSumLength: checkSum.length,
      checkSum: checkSum,
      format: 'SHA256(base64(body) + salt) - Standard PhonePe format',
      saltKeyLength: saltKey?.length || 0,
      saltKeyPreview: saltKey ? saltKey.substring(0, 10) + '...' : 'missing',
      note: 'Standard PhonePe checksum format: base64(body) + salt',
    });

    // Return orderToken, orderId, and checkSum for React Native SDK
    const responsePayload = {
      success: true,
      merchantOrderId,
      orderId: sdkOrderResponse.orderId,
      orderToken: sdkOrderResponse.token, // Required for React Native SDK startTransaction
      merchantId: process.env.PHONEPE_MERCHANT_ID, // Required for React Native SDK request body
      checkSum: checkSum, // Required for React Native SDK startTransaction
      amount: totalDues,
      message: 'Payment order created successfully',
    };

    console.log('📤 Sending response to frontend (PhonePe React Native SDK):', {
      orderId: sdkOrderResponse.orderId,
      merchantOrderId,
      hasOrderToken: !!sdkOrderResponse.token,
    });

    res.json(responsePayload);
  } catch (error) {
    console.error('Error creating PhonePe SDK order:', {
      message: error.message,
      code: error.code,
      status: error.status,
      data: error.data,
    });

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create payment order',
      code: error.code || 'ORDER_CREATION_FAILED',
      debug: process.env.NODE_ENV === 'development' ? {
        errorDetails: {
          message: error.message,
          code: error.code,
          status: error.status,
          data: error.data,
        },
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

    // Get PhonePe SDK client
    const client = getPhonePeClient();

    console.log('🔍 Checking PhonePe order status:', {
      merchantOrderId,
    });

    // Check order status using PhonePe SDK
    const statusResponse = await client.getOrderStatus(merchantOrderId);

    console.log('📥 Order status response:', {
      orderId: statusResponse.order_id,
      state: statusResponse.state,
      amount: statusResponse.amount,
    });

    // Determine if payment is successful
    const isSuccess = statusResponse.state === 'COMPLETED';
    const isFailed = statusResponse.state === 'FAILED';
    const isPending = statusResponse.state === 'PENDING';

    res.json({
      success: true,
      orderStatus: statusResponse.state,
      paymentStatus: statusResponse.state,
      isSuccess,
      isFailed,
      isPending,
      orderId: statusResponse.order_id,
      amount: statusResponse.amount,
      expireAt: statusResponse.expire_at,
      paymentDetails: statusResponse.payment_details || [],
    });
  } catch (error) {
    console.error('Error checking order status:', {
      message: error.message,
      code: error.code,
      status: error.status,
    });

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to check order status',
      code: error.code || 'STATUS_CHECK_FAILED',
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
    const authHeader = req.headers.authorization;

    // Log full webhook payload for debugging (safe on backend only)
    console.log('📥 PhonePe Webhook Received (raw):', JSON.stringify(webhookData, null, 2));

    console.log('📥 PhonePe Webhook Summary:', {
      type: webhookData.type,
      orderId: webhookData.data?.order?.merchantOrderId,
      orderStatus: webhookData.data?.order?.state,
      paymentStatus: webhookData.data?.payment?.state,
      errorCode: webhookData.data?.errorCode || webhookData.errorCode,
      errorMessage: webhookData.data?.errorMessage || webhookData.errorMessage,
    });

    // Get PhonePe SDK client for webhook validation
    const client = getPhonePeClient();
    const webhookUsername = process.env.PHONEPE_WEBHOOK_USERNAME;
    const webhookPassword = process.env.PHONEPE_WEBHOOK_PASSWORD;

    // Validate webhook using PhonePe SDK
    if (webhookUsername && webhookPassword && authHeader) {
      try {
        const callbackResponse = client.validateCallback(
          webhookUsername,
          webhookPassword,
          authHeader,
          JSON.stringify(webhookData)
        );

        if (!callbackResponse.isValid) {
          console.error('❌ Invalid PhonePe webhook - validation failed');
          return res.status(401).json({ 
            success: false, 
            error: 'Invalid webhook signature' 
          });
        }

        console.log('✅ PhonePe webhook validated successfully');
      } catch (validationError) {
        console.error('❌ Error validating webhook:', validationError);
        // Continue processing even if validation fails (for development)
      }
    }

    // Handle payment status updates
    const orderData = webhookData.data?.order;
    const paymentData = webhookData.data?.payment;

    if (orderData && paymentData) {
      const orderStatus = orderData.state;
      const paymentStatus = paymentData.state;
      const merchantOrderId = orderData.merchantOrderId;

      // If payment is successful, process dues
      if (orderStatus === 'COMPLETED' && paymentStatus === 'COMPLETED') {
        await handlePhonePeOrderCompleted({
          merchantOrderId: merchantOrderId,
          amount: orderData.amount / 100, // Convert from paise to rupees
        });
      } else if (paymentStatus === 'FAILED' || orderStatus === 'FAILED') {
        console.log('❌ Payment failed:', {
          merchantOrderId,
          orderStatus,
          paymentStatus,
        });
      }
    } else if (webhookData.type === 'CHECKOUT_ORDER_FAILED') {
      // Special handling: checkout failed before an order/payment object was created
      console.error('❌ PhonePe Checkout Order Failed:', {
        type: webhookData.type,
        raw: webhookData,
      });
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
