const axios = require('axios');

const AUTH_TOKEN = process.env.AUTH_TOKEN || 'YOUR_AUTH_TOKEN_HERE';
const MERCHANT_ORDER_ID = process.env.MERCHANT_ORDER_ID || 'DUES_TEST_' + Date.now();
const MERCHANT_ID = 'M23OKIGC1N363';
const BACKEND_URL = 'https://freelancing-platform-backend-backup.onrender.com';
const PHONEPE_API_URL = 'https://api.phonepe.com/apis/pg';

const requestHeaders = {
  "Content-Type": "application/json",
  "Authorization": `O-Bearer ${AUTH_TOKEN}`
};

// Test variations - removing empty metaInfo or fixing it
const variations = [
  {
    name: "Test 1: SDK with NO metaInfo (remove if empty)",
    body: {
      "merchantId": MERCHANT_ID,
      "merchantOrderId": MERCHANT_ORDER_ID,
      "amount": 100,
      "expireAfter": 1200,
      "paymentFlow": {
        "type": "SDK"
      }
    }
  },
  {
    name: "Test 2: SDK with redirectUrl and callbackUrl (required for SDK?)",
    body: {
      "merchantId": MERCHANT_ID,
      "merchantOrderId": MERCHANT_ORDER_ID,
      "amount": 100,
      "expireAfter": 1200,
      "redirectUrl": `people-app://payment/callback?orderId=${MERCHANT_ORDER_ID}`,
      "callbackUrl": `${BACKEND_URL}/api/payment/webhook`,
      "paymentFlow": {
        "type": "SDK"
      }
    }
  },
  {
    name: "Test 3: SDK with redirectUrl, callbackUrl, and paymentInstrument",
    body: {
      "merchantId": MERCHANT_ID,
      "merchantOrderId": MERCHANT_ORDER_ID,
      "amount": 100,
      "expireAfter": 1200,
      "redirectUrl": `people-app://payment/callback?orderId=${MERCHANT_ORDER_ID}`,
      "callbackUrl": `${BACKEND_URL}/api/payment/webhook`,
      "paymentFlow": {
        "type": "SDK"
      },
      "paymentInstrument": {
        "type": "UPI_INTENT"
      }
    }
  },
  {
    name: "Test 4: SDK with only udf1-10 (no udf11-15 to avoid validation error)",
    body: {
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
        "udf10": ""
      },
      "paymentFlow": {
        "type": "SDK"
      }
    }
  }
];

async function testVariation(variation, index) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${variation.name}`);
  console.log('='.repeat(60));
  console.log('Request Body:');
  console.log(JSON.stringify(variation.body, null, 2));
  console.log('');
  
  try {
    const response = await axios.post(
      `${PHONEPE_API_URL}/checkout/v2/sdk/order`,
      variation.body,
      {
        headers: requestHeaders,
        validateStatus: () => true
      }
    );
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log('Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.status === 200 || response.status === 201) {
      const orderToken = response.data?.data?.orderToken || response.data?.orderToken;
      if (orderToken) {
        console.log('\n🎉🎉🎉 SUCCESS! Order Token received! 🎉🎉🎉');
        console.log('Order Token:', orderToken);
        console.log('Order ID:', response.data?.data?.orderId || response.data?.orderId);
        return true;
      }
    } else if (response.status === 400) {
      console.log('\n⚠️ 400 Bad Request - Format issue, but request is being processed');
    } else if (response.status === 500) {
      console.log('\n❌ 500 Error - Server issue');
    }
    
    return false;
  } catch (error) {
    console.log(`Error: ${error.response?.status || 'ERROR'}`);
    console.log('Details:', error.response?.data || error.message);
    return false;
  }
}

async function runTests() {
  console.log('==========================================');
  console.log('Testing SDK Order with Fixed Format');
  console.log('==========================================');
  console.log('Merchant ID:', MERCHANT_ID);
  console.log('Merchant Order ID:', MERCHANT_ORDER_ID);
  console.log('Auth Token:', AUTH_TOKEN ? `${AUTH_TOKEN.substring(0, 20)}...` : 'NOT SET');
  
  for (let i = 0; i < variations.length; i++) {
    const success = await testVariation(variations[i], i);
    if (success) {
      console.log('\n✅✅✅ FOUND WORKING FORMAT! ✅✅✅');
      break;
    }
    // Wait between requests
    if (i < variations.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('All tests completed');
  console.log('='.repeat(60));
}

runTests().catch(console.error);

