/**
 * Wallet API - People App
 */

import apiClient from './client';

export const walletAPI = {
  /**
   * Get wallet data for freelancer
   * @returns {Promise} Wallet data including dues, transactions, ledger
   */
  getWallet: async () => {
    const response = await apiClient.get('/api/freelancer/wallet');
    return response.data;
  },

  /**
   * Initiate dues payment
   * NOTE: PhonePe integration will be added later.
   * For now, this simply marks all dues as paid on the backend.
   * @param {string} orderId - Optional external order ID
   * @returns {Promise} Updated wallet data
   */
  payDues: async (orderId) => {
    const response = await apiClient.post('/api/freelancer/pay-dues', orderId ? { orderId } : {});
    return response.data;
  },
};

export default walletAPI;

