/**
 * PhonePe SDK Configuration
 * Initializes PhonePe React Native SDK for native payment flow
 */

import PhonePe from 'react-native-phonepe-pg';

// PhonePe Merchant Configuration
// These should match your backend environment variables
const PHONEPE_CONFIG = {
  merchantId: 'M23OKIGC1N363', // From environment or backend
  environment: 'PRODUCTION', // 'PRODUCTION' or 'SANDBOX'
};

/**
 * Initialize PhonePe SDK
 * Call this once when app starts (e.g., in App.js)
 * PhonePe SDK init signature: init(environment, merchantId, appId, enableLogging)
 */
export const initializePhonePe = async () => {
  try {
    // PhonePe SDK init requires: environment, merchantId, appId (optional), enableLogging
    const result = await PhonePe.init(
      PHONEPE_CONFIG.environment, // 'PRODUCTION' or 'SANDBOX'
      PHONEPE_CONFIG.merchantId,    // Merchant ID
      null,                         // appId (optional, can be null)
      false                         // enableLogging (set to true for debugging)
    );
    console.log('✅ PhonePe SDK initialized:', result);
    return true;
  } catch (error) {
    console.error('❌ Error initializing PhonePe SDK:', error);
    // Don't throw - allow app to continue even if SDK init fails
    // Payment will fallback to web browser flow
    return false;
  }
};

/**
 * Start PhonePe transaction using SDK
 * PhonePe SDK startTransaction signature: startTransaction(jsonString, appScheme)
 * @param {Object} params - Transaction parameters
 * @param {string} params.merchantTransactionId - Unique transaction ID
 * @param {number} params.amount - Amount in rupees (will be converted to paise)
 * @param {string} params.mobileNumber - User's mobile number
 * @param {string} params.redirectUrl - Deep link URL for callback
 * @param {string} params.callbackUrl - Backend webhook URL
 * @param {string} params.orderToken - Order token from backend (required)
 * @returns {Promise} Promise that resolves with transaction result
 */
export const startPhonePeTransaction = async (params) => {
  try {
    const {
      merchantTransactionId,
      amount,
      mobileNumber,
      redirectUrl,
      callbackUrl,
      orderToken,
    } = params;

    if (!orderToken) {
      throw new Error('Order token is required for PhonePe SDK transaction');
    }

    // PhonePe SDK expects payment request as JSON string
    // Based on PhonePe documentation: { orderId, merchantId, token, paymentMode: { type } }
    const paymentRequest = {
      orderId: merchantTransactionId,
      merchantId: PHONEPE_CONFIG.merchantId,
      token: orderToken, // Order token from backend
      paymentMode: {
        type: 'PAY_PAGE', // Payment mode type
      },
    };

    // App scheme for deep linking (from app.json)
    const appScheme = 'people-app';

    console.log('🚀 Starting PhonePe transaction:', {
      merchantTransactionId,
      amount,
      orderToken: orderToken.substring(0, 20) + '...', // Log partial token
    });

    // PhonePe SDK expects: startTransaction(JSON.stringify(paymentRequest), appScheme)
    const response = await PhonePe.startTransaction(
      JSON.stringify(paymentRequest),
      appScheme
    );
    
    console.log('✅ PhonePe transaction response:', response);
    return response;
  } catch (error) {
    console.error('❌ PhonePe transaction error:', error);
    throw error;
  }
};

export default PhonePe;

