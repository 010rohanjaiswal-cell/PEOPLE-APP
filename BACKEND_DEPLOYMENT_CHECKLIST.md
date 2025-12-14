# Backend Deployment Checklist

## Issue
Mobile app is getting "Network Error" when trying to send OTP.

## Root Cause
The backend at `https://freelancing-platform-backend-backup.onrender.com` doesn't have the `/api/auth/send-otp` and `/api/auth/verify-otp` endpoints yet.

## Solution

You need to add the authentication endpoints to your existing backend.

### Option 1: Add to Existing Backend (Recommended)

1. **Find your backend code** (the one deployed at `https://freelancing-platform-backend-backup.onrender.com`)

2. **Add these 2 routes** to your backend's auth routes file:
   - Copy from: `/Users/rohanjaiswal/Desktop/PEOPLE APP/backend/routes/auth.js`
   - Add `POST /api/auth/send-otp` endpoint
   - Add `POST /api/auth/verify-otp` endpoint

3. **Update your backend's `.env`** with:
   ```env
   FIREBASE_API_KEY=AIzaSyDr_KGBQE7WiisZkhHZR8Yz9icfndxTkVE
   MONGODB_URI=mongodb+srv://rohanjaiswar2467:N8iwsBEfkbF2Dd2S@cluster1.sg9pmcf.mongodb.net/freelancing-platform?retryWrites=true&w=majority&appName=Cluster1
   JWT_SECRET=your_jwt_secret_here
   ```

4. **Deploy the updated backend**

### Option 2: Use the Backend We Created

If you want to use the backend we created in `/backend/`:

1. **Deploy the backend** from `/Users/rohanjaiswal/Desktop/PEOPLE APP/backend/`
2. **Update the mobile app** API URL to point to the new backend

## Quick Test

Test if the endpoint exists:
```bash
curl -X POST https://freelancing-platform-backend-backup.onrender.com/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919876543210", "role": "client"}'
```

If you get 404, the endpoint doesn't exist yet.

## What Needs to Be Added

### 1. Send OTP Endpoint
```
POST /api/auth/send-otp
Body: { "phoneNumber": "+919876543210", "role": "client" }
```

### 2. Verify OTP Endpoint
```
POST /api/auth/verify-otp
Body: { "phoneNumber": "+919876543210", "otp": "123456" }
```

## Files to Copy

The complete implementation is in:
- `/Users/rohanjaiswal/Desktop/PEOPLE APP/backend/routes/auth.js`

Copy the `send-otp` and `verify-otp` route handlers to your existing backend.

---

**Action Required:** Add the endpoints to your backend and deploy! 🚀

