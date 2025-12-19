const axios = require('axios');

// Get auth token and merchant order ID from environment or use test values
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'YOUR_AUTH_TOKEN_HERE';
const MERCHANT_ORDER_ID = process.env.MERCHANT_ORDER_ID || 'DUES_TEST_' + Date.now();
const MERCHANT_ID = 'M23OKIGC1N363';
const BACKEND_URL = 'https://freelancing-platform-backend-backup.onrender.com';

// Use PRODUCTION URL (not sandbox) since we have production credentials
const PHONEPE_API_URL = 'https://api.phonepe.com/apis/pg';

const requestHeaders = {
  "Content-Type": "application/json",
  "Authorization": `O-Bearer ${AUTH_TOKEN}`
};

const requestBody = {
  "merchantId": MERCHANT_ID,
  "merchantOrderId": MERCHANT_ORDER_ID,
  "amount": 100, // 1 rupee in paise
  "merchantUserId": "test_user",
  "redirectUrl": `people-app://payment/callback?orderId=${MERCHANT_ORDER_ID}`,
  "redirectMode": "REDIRECT",
  "callbackUrl": `${BACKEND_URL}/api/payment/webhook`,
  "paymentFlow": {
    "type": "SDK" // Required for SDK orders - using Object format as per PhonePe docs
  },
  "paymentInstrument": {
    "type": "UPI_INTENT" // SDK order uses UPI_INTENT
  },
  "expireAfter": 1200, // Order expiry in seconds (20 minutes) - included as per PhonePe sample
  "metaInfo": {
    "udf1": "",
    "udf2": "",
    "udf3": "",
    "udf4": "",
    "udf5": "",
    "udf6": "",
    "udf7": "",
    "udf8": "",
    "udf9": "",
    "udf10": "",
    "udf11": "",
    "udf12": "",
    "udf13": "",
    "udf14": "",
    "udf15": ""
  }
};

const options = {
  method: 'POST',
  url: `${PHONEPE_API_URL}/checkout/v2/sdk/order`,
  headers: requestHeaders,
  data: requestBody
};

console.log('==========================================');
console.log('Testing PhonePe SDK Order Creation');
console.log('==========================================');
console.log('');
console.log('Request URL:', options.url);
console.log('Merchant ID:', MERCHANT_ID);
console.log('Merchant Order ID:', MERCHANT_ORDER_ID);
console.log('Auth Token:', AUTH_TOKEN ? `${AUTH_TOKEN.substring(0, 20)}...` : 'NOT SET');
console.log('');
console.log('Request Body:');
console.log(JSON.stringify(requestBody, null, 2));
console.log('');
console.log('Making request...');
console.log('');

axios.request(options)
  .then(function (response) {
    console.log('==========================================');
    console.log('✅ SUCCESS - Response Received');
    console.log('==========================================');
    console.log('Status Code:', response.status);
    console.log('Status Text:', response.statusText);
    console.log('');
    console.log('Response Data:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('');
    
    // Check for orderToken
    const orderToken = response.data?.data?.orderToken || response.data?.orderToken;
    const orderId = response.data?.data?.orderId || response.data?.orderId;
    
    if (orderToken) {
      console.log('==========================================');
      console.log('🎉 ORDER TOKEN RECEIVED!');
      console.log('==========================================');
      console.log('Order Token:', orderToken);
      console.log('Order ID:', orderId);
      console.log('Merchant Order ID:', MERCHANT_ORDER_ID);
      console.log('');
      console.log('✅ SDK order creation is working!');
    } else {
      console.log('⚠️  Response successful but orderToken not found');
    }
  })
  .catch(function (error) {
    console.log('==========================================');
    console.log('❌ ERROR - Request Failed');
    console.log('==========================================');
    
    if (error.response) {
      console.log('Status Code:', error.response.status);
      console.log('Status Text:', error.response.statusText);
      console.log('');
      console.log('Error Response:');
      console.log(JSON.stringify(error.response.data, null, 2));
      console.log('');
      
      const errorCode = error.response.data?.code;
      const errorMessage = error.response.data?.message || error.response.data?.error;
      
      console.log('Error Code:', errorCode);
      console.log('Error Message:', errorMessage);
      console.log('');
      
      if (error.response.status === 500) {
        console.log('This 500 error indicates:');
        console.log('  - SDK orders may not be enabled for your merchant account');
        console.log('  - Contact PhonePe support to enable SDK orders');
        console.log('  - Merchant ID:', MERCHANT_ID);
      }
    } else if (error.request) {
      console.log('No response received from server');
      console.log('Request:', error.request);
    } else {
      console.log('Error:', error.message);
    }
    
    console.log('');
    console.log('Full Error:');
    console.error(error);
  });

