import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { authService } from '../services/auth/authService';

export const useAuth = () => {
  const { state, dispatch } = useApp();
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from localStorage on app load
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const storedAuthData = localStorage.getItem('authData');
        const accessToken = localStorage.getItem('accessToken');
        const refreshToken = localStorage.getItem('refreshToken');
     
        if (storedAuthData && accessToken) {
          const authData = JSON.parse(storedAuthData);
          
          dispatch({ 
            type: 'SET_AUTH_DATA', 
            payload: {
              ...authData,
              accessToken,
              refreshToken
            }
          });
        }
      } catch (error) {
        console.error('Failed to initialize auth state', error);
        // Clear corrupted data
        localStorage.removeItem('authData');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [dispatch]);

  const login = useCallback(async (email, password) => {
    try {
      const response = await authService.login(email, password);
      
      console.log('Login successful, response:', response);
      // Store all authentication data
      const authData = {
        user: response.user,
        company: response.company,
        station: response.station,
        permissions: response.permissions,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken
      };

      // Store in localStorage
      localStorage.setItem('authData', JSON.stringify({
        user: response.user,
        company: response.company,
        station: response.station,
        permissions: response.permissions
      }));
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
      
      // Update context
      dispatch({ 
        type: 'SET_AUTH_DATA', 
        payload: authData 
      });
      
      return { success: true, data: response };
    } catch (error) {
      console.error('Login failed:', error);
      return { 
        success: false, 
        message: error.message || 'Login failed' 
      };
    }
  }, [dispatch]);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear all stored data regardless of server response
      localStorage.removeItem('authData');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      dispatch({ type: 'LOGOUT' });
    }
  }, [dispatch]);

  const refreshToken = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const response = await authService.refreshToken(refreshToken);
      
      // Update stored tokens
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
      
      // Update auth data with new user info if needed
      const existingAuthData = JSON.parse(localStorage.getItem('authData') || '{}');
      const updatedAuthData = {
        ...existingAuthData,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        user: response.user || existingAuthData.user,
        station: response.station || existingAuthData.station
      };
      
      localStorage.setItem('authData', JSON.stringify(updatedAuthData));
      dispatch({ 
        type: 'SET_AUTH_DATA', 
        payload: updatedAuthData 
      });
      
      return { success: true, data: response };
    } catch (error) {
      console.error('Token refresh failed:', error);
      // If refresh fails, logout the user
      logout();
      return { 
        success: false, 
        message: error.message || 'Token refresh failed' 
      };
    }
  }, [dispatch, logout]);

  const resetPassword = useCallback(async (email, newPassword) => {
    try {
      const response = await authService.resetPassword(email, newPassword);
      return { success: true, data: response };
    } catch (error) {
      console.error('Password reset failed:', error);
      return { 
        success: false, 
        message: error.message || 'Password reset failed' 
      };
    }
  }, []);

  // Check if token is expired or about to expire
  const isTokenValid = useCallback(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      // Consider token valid if it expires in more than 30 seconds
      return payload.exp > currentTime + 30;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }, []);

  return { 
    login, 
    logout, 
    refreshToken, 
    resetPassword,
    isTokenValid,
    isLoading,
    isAuthenticated: !!state.accessToken && isTokenValid(),
   user: state.currentUser, 
  company: state.currentCompany,    // 👈
  station: state.currentStation,
    permissions: state.permissions
  };
};