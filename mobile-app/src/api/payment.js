/**
 * Payment API - Cashfree Integration
 */

import apiClient from './client';

export const paymentAPI = {
  /**
   * Create Cashfree payment order for dues
   * @returns {Promise} Payment order with paymentSessionId, paymentUrl and merchantOrderId
   */
  createDuesOrder: async () => {
    const response = await apiClient.post('/api/payment/create-dues-order');
    return response.data;
  },

  /**
   * Check order status
   * @param {string} merchantOrderId - Merchant order ID
   * @returns {Promise} Order status
   */
  checkOrderStatus: async (merchantOrderId) => {
    const response = await apiClient.get(`/api/payment/order-status/${merchantOrderId}`);
    return response.data;
  },

  /**
   * Process dues payment after successful Cashfree payment
   * @param {string} merchantOrderId - Merchant order ID
   * @returns {Promise} Updated wallet data
   */
  processDuesPayment: async (merchantOrderId) => {
    const response = await apiClient.post(`/api/payment/process-dues/${merchantOrderId}`);
    return response.data;
  },
};

export default paymentAPI;
