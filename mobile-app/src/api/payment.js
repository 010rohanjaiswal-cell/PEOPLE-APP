/**
 * Payment API - Cashfree Integration
 */

import apiClient from './client';

export const paymentAPI = {
  /**
   * Create Cashfree payment session for freelancer dues
   * @returns {Promise} { orderId, paymentSessionId, amount, currency }
   */
  createDuesOrder: async () => {
    const response = await apiClient.post('/api/cashfree/dues/create-order');
    return response.data;
  },

  /**
   * Confirm dues payment (poll-friendly)
   * @param {string} orderId - Cashfree order id
   * @returns {Promise} { paid: boolean, wallet? }
   */
  confirmDuesPayment: async (orderId) => {
    const response = await apiClient.post('/api/cashfree/dues/confirm', { orderId });
    return response.data;
  },

  // PhonePe client -> freelancer job payment
  createJobPaymentOrder: async (jobId) => {
    const response = await apiClient.post('/api/payment/create-job-order', { jobId });
    return response.data;
  },

  confirmJobPayment: async (merchantOrderId) => {
    const response = await apiClient.post('/api/payment/confirm-job-payment', { merchantOrderId });
    return response.data;
  },
};

export default paymentAPI;
