import { apiService } from '../apiService';

export const userService = {
  // Create a single user
  createUser: async (userData) => {
    console.log('🟢 [USER API] Creating user:', { 
      email: userData.email, 
      role: userData.role,
      hasPassword: !!userData.password,
      stationCount: userData.stationIds ? userData.stationIds.length : 0
    });
    
    try {
      const response = await apiService.post('/users', userData);
      console.log('✅ [USER API] User created successfully:', { 
        userId: response.data.data.id,
        email: response.data.data.email,
        tempPassword: response.data.data.tempPassword ? 'Generated' : 'Not generated'
      });
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
        count: response.data.data.length,
        successCount: response.data.data.filter(u => u.id).length
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
        count: response.data.pagination?.totalCount,
        totalPages: response.data.pagination?.totalPages,
        currentPage: response.data.pagination?.page
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
        email: response.data.data.email,
        role: response.data.data.role
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
  updateUserStatus: async (userId, statusData) => {
    console.log('🟢 [USER API] Updating user status:', { 
      userId, 
      newStatus: statusData.status 
    });
    
    try {
      const response = await apiService.patch(`/users/${userId}/status`, statusData);
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

  // Update user password
  updateUserPassword: async (userId, passwordData) => {
    console.log('🟢 [USER API] Updating user password:', { userId });
    
    try {
      const response = await apiService.patch(`/users/${userId}/password`, passwordData);
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

  // Assignments starts here
  // Add this method to your userService
  // Assignment methods
assignUserToStation: async (assignmentData) => {
  console.log('🟢 [USER ASSIGNMENT] Assigning user to station:', assignmentData);
  
  try {
    const response = await apiService.post('/user-assignments', assignmentData);
    console.log('✅ [USER ASSIGNMENT] User assigned successfully:', {
      assignmentId: response.data.data.id,
      userId: assignmentData.userId,
      stationId: assignmentData.stationId,
      role: assignmentData.role
    });
    return response.data;
  } catch (error) {
    console.error('❌ [USER ASSIGNMENT] Failed to assign user:', {
      error: error.response?.data?.message || error.message,
      status: error.response?.status,
      validationErrors: error.response?.data?.errors,
      assignmentData
    });
    
    // Enhance error message for validation errors
    if (error.response?.data?.errors) {
      const enhancedError = new Error(
        `Assignment validation failed: ${error.response.data.errors.map(e => e.message).join(', ')}`
      );
      enhancedError.response = error.response;
      throw enhancedError;
    }
    
    throw error;
  }
},

assignUsersBulk: async (bulkData) => {
  console.log('🟢 [USER ASSIGNMENT] Bulk assigning users to station:', { 
    stationId: bulkData.stationId,
    assignmentCount: bulkData.assignments.length,
    roles: [...new Set(bulkData.assignments.map(a => a.role))]
  });
  
  try {
    const response = await apiService.post('/user-assignments/bulk', bulkData);
    
    const result = {
      ...response.data,
      // Add helper properties for easier consumption
      successCount: response.data.data?.length || 0,
      errorCount: response.data.errors?.length || 0
    };
    
    console.log('✅ [USER ASSIGNMENT] Bulk assignment completed:', {
      stationId: bulkData.stationId,
      successCount: result.successCount,
      errorCount: result.errorCount
    });
    
    return result;
  } catch (error) {
    console.error('❌ [USER ASSIGNMENT] Failed to bulk assign users:', {
      error: error.response?.data?.message || error.message,
      status: error.response?.status,
      validationErrors: error.response?.data?.errors,
      stationId: bulkData.stationId
    });
    
    // Enhance error message for validation errors
    if (error.response?.data?.errors) {
      const enhancedError = new Error(
        `Bulk assignment validation failed: ${JSON.stringify(error.response.data.errors)}`
      );
      enhancedError.response = error.response;
      throw enhancedError;
    }
    
    throw error;
  }
},

updateUserAssignment: async (assignmentId, updateData) => {
  console.log('🟢 [USER ASSIGNMENT] Updating assignment:', { 
    assignmentId, 
    updateData 
  });
  
  try {
    const response = await apiService.put(`/user-assignments/${assignmentId}`, updateData);
    console.log('✅ [USER ASSIGNMENT] Assignment updated successfully:', {
      assignmentId: response.data.data.id,
      newRole: response.data.data.role
    });
    return response.data;
  } catch (error) {
    console.error('❌ [USER ASSIGNMENT] Failed to update assignment:', {
      error: error.response?.data?.message || error.message,
      status: error.response?.status,
      validationErrors: error.response?.data?.errors,
      assignmentId
    });
    throw error;
  }
},

unassignUserFromStation: async (assignmentId) => {
  console.log('🟢 [USER ASSIGNMENT] Unassigning user:', { assignmentId });
  
  try {
    const response = await apiService.delete(`/user-assignments/${assignmentId}`);
    console.log('✅ [USER ASSIGNMENT] User unassigned successfully:', { 
      assignmentId,
      message: response.data.message
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

getAssignment: async (assignmentId) => {
  console.log('🟢 [USER ASSIGNMENT] Getting assignment:', { assignmentId });
  
  try {
    const response = await apiService.get(`/user-assignments/${assignmentId}`);
    console.log('✅ [USER ASSIGNMENT] Assignment fetched successfully:', {
      assignmentId: response.data.data.id,
      userId: response.data.data.userId,
      stationId: response.data.data.stationId
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

getUserAssignments: async (userId, filters = {}) => {
  console.log('🟢 [USER ASSIGNMENT] Getting user assignments:', { userId, filters });
  
  try {
    const params = new URLSearchParams();
    
    // Add filters to params if provided
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });
    
    const queryString = params.toString();
    const url = queryString 
      ? `/user-assignments/user/${userId}?${queryString}`
      : `/user-assignments/user/${userId}`;
    
    const response = await apiService.get(url);
    console.log('✅ [USER ASSIGNMENT] User assignments fetched successfully:', {
      userId,
      count: response.data.data.length,
      hasPagination: !!response.data.pagination
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

getStationAssignments: async (stationId, filters = {}) => {
  console.log('🟢 [USER ASSIGNMENT] Getting station assignments:', { stationId, filters });
  
  try {
    const params = new URLSearchParams();
    
    // Add filters to params if provided
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
      count: response.data.data.length,
      pagination: response.data.pagination
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

// Helper method to check if a user is already assigned to a station
checkUserAssignment: async (userId, stationId) => {
  console.log('🟢 [USER ASSIGNMENT] Checking if user is assigned to station:', { 
    userId, 
    stationId 
  });
  
  try {
    // Get all user assignments and check if any match the station
    const assignments = await this.getUserAssignments(userId);
    const isAssigned = assignments.data.some(
      assignment => assignment.stationId === stationId
    );
    
    console.log('✅ [USER ASSIGNMENT] Assignment check completed:', {
      userId,
      stationId,
      isAssigned
    });
    
    return isAssigned;
  } catch (error) {
    console.error('❌ [USER ASSIGNMENT] Failed to check user assignment:', {
      error: error.message,
      userId,
      stationId
    });
    throw error;
  }
}
};



export default userService;