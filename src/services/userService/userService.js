import { apiService } from './apiService';

export const userService = {
  // Create a single user
  createUser: async (userData) => {
    const response = await apiService.post('/users/create', userData);
    return response.data;
  },

  // Create multiple users in bulk
  createBulkUsers: async (usersData) => {
    const response = await apiService.post('/users/bulk', usersData);
    return response.data;
  },

  // Get all users for the current company
  getCompanyUsers: async () => {
    const response = await apiService.get('/users');
    return response.data;
  },

  // Get a specific user by ID
  getUser: async (userId) => {
    const response = await apiService.get(`/users/${userId}`);
    return response.data;
  },

  // Update user status
  updateUserStatus: async (userId, statusData) => {
    const response = await apiService.patch(`/users/${userId}/status`, statusData);
    return response.data;
  },

  // Update user password
  updateUserPassword: async (userId, passwordData) => {
    const response = await apiService.patch(`/users/${userId}/password`, passwordData);
    return response.data;
  },
};