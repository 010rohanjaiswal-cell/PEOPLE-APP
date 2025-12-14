/**
 * Validation Utilities - People App
 */

/**
 * Validate phone number
 * @param {string} phone - Phone number with +91 prefix
 * @returns {boolean}
 */
export const validatePhone = (phone) => {
  // Must be +91 followed by 10 digits (total 17 characters)
  const phoneRegex = /^\+91 \d{5} \d{5}$/;
  return phoneRegex.test(phone);
};

/**
 * Format phone number as +91 XXXXX XXXXX
 * @param {string} phone - Raw phone number
 * @returns {string} Formatted phone number
 */
export const formatPhone = (phone) => {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // If starts with 91, remove it
  const cleanDigits = digits.startsWith('91') ? digits.slice(2) : digits;
  
  // Take only first 10 digits
  const tenDigits = cleanDigits.slice(0, 10);
  
  // Format as +91 XXXXX XXXXX
  if (tenDigits.length === 10) {
    return `+91 ${tenDigits.slice(0, 5)} ${tenDigits.slice(5)}`;
  }
  
  // If incomplete, return partial format
  if (tenDigits.length > 5) {
    return `+91 ${tenDigits.slice(0, 5)} ${tenDigits.slice(5)}`;
  }
  
  if (tenDigits.length > 0) {
    return `+91 ${tenDigits}`;
  }
  
  return '+91 ';
};

/**
 * Validate OTP
 * @param {string} otp - 6-digit OTP
 * @returns {boolean}
 */
export const validateOTP = (otp) => {
  return /^\d{6}$/.test(otp);
};

/**
 * Validate email
 * @param {string} email - Email address
 * @returns {boolean}
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate pincode (6 digits)
 * @param {string} pincode - Pincode
 * @returns {boolean}
 */
export const validatePincode = (pincode) => {
  return /^\d{6}$/.test(pincode);
};

/**
 * Validate budget (minimum ₹10)
 * @param {number} budget - Budget amount
 * @returns {boolean}
 */
export const validateBudget = (budget) => {
  return budget >= 10;
};

/**
 * Validate required field
 * @param {string} value - Field value
 * @returns {boolean}
 */
export const validateRequired = (value) => {
  return value && value.trim().length > 0;
};

