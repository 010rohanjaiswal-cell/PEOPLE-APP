import apiClient from './client';

export const cashfreeWalletAPI = {
  getWallet: async () => {
    const response = await apiClient.get('/api/cashfree/wallet');
    return response.data;
  },

  getLedger: async (limit = 50) => {
    const response = await apiClient.get(`/api/cashfree/wallet/ledger?limit=${limit}`);
    return response.data;
  },

  withdraw: async ({ amount, beneId, beneficiaryName, bankAccount, ifsc }) => {
    const response = await apiClient.post('/api/cashfree/payouts/withdraw', { amount });
    return response.data;
  },

  addBankAccount: async ({ bankAccount, ifsc }) => {
    const response = await apiClient.post('/api/cashfree/payouts/bank-account', { bankAccount, ifsc });
    return response.data;
  },
};

export default cashfreeWalletAPI;

