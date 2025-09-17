import { apiService } from '../apiService';

export const userService = {
  // Create a single user
  createUser: async (userData) => {
    const response = await apiService.post('/users', userData);
    return response.data;
  },

  // Create multiple users in bulk
  createBulkUsers: async (usersData) => {
    const response = await apiService.post('/users/bulk', usersData);
    return response.data;
  },

  // Get all users with optional filters
  getUsers: async (filters = {}) => {
    const params = new URLSearchParams();
    
    // Add filters to params if provided
    if (filters.role) params.append('role', filters.role);
    if (filters.status) params.append('status', filters.status);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    
    const queryString = params.toString();
    const url = queryString ? `/users?${queryString}` : '/users';
    
    const response = await apiService.get(url);
    return response.data;
  },

  // Get a specific user by ID
  getUser: async (userId) => {
    const response = await apiService.get(`/users/${userId}`);
    return response.data;
  },

  // Update user details
  updateUser: async (userId, userData) => {
    const response = await apiService.put(`/users/${userId}`, userData);
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

  // Delete a user
  deleteUser: async (userId) => {
    const response = await apiService.delete(`/users/${userId}`);
    return response.data;
  },

  // Assign user to a station
  assignUserToStation: async (userId, stationId, role) => {
    const response = await apiService.post(`/users/${userId}/assign-station`, {
      stationId,
      role
    });
    return response.data;
  },

  // Remove user from a station
  removeUserFromStation: async (userId, stationId) => {
    const response = await apiService.delete(`/users/${userId}/assign-station/${stationId}`);
    return response.data;
  }
};