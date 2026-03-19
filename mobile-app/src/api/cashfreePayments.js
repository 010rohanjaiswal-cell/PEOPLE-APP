import apiClient from './client';

export const cashfreePaymentsAPI = {
  createJobPaymentOrder: async (jobId) => {
    const response = await apiClient.post('/api/cashfree/payments/create-order', { jobId });
    return response.data;
  },

  confirmJobPayment: async (orderId) => {
    const response = await apiClient.post('/api/cashfree/payments/confirm', { orderId });
    return response.data;
  },
};

export default cashfreePaymentsAPI;

