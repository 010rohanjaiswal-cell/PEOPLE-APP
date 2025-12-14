# Backend Implementation Guide - Send OTP & Verify OTP

## Complete Implementation Code

Since your backend already exists and handles Firebase, here's the complete code you can add:

---

## File: `routes/auth.js`

Add these two routes to your existing auth routes:

```javascript
const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const User = require('../models/User'); // Your User model
const jwt = require('jsonwebtoken');

// Temporary storage for OTP requests (use Redis in production)
const otpRequests = new Map();

// Helper: Store OTP request
function storeOTPRequest(phoneNumber, role) {
  otpRequests.set(phoneNumber, {
    role,
    timestamp: Date.now()
  });
  // Auto-cleanup after 10 minutes
  setTimeout(() => {
    otpRequests.delete(phoneNumber);
  }, 600000);
}

// Helper: Get OTP request
function getOTPRequest(phoneNumber) {
  return otpRequests.get(phoneNumber) || null;
}

// Helper: Clear OTP request
function clearOTPRequest(phoneNumber) {
  otpRequests.delete(phoneNumber);
}

// Helper: Generate JWT
function generateJWT(user) {
  return jwt.sign(
    {
      userId: user._id,
      phone: user.phone,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Send OTP to phone number
 * POST /api/auth/send-otp
 */
router.post('/send-otp', async (req, res) => {
  try {
    const { phoneNumber, role } = req.body;

    // Validation
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

    // Format phone number (ensure it starts with +)
    const formattedPhone = phoneNumber.startsWith('+') 
      ? phoneNumber 
      : `+${phoneNumber}`;

    // Store phone + role temporarily for verification
    storeOTPRequest(formattedPhone, role);

    // TODO: Implement Firebase Phone Auth to send OTP
    // This depends on your Firebase setup
    // For now, you can use Firebase Admin SDK or REST API
    
    // Example using Firebase REST API:
    const axios = require('axios');
    try {
      const response = await axios.post(
        `https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=${process.env.FIREBASE_API_KEY}`,
        {
          phoneNumber: formattedPhone,
        }
      );

      // Store sessionInfo for verification
      otpRequests.set(formattedPhone, {
        ...otpRequests.get(formattedPhone),
        sessionInfo: response.data.sessionInfo
      });

      res.json({
        success: true,
        message: 'OTP sent successfully'
      });
    } catch (firebaseError) {
      console.error('Firebase error:', firebaseError.response?.data || firebaseError);
      res.status(500).json({
        success: false,
        error: 'Failed to send OTP. Please try again.'
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

/**
 * Verify OTP and authenticate user
 * POST /api/auth/verify-otp
 */
router.post('/verify-otp', async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;

    // Validation
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

    // Format phone number
    const formattedPhone = phoneNumber.startsWith('+') 
      ? phoneNumber 
      : `+${phoneNumber}`;

    // Get stored OTP request
    const storedData = getOTPRequest(formattedPhone);
    
    if (!storedData) {
      return res.status(400).json({
        success: false,
        error: 'OTP session expired. Please request a new OTP.'
      });
    }

    const { role, sessionInfo } = storedData;

    // Verify OTP with Firebase
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

      // OTP verified! Now get or create user
      let user = await User.findOne({ phone: formattedPhone });

      if (!user) {
        // Create new user
        user = await User.create({
          phone: formattedPhone,
          role: role,
          // Add other default fields as needed
        });
      } else {
        // Update role if it was changed during login
        if (user.role !== role) {
          user.role = role;
          await user.save();
        }
      }

      // Generate JWT token
      const token = generateJWT(user);

      // Clean up stored OTP request
      clearOTPRequest(formattedPhone);

      res.json({
        success: true,
        token: token,
        user: {
          id: user._id,
          phone: user.phone,
          role: user.role,
          fullName: user.fullName || null,
          profilePhoto: user.profilePhoto || null,
          email: user.email || null,
          // Add other user fields as needed
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

module.exports = router;
```

---

## Environment Variables Needed

Make sure your backend `.env` has:
```env
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_PROJECT_ID=your_project_id
JWT_SECRET=your_jwt_secret
```

---

## Alternative: If You Already Have Firebase Admin SDK

If your backend already uses Firebase Admin SDK, you can use this approach:

```javascript
// For sending OTP - Firebase Admin doesn't directly support Phone Auth
// You'll need to use REST API or a different approach

// For verifying - you can verify the Firebase ID token from the client
// But since we're doing backend-based, use REST API approach above
```

---

## Testing

### 1. Test Send OTP:
```bash
curl -X POST http://localhost:3001/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919876543210", "role": "client"}'
```

Expected Response:
```json
{
  "success": true,
  "message": "OTP sent successfully"
}
```

### 2. Test Verify OTP:
```bash
curl -X POST http://localhost:3001/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919876543210", "otp": "123456"}'
```

Expected Response:
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": "...",
    "phone": "+919876543210",
    "role": "client",
    "fullName": null,
    "profilePhoto": null
  }
}
```

---

## Important Notes

1. **Firebase REST API**: The code uses Firebase REST API which requires your `FIREBASE_API_KEY`
2. **Temporary Storage**: Using in-memory Map for simplicity. Use Redis in production.
3. **Error Handling**: Matches what the mobile app expects
4. **User Creation**: Creates user if doesn't exist, updates role if changed

---

**Add these routes to your backend and test!** 🚀

