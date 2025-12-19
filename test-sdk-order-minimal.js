const axios = require('axios');

// Test with MINIMAL request - only fields from PhonePe sample
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'YOUR_AUTH_TOKEN_HERE';
const MERCHANT_ORDER_ID = process.env.MERCHANT_ORDER_ID || 'DUES_TEST_' + Date.now();
const MERCHANT_ID = 'M23OKIGC1N363';
const PHONEPE_API_URL = 'https://api.phonepe.com/apis/pg';

const requestHeaders = {
  "Content-Type": "application/json",
  "Authorization": `O-Bearer ${AUTH_TOKEN}`
};

// MINIMAL REQUEST - Only fields from PhonePe sample
const requestBody = {
  "merchantOrderId": MERCHANT_ORDER_ID,
  "amount": 100,
  "expireAfter": 1200,
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
  },
  "paymentFlow": {
    "type": "SDK" // Changed from PG_CHECKOUT to SDK
  }
};

// Test 2: With merchantId (might be required)
const requestBodyWithMerchantId = {
  "merchantId": MERCHANT_ID,
  "merchantOrderId": MERCHANT_ORDER_ID,
  "amount": 100,
  "expireAfter": 1200,
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
  },
  "paymentFlow": {
    "type": "SDK"
  }
};

const options = {
  method: 'POST',
  url: `${PHONEPE_API_URL}/checkout/v2/sdk/order`,
  headers: requestHeaders,
  data: requestBodyWithMerchantId // Try with merchantId first
};

console.log('==========================================');
console.log('Testing MINIMAL PhonePe SDK Order Request');
console.log('==========================================');
console.log('');
console.log('Request URL:', options.url);
console.log('Merchant ID:', MERCHANT_ID);
console.log('Merchant Order ID:', MERCHANT_ORDER_ID);
console.log('Auth Token:', AUTH_TOKEN ? `${AUTH_TOKEN.substring(0, 20)}...` : 'NOT SET');
console.log('');
console.log('Request Body (MINIMAL - only PhonePe sample fields + merchantId):');
console.log(JSON.stringify(requestBodyWithMerchantId, null, 2));
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
    } else {
      console.log('Error:', error.message);
    }
  });

