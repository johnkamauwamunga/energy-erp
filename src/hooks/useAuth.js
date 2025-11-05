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

        console.log('🔄 Auth initialization check:', {
          hasStoredAuthData: !!storedAuthData,
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken
        });

        if (storedAuthData && accessToken && refreshToken) {
          const authData = JSON.parse(storedAuthData);
          
          console.log('📦 Parsed auth data from localStorage:', authData);
          
          // Check if token is still valid
          if (isTokenValid(accessToken)) {
            console.log('✅ Token valid, setting auth state with user:', authData.user?.email);
            dispatch({ 
              type: 'SET_AUTH_DATA', 
              payload: {
                user: authData.user,
                company: authData.company,
                station: authData.station,
                permissions: authData.permissions,
                accessToken: accessToken,
                refreshToken: refreshToken
              }
            });
          } else {
            console.log('⚠️ Token expired on initialization');
          }
        } else {
          console.log('❌ Missing auth data in localStorage');
        }
      } catch (error) {
        console.error('❌ Failed to initialize auth state:', error);
        clearAuthData();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [dispatch]);

  // Helper function to update auth data
  const updateAuthData = (responseData) => {
    console.log('💾 Updating auth data with full response:', responseData);
    
    // Extract the actual data from response
    const authData = {
      user: responseData.user,
      company: responseData.company,
      station: responseData.station,
      permissions: responseData.permissions,
      accessToken: responseData.accessToken,
      refreshToken: responseData.refreshToken
    };

    console.log('📦 Extracted auth data:', {
      user: authData.user,
      company: authData.company,
      accessToken: !!authData.accessToken,
      refreshToken: !!authData.refreshToken
    });

    // Store in localStorage - make sure we're storing the actual user object
    const storageData = {
      user: authData.user,
      company: authData.company,
      station: authData.station,
      permissions: authData.permissions
    };

    localStorage.setItem('authData', JSON.stringify(storageData));
    localStorage.setItem('accessToken', authData.accessToken);
    localStorage.setItem('refreshToken', authData.refreshToken);

    console.log('✅ Auth data stored in localStorage, user:', storageData.user?.email);

    // Update context with the actual data
    dispatch({ 
      type: 'SET_AUTH_DATA', 
      payload: authData 
    });

    console.log('🔄 Dispatch completed, context should be updated');
  };

  const clearAuthData = () => {
    localStorage.removeItem('authData');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    dispatch({ type: 'LOGOUT' });
  };

  const isTokenValid = useCallback((token) => {
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp > currentTime + 30;
    } catch (error) {
      return false;
    }
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      console.log('🔄 Starting login process for:', email);
      const response = await authService.login(email, password);
      
      console.log('📨 Login service response:', response);
      
      if (response.success && response.data) {
        console.log('✅ Login successful, updating auth data...');
        updateAuthData(response.data);
        
        return { 
          success: true, 
          data: response.data,
          message: response.message 
        };
      } else {
        return { 
          success: false, 
          message: response.message || 'Login failed' 
        };
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      return { 
        success: false, 
        message: error.message || 'Login failed' 
      };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuthData();
    }
  }, []);

  const refreshToken = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const response = await authService.refreshToken(refreshToken);
      
      if (response.success && response.data) {
        updateAuthData(response.data);
        return { success: true, data: response.data };
      } else {
        throw new Error(response.message || 'Refresh failed');
      }
    } catch (error) {
      console.error('❌ Refresh failed:', error);
      logout();
      return { 
        success: false, 
        message: error.message 
      };
    }
  }, [logout]);

  const resetPassword = useCallback(async (email, newPassword) => {
    try {
      const response = await authService.resetPassword(email, newPassword);
      return { success: true, data: response };
    } catch (error) {
      return { 
        success: false, 
        message: error.message 
      };
    }
  }, []);

  const checkTokenValidity = useCallback(() => {
    const token = localStorage.getItem('accessToken');
    return isTokenValid(token);
  }, [isTokenValid]);

  // FIXED: Use the correct state property names that match your reducer
  return { 
    login, 
    logout, 
    refreshToken, 
    resetPassword,
    isTokenValid: checkTokenValidity,
    isLoading,
    isAuthenticated: !!state.accessToken && checkTokenValidity(),
    user: state.currentUser,        // ← CHANGED: state.currentUser
    company: state.currentCompany,  // ← CHANGED: state.currentCompany
    station: state.currentStation,  // ← CHANGED: state.currentStation
    permissions: state.permissions
  };
};