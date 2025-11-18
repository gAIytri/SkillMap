import api from './api';

const userService = {
  // Get current user profile (with fresh credits data)
  getCurrentProfile: async () => {
    const response = await api.get('/api/users/me');
    return response.data;
  },

  // Update user profile
  updateProfile: async (profileData) => {
    const response = await api.put('/api/users/me', profileData);
    return response.data;
  },

  // Delete user account
  deleteAccount: async () => {
    const response = await api.delete('/api/users/me');
    return response.data;
  },
};

export default userService;
