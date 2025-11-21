import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import adminAuthService from '../services/adminAuthService';

const AdminContext = createContext(null);

export const AdminProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if admin is logged in on mount
    try {
      const currentAdmin = adminAuthService.getCurrentAdmin();
      setAdmin(currentAdmin);
    } catch (error) {
      console.error('Failed to load admin from localStorage:', error);
      // Clear corrupted data
      localStorage.removeItem('admin');
      localStorage.removeItem('admin_access_token');
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (credentials) => {
    const data = await adminAuthService.login(credentials);
    setAdmin(data.admin);
    return data;
  };

  const logout = () => {
    adminAuthService.logout();
    setAdmin(null);
  };

  const refreshAdmin = useCallback(async () => {
    try {
      const profile = await adminAuthService.getProfile();
      setAdmin(profile);

      // CRITICAL: Update localStorage so it stays in sync
      try {
        localStorage.setItem('admin', JSON.stringify(profile));
      } catch (storageError) {
        console.error('Failed to save admin to localStorage:', storageError);
        // Continue anyway - admin is still in memory
      }

      return profile;
    } catch (error) {
      console.error('Failed to refresh admin:', error);
      return null;
    }
  }, []); // No dependencies - adminAuthService is stable

  const value = {
    admin,
    loading,
    login,
    logout,
    refreshAdmin,
    isAuthenticated: !!admin,
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within AdminProvider');
  }
  return context;
};

// Default export for Fast Refresh compatibility
export default AdminContext;
