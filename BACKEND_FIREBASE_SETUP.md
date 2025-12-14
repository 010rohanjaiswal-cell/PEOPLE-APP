# Backend Firebase Setup - Fix Network Error

## Current Status

✅ **Endpoint exists:** `/api/auth/send-otp` is responding  
❌ **Firebase error:** Backend is failing to send OTP via Firebase

## Error Response
```json
{"success":false,"error":"Failed to send OTP. Please try again."}
```

## Root Cause

The backend endpoint exists but is failing when trying to call Firebase REST API. This is likely because:

1. **FIREBASE_API_KEY not set** in backend environment variables
2. **Firebase Phone Auth not enabled** in Firebase Console
3. **Firebase API key incorrect** or doesn't have Phone Auth permissions

## Fix Required

### Step 1: Add Firebase API Key to Backend

Add to your backend's environment variables (Render.com dashboard or `.env`):

```env
FIREBASE_API_KEY=AIzaSyDr_KGBQE7WiisZkhHZR8Yz9icfndxTkVE
```

### Step 2: Enable Phone Auth in Firebase

1. Go to Firebase Console: https://console.firebase.google.com/project/freelancing-platform-v2
2. Authentication → Sign-in method
3. Enable **Phone** authentication
4. Add your app's SHA-1 fingerprint (for Android)

### Step 3: Verify Backend Code

Make sure your backend has the `/api/auth/send-otp` and `/api/auth/verify-otp` endpoints.

The code is in: `/Users/rohanjaiswal/Desktop/PEOPLE APP/backend/routes/auth.js`

## Quick Test

After adding FIREBASE_API_KEY, test again:
```bash
curl -X POST https://freelancing-platform-backend-backup.onrender.com/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919876543210", "role": "client"}'
```

Should return:
```json
{"success":true,"message":"OTP sent successfully"}
```

## What's Happening

1. Mobile app calls: `POST /api/auth/send-otp`
2. Backend receives request ✅
3. Backend tries to call Firebase REST API ❌ (failing here)
4. Firebase error → Backend returns error → Mobile app shows "Network Error"

## Next Steps

1. **Add FIREBASE_API_KEY** to your backend environment variables
2. **Enable Phone Auth** in Firebase Console
3. **Redeploy backend** (if needed)
4. **Test the endpoint** again
5. **Try the mobile app** again

---

**The mobile app is working correctly - the backend just needs Firebase configuration!** 🔧

