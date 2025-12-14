/**
 * QUICK COPY - Add these routes to your existing backend
 * 
 * Copy the send-otp and verify-otp route handlers below
 * and paste them into your existing backend's auth routes file
 */

// ============================================
// HELPER FUNCTIONS (add to your auth routes file)
// ============================================

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

// ============================================
// ROUTE 1: Send OTP
// ============================================

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

// ============================================
// ROUTE 2: Verify OTP
// ============================================

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

      // Get or create user (adjust based on your User model)
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

      // Generate JWT (use your existing function)
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

