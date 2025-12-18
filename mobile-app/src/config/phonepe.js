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
    // Enable logging to debug SDK issues
    const result = await PhonePe.init(
      PHONEPE_CONFIG.environment, // 'PRODUCTION' or 'SANDBOX'
      PHONEPE_CONFIG.merchantId,    // Merchant ID
      null,                         // appId (optional, can be null)
      true                          // enableLogging: true for debugging (set to false in production)
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
 * Start PhonePe transaction using SDK (B2C PG flow)
 * 
 * For B2C PG, we use SDK order flow:
 * 1. Backend creates SDK order using /checkout/v2/sdk/order
 * 2. Backend returns orderToken and orderId
 * 3. SDK uses orderToken to start transaction
 * 
 * PhonePe React Native SDK startTransaction signature: 
 * startTransaction(base64Body, checksum, packageName, appSchema)
 * 
 * For B2C SDK orders, we need to create a base64Body containing the orderToken.
 * The SDK still expects base64Body and checksum format.
 * 
 * @param {Object} params - Transaction parameters
 * @param {string} params.orderToken - Order token from B2C SDK order (REQUIRED for B2C)
 * @param {string} params.orderId - Order ID from B2C SDK order (REQUIRED for B2C)
 * @param {string} params.base64Body - Base64 encoded body (for B2B PG or direct B2C)
 * @param {string} params.checksum - Checksum (for B2B PG or direct B2C)
 * @param {string} params.packageName - Package name for Android (optional)
 * @param {string} params.appSchema - App scheme for deep linking (optional, defaults to 'people-app')
 * @returns {Promise} Promise that resolves with transaction result
 */
export const startPhonePeTransaction = async (params) => {
  try {
    const {
      orderToken,     // Order token from B2C SDK order
      orderId,        // Order ID from B2C SDK order
      base64Body,    // Base64 encoded body (B2B PG or direct B2C)
      checksum,      // Checksum (B2B PG or direct B2C)
      packageName = null, // Optional: Android package name
      appSchema = 'people-app', // App scheme for deep linking
    } = params;

    // Verify SDK method exists
    if (!PhonePe.startTransaction || typeof PhonePe.startTransaction !== 'function') {
      throw new Error('PhonePe.startTransaction method not available. SDK may not be properly initialized.');
    }

    // B2C PG flow: Use base64Body and checksum (React Native SDK always expects this format)
    // The SDK's startTransaction method signature is: startTransaction(base64Body, checksum, packageName, appSchema)
    // For B2C PG, we use /pg/v1/pay endpoint with base64Body and checksum
    if (base64Body && checksum) {
      console.log('🚀 Starting PhonePe B2C PG transaction:', {
        base64BodyLength: base64Body.length,
        checksum: checksum.substring(0, 20) + '...',
        packageName,
        appSchema,
      });

      console.log('📞 Calling PhonePe.startTransaction (B2C PG)...');
      console.log('Parameters:', {
        base64BodyLength: base64Body.length,
        checksumLength: checksum.length,
        packageName: packageName || 'null',
        appSchema,
      });
      
      try {
        const response = await PhonePe.startTransaction(
          base64Body,    // Base64 encoded body
          checksum,      // Checksum
          packageName,   // Optional package name
          appSchema      // App scheme for deep linking
        );
        
        console.log('✅ PhonePe B2C PG transaction response:', response);
        return response;
      } catch (sdkError) {
        console.error('❌ PhonePe SDK startTransaction error (B2C PG):', sdkError);
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
    } else {
      throw new Error('base64Body and checksum are required for PhonePe B2C PG SDK transaction');
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

