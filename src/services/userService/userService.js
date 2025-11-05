import { apiService } from '../apiService';

export const userService = {
  // =====================
  // USER MANAGEMENT METHODS
  // =====================

  // Create a single user (WITH optional station assignments)
  createUser: async (userData) => {
    console.log('🟢 [USER API] Creating user:', { 
      email: userData.email, 
      role: userData.role,
      hasPassword: !!userData.password,
      stationAssignments: userData.stationAssignments?.length || 0
    });
    
    try {
      const response = await apiService.post('/users', userData);
      console.log("✅ [USER API] User created successfully:", response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [USER API] Failed to create user:', {
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        email: userData.email
      });
      throw error;
    }
  },

  // Create multiple users in bulk
  createBulkUsers: async (usersData) => {
    console.log('🟢 [USER API] Creating users in bulk:', { 
      userCount: usersData.length,
      emails: usersData.map(u => u.email)
    });
    
    try {
      const response = await apiService.post('/users/bulk', usersData);
      console.log('✅ [USER API] Bulk users created successfully:', { 
        count: response.data.data.length
      });
      return response.data;
    } catch (error) {
      console.error('❌ [USER API] Failed to create bulk users:', {
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        userCount: usersData.length
      });
      throw error;
    }
  },

  // Get all users with optional filters
  getUsers: async (filters = {}) => {
    console.log('🟢 [USER API] Fetching users with filters:', filters);
    
    const params = new URLSearchParams();
    
    // Add filters to params if provided
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });
    
    const queryString = params.toString();
    const url = queryString ? `/users?${queryString}` : '/users';
    console.log("the get users ",url)
    
    try {
      const response = await apiService.get(url);
      console.log('✅ [USER API] Users fetched successfully:', { 
        count: response?.length,
        totalCount: response.pagination?.totalCount
      });
      return response;
    } catch (error) {
      console.error('❌ [USER API] Failed to fetch users:', {
        error: error.response?.message || error.message,
        status: error.response?.status,
        filters
      });
      throw error;
    }
  },

  // Get a specific user by ID
  getUser: async (userId) => {
    console.log('🟢 [USER API] Fetching user:', { userId });
    
    try {
      const response = await apiService.get(`/users/${userId}`);
      console.log('✅ [USER API] User fetched successfully:', { 
        userId: response.data.data.id,
        email: response.data.data.email,
        stationAssignments: response.data.data.stationAssignments?.length || 0
      });
      return response.data;
    } catch (error) {
      console.error('❌ [USER API] Failed to fetch user:', {
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        userId
      });
      throw error;
    }
  },

  // Get user by email
  getUserByEmail: async (email) => {
    console.log('🟢 [USER API] Fetching user by email:', { email });
    
    try {
      const response = await apiService.get(`/users/email/${encodeURIComponent(email)}`);
      console.log('✅ [USER API] User fetched by email successfully:', { 
        userId: response.data.data.id,
        email: response.data.data.email
      });
      return response.data;
    } catch (error) {
      console.error('❌ [USER API] Failed to fetch user by email:', {
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        email
      });
      throw error;
    }
  },

  // Update user details
  updateUser: async (userId, userData) => {
    console.log('🟢 [USER API] Updating user:', { 
      userId,
      updates: Object.keys(userData)
    });
    
    try {
      const response = await apiService.put(`/users/${userId}`, userData);
      console.log('✅ [USER API] User updated successfully:', { 
        userId: response.data.data.id,
        updatedFields: Object.keys(userData)
      });
      return response.data;
    } catch (error) {
      console.error('❌ [USER API] Failed to update user:', {
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        userId
      });
      throw error;
    }
  },

  // Update user status
  updateUserStatus: async (userId, status) => {
    console.log('🟢 [USER API] Updating user status:', { 
      userId, 
      newStatus: status 
    });
    
    try {
      const response = await apiService.patch(`/users/${userId}/status`, { status });
      console.log('✅ [USER API] User status updated successfully:', { 
        userId: response.data.data.id,
        newStatus: response.data.data.status
      });
      return response.data;
    } catch (error) {
      console.error('❌ [USER API] Failed to update user status:', {
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        userId
      });
      throw error;
    }
  },

  // Update user password (admin function)
  updateUserPassword: async (userId, password) => {
    console.log('🟢 [USER API] Updating user password:', { userId });
    
    try {
      const response = await apiService.patch(`/users/${userId}/password`, { password });
      console.log('✅ [USER API] User password updated successfully:', { userId });
      return response.data;
    } catch (error) {
      console.error('❌ [USER API] Failed to update user password:', {
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        userId
      });
      throw error;
    }
  },

  // Delete a user
  deleteUser: async (userId) => {
    console.log('🟢 [USER API] Deleting user:', { userId });
    
    try {
      const response = await apiService.delete(`/users/${userId}`);
      console.log('✅ [USER API] User deleted successfully:', { userId });
      return response.data;
    } catch (error) {
      console.error('❌ [USER API] Failed to delete user:', {
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        userId
      });
      throw error;
    }
  },

  // =====================
  // INTEGRATED STATION ASSIGNMENT METHODS
  // =====================

  // Assign user to station (NEW integrated endpoint)
  assignUserToStation: async (userId, stationId, role) => {
    console.log('🟢 [USER API] Assigning user to station:', { userId, stationId, role });
    
    try {
      const response = await apiService.post(`/users/${userId}/assign-station`, { 
        stationId, 
        role 
      });
      console.log('✅ [USER API] User assigned successfully:', {
        userId,
        stationId,
        role
      });
      return response.data;
    } catch (error) {
      console.error('❌ [USER API] Failed to assign user:', {
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        userId,
        stationId
      });
      throw error;
    }
  },

  // Bulk assign users to station (NEW integrated endpoint)
  bulkAssignUsersToStation: async (stationId, userIds, role) => {
    console.log('🟢 [USER API] Bulk assigning users to station:', { 
      stationId,
      userIds,
      role
    });
    
    try {
      const response = await apiService.post('/users/bulk-assign-station', {
        stationId,
        userIds,
        role
      });
      console.log('✅ [USER API] Bulk assignment completed:', {
        stationId,
        successCount: response.data.data?.length || 0,
        errorCount: response.data.errors?.length || 0
      });
      return response.data;
    } catch (error) {
      console.error('❌ [USER API] Failed to bulk assign users:', {
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        stationId
      });
      throw error;
    }
  },

  // Unassign user from specific station
  unassignUserFromStation: async (userId, assignmentId) => {
    console.log('🟢 [USER API] Unassigning user from station:', { userId, assignmentId });
    
    try {
      const response = await apiService.delete(`/users/${userId}/unassign-station/${assignmentId}`);
      console.log('✅ [USER API] User unassigned successfully:', { 
        userId,
        assignmentId
      });
      return response.data;
    } catch (error) {
      console.error('❌ [USER API] Failed to unassign user:', {
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        userId,
        assignmentId
      });
      throw error;
    }
  },

  // Unassign user from ALL stations
  unassignUserFromAllStations: async (userId) => {
    console.log('🟢 [USER API] Unassigning user from all stations:', { userId });
    
    try {
      const response = await apiService.delete(`/users/${userId}/unassign-all-stations`);
      console.log('✅ [USER API] User unassigned from all stations successfully:', { 
        userId,
        assignmentsRemoved: response.data.data?.assignmentsRemoved
      });
      return response.data;
    } catch (error) {
      console.error('❌ [USER API] Failed to unassign user from all stations:', {
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        userId
      });
      throw error;
    }
  },

  // Get user's station assignments
  getUserStationAssignments: async (userId) => {
    console.log('🟢 [USER API] Getting user station assignments:', { userId });
    
    try {
      const response = await apiService.get(`/users/${userId}/station-assignments`);
      console.log('✅ [USER API] User station assignments fetched successfully:', {
        userId,
        count: response.data.data?.length
      });
      return response.data;
    } catch (error) {
      console.error('❌ [USER API] Failed to get user station assignments:', {
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        userId
      });
      throw error;
    }
  },

  // Get users by station (integrated endpoint)
  getUsersByStation: async (stationId, filters = {}) => {
    console.log('🟢 [USER API] Fetching users for station:', { stationId, filters });
    
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      
      const queryString = params.toString();
      const url = queryString 
        ? `/users/station/${stationId}/users?${queryString}`
        : `/users/station/${stationId}/users`;
      
      const response = await apiService.get(url);
      console.log('✅ [USER API] Station users fetched successfully:', { 
        stationId,
        count: response.data.data?.length
      });
      return response.data;
    } catch (error) {
      console.error('❌ [USER API] Failed to fetch station users:', {
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        stationId
      });
      throw error;
    }
  },

  // =====================
  // REMOVED OLD ENDPOINTS - These no longer exist:
  // =====================
  // ❌ assignUsersBulk (old assignment endpoint)
  // ❌ updateUserAssignment (old assignment endpoint)  
  // ❌ getAssignment (old assignment endpoint)
  // ❌ getStationAssignments (old assignment endpoint)
  // ❌ getUserStationAssignments (old two-parameter version)
  // ❌ getStationUsersSummary (moved to station service)
  // ❌ getUserCurrentStation (moved to station service)
  // ❌ getUserAssignedStations (moved to station service)

  // =====================
  // HELPER METHODS FOR STATION MANAGEMENT
  // =====================

  // Get attendants for a station
  getStationAttendants: async (stationId, filters = {}) => {
    const response = await userService.getUsersByStation(stationId, {
      ...filters,
      role: 'ATTENDANT'
    });
    console.log("✅ [STATION ATTENDANTS] Fetched:", response.data?.length || 0);
    return response;
  },

  // Get supervisors for a station
  getStationSupervisors: async (stationId, filters = {}) => {
    const response = await userService.getUsersByStation(stationId, {
      ...filters,
      role: 'SUPERVISOR'
    });
    console.log("✅ [STATION SUPERVISORS] Fetched:", response.data?.length || 0);
    return response;
  },

  // Get station managers for a station
  getStationManagers: async (stationId, filters = {}) => {
    const response = await userService.getUsersByStation(stationId, {
      ...filters,
      role: 'STATION_MANAGER'
    });
    console.log("✅ [STATION MANAGERS] Fetched:", response.data?.length || 0);
    return response;
  },

  // =====================
  // PASSWORD RESET (Public endpoint)
  // =====================

  resetPasswordByEmail: async (resetData) => {
    const { email, newPassword, confirmPassword } = resetData;
    
    console.log('🟢 [USER API] Resetting password by email:', { email });
    
    // Client-side validation
    if (!email || !newPassword || !confirmPassword) {
      throw new Error('All fields are required');
    }

    if (newPassword !== confirmPassword) {
      throw new Error('Passwords do not match');
    }

    const passwordValidation = userService.validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw new Error(passwordValidation.errors[0]);
    }

    try {
      const payload = {
        email: email.trim().toLowerCase(),
        newPassword: newPassword,
        confirmPassword: confirmPassword
      };

      const response = await apiService.patch('/users/password/reset', payload);
      console.log('✅ [USER API] Password reset successfully:', { email });
      
      return {
        success: true,
        message: response.data.message,
        data: response.data.data
      };

    } catch (error) {
      console.error('❌ [USER API] Failed to reset password:', {
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        email
      });
      throw error;
    }
  },

  // =====================
  // UTILITY METHODS
  // =====================

  // Validate password strength
  validatePasswordStrength: (password) => {
    const errors = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // Format user for display (includes station assignments)
  formatUserDisplay: (user) => {
    return {
      id: user.id,
      name: `${user.firstName} ${user.lastName}`.trim(),
      email: user.email,
      role: user.role,
      status: user.status,
      isActive: user.status === 'ACTIVE',
      stationAssignments: user.stationAssignments || [],
      // Helper computed properties
      assignedStations: user.stationAssignments?.map(sa => sa.stationName) || [],
      primaryStation: user.stationAssignments?.[0] || null
    };
  },

  // Check if user can be assigned to stations
  canUserHaveStationAssignments: (role) => {
    const stationRoles = ['STATION_MANAGER', 'SUPERVISOR', 'ATTENDANT'];
    return stationRoles.includes(role);
  },

  // Prepare user data for creation/update
  prepareUserData: (userData) => {
    const prepared = { ...userData };
    
    // Remove station assignments if user role doesn't allow them
    if (!userService.canUserHaveStationAssignments(userData.role)) {
      delete prepared.stationAssignments;
    }
    
    return prepared;
  }
};

export default userService;