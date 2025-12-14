/**
 * JWT Utility Functions - People App Backend
 */

const jwt = require('jsonwebtoken');

/**
 * Generate JWT token for user
 * @param {Object} user - User object from database
 * @returns {string} JWT token
 */
function generateJWT(user) {
  return jwt.sign(
    {
      userId: user._id || user.id,
      phone: user.phone,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || '7d' 
    }
  );
}

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
function verifyJWT(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

module.exports = {
  generateJWT,
  verifyJWT,
};

