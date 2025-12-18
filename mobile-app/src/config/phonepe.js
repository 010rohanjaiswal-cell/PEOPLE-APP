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
 * 
 * Production Requirements (per PhonePe Go Live guide):
 * - environment: PRODUCTION
 * - merchantId: Production MID
 * - enableLogging: false (must be false in production)
 */
export const initializePhonePe = async () => {
  try {
    // PhonePe SDK init requires: environment, merchantId, appId (optional), enableLogging
    // Per PhonePe Go Live guide: enableLogging must be false in production
    const isProduction = PHONEPE_CONFIG.environment === 'PRODUCTION';
    const enableLogging = !isProduction; // false for production, true for sandbox
    
    const result = await PhonePe.init(
      PHONEPE_CONFIG.environment, // 'PRODUCTION' or 'SANDBOX'
      PHONEPE_CONFIG.merchantId,    // Merchant ID
      null,                         // appId (optional, can be null)
      enableLogging                 // false in production, true in sandbox (per Go Live guide)
    );
    console.log('✅ PhonePe SDK initialized:', {
      environment: PHONEPE_CONFIG.environment,
      merchantId: PHONEPE_CONFIG.merchantId,
      enableLogging,
    });
    return true;
  } catch (error) {
    console.error('❌ Error initializing PhonePe SDK:', error);
    // Don't throw - allow app to continue even if SDK init fails
    // Payment will fallback to web browser flow
    return false;
  }
};

/**
 * Start PhonePe transaction using SDK (SDK Order flow)
 * 
 * For React Native SDK, we use SDK Order flow:
 * 1. Backend creates SDK order using /checkout/v2/sdk/order
 * 2. Backend returns orderToken and orderId
 * 3. SDK uses orderToken and orderId to start transaction
 * 
 * PhonePe React Native SDK startTransaction signature: 
 * startTransaction(orderToken, orderId, packageName, appSchema)
 * 
 * @param {Object} params - Transaction parameters
 * @param {string} params.orderToken - Order token from SDK order (REQUIRED)
 * @param {string} params.orderId - Order ID from SDK order (REQUIRED)
 * @param {string} params.packageName - Package name for Android (optional)
 * @param {string} params.appSchema - App scheme for deep linking (optional, defaults to 'people-app')
 * @returns {Promise} Promise that resolves with transaction result
 */
export const startPhonePeTransaction = async (params) => {
  try {
    const {
      orderToken,     // Order token from SDK order (REQUIRED)
      orderId,        // Order ID from SDK order (REQUIRED)
      packageName = null, // Optional: Android package name
      appSchema = 'people-app', // App scheme for deep linking
    } = params;

    if (!orderToken) {
      throw new Error('Order token is required for PhonePe SDK transaction');
    }

    if (!orderId) {
      throw new Error('Order ID is required for PhonePe SDK transaction');
    }

    // Verify SDK method exists
    if (!PhonePe.startTransaction || typeof PhonePe.startTransaction !== 'function') {
      throw new Error('PhonePe.startTransaction method not available. SDK may not be properly initialized.');
    }

    // SDK Order flow: Use orderToken and orderId
    // The SDK's startTransaction method signature is: startTransaction(orderToken, orderId, packageName, appSchema)
    console.log('🚀 Starting PhonePe SDK transaction:', {
      orderToken: orderToken ? `${orderToken.substring(0, 20)}...` : null,
      orderId,
      packageName,
      appSchema,
    });

    console.log('📞 Calling PhonePe.startTransaction (SDK Order)...');
    console.log('Parameters:', {
      orderTokenLength: orderToken?.length || 0,
      orderId,
      packageName: packageName || 'null',
      appSchema,
    });
    
    try {
      const response = await PhonePe.startTransaction(
        orderToken,    // Order token from SDK order
        orderId,       // Order ID from SDK order
        packageName,   // Optional package name
        appSchema      // App scheme for deep linking
      );
      
      console.log('✅ PhonePe SDK transaction response:', response);
      return response;
    } catch (sdkError) {
      console.error('❌ PhonePe SDK startTransaction error:', sdkError);
      console.error('Error type:', typeof sdkError);
      console.error('Error stringified:', JSON.stringify(sdkError, Object.getOwnPropertyNames(sdkError), 2));
      
      // Check if SDK returns error in response instead of throwing
      if (sdkError && typeof sdkError === 'object') {
        if (sdkError.success === false || sdkError.error) {
          throw new Error(sdkError.error || sdkError.message || 'PhonePe SDK transaction failed');
        }
      }
      
      throw sdkError;
    }
  } catch (error) {
    console.error('❌ PhonePe transaction error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      params: params,
    });
    throw error;
  }
};

export default PhonePe;

