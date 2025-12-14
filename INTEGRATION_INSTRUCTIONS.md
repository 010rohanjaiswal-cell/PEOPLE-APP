# Integration Instructions - Add Routes to Your Existing Backend

## Quick Summary

Your backend at `https://freelancing-platform-backup.onrender.com` needs these 2 routes:
- `POST /api/auth/send-otp`
- `POST /api/auth/verify-otp`

## Step-by-Step Instructions

### Step 1: Open Your Backend Code

Find your backend code (the one deployed on Render.com). It should have a file like:
- `routes/auth.js` or
- `routes/authRoutes.js` or
- `controllers/authController.js`

### Step 2: Install axios (if not already installed)

```bash
cd your-backend-directory
npm install axios
```

### Step 3: Add Environment Variable

In your Render.com dashboard:
1. Go to your backend service
2. Click **Environment** tab
3. Add this variable:
   ```
   FIREBASE_API_KEY=AIzaSyDr_KGBQE7WiisZkhHZR8Yz9icfndxTkVE
   ```
4. Click **Save Changes** (this will auto-redeploy)

### Step 4: Copy the Routes

Open the file: `ROUTES_TO_ADD_TO_BACKEND.js`

Copy these sections to your existing auth routes file:

1. **Helper Functions** (lines 30-50)
   - `storeOTPRequest`
   - `getOTPRequest`
   - `clearOTPRequest`

2. **Send OTP Route** (lines 55-120)
   - `router.post('/send-otp', ...)`

3. **Verify OTP Route** (lines 125-260)
   - `router.post('/verify-otp', ...)`

### Step 5: Adjust Imports

At the top of your auth routes file, make sure you have:

```javascript
const express = require('express');
const router = express.Router();
const axios = require('axios');

// Adjust these to match your backend structure:
const User = require('../models/User'); // Your User model path
const { generateJWT } = require('../utils/jwt'); // Your JWT function
```

### Step 6: Adjust User Model Calls

In the `verify-otp` route, adjust these lines to match your User model:

```javascript
// Line ~187: Adjust based on your User model
let user = await User.findOne({ phone: formattedPhone });

// Line ~191: Adjust fields based on your User model
if (!user) {
  user = await User.create({
    phone: formattedPhone,
    role: role,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}
```

### Step 7: Adjust JWT Function

Make sure `generateJWT(user)` matches your existing JWT generation function. If you use a different function name, replace it.

### Step 8: Test Locally (Optional)

```bash
# Test send OTP
curl -X POST http://localhost:3001/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919876543210", "role": "client"}'

# Should return: {"success":true,"message":"OTP sent successfully"}
```

### Step 9: Deploy

1. Commit your changes
2. Push to your repository (if using Git)
3. Render.com will auto-deploy, or manually trigger deployment

### Step 10: Test Production

```bash
curl -X POST https://freelancing-platform-backend-backup.onrender.com/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919876543210", "role": "client"}'
```

Should return: `{"success":true,"message":"OTP sent successfully"}`

## Common Issues

### Issue 1: "Cannot find module 'axios'"
**Fix:** Run `npm install axios` in your backend directory

### Issue 2: "FIREBASE_API_KEY is not defined"
**Fix:** Add `FIREBASE_API_KEY` to your environment variables in Render.com

### Issue 3: "User.findOne is not a function"
**Fix:** Adjust the User model import and method calls to match your existing code

### Issue 4: "generateJWT is not a function"
**Fix:** Replace `generateJWT` with your existing JWT generation function

## What the Routes Do

### `/send-otp`
1. Validates phone number and role
2. Calls Firebase REST API to send OTP
3. Stores session info for verification
4. Returns success/error

### `/verify-otp`
1. Validates phone number and OTP
2. Calls Firebase REST API to verify OTP
3. Gets or creates user in database
4. Generates JWT token
5. Returns token and user data

## Need Help?

If you get stuck, check:
1. Backend logs in Render.com dashboard
2. Environment variables are set correctly
3. User model methods match your existing code
4. JWT function exists and works

---

**Once these routes are added and deployed, your mobile app will work!** 🚀

