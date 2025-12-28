/**
 * Test Cashfree Order Creation
 * Run this to verify Cashfree API response and payment URL format
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Load .env file manually
const envPath = path.join(__dirname, 'backend', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

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

async function testCashfreeOrder() {
  try {
    const credentials = getCashfreeCredentials();
    const config = getCashfreeConfig();

    if (!credentials.clientId || !credentials.clientSecret) {
      console.error('❌ Missing Cashfree credentials in .env file');
      console.log('Required: CASHFREE_CLIENT_ID, CASHFREE_CLIENT_SECRET');
      return;
    }

    console.log('🧪 Testing Cashfree Order Creation...\n');
    console.log('Configuration:');
    console.log('  Environment:', process.env.CASHFREE_ENV || 'production');
    console.log('  API URL:', config.API_URL);
    console.log('  Client ID:', credentials.clientId.substring(0, 10) + '...');
    console.log('  API Version:', credentials.apiVersion);
    console.log('');

    // Create test order
    const merchantOrderId = `TEST_${Date.now()}`;
    const orderRequestBody = {
      order_id: merchantOrderId,
      order_amount: 1, // 1 rupee for testing
      order_currency: 'INR',
      customer_details: {
        customer_id: 'test_customer_123',
        customer_name: 'Test User',
        customer_email: 'test@example.com',
        customer_phone: '9999999999',
      },
      order_meta: {
        return_url: `${process.env.BACKEND_URL || 'https://freelancing-platform-backend-backup.onrender.com'}/api/payment/return?orderId=${merchantOrderId}`,
        notify_url: `${process.env.BACKEND_URL || 'https://freelancing-platform-backend-backup.onrender.com'}/api/payment/webhook`,
      },
    };

    const orderEndpoint = '/pg/orders';
    const orderUrl = `${config.API_URL}${orderEndpoint}`;

    console.log('📤 Creating order...');
    console.log('  Endpoint:', orderUrl);
    console.log('  Order ID:', merchantOrderId);
    console.log('  Amount: ₹1');
    console.log('');

    const orderResponse = await axios.post(
      orderUrl,
      orderRequestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': credentials.clientId,
          'x-client-secret': credentials.clientSecret,
          'x-api-version': credentials.apiVersion,
        },
        timeout: 10000,
        validateStatus: (status) => status < 600,
      }
    );

    console.log('📥 Response Status:', orderResponse.status);
    console.log('📥 Response Headers:', JSON.stringify(orderResponse.headers, null, 2));
    console.log('');

    if (orderResponse.status !== 200 && orderResponse.status !== 201) {
      console.error('❌ Order creation failed:');
      console.error(JSON.stringify(orderResponse.data, null, 2));
      return;
    }

    const orderData = orderResponse.data;
    console.log('✅ Order created successfully!');
    console.log('');
    console.log('📋 Full Response Data:');
    console.log(JSON.stringify(orderData, null, 2));
    console.log('');

    // Extract payment information
    const paymentSessionId = orderData.payment_session_id;
    const paymentLink = orderData.payment_link;
    const orderId = orderData.order_id;

    console.log('🔑 Payment Information:');
    console.log('  Order ID:', orderId);
    console.log('  Payment Session ID:', paymentSessionId);
    console.log('  Payment Link (from API):', paymentLink || '(not provided)');
    console.log('');

    // Test different URL formats
    console.log('🔗 Possible Payment URLs:');
    if (paymentLink) {
      console.log('  1. From API (payment_link):', paymentLink);
    }
    if (paymentSessionId) {
      console.log('  2. Constructed (paylink):', `https://www.cashfree.com/checkout/paylink/${paymentSessionId}`);
      console.log('  3. Constructed (checkout):', `https://www.cashfree.com/checkout/${paymentSessionId}`);
      console.log('  4. Constructed (payments):', `https://payments.cashfree.com/checkout/${paymentSessionId}`);
    }
    console.log('');

    // Test which URL works
    if (paymentLink) {
      console.log('✅ Use payment_link from API response:', paymentLink);
    } else if (paymentSessionId) {
      console.log('⚠️  payment_link not provided, try constructed URLs above');
      console.log('   Recommended: https://www.cashfree.com/checkout/paylink/' + paymentSessionId);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('  Status:', error.response.status);
      console.error('  Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the test
testCashfreeOrder();

