import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import authService from '../services/authService';
import userService from '../services/userService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simple: Just load from localStorage
    try {
      const currentUser = authService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Failed to load user from localStorage:', error);
      localStorage.removeItem('user');
      localStorage.removeItem('access_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (credentials) => {
    const data = await authService.login(credentials);
    // Always set user (even if unverified) - ProtectedRoute will handle redirect
    setUser(data.user);
    return data;
  };

  const register = async (userData) => {
    const data = await authService.register(userData);
    // Set user even if unverified - ProtectedRoute will redirect to verification
    setUser(data.user);
    return data;
  };

  const googleLogin = async (idToken) => {
    const data = await authService.googleLogin(idToken);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const refreshUser = useCallback(async () => {
    try {
      const profile = await userService.getCurrentProfile();
      setUser(profile);

      // CRITICAL: Update localStorage so it stays in sync
      try {
        localStorage.setItem('user', JSON.stringify(profile));
      } catch (storageError) {
        console.error('Failed to save user to localStorage:', storageError);
        // Continue anyway - user is still in memory
      }

      return profile;
    } catch (error) {
      console.error('Failed to refresh user:', error);
      return null;
    }
  }, []); // No dependencies - userService is stable

  const value = {
    user,
    loading,
    login,
    register,
    googleLogin,
    logout,
    refreshUser,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Default export for Fast Refresh compatibility
export default AuthContext;
