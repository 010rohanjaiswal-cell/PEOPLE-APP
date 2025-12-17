/**
 * PhonePe Authorization Test Script
 * Tests both Sandbox and Production endpoints
 */

const axios = require('axios');

const credentials = {
  clientId: 'SU2509171240249286269937',
  clientSecret: 'd74141aa-8762-4d1b-bfa1-dfe2a094d310',
};

// Test Sandbox
async function testSandbox() {
  console.log('\n🧪 Testing Sandbox Environment...');
  console.log('URL: https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token\n');
  
  const params = new URLSearchParams();
  params.append('client_id', credentials.clientId);
  params.append('client_version', '1');
  params.append('client_secret', credentials.clientSecret);
  params.append('grant_type', 'client_credentials');

  try {
    const response = await axios.post(
      'https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token',
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    console.log('✅ Sandbox Success:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Sandbox Error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    return false;
  }
}

// Test Production
async function testProduction() {
  console.log('\n🧪 Testing Production Environment...');
  console.log('URL: https://api.phonepe.com/apis/identity-manager/v1/oauth/token\n');
  
  const params = new URLSearchParams();
  params.append('client_id', credentials.clientId);
  params.append('client_version', '1');
  params.append('client_secret', credentials.clientSecret);
  params.append('grant_type', 'client_credentials');

  try {
    const response = await axios.post(
      'https://api.phonepe.com/apis/identity-manager/v1/oauth/token',
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    console.log('✅ Production Success:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Production Error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    return false;
  }
}

// Run tests
(async () => {
  console.log('='.repeat(60));
  console.log('PhonePe Authorization Test');
  console.log('='.repeat(60));
  
  const sandboxResult = await testSandbox();
  const productionResult = await testProduction();
  
  console.log('\n' + '='.repeat(60));
  console.log('Test Results:');
  console.log('='.repeat(60));
  console.log(`Sandbox: ${sandboxResult ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Production: ${productionResult ? '✅ PASS' : '❌ FAIL'}`);
  
  if (!sandboxResult && !productionResult) {
    console.log('\n⚠️  Both environments failed. Possible issues:');
    console.log('1. Credentials are incorrect');
    console.log('2. API access not enabled in PhonePe Dashboard');
    console.log('3. Account not activated or suspended');
    console.log('4. Contact PhonePe support for assistance');
  } else if (sandboxResult) {
    console.log('\n✅ Use Sandbox environment (NODE_ENV != production)');
  } else if (productionResult) {
    console.log('\n✅ Use Production environment (NODE_ENV = production)');
  }
})();
