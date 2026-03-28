/**
 * Payment API — PhonePe (job + dues) and legacy Cashfree helpers where still used
 */

import apiClient from './client';

export const paymentAPI = {
  /**
   * Create PhonePe SDK order for freelancer commission dues (money settles to merchant account)
   * @returns {Promise} merchantOrderId, orderToken, orderId, merchantId, checkSum, amount
   */
  createDuesOrder: async () => {
    const response = await apiClient.post('/api/payment/create-dues-order');
    return response.data;
  },

  /**
   * Confirm PhonePe dues payment after SDK checkout (poll-friendly)
   * @param {string} merchantOrderId - from createDuesOrder (DUES_...)
   */
  confirmDuesPayment: async (merchantOrderId) => {
    const response = await apiClient.post('/api/payment/confirm-dues-payment', { merchantOrderId });
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
