/**
 * Payment API - People App
 */

import apiClient from './client';

export const paymentAPI = {
  /**
   * Process dues payment order
   * @param {string} orderId - Payment order ID
   * @returns {Promise}
   */
  processDuesOrder: async (orderId) => {
    const response = await apiClient.post(`/payment/process-dues-order/${orderId}`);
    return response.data;
  },
};

export default paymentAPI;

