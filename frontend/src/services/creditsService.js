import api from './api';

const creditsService = {
  // Get current credit balance
  getBalance: async () => {
    const response = await api.get('/api/credits/balance');
    return response.data;
  },

  // Get credit transaction history
  getTransactions: async (limit = 50, offset = 0) => {
    const response = await api.get('/api/credits/transactions', {
      params: { limit, offset },
    });
    return response.data;
  },

  // Get available credit packages
  getPackages: async () => {
    const response = await api.get('/api/credits/packages');
    return response.data;
  },

  // Create Stripe checkout session
  createCheckoutSession: async (credits) => {
    const response = await api.post('/api/credits/create-checkout-session', {
      credits,
    });
    return response.data;
  },
};

export default creditsService;
