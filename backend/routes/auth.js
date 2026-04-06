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
const FreelancerVerification = require('../models/FreelancerVerification');
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
 * Shared login after Firebase has verified the phone (session+OTP or client idToken).
 * @returns {Promise<{success: true, token, user, isNewUser}|{success: false, code?: string, error?: string, message?: string}>}
 */
async function performPhoneLogin(formattedPhone, role, deviceId, forceLogin) {
  let user = await User.findOne({ phone: formattedPhone });
  const isNewUser = !user;

  if (!user) {
    user = await User.create({
      phone: formattedPhone,
      role: role,
      currentDeviceId: deviceId || null,
      tokenVersion: 0,
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

  if (role === 'client' && !user.fullName) {
    const freelancerVerification = await FreelancerVerification.findOne({ user: user._id })
      .sort({ createdAt: -1 })
      .lean();
    if (freelancerVerification && freelancerVerification.fullName) {
      user.fullName = freelancerVerification.fullName;
      user.profilePhoto = freelancerVerification.profilePhoto || user.profilePhoto;
      user.updatedAt = new Date();
      await user.save();
    }
  }

  const requestDeviceId = (deviceId != null && String(deviceId).trim()) ? String(deviceId).trim() : null;
  if (requestDeviceId && user.currentDeviceId && user.currentDeviceId !== requestDeviceId) {
    if (!forceLogin) {
      return {
        success: false,
        code: 'ALREADY_LOGGED_IN_ELSEWHERE',
        error: 'You are already logged in on another device. To login here, logout from the previous device.',
        message: 'You are already logged in on another device. To login here, do you want to logout from the previous device?',
      };
    }
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    user.currentDeviceId = requestDeviceId;
    user.updatedAt = new Date();
    await user.save();
  } else if (requestDeviceId && user.currentDeviceId !== requestDeviceId) {
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    user.currentDeviceId = requestDeviceId;
    user.updatedAt = new Date();
    await user.save();
  }

  const token = generateJWT(user);
  const [profilePhoto, freelancerVerification] = await Promise.all([
    getUserProfilePhoto(user._id, user),
    FreelancerVerification.findOne({ user: user._id })
      .select('fullName')
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  let displayFullName = user.fullName || null;
  if (freelancerVerification?.fullName) {
    displayFullName = freelancerVerification.fullName;
  }

  return {
    success: true,
    token,
    isNewUser,
    user: {
      id: user._id || user.id,
      phone: user.phone,
      role: user.role,
      fullName: displayFullName,
      profilePhoto: profilePhoto,
      email: user.email || null,
      verificationStatus: user.verificationStatus || null,
      ...(user.role === 'freelancer'
        ? { freelancerPickupBlockedUntil: user.freelancerPickupBlockedUntil || null }
        : {}),
    },
  };
}

/**
 * Helper function to get the appropriate profile photo for a user
 * Priority: Freelancer verification profilePhoto > User profilePhoto > null
 */
async function getUserProfilePhoto(userId, userDoc = null) {
  try {
    const verification = await FreelancerVerification.findOne({
      user: userId,
      profilePhoto: { $exists: true, $ne: null },
    })
      .sort({ createdAt: -1 })
      .select('profilePhoto')
      .lean();

    if (verification?.profilePhoto) {
      return verification.profilePhoto;
    }

    if (userDoc?.profilePhoto) {
      return userDoc.profilePhoto;
    }

    const user = await User.findById(userId).select('profilePhoto').lean();
    return user?.profilePhoto || null;
  } catch (error) {
    console.error('Error getting user profile photo:', error);
    try {
      if (userDoc?.profilePhoto) return userDoc.profilePhoto;
      const user = await User.findById(userId).select('profilePhoto').lean();
      return user?.profilePhoto || null;
    } catch (err) {
      return null;
    }
  }
}

/**
 * Send OTP to phone number (Firebase REST — no app attestation).
 * Real SMS to arbitrary numbers requires reCAPTCHA/Play Integrity; the mobile app uses
 * client-side Firebase Phone Auth + POST /verify-firebase-id-token instead.
 * This route may still work for Firebase *test phone numbers* configured in the console.
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
    const { phoneNumber, otp, deviceId, forceLogin } = req.body;

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

      const loginResult = await performPhoneLogin(formattedPhone, role, deviceId, forceLogin);
      if (!loginResult.success) {
        if (loginResult.code === 'ALREADY_LOGGED_IN_ELSEWHERE') {
          return res.json({
            success: false,
            code: loginResult.code,
            error: loginResult.error,
            message: loginResult.message,
          });
        }
        return res.status(500).json({ success: false, error: loginResult.error || 'Login failed' });
      }

      clearOTPRequest(formattedPhone);

      res.json({
        success: true,
        token: loginResult.token,
        user: {
          ...loginResult.user,
          isNewUser: loginResult.isNewUser,
        },
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
 * Exchange Firebase ID token (from client Phone Auth after OTP) for app JWT.
 * Real SMS requires reCAPTCHA / device attestation; the mobile app verifies OTP in Firebase
 * client-side, then sends this ID token here.
 * POST /api/auth/verify-firebase-id-token
 */
router.post('/verify-firebase-id-token', async (req, res) => {
  try {
    const { idToken, role, deviceId, forceLogin } = req.body;

    if (!idToken || typeof idToken !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Firebase ID token is required',
      });
    }

    if (!role || !['client', 'freelancer'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Valid role is required (client or freelancer)',
      });
    }

    if (!process.env.FIREBASE_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Server is not configured for Firebase',
      });
    }

    const lookup = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${process.env.FIREBASE_API_KEY}`,
      { idToken }
    );

    const users = lookup.data?.users;
    if (!users?.length || !users[0].phoneNumber) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session. Please sign in again.',
      });
    }

    const formattedPhone = users[0].phoneNumber;

    const loginResult = await performPhoneLogin(formattedPhone, role, deviceId, forceLogin);
    if (!loginResult.success) {
      if (loginResult.code === 'ALREADY_LOGGED_IN_ELSEWHERE') {
        return res.json({
          success: false,
          code: loginResult.code,
          error: loginResult.error,
          message: loginResult.message,
        });
      }
      return res.status(500).json({ success: false, error: loginResult.error || 'Login failed' });
    }

    res.json({
      success: true,
      token: loginResult.token,
      user: {
        ...loginResult.user,
        isNewUser: loginResult.isNewUser,
      },
    });
  } catch (error) {
    console.error('verify-firebase-id-token error:', error.response?.data || error);
    const msg = error.response?.data?.error?.message || '';
    if (msg.includes('INVALID_ID_TOKEN') || msg.includes('TOKEN_EXPIRED')) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session. Please sign in again.',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to verify Firebase token',
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

/**
 * Exchange MSG91 OTP Widget access-token for app JWT.
 * Client verifies OTP with MSG91 SDK, then sends access-token here.
 * POST /api/auth/verify-msg91-access-token
 */
router.post('/verify-msg91-access-token', async (req, res) => {
  try {
    const { accessToken, role, deviceId, forceLogin } = req.body;

    if (!accessToken || typeof accessToken !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'MSG91 access token is required',
      });
    }

    if (!role || !['client', 'freelancer'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Valid role is required (client or freelancer)',
      });
    }

    const authkey =
      process.env.MSG91_AUTHKEY ||
      process.env.MSG91_AUTH_KEY ||
      process.env.MSG91_AUTH_KEY_OTP ||
      '';

    if (!authkey) {
      return res.status(500).json({
        success: false,
        error: 'Server is not configured for MSG91',
      });
    }

    const verifyResp = await axios.post(
      'https://control.msg91.com/api/v5/widget/verifyAccessToken',
      {
        authkey,
        'access-token': accessToken,
      },
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const identifier =
      verifyResp.data?.identifier ||
      verifyResp.data?.data?.identifier ||
      verifyResp.data?.mobile ||
      verifyResp.data?.data?.mobile ||
      verifyResp.data?.phone ||
      verifyResp.data?.data?.phone ||
      null;

    if (!identifier) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired OTP session. Please try again.',
      });
    }

    // MSG91 identifier is countrycode+number without "+". Normalize to E.164.
    const formattedPhone = String(identifier).startsWith('+')
      ? String(identifier)
      : `+${String(identifier)}`;

    const loginResult = await performPhoneLogin(formattedPhone, role, deviceId, forceLogin);
    if (!loginResult.success) {
      if (loginResult.code === 'ALREADY_LOGGED_IN_ELSEWHERE') {
        return res.json({
          success: false,
          code: loginResult.code,
          error: loginResult.error,
          message: loginResult.message,
        });
      }
      return res.status(500).json({ success: false, error: loginResult.error || 'Login failed' });
    }

    res.json({
      success: true,
      token: loginResult.token,
      user: {
        ...loginResult.user,
        isNewUser: loginResult.isNewUser,
      },
    });
  } catch (error) {
    console.error('verify-msg91-access-token error:', error.response?.data || error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify MSG91 access token',
    });
  }
});

module.exports = router;

