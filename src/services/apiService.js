import { authService } from './auth/authService';

// const API_BASE_URL = 'http://localhost:3001/api';

// const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';
// Use environment variable with fallback

//const API_BASE_URL = 'https://178.128.201.205/api';  // Production

// const API_BASE_URL = 'http://localhost:3001/api';  // Development

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const headers = {
        ...authService.getAuthHeaders(),
        ...options.headers,
      };

      const config = {
        ...options,
        headers,
      };

      // Add body for methods that need it
      if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
        config.body = JSON.stringify(options.body);
        headers['Content-Type'] = 'application/json';
      }

      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `API request failed: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }

  // CRUD methods
  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: data,
    });
  }

  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: data,
    });
  }

  async patch(endpoint, data) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: data,
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

export const apiService = new ApiService();