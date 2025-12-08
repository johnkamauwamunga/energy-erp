// services/auth/authService.js
//const API_BASE_URL = 'http://localhost:3001/api';

// Use environment variable with fallback
// const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';

const API_BASE_URL = 'https://178.128.201.205/api';  // Production

// const API_BASE_URL = 'http://localhost:3001/api';  // Development

export const authService = {
  login: async (email, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      console.log('🔐 Login API response:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      if (!data.success) {
        throw new Error(data.message || 'Login failed');
      }

      // Return the FULL response including success status
      return data;
    } catch (error) {
      console.error('❌ Login service error:', error);
      throw new Error(error.message || 'Login failed. Please try again.');
    }
  },

  logout: async () => {
    try {
      const token = localStorage.getItem('accessToken');
      
      // Call server logout endpoint if available
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  },

  refreshToken: async (refreshToken) => {
    try {
      console.log('🔄 Refresh token API call with:', refreshToken?.substring(0, 20) + '...');
      
      const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await response.json();

      console.log('🔐 Refresh token API response:', data);

      if (!data.success) {
        throw new Error(data.message || 'Token refresh failed');
      }

      // Return the FULL response
      return data;
    } catch (error) {
      console.error('❌ Refresh token service error:', error);
      throw new Error(error.message || 'Token refresh failed');
    }
  },

  resetPassword: async (email, newPassword) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, newPassword }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Password reset failed');
      }

      return data;
    } catch (error) {
      throw new Error(error.message || 'Password reset failed');
    }
  },

  getAuthHeaders: () => {
    const token = localStorage.getItem('accessToken');
    return {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
    };
  },
};