import { apiService } from '../apiService';

export const userService = {
  // =====================
  // USER MANAGEMENT METHODS
  // =====================

  // Create a single user (NO stationIds in payload anymore)
  createUser: async (userData) => {
    console.log('🟢 [USER API] Creating user:', { 
      email: userData.email, 
      role: userData.role,
      hasPassword: !!userData.password
      // REMOVED: stationCount - station assignments are separate now
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
    
    try {
      const response = await apiService.get(url);
      console.log('✅ [USER API] Users fetched successfully:', { 
        count: response.data.data?.length,
        totalCount: response.data.pagination?.totalCount
      });
      return response.data;
    } catch (error) {
      console.error('❌ [USER API] Failed to fetch users:', {
        error: error.response?.data?.message || error.message,
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
        email: response.data.data.email
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
  // ASSIGNMENT MANAGEMENT METHODS
  // =====================

  // Assign user to station
  assignUserToStation: async (assignmentData) => {
    console.log('🟢 [USER ASSIGNMENT] Assigning user to station:', assignmentData);
    
    try {
      const response = await apiService.post('/user-assignments', assignmentData);
      console.log('✅ [USER ASSIGNMENT] User assigned successfully:', {
        assignmentId: response.data.data.id,
        userId: assignmentData.userId,
        stationId: assignmentData.stationId
      });
      return response.data;
    } catch (error) {
      console.error('❌ [USER ASSIGNMENT] Failed to assign user:', {
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        assignmentData
      });
      throw error;
    }
  },

  // Bulk assign users to station
  assignUsersBulk: async (bulkData) => {
    console.log('🟢 [USER ASSIGNMENT] Bulk assigning users to station:', { 
      stationId: bulkData.stationId,
      assignmentCount: bulkData.assignments.length
    });
    
    try {
      const response = await apiService.post('/user-assignments/bulk', bulkData);
      console.log('✅ [USER ASSIGNMENT] Bulk assignment completed:', {
        stationId: bulkData.stationId,
        successCount: response.data.data?.length || 0,
        errorCount: response.data.errors?.length || 0
      });
      return response.data;
    } catch (error) {
      console.error('❌ [USER ASSIGNMENT] Failed to bulk assign users:', {
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        stationId: bulkData.stationId
      });
      throw error;
    }
  },

  // Update user assignment
  updateUserAssignment: async (assignmentId, updateData) => {
    console.log('🟢 [USER ASSIGNMENT] Updating assignment:', { 
      assignmentId, 
      updateData 
    });
    
    try {
      const response = await apiService.put(`/user-assignments/${assignmentId}`, updateData);
      console.log('✅ [USER ASSIGNMENT] Assignment updated successfully:', {
        assignmentId: response.data.data.id
      });
      return response.data;
    } catch (error) {
      console.error('❌ [USER ASSIGNMENT] Failed to update assignment:', {
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        assignmentId
      });
      throw error;
    }
  },

  // Unassign user from station
  unassignUserFromStation: async (assignmentId) => {
    console.log('🟢 [USER ASSIGNMENT] Unassigning user:', { assignmentId });
    
    try {
      const response = await apiService.delete(`/user-assignments/${assignmentId}`);
      console.log('✅ [USER ASSIGNMENT] User unassigned successfully:', { 
        assignmentId
      });
      return response.data;
    } catch (error) {
      console.error('❌ [USER ASSIGNMENT] Failed to unassign user:', {
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        assignmentId
      });
      throw error;
    }
  },

  // Get assignment by ID
  getAssignment: async (assignmentId) => {
    console.log('🟢 [USER ASSIGNMENT] Getting assignment:', { assignmentId });
    
    try {
      const response = await apiService.get(`/user-assignments/${assignmentId}`);
      console.log('✅ [USER ASSIGNMENT] Assignment fetched successfully:', {
        assignmentId: response.data.data.id
      });
      return response.data;
    } catch (error) {
      console.error('❌ [USER ASSIGNMENT] Failed to get assignment:', {
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        assignmentId
      });
      throw error;
    }
  },

  // Get all assignments for a user
  getUserAssignments: async (userId) => {
    console.log('🟢 [USER ASSIGNMENT] Getting user assignments:', { userId });
    
    try {
      const response = await apiService.get(`/user-assignments/user/${userId}`);
      console.log('✅ [USER ASSIGNMENT] User assignments fetched successfully:', {
        userId,
        count: response.data.data.length
      });
      return response.data;
    } catch (error) {
      console.error('❌ [USER ASSIGNMENT] Failed to get user assignments:', {
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        userId
      });
      throw error;
    }
  },

  // Get all assignments for a station
  getStationAssignments: async (stationId, filters = {}) => {
    console.log('🟢 [USER ASSIGNMENT] Getting station assignments:', { stationId, filters });
    
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      
      const queryString = params.toString();
      const url = queryString 
        ? `/user-assignments/station/${stationId}?${queryString}`
        : `/user-assignments/station/${stationId}`;
      
      const response = await apiService.get(url);
      console.log('✅ [USER ASSIGNMENT] Station assignments fetched successfully:', {
        stationId,
        count: response.data.data.length
      });
      return response.data;
    } catch (error) {
      console.error('❌ [USER ASSIGNMENT] Failed to get station assignments:', {
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        stationId
      });
      throw error;
    }
  },

  // Get users by station (from assignment service)
  getUsersByStation: async (stationId, filters = {}) => {
    console.log('🟢 [STATION USERS] Fetching users for station:', { stationId, filters });
    
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      
      const queryString = params.toString();
      const url = queryString 
        ? `/user-assignments/station/${stationId}/users?${queryString}`
        : `/user-assignments/station/${stationId}/users`;
      
      const response = await apiService.get(url);
      console.log('✅ [STATION USERS] Station users fetched successfully:', { 
        stationId,
        count: response.data.data?.length
      });
      return response.data;
    } catch (error) {
      console.error('❌ [STATION USERS] Failed to fetch station users:', {
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        stationId
      });
      throw error;
    }
  },

  // Get user's station assignments
  getUserStationAssignments: async (userId, stationId) => {
    console.log('🟢 [USER ASSIGNMENTS] Fetching user station assignments:', { userId, stationId });
    
    try {
      const response = await apiService.get(`/user-assignments/user/${userId}/station/${stationId}`);
      console.log('✅ [USER ASSIGNMENTS] User station assignments fetched successfully:', { 
        userId,
        stationId
      });
      return response.data;
    } catch (error) {
      console.error('❌ [USER ASSIGNMENTS] Failed to fetch user station assignments:', {
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        userId,
        stationId
      });
      throw error;
    }
  },

  // Get station users summary
  getStationUsersSummary: async (stationId) => {
    console.log('🟢 [STATION SUMMARY] Fetching station users summary:', { stationId });
    
    try {
      const response = await apiService.get(`/user-assignments/station/${stationId}/summary`);
      console.log('✅ [STATION SUMMARY] Station users summary fetched successfully:', { 
        stationId
      });
      return response.data;
    } catch (error) {
      console.error('❌ [STATION SUMMARY] Failed to fetch station users summary:', {
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        stationId
      });
      throw error;
    }
  },

  // Get user's current station
  getUserCurrentStation: async (userId) => {
    console.log('🟢 [USER STATION] Getting user current station:', { userId });
    
    try {
      const response = await apiService.get(`/user-assignments/user/${userId}/current-station`);
      console.log('✅ [USER STATION] User current station fetched successfully:', { 
        userId,
        station: response.data.data
      });
      return response.data;
    } catch (error) {
      console.error('❌ [USER STATION] Failed to get user current station:', {
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        userId
      });
      throw error;
    }
  },

  // Get all stations assigned to user
  getUserAssignedStations: async (userId) => {
    console.log('🟢 [USER STATIONS] Getting user assigned stations:', { userId });
    
    try {
      const response = await apiService.get(`/user-assignments/user/${userId}/stations`);
      console.log('✅ [USER STATIONS] User assigned stations fetched successfully:', { 
        userId,
        count: response.data.data?.length
      });
      return response.data;
    } catch (error) {
      console.error('❌ [USER STATIONS] Failed to get user assigned stations:', {
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        userId
      });
      throw error;
    }
  },

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

  // Format user for display
  formatUserDisplay: (user) => {
    return {
      id: user.id,
      name: `${user.firstName} ${user.lastName}`.trim(),
      email: user.email,
      role: user.role,
      status: user.status,
      isActive: user.status === 'ACTIVE',
      // Note: station assignments now come from separate assignment calls
    };
  }
};

export default userService;