/**
 * Authentication Middleware - People App Backend
 * 
 * Middleware to protect routes that require authentication
 */

const { verifyJWT } = require('../utils/jwt');
const User = require('../models/User');

/**
 * Middleware to verify JWT token and attach user to request
 */
async function authenticate(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided. Please login first.'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = verifyJWT(token);

    // Admin tokens may not have a DB user; allow admin bypass
    if (decoded.role === 'admin' && decoded.userId === 'admin') {
      req.user = {
        id: 'admin',
        role: 'admin',
        email: decoded.email || null,
      };
      req.userId = 'admin';
    } else {
      // Get user from database
      const user = await User.findById(decoded.userId);

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'User not found. Please login again.'
        });
      }

      req.user = user;
      req.userId = decoded.userId;
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: error.message || 'Invalid or expired token. Please login again.'
    });
  }
}

/**
 * Middleware to check if user has required role
 * @param {string[]} roles - Array of allowed roles
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
}

module.exports = {
  authenticate,
  requireRole,
};

