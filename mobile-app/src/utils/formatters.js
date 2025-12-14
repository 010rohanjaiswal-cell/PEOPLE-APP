/**
 * Formatter Utilities - People App
 */

/**
 * Format currency (₹)
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '₹0';
  return `₹${amount.toLocaleString('en-IN')}`;
};

/**
 * Format date
 * @param {string|Date} date - Date to format
 * @param {string} format - Format string (default: 'DD MMM YYYY')
 * @returns {string} Formatted date
 */
export const formatDate = (date, format = 'DD MMM YYYY') => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return 'Recently';
    }
    
    const day = dateObj.getDate();
    const month = dateObj.toLocaleString('en-US', { month: 'short' });
    const year = dateObj.getFullYear();
    
    if (format === 'DD MMM YYYY') {
      return `${day} ${month} ${year}`;
    }
    
    // Default format
    return `${day} ${month} ${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'N/A';
  }
};

/**
 * Format date and time
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date and time
 */
export const formatDateTime = (date) => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return 'Recently';
    }
    
    const formattedDate = formatDate(dateObj);
    const hours = dateObj.getHours();
    const minutes = dateObj.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    
    return `${formattedDate} at ${displayHours}:${displayMinutes} ${ampm}`;
  } catch (error) {
    console.error('Error formatting date time:', error);
    return 'N/A';
  }
};

