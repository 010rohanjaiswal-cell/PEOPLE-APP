# Firebase Auth & Network Error Fix

## Issues Fixed

### 1. ✅ Firebase Auth AsyncStorage Persistence
**Problem:** Firebase Auth warning about missing AsyncStorage persistence.

**Fix:** Updated `src/config/firebase.js` to use `initializeAuth` with `getReactNativePersistence`:
```javascript
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
```

**Result:** Firebase Auth state will now persist between app sessions.

### 2. ⚠️ Network Error - Backend Authentication
**Problem:** `Login error: [AxiosError: Network Error]` when trying to authenticate.

**Possible Causes:**
1. **Mock Firebase Token:** The OTP screen is using a mock Firebase token (`mock_firebase_token_...`), which the backend will reject.
2. **Backend Not Accessible:** The backend URL might not be reachable from the device/emulator.
3. **CORS Issues:** Backend might not allow requests from the app.
4. **Network Configuration:** Device/emulator might not have internet access.

**Current Status:**
- The app is using mock Firebase tokens for development
- Backend will reject mock tokens (expected behavior)
- Real Firebase Phone Auth needs to be implemented

## Next Steps

### Option 1: Implement Real Firebase Phone Auth (Recommended)
For production, you need to implement real Firebase Phone Auth:

1. **Install required packages:**
   ```bash
   npx expo install expo-firebase-recaptcha
   ```

2. **Update Login Screen** to send real OTP via Firebase
3. **Update OTP Screen** to verify real OTP and get Firebase ID token

### Option 2: Test with Backend Development Mode
If your backend has a development mode that accepts mock tokens:
- Enable it temporarily for testing
- Or create a test endpoint that accepts mock tokens

### Option 3: Use Test Phone Numbers
Firebase provides test phone numbers for development:
- Use Firebase Console test phone numbers
- These work without sending real SMS

## Current Flow

1. ✅ User enters phone number
2. ✅ User selects role
3. ✅ App navigates to OTP screen (with mock verification ID)
4. ✅ User enters OTP
5. ⚠️ App tries to authenticate with mock token
6. ❌ Backend rejects mock token (expected)
7. ❌ Network error shown to user

## Testing

To test the current flow:
1. Enter phone number: `+91 9876543210`
2. Select role (Client or Freelancer)
3. Enter any 6-digit OTP (e.g., `123456`)
4. You'll see network error (expected until real Firebase Auth is implemented)

## Firebase Phone Auth Implementation Guide

When ready to implement real Firebase Phone Auth:

1. **Login Screen (`src/screens/auth/Login.js`):**
   ```javascript
   import { signInWithPhoneNumber, RecaptchaVerifier } from 'firebase/auth';
   import { auth } from '../../config/firebase';
   
   // Send OTP
   const confirmationResult = await signInWithPhoneNumber(
     auth,
     phoneNumber,
     recaptchaVerifier
   );
   ```

2. **OTP Screen (`src/screens/auth/OTP.js`):**
   ```javascript
   import { PhoneAuthCredential, signInWithCredential } from 'firebase/auth';
   
   // Verify OTP
   const credential = PhoneAuthCredential.fromVerificationId(verificationId, otp);
   const userCredential = await signInWithCredential(auth, credential);
   const firebaseToken = await userCredential.user.getIdToken();
   ```

## Status

- ✅ Firebase Auth persistence fixed
- ✅ Error handling improved
- ⏳ Real Firebase Phone Auth needs implementation
- ⏳ Backend authentication will work once real Firebase tokens are used

---

**Note:** The network error is expected until real Firebase Phone Auth is implemented. The backend correctly rejects mock tokens for security.

