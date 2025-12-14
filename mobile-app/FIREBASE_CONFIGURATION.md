# Firebase Configuration - Complete Setup Guide

## ✅ Configured Values

Based on your Firebase project configuration, I've set up the following:

- **Project ID:** `freelancing-platform-v2`
- **API Key:** `AIzaSyB2nDFIh15WylAq4WkgKtBwXNDII7Ej81c`
- **Storage Bucket:** `freelancing-platform-v2.firebasestorage.app`
- **Messaging Sender ID:** `713504655146` (Project Number)
- **Auth Domain:** `freelancing-platform-v2.firebaseapp.com` (calculated)
- **Android Package:** `com.company.people`

## 📝 Next Steps

### 1. Create `.env` File

Copy the `.env.example` file to `.env`:

```bash
cd mobile-app
cp .env.example .env
```

### 2. Verify App ID

The App ID in `.env.example` is set to: `1:713504655146:android:62e7fed3246e74c6938053`

To verify or get the correct App ID:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `freelancing-platform-v2`
3. Go to Project Settings (gear icon)
4. Scroll to "Your apps" section
5. Find your Android app or create one if it doesn't exist
6. Copy the App ID

### 3. Enable Phone Authentication

1. Go to Firebase Console > Authentication
2. Click "Get Started" if not already enabled
3. Go to "Sign-in method" tab
4. Enable "Phone" authentication
5. Configure reCAPTCHA settings (for web) or set up reCAPTCHA for Android

### 4. For Android Phone Auth

Since you're building an Android app, you need to:

1. **Add SHA-1 and SHA-256 fingerprints:**
   - Get your debug keystore SHA-1:
     ```bash
     keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
     ```
   - Add the SHA-1 and SHA-256 to Firebase Console > Project Settings > Your apps > Android app

2. **Download `google-services.json`:**
   - In Firebase Console, go to Project Settings
   - Download `google-services.json` for your Android app
   - Place it in `mobile-app/android/app/` (if using bare React Native)
   - For Expo, this is handled automatically

### 5. Test Firebase Connection

After setting up `.env`, test the Firebase connection:

```javascript
// You can test in your app by checking if Firebase initializes
import { auth } from './src/config/firebase';
console.log('Firebase Auth:', auth);
```

## 🔧 Current Configuration

The Firebase config is set up in:
- `src/config/firebase.js` - Main Firebase configuration
- `.env.example` - Environment variables template
- `app.json` - Android package name configured

## 📱 Phone Authentication Setup

### For React Native/Expo

Phone authentication in React Native requires:

1. **Expo Managed Workflow:**
   - Use `expo-firebase-recaptcha` for reCAPTCHA
   - Or use Firebase's native phone auth

2. **Bare React Native:**
   - Use `@react-native-firebase/auth` (already installed but removed - reinstall if needed)
   - Configure native modules

### Recommended Approach for Expo

Since you're using Expo, I recommend:

1. **Option 1: Use Firebase Web SDK** (Current approach)
   - Works with Expo
   - Requires reCAPTCHA setup
   - May need `expo-firebase-recaptcha` for better UX

2. **Option 2: Use Expo Firebase** (Alternative)
   - Install: `expo install firebase`
   - Better integration with Expo
   - Still requires reCAPTCHA

## 🚀 Quick Start

1. **Create `.env` file:**
   ```bash
   cd mobile-app
   cp .env.example .env
   ```

2. **Verify all values in `.env` are correct**

3. **Enable Phone Auth in Firebase Console**

4. **Add SHA fingerprints for Android**

5. **Test the authentication flow**

## 📚 Resources

- [Firebase Phone Auth Docs](https://firebase.google.com/docs/auth/web/phone-auth)
- [Expo Firebase Guide](https://docs.expo.dev/guides/using-firebase/)
- [Firebase Console](https://console.firebase.google.com/project/freelancing-platform-v2)

## ⚠️ Important Notes

1. **Never commit `.env` file** - It's already in `.gitignore`
2. **Keep API keys secure** - Don't share them publicly
3. **Test with real phone numbers** - Firebase Phone Auth requires real numbers
4. **Handle errors gracefully** - Phone auth can fail for various reasons

## ✅ Checklist

- [x] Firebase project identified
- [x] API Key configured
- [x] Project ID configured
- [x] Storage Bucket configured
- [x] Auth Domain configured
- [x] Messaging Sender ID configured
- [x] Android package name set
- [ ] Create `.env` file with values
- [ ] Verify App ID in Firebase Console
- [ ] Enable Phone Authentication
- [ ] Add SHA fingerprints for Android
- [ ] Test authentication flow

