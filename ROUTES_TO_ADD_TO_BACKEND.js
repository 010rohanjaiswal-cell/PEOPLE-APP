/**
 * ============================================
 * AUTHENTICATION ROUTES - COPY TO YOUR BACKEND
 * ============================================
 * 
 * Instructions:
 * 1. Open your existing backend's auth routes file (usually routes/auth.js)
 * 2. Copy the helper functions and two route handlers below
 * 3. Make sure you have axios installed: npm install axios
 * 4. Add FIREBASE_API_KEY to your .env file
 * 5. Deploy your backend
 * 
 * Required Environment Variable:
 * FIREBASE_API_KEY=AIzaSyDr_KGBQE7WiisZkhHZR8Yz9icfndxTkVE
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');

// ============================================
// ADJUST THESE IMPORTS TO MATCH YOUR BACKEND
// ============================================
// Replace with your actual User model and JWT function:
const User = require('../models/User'); // Adjust path as needed
const { generateJWT } = require('../utils/jwt'); // Or use your JWT function

// ============================================
// HELPER FUNCTIONS
// ============================================

// Temporary storage for OTP requests (use Redis in production)
const otpRequests = new Map();

function storeOTPRequest(phoneNumber, role, sessionInfo = null) {
  otpRequests.set(phoneNumber, {
    role,
    sessionInfo,
    timestamp: Date.now()
  });
  // Auto-cleanup after 10 minutes
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

// ============================================
// ROUTE 1: Send OTP
// POST /api/auth/send-otp
// ============================================

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

    // Send OTP via Firebase REST API
    try {
      const response = await axios.post(
        `https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=${process.env.FIREBASE_API_KEY}`,
        {
          phoneNumber: formattedPhone,
        }
      );

      // Store sessionInfo for verification
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
      
      // Clean up stored request on error
      clearOTPRequest(formattedPhone);
      
      // Return user-friendly error
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

// ============================================
// ROUTE 2: Verify OTP
// POST /api/auth/verify-otp
// ============================================

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

    if (!sessionInfo) {
      return res.status(400).json({
        success: false,
        error: 'Invalid OTP session. Please request a new OTP.'
      });
    }

    // Verify OTP with Firebase REST API
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
      // ADJUST THIS BASED ON YOUR USER MODEL:
      let user = await User.findOne({ phone: formattedPhone });

      if (!user) {
        // Create new user - adjust fields based on your User model
        user = await User.create({
          phone: formattedPhone,
          role: role,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } else {
        // Update role if it was changed during login
        if (user.role !== role) {
          user.role = role;
          user.updatedAt = new Date();
          await user.save();
        }
      }

      // Generate JWT token - use your existing function
      const token = generateJWT(user);

      // Clean up stored OTP request
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

      if (firebaseError.response?.data?.error?.message?.includes('SESSION_EXPIRED')) {
        return res.status(400).json({
          success: false,
          error: 'OTP session expired. Please request a new OTP.'
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

// ============================================
// EXPORT (if using as standalone file)
// ============================================
// If you're adding this to an existing file, don't export
// If you're creating a new file, uncomment below:
// module.exports = router;

