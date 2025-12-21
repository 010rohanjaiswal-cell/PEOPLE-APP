/**
 * PhonePe SDK Configuration
 * Initializes PhonePe React Native SDK for native payment flow
 */

import PhonePe from 'react-native-phonepe-pg';
import { Platform } from 'react-native';

// PhonePe Merchant Configuration
// These should match your backend environment variables
const PHONEPE_CONFIG = {
  merchantId: 'M23OKIGC1N363', // From environment or backend
  environment: 'PRODUCTION', // 'PRODUCTION' or 'SANDBOX'
};

/**
 * Initialize PhonePe SDK
 * Call this once when app starts (e.g., in App.js)
 * PhonePe React Native SDK init signature: init(environment, merchantId, flowId, enableLogging)
 * 
 * @param {string} flowId - An alphanumeric string without special characters. 
 *   Acts as a common ID between app user journey and PhonePe SDK.
 *   Recommended: Pass user-specific information or merchant user Id to track the journey.
 * 
 * Production Requirements:
 * - environment: PRODUCTION
 * - merchantId: Production MID
 * - enableLogging: false (must be false in production)
 */
export const initializePhonePe = async (flowId = null) => {
  try {
    // PhonePe React Native SDK init requires: environment, merchantId, flowId, enableLogging
    // flowId: An alphanumeric string for tracking user journey (recommended: user ID)
    const isProduction = PHONEPE_CONFIG.environment === 'PRODUCTION';
    const enableLogging = !isProduction; // false for production, true for sandbox
    
    // Generate flowId if not provided (use timestamp + random for uniqueness)
    const generatedFlowId = flowId || `flow_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    const result = await PhonePe.init(
      PHONEPE_CONFIG.environment, // 'PRODUCTION' or 'SANDBOX'
      PHONEPE_CONFIG.merchantId,    // Merchant ID
      generatedFlowId,              // flowId: alphanumeric string for tracking
      enableLogging                 // false in production, true in sandbox
    );
    console.log('✅ PhonePe SDK initialized:', {
      environment: PHONEPE_CONFIG.environment,
      merchantId: PHONEPE_CONFIG.merchantId,
      flowId: generatedFlowId,
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
 * Start PhonePe transaction using React Native SDK
 * 
 * For React Native SDK, we use SDK Order flow:
 * 1. Backend creates SDK order using /checkout/v2/sdk/order
 * 2. Backend returns orderToken and orderId
 * 3. Construct request body as JSON string
 * 4. SDK uses request body string to start transaction
 * 
 * PhonePe React Native SDK startTransaction signature: 
 * startTransaction(request: string, appSchema: string | null)
 * 
 * Request body format:
 * {
 *   "orderId": <orderId>,
 *   "merchantId": <merchantId>,
 *   "token": <token>,
 *   "paymentMode": {
 *     "type": "PAY_PAGE"
 *   }
 * }
 * 
 * @param {Object} params - Transaction parameters
 * @param {string} params.orderToken - Order token from SDK order (REQUIRED)
 * @param {string} params.orderId - Order ID from SDK order (REQUIRED)
 * @param {string} params.merchantId - Merchant ID (REQUIRED)
 * @param {string} params.appSchema - App scheme for deep linking (optional, defaults to 'people-app')
 * @returns {Promise} Promise that resolves with transaction result
 * 
 * Response format:
 * {
 *   status: String, // "SUCCESS", "FAILURE", "INTERRUPTED"
 *   error: String   // if any error occurs
 * }
 */
export const startPhonePeTransaction = async (params) => {
  try {
    const {
      orderToken,     // Order token from SDK order (REQUIRED)
      orderId,        // Order ID from SDK order (REQUIRED)
      merchantId,     // Merchant ID (REQUIRED)
      appSchema = 'people-app', // App scheme for deep linking (optional, not needed for Android)
    } = params;

    if (!orderToken) {
      throw new Error('Order token is required for PhonePe SDK transaction');
    }

    if (!orderId) {
      throw new Error('Order ID is required for PhonePe SDK transaction');
    }

    if (!merchantId) {
      throw new Error('Merchant ID is required for PhonePe SDK transaction');
    }

    // Verify SDK method exists
    if (!PhonePe || !PhonePe.startTransaction || typeof PhonePe.startTransaction !== 'function') {
      throw new Error('PhonePe.startTransaction method not available. SDK may not be properly initialized. Please ensure PhonePe SDK is initialized before starting a transaction.');
    }

    // Construct request body as per React Native SDK documentation
    // Ensure all values are strings (orderId, merchantId, token)
    const requestBody = {
      orderId: String(orderId).trim(),
      merchantId: String(merchantId).trim(),
      token: String(orderToken).trim(),
      paymentMode: {
        type: 'PAY_PAGE', // For Standard Checkout
      },
    };

    // Validate all required fields are present and non-empty
    if (!requestBody.orderId || !requestBody.merchantId || !requestBody.token) {
      throw new Error('Missing required fields in PhonePe transaction request. orderId, merchantId, and token are required.');
    }

    // Convert to JSON string (required by SDK)
    // Use JSON.stringify without spaces to ensure consistent format
    const requestBodyString = JSON.stringify(requestBody);
    
    // Validate JSON string is valid
    try {
      JSON.parse(requestBodyString);
    } catch (jsonError) {
      throw new Error(`Invalid JSON format for PhonePe transaction request: ${jsonError.message}`);
    }

    console.log('🚀 Starting PhonePe React Native SDK transaction:', {
      orderId,
      merchantId,
      tokenLength: orderToken?.length || 0,
      appSchema,
      requestBody: requestBodyString,
    });

    console.log('📞 Calling PhonePe.startTransaction...');
    
    try {
      // Validate request body string is not empty
      if (!requestBodyString || typeof requestBodyString !== 'string') {
        throw new Error('Invalid request body: must be a non-empty JSON string');
      }
      
      console.log('📱 Platform:', Platform.OS);
      console.log('📱 Request body string type:', typeof requestBodyString);
      console.log('📱 Request body string length:', requestBodyString?.length);
      console.log('📱 Request body preview:', requestBodyString.substring(0, 200));
      
      // React Native SDK signature: startTransaction(request: string, appSchema: string | null)
      // For Android: Some versions may not accept null, try empty string or omit parameter
      // For iOS: appSchema is required
      let response;
      
      if (Platform.OS === 'android') {
        // For Android, try calling with empty string first
        // If that fails, the native module might need null or no second parameter
        console.log('📱 Calling PhonePe.startTransaction for Android with empty string...');
        try {
          response = await PhonePe.startTransaction(requestBodyString, '');
        } catch (androidError) {
          console.log('⚠️ Android call with empty string failed, trying with null...');
          // Try with null if empty string doesn't work
          response = await PhonePe.startTransaction(requestBodyString, null);
        }
      } else {
        // For iOS, appSchema is required
        console.log('📱 Calling PhonePe.startTransaction for iOS with appSchema:', appSchema);
        response = await PhonePe.startTransaction(requestBodyString, appSchema);
      }
      
      console.log('✅ PhonePe SDK transaction response:', response);
      console.log('Response type:', typeof response);
      console.log('Response keys:', response ? Object.keys(response) : 'null');
      
      // Handle different response formats
      if (response && typeof response === 'object') {
        // Check if response has status field
        if (response.status) {
          return response;
        }
        // If response doesn't have status, it might be the payment flow is starting
        // Return a default response indicating the flow has started
        return {
          status: 'PENDING',
          message: 'Payment flow initiated',
        };
      }
      
      // If response is not an object, return it as-is
      return response;
    } catch (sdkError) {
      console.error('❌ PhonePe SDK startTransaction error:', sdkError);
      console.error('Error type:', typeof sdkError);
      console.error('Error message:', sdkError?.message);
      console.error('Error code:', sdkError?.code);
      console.error('Error stringified:', JSON.stringify(sdkError, Object.getOwnPropertyNames(sdkError), 2));
      
      // Check if SDK returns error in response instead of throwing
      if (sdkError && typeof sdkError === 'object') {
        // PhonePe SDK might return error with status field
        if (sdkError.status === 'FAILURE' || sdkError.status === 'INTERRUPTED') {
          return sdkError; // Return the error response instead of throwing
        }
        if (sdkError.error || sdkError.message) {
          throw new Error(sdkError.error || sdkError.message || 'PhonePe SDK transaction failed');
        }
      }
      
      // Re-throw if it's a real error
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

