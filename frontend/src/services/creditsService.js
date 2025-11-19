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
  createCheckoutSession: async (credits, enableAutoRecharge = false) => {
    const response = await api.post('/api/credits/create-checkout-session', {
      credits,
      enable_auto_recharge: enableAutoRecharge,
    });
    return response.data;
  },

  // Get auto-recharge settings
  getAutoRechargeSettings: async () => {
    const response = await api.get('/api/credits/auto-recharge');
    return response.data;
  },

  // Update auto-recharge settings
  updateAutoRechargeSettings: async (enabled, credits = null, threshold = 10.0) => {
    const response = await api.post('/api/credits/auto-recharge', {
      enabled,
      credits,
      threshold,
    });
    return response.data;
  },
};

export default creditsService;
