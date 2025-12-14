# Testing Firebase Setup - Guide

## Quick Test Steps

### 1. Start the App

```bash
cd mobile-app
npm start
```

Then press `a` for Android or scan the QR code with Expo Go.

### 2. Check Console Output

When the Login screen loads, you should see in the console:

```
🧪 Testing Firebase Configuration...
📋 Firebase Config Check:
API Key: ✅ Set
Auth Domain: ✅ Set
Project ID: ✅ Set
Storage Bucket: ✅ Set
Messaging Sender ID: ✅ Set
App ID: ✅ Set
✅ All Firebase config values are set!

🔥 Firebase Auth Object: [Object]
🔥 Firebase App: [Object]
🔥 Firebase Project ID: freelancing-platform-v2
✅ Firebase initialized successfully!
```

### 3. Use Firebase Test Screen

1. On the Login screen, tap "Test Firebase Configuration" button (only visible in development)
2. This will open a test screen showing:
   - All environment variables status
   - Firebase Auth initialization status
   - Test buttons to run diagnostics

### 4. Run Tests

Tap "Run All Tests" button to:
- Verify all environment variables are set
- Test Firebase initialization
- Check Firebase Auth object

## Expected Results

### ✅ Success Indicators

- All environment variables show "✅ Set"
- Firebase Auth object is initialized
- Project ID matches: `freelancing-platform-v2`
- No error messages in console

### ❌ Common Issues

1. **Environment variables not loading:**
   - Make sure `.env` file exists in `mobile-app/` directory
   - Restart Metro bundler after creating/updating `.env`
   - Check that variable names start with `EXPO_PUBLIC_`

2. **Firebase Auth not initialized:**
   - Check Firebase config values in `.env`
   - Verify Firebase project is active
   - Check console for specific error messages

3. **Phone Auth not working:**
   - Phone Authentication must be enabled in Firebase Console
   - SHA fingerprints must be added for Android
   - Check Firebase Console → Authentication → Sign-in method

## Manual Testing Checklist

- [ ] App starts without errors
- [ ] Login screen displays correctly
- [ ] Console shows Firebase config check
- [ ] All environment variables are set
- [ ] Firebase Auth object is initialized
- [ ] Test screen is accessible (dev mode only)
- [ ] All tests pass

## Next Steps After Testing

Once Firebase is confirmed working:

1. **Enable Phone Authentication:**
   - Go to Firebase Console
   - Authentication → Sign-in method
   - Enable "Phone"

2. **Add SHA Fingerprints:**
   ```bash
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
   ```
   - Copy SHA-1 and SHA-256
   - Add to Firebase Console → Project Settings → Your apps

3. **Test Phone Auth:**
   - Try sending OTP from Login screen
   - Verify OTP is received
   - Test OTP verification

## Troubleshooting

### Issue: Environment variables not loading

**Solution:**
1. Make sure `.env` file is in `mobile-app/` directory
2. Restart Metro bundler: `npm start -- --clear`
3. Verify variable names match exactly (case-sensitive)

### Issue: Firebase initialization error

**Solution:**
1. Check Firebase config values in `.env`
2. Verify Firebase project is active
3. Check Firebase Console for any restrictions
4. Review console error messages

### Issue: Phone Auth not working

**Solution:**
1. Enable Phone Authentication in Firebase Console
2. Add SHA fingerprints for Android
3. Check Firebase Console for error messages
4. Verify phone number format (+91 XXXXX XXXXX)

## Support

If you encounter issues:
1. Check console logs for detailed error messages
2. Review `FIREBASE_CONFIGURATION.md` for setup guide
3. Verify all steps in Firebase Console are completed

