/**
 * Authentication Routes - People App Backend
 * 
 * Routes:
 * - POST /api/auth/send-otp - Send OTP to phone number
 * - POST /api/auth/verify-otp - Verify OTP and authenticate user
 * - POST /api/auth/authenticate - Authenticate with Firebase token (legacy)
 * - POST /api/auth/logout - Logout user
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');

// Import your models and utilities
// Adjust these imports based on your backend structure
const User = require('../models/User');
const { generateJWT } = require('../utils/jwt');
const bcrypt = require('bcryptjs');

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
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber?key=${process.env.FIREBASE_API_KEY}`,
        {
          sessionInfo: sessionInfo,
          code: otp
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
          createdAt: new Date(),
          updatedAt: new Date(),
          // verificationStatus left undefined for new freelancers until they submit
        });
      } else {
        // Update role if it was changed during login
        if (user.role !== role) {
          user.role = role;
          user.updatedAt = new Date();
          await user.save();
        }
      }

      // Generate JWT token
      const token = generateJWT(user);

      // Get the appropriate profile photo (freelancer verification photo takes priority)
      const profilePhoto = await getUserProfilePhoto(user._id);

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
          profilePhoto: profilePhoto, // Use the helper function result
          email: user.email || null,
          verificationStatus: user.verificationStatus || null,
        }
      });

    } catch (firebaseError) {
      console.error('Firebase verification error:', firebaseError.response?.data || firebaseError);
      console.error('Firebase error details:', {
        message: firebaseError.message,
        code: firebaseError.code,
        response: firebaseError.response?.data,
        status: firebaseError.response?.status,
      });
      
      const errorMessage = firebaseError.response?.data?.error?.message || '';
      
      if (errorMessage.includes('INVALID_CODE') || errorMessage.includes('INVALID_VERIFICATION_CODE')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid OTP. Please check and try again.'
        });
      }

      if (errorMessage.includes('EXPIRED') || errorMessage.includes('CODE_EXPIRED')) {
        return res.status(400).json({
          success: false,
          error: 'OTP has expired. Please request a new one.'
        });
      }

      if (errorMessage.includes('SESSION_EXPIRED') || errorMessage.includes('SESSION_INFO_EXPIRED')) {
        return res.status(400).json({
          success: false,
          error: 'OTP session expired. Please request a new OTP.'
        });
      }

      // Return more detailed error for debugging
      res.status(500).json({
        success: false,
        error: errorMessage || 'Failed to verify OTP. Please try again.',
        details: process.env.NODE_ENV === 'development' ? firebaseError.message : undefined,
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

/**
 * Authenticate user with Firebase token (legacy - kept for compatibility)
 * POST /api/auth/authenticate
 */
router.post('/authenticate', async (req, res) => {
  try {
    const { firebaseToken } = req.body;

    if (!firebaseToken) {
      return res.status(400).json({
        success: false,
        error: 'Firebase token is required'
      });
    }

    // Verify Firebase token and get user
    // Implement your existing Firebase token verification logic here
    // This is kept for backward compatibility with web app

    res.status(501).json({
      success: false,
      error: 'Firebase token authentication not implemented. Use /verify-otp instead.'
    });

  } catch (error) {
    console.error('Error authenticating:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Authentication failed'
    });
  }
});

/**
 * Logout user
 * POST /api/auth/logout
 */
router.post('/logout', async (req, res) => {
  try {
    // Add any logout logic here (e.g., blacklist token, clear sessions)
    // For now, just return success - client will clear token
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Error logging out:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Logout failed'
    });
  }
});

/**
 * Admin login with email/password (env-based)
 * POST /api/auth/admin-login
 */
router.post('/admin-login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      return res.status(500).json({
        success: false,
        error: 'Admin credentials are not configured on the server',
      });
    }

    // Plaintext compare (if you want hashing, store a bcrypt hash in env and compare)
    if (email !== adminEmail || password !== adminPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid admin credentials',
      });
    }

    // Build minimal admin user payload
    const adminUser = {
      id: 'admin',
      role: 'admin',
      phone: null,
      email: adminEmail,
    };

    const token = generateJWT(adminUser);

    res.json({
      success: true,
      token,
      user: {
        id: adminUser.id,
        role: adminUser.role,
        email: adminUser.email,
      },
    });
  } catch (error) {
    console.error('Error during admin login:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to login as admin',
    });
  }
});

module.exports = router;

