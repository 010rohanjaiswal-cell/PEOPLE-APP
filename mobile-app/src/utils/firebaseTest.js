/**
 * Firebase Test Utility - People App
 * Use this to test Firebase configuration
 */

import auth from '@react-native-firebase/auth';

/**
 * Test Firebase initialization
 */
export const testFirebaseInit = () => {
  try {
    const authInstance = auth();
    console.log('🔥 Firebase Auth Object:', authInstance);
    console.log('✅ Firebase initialized successfully!');
    return { success: true, auth: authInstance };
  } catch (error) {
    console.error('❌ Firebase initialization error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Test Firebase configuration values
 * Note: @react-native-firebase reads from google-services.json, not env vars
 */
export const testFirebaseConfig = () => {
  const config = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  };

  console.log('📋 Firebase Config Check (from .env):');
  console.log('API Key:', config.apiKey ? '✅ Set' : '❌ Missing');
  console.log('Auth Domain:', config.authDomain ? '✅ Set' : '❌ Missing');
  console.log('Project ID:', config.projectId ? '✅ Set' : '❌ Missing');
  console.log('Storage Bucket:', config.storageBucket ? '✅ Set' : '❌ Missing');
  console.log('Messaging Sender ID:', config.messagingSenderId ? '✅ Set' : '❌ Missing');
  console.log('App ID:', config.appId ? '✅ Set' : '❌ Missing');
  console.log('⚠️  Note: @react-native-firebase reads from google-services.json, not .env');

  const allSet = Object.values(config).every(value => value && value !== 'undefined');
  
  if (allSet) {
    console.log('✅ All Firebase config values are set in .env!');
    console.log('⚠️  Make sure google-services.json is in android/app/');
  } else {
    console.log('❌ Some Firebase config values are missing in .env!');
    console.log('Make sure your .env file exists and has all required values.');
  }

  return { config, allSet };
};

/**
 * Test Phone Authentication setup
 * Note: This requires Phone Auth to be enabled in Firebase Console
 */
export const testPhoneAuthSetup = async (phoneNumber) => {
  try {
    console.log('📱 Testing Phone Auth with:', phoneNumber);
    
    // Check if auth is initialized
    const authInstance = auth();
    if (!authInstance) {
      throw new Error('Firebase Auth not initialized');
    }

    console.log('✅ Firebase Auth is ready');
    console.log('⚠️  Note: Phone Auth requires SHA fingerprints added to Firebase Console for Android');
    console.log('⚠️  Make sure google-services.json is in android/app/');
    
    return { success: true, message: 'Firebase Auth is ready. Phone Auth setup needs to be verified in Firebase Console.' };
  } catch (error) {
    console.error('❌ Phone Auth test error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Run all Firebase tests
 */
export const runAllFirebaseTests = () => {
  console.log('🧪 Running Firebase Tests...\n');
  
  const configTest = testFirebaseConfig();
  console.log('\n');
  
  const initTest = testFirebaseInit();
  console.log('\n');
  
  return {
    config: configTest,
    initialization: initTest,
  };
};

export default {
  testFirebaseInit,
  testFirebaseConfig,
  testPhoneAuthSetup,
  runAllFirebaseTests,
};
