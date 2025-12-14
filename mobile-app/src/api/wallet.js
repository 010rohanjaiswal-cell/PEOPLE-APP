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
   * @param {number} amount - Amount to pay
   * @returns {Promise} Payment URL and order ID
   */
  payDues: async (amount) => {
    const response = await apiClient.post('/api/freelancer/pay-dues', { amount });
    return response.data;
  },
};

export default walletAPI;

