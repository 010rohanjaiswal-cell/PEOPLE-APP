/**
 * Backend Auth Routes - Send OTP & Verify OTP
 * 
 * Add these routes to your existing backend auth routes file
 * OR use this as a standalone file and import it
 * 
 * File location: routes/auth.js (or wherever your auth routes are)
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');

// Import your existing models and utilities
// Adjust these imports based on your backend structure
// const User = require('../models/User');
// const jwt = require('jsonwebtoken');
// const admin = require('firebase-admin');

// Temporary storage for OTP requests (use Redis in production)
const otpRequests = new Map();

// Helper: Store OTP request
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

// Helper: Get OTP request
function getOTPRequest(phoneNumber) {
  return otpRequests.get(phoneNumber) || null;
}

// Helper: Clear OTP request
function clearOTPRequest(phoneNumber) {
  otpRequests.delete(phoneNumber);
}

// Helper: Generate JWT (adjust based on your existing JWT implementation)
function generateJWT(user) {
  // Use your existing JWT generation logic
  // Example:
  // const jwt = require('jsonwebtoken');
  // return jwt.sign(
  //   {
  //     userId: user._id,
  //     phone: user.phone,
  //     role: user.role,
  //   },
  //   process.env.JWT_SECRET,
  //   { expiresIn: '7d' }
  // );
  
  // Replace with your actual JWT generation function
  throw new Error('Implement generateJWT function with your existing JWT logic');
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
      // Replace with your actual User model
      // const User = require('../models/User');
      let user = await User.findOne({ phone: formattedPhone });

      if (!user) {
        // Create new user
        user = await User.create({
          phone: formattedPhone,
          role: role,
          // Add other default fields as needed
          // createdAt: new Date(),
          // updatedAt: new Date(),
        });
      } else {
        // Update role if it was changed during login
        if (user.role !== role) {
          user.role = role;
          await user.save();
        }
      }

      // Generate JWT token (use your existing JWT generation)
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

module.exports = router;

