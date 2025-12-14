# Firebase Phone Authentication Setup

## Important Note

The authentication screens are built, but Firebase Phone Authentication needs to be properly configured for production use.

## Current Implementation

The current implementation uses mock/placeholder Firebase integration for development. To make it production-ready, you need to:

## Steps to Complete Firebase Integration

### 1. Configure Firebase in `.env`

Make sure your `.env` file has all Firebase credentials:

```
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 2. Update Login Screen (`src/screens/auth/Login.js`)

Replace the mock implementation in `handleSendOTP` with actual Firebase Phone Auth:

```javascript
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '../../config/firebase';

const handleSendOTP = async () => {
  // ... validation code ...
  
  try {
    // Initialize reCAPTCHA verifier
    // For React Native, you may need expo-firebase-recaptcha
    const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
      callback: (response) => {
        // reCAPTCHA solved
      },
    });

    // Send OTP
    const confirmationResult = await signInWithPhoneNumber(
      auth,
      phone.replace(/\s/g, '').replace('+', ''),
      recaptchaVerifier
    );

    // Store verification ID
    await AsyncStorage.setItem('verificationId', confirmationResult.verificationId);
    
    // Navigate to OTP screen
    navigation.navigate('OTP', {
      phoneNumber: phone,
      selectedRole,
      verificationId: confirmationResult.verificationId,
    });
  } catch (error) {
    // Handle error
  }
};
```

### 3. Update OTP Screen (`src/screens/auth/OTP.js`)

Replace the mock implementation in `handleVerifyOTP` with actual Firebase verification:

```javascript
import { signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '../../config/firebase';

const handleVerifyOTP = async () => {
  // ... validation code ...
  
  try {
    // Get stored verification ID
    const storedVerificationId = await AsyncStorage.getItem('verificationId');
    
    // Verify OTP
    const confirmationResult = await signInWithPhoneNumber(
      auth,
      storedVerificationId,
      otp
    );

    // Get Firebase ID token
    const firebaseToken = await confirmationResult.user.getIdToken();
    
    // Call backend authenticate
    const result = await login(firebaseToken);
    
    // ... rest of the flow ...
  } catch (error) {
    // Handle error
  }
};
```

### 4. For React Native/Expo

For React Native with Expo, you may need:

- `expo-firebase-recaptcha` for reCAPTCHA support
- Or use Firebase's native phone auth if using bare React Native

### 5. Testing

1. Test with a real phone number
2. Verify OTP is received
3. Test OTP verification
4. Test error handling (wrong OTP, expired OTP, etc.)

## Resources

- [Firebase Phone Auth Documentation](https://firebase.google.com/docs/auth/web/phone-auth)
- [Expo Firebase Setup](https://docs.expo.dev/guides/using-firebase/)
- [React Native Firebase](https://rnfirebase.io/)

## Current Status

✅ UI Screens: Complete
✅ Navigation: Complete
✅ State Management: Complete
⏳ Firebase Integration: Needs implementation
⏳ Backend API Integration: Needs testing

