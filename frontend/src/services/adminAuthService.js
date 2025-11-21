import api from './api';

const adminAuthService = {
  // Admin login with email and password
  login: async (credentials) => {
    const response = await api.post('/api/admin/login', credentials);
    if (response.data.access_token) {
      localStorage.setItem('admin_access_token', response.data.access_token);
      localStorage.setItem('admin', JSON.stringify(response.data.admin));
    }
    return response.data;
  },

  // Logout admin
  logout: () => {
    localStorage.removeItem('admin_access_token');
    localStorage.removeItem('admin');
  },

  // Get current admin (with error handling for corrupted localStorage)
  getCurrentAdmin: () => {
    try {
      const adminStr = localStorage.getItem('admin');
      if (!adminStr) return null;

      // Parse JSON safely
      return JSON.parse(adminStr);
    } catch (error) {
      console.error('Failed to parse admin from localStorage:', error);
      // Clear corrupted data
      try {
        localStorage.removeItem('admin');
        localStorage.removeItem('admin_access_token');
      } catch (clearError) {
        console.error('Failed to clear localStorage:', clearError);
      }
      return null;
    }
  },

  // Check if admin is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('admin_access_token');
  },

  // Get admin profile
  getProfile: async () => {
    const token = localStorage.getItem('admin_access_token');
    const response = await api.get('/api/admin/me', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  },

  // Get analytics data
  getUserAnalytics: async (params) => {
    const token = localStorage.getItem('admin_access_token');
    const response = await api.get('/api/admin/analytics/users', {
      params,
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  },

  getTokenAnalytics: async (params) => {
    const token = localStorage.getItem('admin_access_token');
    const response = await api.get('/api/admin/analytics/tokens', {
      params,
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  },

  getCreditsAnalytics: async (params) => {
    const token = localStorage.getItem('admin_access_token');
    const response = await api.get('/api/admin/analytics/credits', {
      params,
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  },

  getRetentionAnalytics: async (params) => {
    const token = localStorage.getItem('admin_access_token');
    const response = await api.get('/api/admin/analytics/retention', {
      params,
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  },

  // Detailed data endpoints
  getDetailedUsers: async () => {
    const token = localStorage.getItem('admin_access_token');
    const response = await api.get('/api/admin/users/detailed', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  },

  getDetailedCredits: async () => {
    const token = localStorage.getItem('admin_access_token');
    const response = await api.get('/api/admin/credits/detailed', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  },

  getDetailedTokens: async () => {
    const token = localStorage.getItem('admin_access_token');
    const response = await api.get('/api/admin/tokens/detailed', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  },

  // Update user credits
  updateUserCredits: async (userId, credits) => {
    const token = localStorage.getItem('admin_access_token');
    const response = await api.patch(`/api/admin/users/${userId}/credits`,
      { credits },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    return response.data;
  },
};

export default adminAuthService;
