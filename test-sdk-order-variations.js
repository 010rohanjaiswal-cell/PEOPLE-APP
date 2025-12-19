const axios = require('axios');

const AUTH_TOKEN = process.env.AUTH_TOKEN || 'YOUR_AUTH_TOKEN_HERE';
const MERCHANT_ORDER_ID = process.env.MERCHANT_ORDER_ID || 'DUES_TEST_' + Date.now();
const MERCHANT_ID = 'M23OKIGC1N363';
const PHONEPE_API_URL = 'https://api.phonepe.com/apis/pg';

const requestHeaders = {
  "Content-Type": "application/json",
  "Authorization": `O-Bearer ${AUTH_TOKEN}`
};

// Test different variations
const variations = [
  {
    name: "Variation 1: Exact PhonePe Sample (no merchantId, no metaInfo)",
    body: {
      "merchantOrderId": MERCHANT_ORDER_ID,
      "amount": 100,
      "expireAfter": 1200,
      "paymentFlow": {
        "type": "SDK"
      }
    }
  },
  {
    name: "Variation 2: With merchantId, no metaInfo",
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
    name: "Variation 3: With merchantId and metaInfo (empty)",
    body: {
      "merchantId": MERCHANT_ID,
      "merchantOrderId": MERCHANT_ORDER_ID,
      "amount": 100,
      "expireAfter": 1200,
      "metaInfo": {},
      "paymentFlow": {
        "type": "SDK"
      }
    }
  },
  {
    name: "Variation 4: With merchantId and metaInfo (all fields)",
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
    }
  },
  {
    name: "Variation 5: Try PG_CHECKOUT type (from PhonePe sample)",
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
        "udf10": "",
        "udf11": "",
        "udf12": "",
        "udf13": "",
        "udf14": "",
        "udf15": ""
      },
      "paymentFlow": {
        "type": "PG_CHECKOUT"
      }
    }
  }
];

async function testVariation(variation, index) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TEST ${index + 1}: ${variation.name}`);
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
        console.log('\n🎉 SUCCESS! Order Token received!');
        console.log('Order Token:', orderToken);
        return true; // Success found
      }
    }
    
    return false;
  } catch (error) {
    console.log(`Status: ${error.response?.status || 'ERROR'}`);
    console.log('Error:', error.response?.data || error.message);
    return false;
  }
}

async function runTests() {
  console.log('==========================================');
  console.log('Testing Multiple Request Variations');
  console.log('==========================================');
  console.log('Merchant ID:', MERCHANT_ID);
  console.log('Merchant Order ID:', MERCHANT_ORDER_ID);
  console.log('Auth Token:', AUTH_TOKEN ? `${AUTH_TOKEN.substring(0, 20)}...` : 'NOT SET');
  
  for (let i = 0; i < variations.length; i++) {
    const success = await testVariation(variations[i], i);
    if (success) {
      console.log('\n✅ Found working variation!');
      break;
    }
    // Wait a bit between requests
    if (i < variations.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('All variations tested');
  console.log('='.repeat(60));
}

runTests().catch(console.error);

