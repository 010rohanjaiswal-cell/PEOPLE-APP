# Backend Endpoints to Add

## Add These 2 Endpoints to Your Backend

### File: `routes/auth.js` (or wherever your auth routes are)

Add these two new routes:

---

## 1. Send OTP Endpoint

```javascript
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

    // Use Firebase Admin SDK to send OTP
    // Your backend should already have Firebase Admin initialized
    const admin = require('firebase-admin');
    
    // Create a phone auth provider
    // Note: Firebase Admin SDK doesn't directly send OTP
    // You need to use Firebase's REST API or a service
    
    // Option 1: Use Firebase REST API (recommended)
    const axios = require('axios');
    const firebaseConfig = {
      apiKey: process.env.FIREBASE_API_KEY,
      projectId: process.env.FIREBASE_PROJECT_ID,
    };

    // Store phone + role temporarily for verification
    // Use Redis, in-memory store, or database
    // This is needed to retrieve role during OTP verification
    await storeOTPRequest(formattedPhone, role);

    // Send OTP via Firebase
    // You'll need to implement this based on your Firebase setup
    // For now, using a placeholder - replace with actual Firebase Admin implementation
    const verificationId = await sendOTPViaFirebase(formattedPhone);

    res.json({
      success: true,
      message: 'OTP sent successfully'
    });

  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send OTP'
    });
  }
});
```

---

## 2. Verify OTP Endpoint

```javascript
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

    if (!otp || otp.length !== 6) {
      return res.status(400).json({
        success: false,
        error: 'Valid 6-digit OTP is required'
      });
    }

    // Format phone number
    const formattedPhone = phoneNumber.startsWith('+') 
      ? phoneNumber 
      : `+${phoneNumber}`;

    // Verify OTP with Firebase
    // You'll need to implement this based on your Firebase setup
    const isValid = await verifyOTPWithFirebase(formattedPhone, otp);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid OTP. Please try again.'
      });
    }

    // Get stored role from OTP request
    const storedData = await getOTPRequest(formattedPhone);
    const role = storedData?.role || 'client'; // Default to client if not found

    // Find or create user
    let user = await User.findOne({ phone: formattedPhone });

    if (!user) {
      // Create new user
      user = await User.create({
        phone: formattedPhone,
        role: role,
        // Other default fields
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
    await clearOTPRequest(formattedPhone);

    res.json({
      success: true,
      token: token,
      user: {
        id: user._id,
        phone: user.phone,
        role: user.role,
        fullName: user.fullName || null,
        profilePhoto: user.profilePhoto || null,
        // Add other user fields as needed
      }
    });

  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to verify OTP'
    });
  }
});
```

---

## Helper Functions Needed

### 1. Store OTP Request (temporary storage)
```javascript
// Use Redis, in-memory store, or database
// Store for 10 minutes (OTP expiry time)

// Option 1: Using Redis (recommended)
const redis = require('redis');
const client = redis.createClient();

async function storeOTPRequest(phoneNumber, role) {
  const key = `otp_request:${phoneNumber}`;
  await client.setex(key, 600, JSON.stringify({ role, timestamp: Date.now() }));
}

async function getOTPRequest(phoneNumber) {
  const key = `otp_request:${phoneNumber}`;
  const data = await client.get(key);
  return data ? JSON.parse(data) : null;
}

async function clearOTPRequest(phoneNumber) {
  const key = `otp_request:${phoneNumber}`;
  await client.del(key);
}

// Option 2: Using in-memory store (simple, but lost on server restart)
const otpRequests = new Map();

async function storeOTPRequest(phoneNumber, role) {
  otpRequests.set(phoneNumber, {
    role,
    timestamp: Date.now()
  });
  // Auto-cleanup after 10 minutes
  setTimeout(() => {
    otpRequests.delete(phoneNumber);
  }, 600000);
}

async function getOTPRequest(phoneNumber) {
  return otpRequests.get(phoneNumber) || null;
}

async function clearOTPRequest(phoneNumber) {
  otpRequests.delete(phoneNumber);
}
```

### 2. Send OTP via Firebase
```javascript
// This depends on your Firebase setup
// If using Firebase Admin SDK with Phone Auth, you might need to use REST API

async function sendOTPViaFirebase(phoneNumber) {
  // Option 1: Use Firebase REST API
  const axios = require('axios');
  
  const response = await axios.post(
    `https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=${process.env.FIREBASE_API_KEY}`,
    {
      phoneNumber: phoneNumber,
      recaptchaToken: 'RECAPTCHA_TOKEN' // You might need to handle this
    }
  );

  return response.data.sessionInfo; // This is the verification ID

  // Option 2: If your backend already has Firebase Phone Auth setup
  // Use your existing implementation
}
```

### 3. Verify OTP with Firebase
```javascript
async function verifyOTPWithFirebase(phoneNumber, otp) {
  // Option 1: Use Firebase REST API
  const axios = require('axios');
  
  try {
    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:verifyPhoneNumber?key=${process.env.FIREBASE_API_KEY}`,
      {
        phoneNumber: phoneNumber,
        code: otp,
        sessionInfo: sessionInfo // Get from stored OTP request
      }
    );

    return response.data.idToken ? true : false;
  } catch (error) {
    return false;
  }

  // Option 2: If your backend already has Firebase Phone Auth setup
  // Use your existing implementation
}
```

### 4. Generate JWT Token
```javascript
// You probably already have this in your backend
const jwt = require('jsonwebtoken');

function generateJWT(user) {
  return jwt.sign(
    {
      userId: user._id,
      phone: user.phone,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' } // Adjust as needed
  );
}
```

---

## Quick Implementation Guide

### If Your Backend Already Has Firebase Admin:

1. **Find your auth routes file** (usually `routes/auth.js` or `routes/index.js`)
2. **Add the two endpoints** above
3. **Implement helper functions** based on your existing Firebase setup
4. **Test with Postman/curl**

### If You Need Firebase Admin Setup:

1. Install: `npm install firebase-admin`
2. Initialize in your backend:
```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./path-to-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
```

---

## Testing

### Test Send OTP:
```bash
curl -X POST http://localhost:3001/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919876543210", "role": "client"}'
```

### Test Verify OTP:
```bash
curl -X POST http://localhost:3001/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919876543210", "otp": "123456"}'
```

---

## Important Notes

1. **Firebase Phone Auth**: Your backend needs to handle Firebase Phone Auth. The exact implementation depends on your Firebase setup.

2. **Temporary Storage**: Store phone + role temporarily (Redis recommended, or in-memory for development).

3. **Security**: 
   - Validate phone numbers
   - Rate limit OTP requests
   - Expire OTP requests after 10 minutes

4. **Error Handling**: Return proper error messages that match what the mobile app expects.

---

**Add these endpoints to your backend and the mobile app will work!** 🚀

