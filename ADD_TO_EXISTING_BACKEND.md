# Add Endpoints to Your Existing Backend

## Current Situation

✅ Mobile app build: **SUCCESS**  
✅ Backend endpoint exists: `/api/auth/send-otp`  
❌ Backend is failing: Firebase API key not configured

## What You Need to Do

Add the authentication endpoints to your **existing backend** that's deployed at:
`https://freelancing-platform-backend-backup.onrender.com`

## Step 1: Add Environment Variable

In your Render.com dashboard (or wherever your backend is hosted):

1. Go to your backend service
2. Go to **Environment** tab
3. Add this variable:
   ```
   FIREBASE_API_KEY=AIzaSyDr_KGBQE7WiisZkhHZR8Yz9icfndxTkVE
   ```
4. Save and redeploy

## Step 2: Add the Routes

Copy these 2 route handlers to your existing backend's auth routes file:

### File: `routes/auth.js` (or wherever your auth routes are)

Add these two routes:

```javascript
// Temporary storage for OTP requests (use Redis in production)
const otpRequests = new Map();

function storeOTPRequest(phoneNumber, role, sessionInfo = null) {
  otpRequests.set(phoneNumber, {
    role,
    sessionInfo,
    timestamp: Date.now()
  });
  setTimeout(() => {
    otpRequests.delete(phoneNumber);
  }, 600000);
}

function getOTPRequest(phoneNumber) {
  return otpRequests.get(phoneNumber) || null;
}

function clearOTPRequest(phoneNumber) {
  otpRequests.delete(phoneNumber);
}

// POST /api/auth/send-otp
router.post('/send-otp', async (req, res) => {
  try {
    const { phoneNumber, role } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }

    if (!role || !['client', 'freelancer'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Valid role is required (client or freelancer)'
      });
    }

    const formattedPhone = phoneNumber.startsWith('+') 
      ? phoneNumber 
      : `+${phoneNumber}`;

    storeOTPRequest(formattedPhone, role);

    const axios = require('axios');
    try {
      const response = await axios.post(
        `https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=${process.env.FIREBASE_API_KEY}`,
        {
          phoneNumber: formattedPhone,
        }
      );

      const storedData = otpRequests.get(formattedPhone);
      if (storedData && response.data.sessionInfo) {
        storeOTPRequest(formattedPhone, storedData.role, response.data.sessionInfo);
      }

      res.json({
        success: true,
        message: 'OTP sent successfully'
      });
    } catch (firebaseError) {
      console.error('Firebase error:', firebaseError.response?.data || firebaseError);
      clearOTPRequest(formattedPhone);
      
      const errorMessage = firebaseError.response?.data?.error?.message || 'Failed to send OTP';
      res.status(500).json({
        success: false,
        error: errorMessage.includes('PHONE_NUMBER') 
          ? 'Invalid phone number. Please check and try again.'
          : 'Failed to send OTP. Please try again.'
      });
    }

  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send OTP'
    });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }

    if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        error: 'Valid 6-digit OTP is required'
      });
    }

    const formattedPhone = phoneNumber.startsWith('+') 
      ? phoneNumber 
      : `+${phoneNumber}`;

    const storedData = getOTPRequest(formattedPhone);
    
    if (!storedData) {
      return res.status(400).json({
        success: false,
        error: 'OTP session expired. Please request a new OTP.'
      });
    }

    const { role, sessionInfo } = storedData;

    if (!sessionInfo) {
      return res.status(400).json({
        success: false,
        error: 'Invalid OTP session. Please request a new OTP.'
      });
    }

    const axios = require('axios');
    try {
      const response = await axios.post(
        `https://identitytoolkit.googleapis.com/v1/accounts:verifyPhoneNumber?key=${process.env.FIREBASE_API_KEY}`,
        {
          phoneNumber: formattedPhone,
          code: otp,
          sessionInfo: sessionInfo
        }
      );

      if (!response.data.idToken) {
        return res.status(400).json({
          success: false,
          error: 'Invalid OTP. Please try again.'
        });
      }

      // Get or create user (use your existing User model)
      let user = await User.findOne({ phone: formattedPhone });

      if (!user) {
        user = await User.create({
          phone: formattedPhone,
          role: role,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } else {
        if (user.role !== role) {
          user.role = role;
          user.updatedAt = new Date();
          await user.save();
        }
      }

      // Generate JWT (use your existing JWT function)
      const token = generateJWT(user);

      clearOTPRequest(formattedPhone);

      res.json({
        success: true,
        token: token,
        user: {
          id: user._id || user.id,
          phone: user.phone,
          role: user.role,
          fullName: user.fullName || null,
          profilePhoto: user.profilePhoto || null,
          email: user.email || null,
        }
      });

    } catch (firebaseError) {
      console.error('Firebase verification error:', firebaseError.response?.data || firebaseError);
      
      if (firebaseError.response?.data?.error?.message?.includes('INVALID_CODE')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid OTP. Please check and try again.'
        });
      }

      if (firebaseError.response?.data?.error?.message?.includes('EXPIRED')) {
        return res.status(400).json({
          success: false,
          error: 'OTP has expired. Please request a new one.'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to verify OTP. Please try again.'
      });
    }

  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to verify OTP'
    });
  }
});
```

## Step 3: Update Your User Model & JWT Function

Make sure your backend has:
- `User` model with `phone`, `role`, `fullName`, `profilePhoto` fields
- `generateJWT(user)` function that creates JWT tokens

## Step 4: Enable Firebase Phone Auth

1. Go to: https://console.firebase.google.com/project/freelancing-platform-v2/authentication/providers
2. Enable **Phone** authentication
3. Add Android app SHA-1 fingerprint (if needed)

## Step 5: Test

After adding the endpoints and environment variable:

```bash
curl -X POST https://freelancing-platform-backend-backup.onrender.com/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919876543210", "role": "client"}'
```

Should return: `{"success":true,"message":"OTP sent successfully"}`

## Complete Code

The full implementation is in:
`/Users/rohanjaiswal/Desktop/PEOPLE APP/backend/routes/auth.js`

Copy the `send-otp` and `verify-otp` routes to your existing backend.

---

**Once you add these endpoints and set FIREBASE_API_KEY, the mobile app will work!** 🚀

